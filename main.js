const { app, BrowserWindow, ipcMain, dialog, shell, protocol, net, powerSaveBlocker } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { pathToFileURL, fileURLToPath } = require('url');
const { 
  getAccounts, 
  addAccount, 
  deleteAccount, 
  deleteAllAccounts,
  updateAccountCredits,
  updateAccountProxy, 
  openLoginWindow, 
  saveAccounts, 
  fetchRealCredits, 
  refreshAllAccountCredits,
  exportSessionsBundle,
  importSessionsBundle,
  getInstalledChromeProfiles,
  importFromInstalledChrome,
  importAllInstalledChromeProfiles
} = require('./engine/accountStore');
const { WorkerPool } = require('./engine/workerPool');
const { FlowAutomationEngine } = require('./engine/flowAutomation');
const { FFmpegService } = require('./engine/ffmpegService');
const { dbService } = require('./engine/db');
const { 
  runFullHealthCheck, 
  releaseAllChromeLocks, 
  autoHealSystem,
  getRuntimeErrors,
  clearRuntimeErrors
} = require('./engine/diagnosticsService');
const { getChromeExecutablePath } = require('./engine/profileDetector');
const { 
  resolveInside, 
  assertInside, 
  assertAllowedMediaFolder, 
  assertAllowedMediaFile, 
  assertAccountId, 
  assertChromeProfileDirName,
  validateNumericSetting
} = require('./engine/pathSecurity');

let mainWindow = null;
let activeWorkerPool = null;
let powerSaveBlockerId = null;

function enablePowerLock() {
  if (powerSaveBlockerId === null) {
    try {
      powerSaveBlockerId = powerSaveBlocker.start('prevent-display-sleep');
      console.log('[POWER]: prevent-display-sleep lock ACTIVATED for bulk generation.');
    } catch (e) {}
  }
}

function releasePowerLock() {
  if (powerSaveBlockerId !== null) {
    try {
      powerSaveBlocker.stop(powerSaveBlockerId);
      console.log('[POWER]: prevent-display-sleep lock RELEASED.');
    } catch (e) {}
    powerSaveBlockerId = null;
  }
}

function assertTrustedRenderer(event) {
  if (!mainWindow || mainWindow.isDestroyed() || !event || !event.sender) {
    throw new Error('Untrusted IPC sender: Window is not available');
  }
  if (event.sender !== mainWindow.webContents) {
    throw new Error('Untrusted IPC sender: Event sender does not match main window');
  }
  if (event.senderFrame && event.senderFrame.parent !== null) {
    throw new Error('Untrusted IPC sender: Child frame IPC invocation is forbidden');
  }
  const currentUrl = event.sender.getURL();
  if (typeof currentUrl !== 'string' || (!currentUrl.startsWith('file:') && currentUrl !== 'about:blank')) {
    throw new Error('Untrusted IPC sender: Renderer window navigated to an untrusted URL');
  }
}

function getAllowedMediaRoots() {
  const roots = [
    path.join(os.homedir(), 'Downloads'),
    path.join(os.homedir(), 'Downloads', 'GoogleFlow_Videos'),
    path.join(__dirname, 'downloads')
  ];
  try {
    const configured = dbService.getSetting('download_folder', '');
    if (configured && typeof configured === 'string' && configured.trim()) {
      roots.push(configured.trim());
    }
  } catch (e) {}
  return roots.map(root => path.resolve(root));
}

function assertAllowedMediaPath(filePath, label = 'Media path') {
  return assertAllowedMediaFile(filePath, getAllowedMediaRoots(), undefined, label);
}

function assertAllowedMediaFolderPath(folderPath, label = 'Folder path') {
  return assertAllowedMediaFolder(folderPath, getAllowedMediaRoots(), label);
}

// Ensure single instance to prevent duplicate process conflicts
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// Register protocol privileges before app ready
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'local-video',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true
    }
  }
]);

