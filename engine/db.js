const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'flow_studio_v2.db');

let db = null;
let SQL = null;
let isInitialized = false;

// Resolve local sql-wasm.wasm
let wasmPath = null;
try {
  wasmPath = require.resolve('sql.js/dist/sql-wasm.wasm');
} catch (e) {
  wasmPath = path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');
}

const wasmBinary = fs.existsSync(wasmPath) ? fs.readFileSync(wasmPath) : null;

function persist() {
  if (!db) return;
  try {
    const data = db.export();
    const buf = Buffer.from(data);
    const tmpPath = `${DB_PATH}.tmp_${process.pid}_${Date.now()}`;
    const fd = fs.openSync(tmpPath, 'w');
    fs.writeSync(fd, buf);
    try { fs.fsyncSync(fd); } catch (e) {}
    fs.closeSync(fd);
    fs.renameSync(tmpPath, DB_PATH);
  } catch (err) {
    console.warn('[SQLite Atomic Persist Error]:', err.message);
  }
}


function initSchema() {
  db.run(`
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      google_name TEXT,
      credits INTEGER DEFAULT 0,
      proxy_url TEXT DEFAULT '',
      status TEXT DEFAULT 'Ready',
      dir_name TEXT NOT NULL,
      selected INTEGER DEFAULT 1,
      last_checked TEXT,
      chrome_profile_dir TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS queue_tasks (
      id TEXT PRIMARY KEY,
      batch_id TEXT,
      prompt_text TEXT NOT NULL,
      prompt_index INTEGER DEFAULT 0,
      settings_json TEXT,
      status TEXT DEFAULT 'pending',
      assigned_account_id TEXT,
      assigned_account_name TEXT,
      video_url TEXT,
      file_path TEXT,
      file_name TEXT,
      file_size_mb TEXT,
      duration TEXT,
      aspect_ratio TEXT,
      model TEXT,
      quality TEXT,
      error_reason TEXT,
      retry_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  try {
    db.run('ALTER TABLE accounts ADD COLUMN chrome_profile_dir TEXT DEFAULT ""');
  } catch (e) {}

  // Auto-migrate from accounts.json ONLY ONCE on initial setup
  try {
    const migratedSetting = queryOne("SELECT value FROM app_settings WHERE key = 'migrated_legacy_accounts'");
    if (!migratedSetting) {
      const countRes = queryOne('SELECT COUNT(*) as count FROM accounts');
      if (!countRes || countRes.count === 0) {
        const jsonPath = path.join(__dirname, '..', 'accounts.json');
        if (fs.existsSync(jsonPath)) {
          const raw = fs.readFileSync(jsonPath, 'utf8');
          const legacy = JSON.parse(raw);
          if (Array.isArray(legacy) && legacy.length > 0) {
            legacy.forEach(a => {
              db.run(`
                INSERT OR IGNORE INTO accounts (id, name, email, google_name, credits, proxy_url, status, dir_name, selected, last_checked, chrome_profile_dir)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `, [
                a.id || `acc_${Date.now()}`,
                a.name || 'Google Account',
                a.email || '',
                a.googleName || a.name || 'Google User',
                Number(a.credits) || 0,
                a.proxyUrl || '',
                a.status || 'Ready',
                a.dirName || a.id || 'acc_1',
                a.selected !== false ? 1 : 0,
                a.lastChecked || '',
                a.chromeProfileDir || ''
              ]);
            });
            persist();
          }
        }
      }
      run("INSERT OR REPLACE INTO app_settings (key, value) VALUES ('migrated_legacy_accounts', '1')");
      persist();
    }
  } catch (mErr) {
    console.warn('[DB Migration Warning]:', mErr.message);
  }

  persist();
}

function assertDbInitialized() {
  if (!db || !isInitialized) {
    throw new Error('SQLite database is not initialized. Please await dbService.ensureInit() before executing operations.');
  }
}

function query(sql, params = []) {
  if (!db) {
    throw new Error('SQLite database is not initialized. Please await dbService.ensureInit() before executing operations.');
  }
  const stmt = db.prepare(sql);
  if (params && params.length > 0) {
    stmt.bind(params);
  }
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

function queryOne(sql, params = []) {
  const list = query(sql, params);
  return list.length > 0 ? list[0] : null;
}

function run(sql, params = []) {
  if (!db) {
    throw new Error('SQLite database is not initialized. Please await dbService.ensureInit() before executing operations.');
  }
  db.run(sql, params);
  persist();
  return true;
}

const initPromise = initSqlJs(wasmBinary ? { wasmBinary } : {}).then(sqlInstance => {
  SQL = sqlInstance;
  if (fs.existsSync(DB_PATH)) {
    try {
      const fileBuffer = fs.readFileSync(DB_PATH);
      db = new SQL.Database(fileBuffer);
    } catch (e) {
      console.warn('[DB load fallback]:', e.message);
      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
  }
  initSchema();
  isInitialized = true;
  return db;
}).catch(err => {
  console.error('[SQLite Init Error]:', err);
  throw err;
});

const dbService = {
  isReady() {
    return isInitialized && !!db;
  },

  async ensureInit() {
    if (!isInitialized || !db) {
      await initPromise;
    }
    return db;
  },

  // Accounts
  getAccounts() {
    const rows = query('SELECT * FROM accounts ORDER BY created_at ASC');
    return rows.map(a => ({
      id: a.id,
      name: a.name,
      email: a.email,
      credits: a.credits,
      status: a.status,
      selected: Boolean(a.selected),
      googleName: a.google_name,
      proxyUrl: a.proxy_url,
      dirName: a.dir_name,
      lastChecked: a.last_checked,
      chromeProfileDir: a.chrome_profile_dir || ''
    }));
  },

  saveAccount(account) {
    run(`
      INSERT INTO accounts (id, name, email, google_name, credits, proxy_url, status, dir_name, selected, last_checked, chrome_profile_dir)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        email = excluded.email,
        google_name = excluded.google_name,
        credits = excluded.credits,
        proxy_url = excluded.proxy_url,
        status = excluded.status,
        selected = excluded.selected,
        last_checked = excluded.last_checked,
        chrome_profile_dir = excluded.chrome_profile_dir
    `, [
      account.id,
      account.name,
      account.email || '',
      account.googleName || account.name,
      Number(account.credits) || 0,
      account.proxyUrl || '',
      account.status || 'Ready',
      account.dirName || account.id,
      account.selected ? 1 : 0,
      account.lastChecked || new Date().toLocaleTimeString(),
      account.chromeProfileDir || ''
    ]);
    return this.getAccounts();
  },

  deleteAccount(id) {
    run('DELETE FROM accounts WHERE id = ?', [id]);
    return this.getAccounts();
  },

  deleteAllAccounts() {
    run('DELETE FROM accounts');
    return [];
  },

  updateAccountCredits(id, credits) {
    const numCredits = Number(credits) || 0;
    const status = numCredits > 0 ? 'Ready' : 'Exhausted';
    run('UPDATE accounts SET credits = ?, status = ?, last_checked = ? WHERE id = ?', [numCredits, status, new Date().toLocaleTimeString(), id]);
    return this.getAccounts();
  },

  updateAccountStatus(id, status, credits = null) {
    if (credits !== null) {
      run('UPDATE accounts SET status = ?, credits = ?, last_checked = ? WHERE id = ?', [status, credits, new Date().toLocaleTimeString(), id]);
    } else {
      run('UPDATE accounts SET status = ?, last_checked = ? WHERE id = ?', [status, new Date().toLocaleTimeString(), id]);
    }
  },

  updateAccountProxy(id, proxyUrl) {
    run('UPDATE accounts SET proxy_url = ? WHERE id = ?', [proxyUrl || '', id]);
  },

  // Queue & Tasks
  createBatchTasks(batchId, prompts, settings) {
    const now = Date.now();
    prompts.forEach((p, idx) => {
      run(`
        INSERT INTO queue_tasks (id, batch_id, prompt_text, prompt_index, settings_json, status, duration, aspect_ratio, model, quality)
        VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)
      `, [
        `task_${now}_${idx + 1}`,
        batchId,
        p,
        idx,
        JSON.stringify(settings || {}),
        settings.duration || '6s',
        settings.aspectRatio || '9:16',
        settings.model || 'Omni Flash',
        settings.quality || '1080p'
      ]);
    });
    return this.getPendingTasks(batchId);
  },

  getPendingTasks(batchId = null) {
    if (batchId) {
      return query("SELECT * FROM queue_tasks WHERE batch_id = ? AND status = 'pending' ORDER BY prompt_index ASC", [batchId]);
    }
    return query("SELECT * FROM queue_tasks WHERE status = 'pending' ORDER BY prompt_index ASC");
  },

  updateTaskProgress(taskId, status, assignedAccountId = null, assignedAccountName = null) {
    run(`
      UPDATE queue_tasks 
      SET status = ?, 
          assigned_account_id = COALESCE(?, assigned_account_id), 
          assigned_account_name = COALESCE(?, assigned_account_name)
      WHERE id = ?
    `, [status, assignedAccountId, assignedAccountName, taskId]);
  },

  completeTask(taskId, result) {
    run(`
      UPDATE queue_tasks 
      SET status = 'completed',
          video_url = ?,
          file_path = ?,
          file_name = ?,
          file_size_mb = ?,
          completed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      result.videoUrl || '',
      result.filePath || '',
      result.fileName || '',
      result.fileSizeMb || '',
      taskId
    ]);
  },

  failTask(taskId, errorReason) {
    run(`
      UPDATE queue_tasks 
      SET status = 'failed',
          error_reason = ?,
          retry_count = retry_count + 1,
          completed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [errorReason || 'Unknown error', taskId]);
  },

  getFailedTasks() {
    return query("SELECT * FROM queue_tasks WHERE status = 'failed' ORDER BY rowid DESC");
  },

  retryFailedTasks(taskIds = []) {
    if (!taskIds || taskIds.length === 0) {
      run("UPDATE queue_tasks SET status = 'pending', error_reason = NULL WHERE status = 'failed'");
    } else {
      const placeholders = taskIds.map(() => '?').join(',');
      run(`UPDATE queue_tasks SET status = 'pending', error_reason = NULL WHERE id IN (${placeholders})`, taskIds);
    }
    return this.getFailedTasks();
  },

  clearFailedTasks() {
    run("DELETE FROM queue_tasks WHERE status = 'failed'");
  },

  getHistory(limit = 200) {
    return query("SELECT * FROM queue_tasks WHERE status = 'completed' ORDER BY rowid DESC LIMIT ?", [limit]);
  },

  clearHistory() {
    run("DELETE FROM queue_tasks WHERE status = 'completed'");
  },

  // App Settings
  getSetting(key, defaultValue = null) {
    const row = queryOne('SELECT value FROM app_settings WHERE key = ?', [key]);
    return row ? row.value : defaultValue;
  },

  setSetting(key, value) {
    run(`
      INSERT INTO app_settings (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `, [key, String(value)]);
  },

  query(sql, params) {
    return query(sql, params);
  },

  run(sql, params) {
    return run(sql, params);
  }
};

module.exports = { dbService, db, initPromise };