// Enable Chromium GPU Acceleration for silky smooth rendering
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('ignore-gpu-blocklist');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1340,
    height: 940,
    minWidth: 1020,
    minHeight: 720,
    backgroundColor: '#090c15',
    title: 'Google Flow Studio V2 - Multi-Account Parallel AI Studio',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      backgroundThrottling: false // Keep active even when minimized!
    },
    icon: path.join(__dirname, 'renderer', 'icon.png')
  });

  mainWindow.webContents.on('console-message', (event, level, message) => {
    console.log(`[RENDERER CONSOLE]: ${message}`);
  });

  // Hotkeys: Prevent accidental refresh during active batch execution
  mainWindow.webContents.on('before-input-event', (event, input) => {
    const isQueueActive = !!(activeWorkerPool && activeWorkerPool.activeWorkers && activeWorkerPool.activeWorkers.size > 0 && !activeWorkerPool.isStopping);
    if ((input.control || input.meta) && input.key.toLowerCase() === 'r') {
      if (isQueueActive) {
        event.preventDefault();
        mainWindow.webContents.send('automation-log', {
          message: '⚠️ Accidental reload blocked: Video batch is actively running. Stop queue before reloading.',
          type: 'warn'
        });
        return;
      }
      mainWindow.reload();
      event.preventDefault();
    }
    if (input.key === 'F5') {
      if (isQueueActive) {
        event.preventDefault();
        mainWindow.webContents.send('automation-log', {
          message: '⚠️ Accidental F5 reload blocked: Video batch is actively running. Stop queue before reloading.',
          type: 'warn'
        });
        return;
      }
      mainWindow.reload();
      event.preventDefault();
    }
    if ((input.control || input.meta) && input.shift && input.key.toLowerCase() === 'i') {
      mainWindow.webContents.toggleDevTools();
      event.preventDefault();
    }
  });

  // Graceful Window Close: Prompt user and cleanly shut down workers to prevent zombie Chrome processes
  mainWindow.on('close', async (e) => {
    const isQueueActive = !!(activeWorkerPool && activeWorkerPool.activeWorkers && activeWorkerPool.activeWorkers.size > 0 && !activeWorkerPool.isStopping);
    if (isQueueActive) {
      e.preventDefault();
      const choice = dialog.showMessageBoxSync(mainWindow, {
        type: 'question',
        buttons: ['Cancel', 'Exit & Stop Queue'],
        defaultId: 0,
        cancelId: 0,
        title: 'Queue In Progress',
        message: 'A video generation queue is currently active.',
        detail: 'If you exit now, running tasks will be safely paused and browser processes terminated cleanly.'
      });
      if (choice === 1) {
        try {
          if (activeWorkerPool) await activeWorkerPool.stop();
        } catch (err) {}
        releasePowerLock();
        mainWindow.destroy();
      }
    } else {
      releasePowerLock();
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event) => event.preventDefault());
  mainWindow.webContents.on('will-frame-navigate', (event) => event.preventDefault());
  mainWindow.setMenuBarVisibility(false);
}


app.whenReady().then(async () => {
  // Ensure SQLite WASM DB is fully initialized
  try {
    await dbService.ensureInit();
  } catch (dbErr) {
    console.warn('[DB init]:', dbErr);
  }

  // Protocol handler for local video and image streaming with range requests
  try {
    protocol.handle('local-video', (request) => {
      try {
        let filePath = '';
        try {
          let fileUrl = request.url.replace(/^local-video:/i, 'file:');
          filePath = fileURLToPath(fileUrl);
        } catch (e) {
          let raw = request.url.replace(/^local-video:\/\//i, '');
          let decoded = decodeURIComponent(raw);
          if (/^\/[a-zA-Z]:/.test(decoded)) {
            decoded = decoded.substring(1);
          }
          filePath = decoded;
        }
        if (filePath && fs.existsSync(filePath)) {
          return net.fetch(pathToFileURL(filePath).toString(), {
            headers: request.headers
          });
        }
        return new Response('File not found', { status: 404 });
      } catch (err) {
        console.error('local-video stream error:', err);
        return new Response('Media error', { status: 500 });
      }
    });
  } catch (e) {}

  createWindow();

  // ⚡ Live UI state tick to keep indicators in sync without spawning heavy background Chrome processes
  setInterval(() => {
    try {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('account-updated', {
          accounts: getAccounts()
        });
      }
    } catch (err) {}
  }, 30000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (activeWorkerPool) {
    activeWorkerPool.stop().catch(() => {});
  }
  if (process.platform !== 'darwin') app.quit();
});

// ==========================================
// 🔌 IPC HANDLERS (V2 Enhanced API)
// ==========================================

// 1. Account & Proxy Management
ipcMain.handle('get-accounts', async (event) => {
  assertTrustedRenderer(event);
  await dbService.ensureInit();
  return getAccounts();
});

ipcMain.handle('add-account', async (event, customName) => {
  assertTrustedRenderer(event);
  await dbService.ensureInit();
  const safeName = typeof customName === 'string' ? customName.trim().slice(0, 100) : '';
  return addAccount(safeName);
});

ipcMain.handle('delete-account', async (event, id) => {
  assertTrustedRenderer(event);
  assertAccountId(id);
  await dbService.ensureInit();
  return deleteAccount(id);
});

ipcMain.handle('delete-all-accounts', async (event) => {
  assertTrustedRenderer(event);
  await dbService.ensureInit();
  return deleteAllAccounts();
});

ipcMain.handle('update-account-credits', async (event, payload) => {
  assertTrustedRenderer(event);
  if (!payload || typeof payload !== 'object') throw new Error('Invalid payload');
  assertAccountId(payload.id);
  const credits = Math.max(0, Math.min(100000, Number(payload.credits) || 0));
  await dbService.ensureInit();
  const updated = updateAccountCredits(payload.id, credits);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('credits-updated', { accounts: updated });
    mainWindow.webContents.send('account-updated', { accounts: updated });
  }
  return updated;
});

ipcMain.handle('update-account-proxy', async (event, payload) => {
  assertTrustedRenderer(event);
  if (!payload || typeof payload !== 'object') throw new Error('Invalid payload');
  assertAccountId(payload.id);
  const proxyUrl = typeof payload.proxyUrl === 'string' ? payload.proxyUrl.trim().slice(0, 500) : '';
  await dbService.ensureInit();
  return updateAccountProxy(payload.id, proxyUrl);
});

ipcMain.handle('open-login-window', async (event, id) => {
  assertTrustedRenderer(event);
  assertAccountId(id);
  await dbService.ensureInit();
  return openLoginWindow(id, (res) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('account-logged-in', {
        accountId: id,
        result: res,
        accounts: getAccounts()
      });
    }
  });
});

ipcMain.handle('save-accounts-state', async (event, accounts) => {
  assertTrustedRenderer(event);
  if (!Array.isArray(accounts)) throw new Error('Invalid accounts array');
  for (const a of accounts) {
    if (!a || typeof a !== 'object') throw new Error('Invalid account item');
    assertAccountId(a.id);
  }
  await dbService.ensureInit();
  saveAccounts(accounts);
  return { success: true };
});

ipcMain.handle('refresh-account-credits', async (event, id) => {
  assertTrustedRenderer(event);
  assertAccountId(id);
  await dbService.ensureInit();
  const res = await fetchRealCredits(id);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('account-updated', { account: res.account, accounts: getAccounts() });
    mainWindow.webContents.send('credits-updated', { accounts: getAccounts() });
  }
  return res;
});

ipcMain.handle('refresh-all-credits', async (event) => {
  assertTrustedRenderer(event);
  await dbService.ensureInit();
  const refreshed = await refreshAllAccountCredits();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('credits-updated', { accounts: refreshed });
    mainWindow.webContents.send('account-updated', { accounts: refreshed });
  }
  return refreshed;
});

ipcMain.handle('get-installed-chrome-profiles', async (event) => {
  assertTrustedRenderer(event);
  return getInstalledChromeProfiles();
});

ipcMain.handle('import-installed-chrome-profile', async (event, payload) => {
  assertTrustedRenderer(event);
  if (!payload || typeof payload !== 'object') throw new Error('Invalid payload');
  assertChromeProfileDirName(payload.profileDirName);
  if (payload.targetAccountId) assertAccountId(payload.targetAccountId);
  await dbService.ensureInit();
  return importFromInstalledChrome(payload.profileDirName, payload.targetAccountId);
});

ipcMain.handle('import-all-installed-chrome-profiles', async (event) => {
  assertTrustedRenderer(event);
  await dbService.ensureInit();
  return importAllInstalledChromeProfiles();
});

// 2. Portable Session Backup & Restore
ipcMain.handle('export-sessions-bundle', async (event) => {
  assertTrustedRenderer(event);
  await dbService.ensureInit();
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Flow Studio Accounts & Sessions Bundle',
    defaultPath: `Flow_Studio_Accounts_${Date.now()}.flowbackup`,
    filters: [{ name: 'Flow Backup', extensions: ['flowbackup', 'zip'] }]
  });
  if (!result.canceled && result.filePath) {
    return exportSessionsBundle(result.filePath);
  }
  return { success: false, error: 'Cancelled by user' };
});

ipcMain.handle('import-sessions-bundle', async (event) => {
  assertTrustedRenderer(event);
  await dbService.ensureInit();
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Import Flow Studio Accounts & Sessions Bundle',
    filters: [{ name: 'Flow Backup', extensions: ['flowbackup', 'zip'] }],
    properties: ['openFile']
  });
  if (!result.canceled && result.filePaths.length > 0) {
    return importSessionsBundle(result.filePaths[0]);
  }
  return { success: false, error: 'Cancelled by user' };
});

// 3. File System & Media Pickers
ipcMain.handle('get-default-download-path', async (event) => {
  assertTrustedRenderer(event);
  return path.join(os.homedir(), 'Downloads', 'GoogleFlow_Videos');
});

ipcMain.handle('select-folder', async (event) => {
  assertTrustedRenderer(event);
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
    title: 'Select Master Video Download Folder'
  });
  if (!result.canceled && result.filePaths.length > 0) {
    const selected = path.resolve(result.filePaths[0]);
    try {
      dbService.setSetting('download_folder', selected);
    } catch (e) {}
    return selected;
  }
  return null;
});

ipcMain.handle('select-image-file', async (event) => {
  assertTrustedRenderer(event);
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'] }
    ],
    title: 'Select Reference / Frame Image'
  });
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('select-multiple-images', async (event) => {
  assertTrustedRenderer(event);
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'] }
    ],
    title: 'Select Batch Reference Images'
  });
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths;
  }
  return [];
});

// App Settings & Chrome Path Handlers
ipcMain.handle('get-setting', async (event, payload) => {
  assertTrustedRenderer(event);
  await dbService.ensureInit();
  const key = typeof payload?.key === 'string' ? payload.key.slice(0, 100) : '';
  const defaultValue = payload?.defaultValue !== undefined ? payload.defaultValue : null;
  try {
    return dbService.getSetting(key, defaultValue);
  } catch (err) {
    return defaultValue;
  }
});

ipcMain.handle('set-setting', async (event, payload) => {
  assertTrustedRenderer(event);
  await dbService.ensureInit();
  const key = typeof payload?.key === 'string' ? payload.key.slice(0, 100) : '';
  if (!key) throw new Error('Setting key cannot be empty');
  const value = String(payload?.value ?? '').slice(0, 5000);
  try {
    dbService.setSetting(key, value);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('get-chrome-path', async (event) => {
  assertTrustedRenderer(event);
  return getChromeExecutablePath();
});

ipcMain.handle('select-chrome-exe', async (event) => {
  assertTrustedRenderer(event);
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Chrome Executable', extensions: ['exe'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    title: 'Select Google Chrome Executable (chrome.exe)'
  });
  if (!result.canceled && result.filePaths.length > 0) {
    const selectedPath = result.filePaths[0];
    await dbService.ensureInit();
    dbService.setSetting('chrome_path', selectedPath);
    return selectedPath;
  }
  return null;
});

ipcMain.handle('open-folder', async (event, folderPath) => {
  assertTrustedRenderer(event);
  if (folderPath) {
    const safeFolder = assertAllowedMediaFolderPath(folderPath, 'Folder path');
    await shell.openPath(safeFolder);
  }
  return true;
});

ipcMain.handle('read-video-binary', async (event, filePath) => {
  try {
    assertTrustedRenderer(event);
    const safePath = assertAllowedMediaPath(filePath, 'Video path');
    if (fs.existsSync(safePath) && fs.statSync(safePath).isFile()) {
      return fs.readFileSync(safePath);
    }
  } catch (err) {
    console.error('Error reading video binary buffer:', err);
  }
  return null;
});

ipcMain.handle('scan-download-folder', async (event, folderPath) => {
  try {
    assertTrustedRenderer(event);
    const safeFolder = assertAllowedMediaFolderPath(folderPath, 'Download folder');
    if (!fs.existsSync(safeFolder) || !fs.statSync(safeFolder).isDirectory()) return [];
    const files = fs.readdirSync(safeFolder);
    const mp4Files = [];
    for (const f of files) {
      if (f.endsWith('.mp4')) {
        const fullPath = path.join(safeFolder, f);
        const stats = fs.statSync(fullPath);
        mp4Files.push({
          fileName: f,
          filePath: fullPath,
          sizeBytes: stats.size,
          sizeMB: (stats.size / (1024 * 1024)).toFixed(2) + ' MB',
          createdAt: stats.birthtime,
          timestamp: stats.birthtime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          dateStr: stats.birthtime.toLocaleDateString()
        });
      }
    }
    return mp4Files.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } catch (err) {
    return [];
  }
});

ipcMain.handle('scan-image-folder', async (event, folderPath) => {
  try {
    assertTrustedRenderer(event);
    const safeFolder = assertAllowedMediaFolderPath(folderPath, 'Image folder');
    if (!fs.existsSync(safeFolder) || !fs.statSync(safeFolder).isDirectory()) return [];
    const files = fs.readdirSync(safeFolder);
    const imgFiles = [];
    for (const f of files) {
      const lower = f.toLowerCase();
      if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.webp')) {
        const fullPath = path.join(safeFolder, f);
        const stats = fs.statSync(fullPath);
        imgFiles.push({
          fileName: f,
          filePath: fullPath,
          sizeBytes: stats.size,
          sizeMB: (stats.size / (1024 * 1024)).toFixed(2) + ' MB',
          createdAt: stats.birthtime,
          timestamp: stats.birthtime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          dateStr: stats.birthtime.toLocaleDateString()
        });
      }
    }
    return imgFiles.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } catch (err) {
    return [];
  }
});

ipcMain.handle('delete-video-file', async (event, filePath) => {
  try {
    assertTrustedRenderer(event);
    const safePath = assertAllowedMediaPath(filePath, 'Video path');
    if (fs.existsSync(safePath) && fs.statSync(safePath).isFile()) {
      fs.unlinkSync(safePath);
      return { success: true };
    }
  } catch (err) {
    console.error('Error deleting file:', err);
  }
  return { success: false };
});

// 4. FFmpeg Video Stitcher & Metadata Stripper
ipcMain.handle('stitch-videos', async (event, payload) => {
  try {
    assertTrustedRenderer(event);
    if (!payload || typeof payload !== 'object') throw new Error('Invalid payload');
    const safeInputs = (Array.isArray(payload.videoPaths) ? payload.videoPaths : []).map(p => assertAllowedMediaPath(p, 'Input video'));
    const safeOutput = assertAllowedMediaPath(payload.outputPath, 'Output video');
    const finalPath = await FFmpegService.stitchVideos(safeInputs, safeOutput, (p) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('stitch-progress', p);
      }
    });
    return { success: true, filePath: finalPath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('strip-metadata', async (event, filePath) => {
  try {
    assertTrustedRenderer(event);
    const safeInput = assertAllowedMediaPath(filePath, 'Video path');
    const cleanedPath = await FFmpegService.stripMetadata(safeInput);
    return { success: true, filePath: cleanedPath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('clean-video-watermark', async (event, filePath) => {
  try {
    assertTrustedRenderer(event);
    const safeInput = assertAllowedMediaPath(filePath, 'Video path');
    const cleanedPath = await FFmpegService.removeVideoWatermark(safeInput);
    return { success: true, filePath: cleanedPath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// 5. Failed Tasks Recovery & SQLite DB
ipcMain.handle('get-failed-tasks', async (event) => {
  assertTrustedRenderer(event);
  await dbService.ensureInit();
  return dbService.getFailedTasks();
});

ipcMain.handle('retry-failed-tasks', async (event, taskIds) => {
  assertTrustedRenderer(event);
  await dbService.ensureInit();
  const safeTaskIds = Array.isArray(taskIds) ? taskIds.filter(id => typeof id === 'string' && id.length <= 100) : [];
  return dbService.retryFailedTasks(safeTaskIds);
});

ipcMain.handle('clear-failed-tasks', async (event) => {
  assertTrustedRenderer(event);
  await dbService.ensureInit();
  dbService.clearFailedTasks();
  return { success: true };
});

ipcMain.handle('get-history', async (event, limit) => {
  assertTrustedRenderer(event);
  await dbService.ensureInit();
  const safeLimit = Math.max(1, Math.min(500, Number(limit) || 200));
  return dbService.getHistory(safeLimit);
});

// 6. System Diagnostics & Live Health Monitor
ipcMain.handle('diagnostics:run-health-check', async (event, payload) => {
  assertTrustedRenderer(event);
  await dbService.ensureInit();
  const folder = (payload && typeof payload.downloadFolder === 'string') ? payload.downloadFolder : null;
  return runFullHealthCheck(folder);
});

ipcMain.handle('diagnostics:release-locks', async (event) => {
  assertTrustedRenderer(event);
  await dbService.ensureInit();
  return releaseAllChromeLocks();
});

ipcMain.handle('diagnostics:auto-heal', async (event, payload) => {
  assertTrustedRenderer(event);
  await dbService.ensureInit();
  const folder = (payload && typeof payload.downloadFolder === 'string') ? payload.downloadFolder : null;
  return autoHealSystem(folder);
});

ipcMain.handle('diagnostics:get-telemetry', async (event) => {
  assertTrustedRenderer(event);
  const workersData = [];
  if (activeWorkerPool && activeWorkerPool.activeWorkers) {
    for (const [id, engine] of activeWorkerPool.activeWorkers.entries()) {
      workersData.push({
        workerId: id,
        accountName: engine.currentAccount ? (engine.currentAccount.googleName || engine.currentAccount.name) : 'None',
        accountId: engine.currentAccount ? engine.currentAccount.id : null,
        currentStage: engine.currentStage || 'Idle / Ready',
        isPaused: engine.isPaused,
        isStopped: engine.isStopped
      });
    }
  }
  return {
    isQueueRunning: !!(activeWorkerPool && activeWorkerPool.activeWorkers && activeWorkerPool.activeWorkers.size > 0),
    workers: workersData
  };
});

ipcMain.handle('diagnostics:get-errors', async (event) => {
  assertTrustedRenderer(event);
  return getRuntimeErrors();
});

ipcMain.handle('diagnostics:clear-errors', async (event) => {
  assertTrustedRenderer(event);
  return clearRuntimeErrors();
});

// 6. V2 Concurrent Worker Pool Automation
ipcMain.handle('start-automation', async (event, config) => {
  assertTrustedRenderer(event);
  if (!config || typeof config !== 'object') throw new Error('Invalid automation configuration');

  await dbService.ensureInit();

  if (activeWorkerPool) {
    await activeWorkerPool.stop();
  }

  const concurrency = validateNumericSetting(config.concurrency, 1, 5, 1);
  const isHeadless = !!config.headless;
  const requestedDownloadFolder = config.downloadFolder || path.join(os.homedir(), 'Downloads', 'GoogleFlow_Videos');
  if (requestedDownloadFolder && typeof requestedDownloadFolder === 'string') {
    try {
      const resolvedTarget = path.resolve(requestedDownloadFolder.trim());
      if (fs.existsSync(resolvedTarget)) {
        dbService.setSetting('download_folder', resolvedTarget);
      }
    } catch (e) {}
  }
  config.downloadFolder = assertAllowedMediaFolderPath(requestedDownloadFolder, 'Download folder');

  // Validate prompts array
  const rawPrompts = Array.isArray(config.prompts) ? config.prompts : [];
  config.prompts = rawPrompts.slice(0, 500).map(p => String(p || '').trim()).filter(Boolean);

  console.log(`\n🚀 [V2 MAIN]: Starting Queue: ${config.prompts.length} prompts, Concurrency: ${concurrency}x, Headless: ${isHeadless}`);

  activeWorkerPool = new WorkerPool({
    concurrency,
    headless: isHeadless,
    onLog: (logData) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('automation-log', logData);
      }
    },
    onProgress: (progressData) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('automation-progress', progressData);
      }
    },
    onWorkerUpdate: (workerData) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('worker-update', workerData);
      }
    },
    onVideoStarted: (videoData) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('video-started', videoData);
      }
    },
    onVideoProgress: (progressData) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('video-rendering-tick', progressData);
      }
    },
    onVideoCompleted: (videoData) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('video-completed', videoData);
      }
    },
    onAccountUpdated: (accountData) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('account-updated', accountData);
      }
    }
  });

  enablePowerLock();

  activeWorkerPool.runQueue(
    config.prompts,
    config.settings || {},
    config.downloadFolder,
    Array.isArray(config.accounts) ? config.accounts : []
  ).catch(err => {
    console.error(`[QUEUE FATAL ERROR]:`, err);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('automation-log', {
        message: `Queue execution error: ${err.message}`,
        type: 'error',
        timestamp: new Date().toLocaleTimeString()
      });
    }
  }).finally(() => {
    releasePowerLock();
  });

  return { success: true };
});

ipcMain.handle('stop-automation', async (event) => {
  assertTrustedRenderer(event);
  releasePowerLock();
  if (activeWorkerPool) {
    await activeWorkerPool.stop();
    return { success: true };
  }
  return { success: false };
});

ipcMain.handle('pause-automation', async (event) => {
  assertTrustedRenderer(event);
  releasePowerLock();
  if (activeWorkerPool) {
    activeWorkerPool.pause();
    return { success: true };
  }
  return { success: false };
});

ipcMain.handle('resume-automation', async (event) => {
  assertTrustedRenderer(event);
  enablePowerLock();
  if (activeWorkerPool) {
    activeWorkerPool.resume();
    return { success: true };
  }
  return { success: false };
});

