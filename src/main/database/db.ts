import fs from 'fs';
import path from 'path';
import initSqlJs, { Database as SqlJsDatabase, SqlJsStatic } from 'sql.js';
import { PathSecurity } from '../security/paths';
import { GoogleAccount, AccountStatus, BrowserStatus } from '../../shared/types/account';
import { ActivityLogEntry } from '../../shared/types/activity';
import { AppSettings, DEFAULT_SETTINGS } from '../../shared/types/settings';
import { Project } from '../../shared/types/project';
import { Job, JobStatus } from '../../shared/types/job';
import { Logger } from '../logging/logger';

export class AppDatabase {
  private static db: SqlJsDatabase | null = null;
  private static dbFilePath: string = '';
  private static SQL: SqlJsStatic | null = null;

  public static async initialize(): Promise<void> {
    if (this.db) return;

    this.dbFilePath = path.join(PathSecurity.getUserDataDir(), 'flow_workspace.sqlite');
    this.SQL = await initSqlJs();

    if (fs.existsSync(this.dbFilePath)) {
      try {
        const fileBuffer = fs.readFileSync(this.dbFilePath);
        this.db = new this.SQL.Database(fileBuffer);
        Logger.info('Database', `Loaded existing SQLite database from ${this.dbFilePath}`);
      } catch (err) {
        Logger.warn('Database', 'Corrupt database file encountered, re-initializing fresh database', null, null, { error: String(err) });
        this.db = new this.SQL.Database();
      }
    } else {
      this.db = new this.SQL.Database();
      Logger.info('Database', `Created fresh SQLite database at ${this.dbFilePath}`);
    }

    this.runMigrations();
    this.persist();
  }

  private static runMigrations(): void {
    if (!this.db) return;

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        display_name TEXT NOT NULL,
        email TEXT,
        profile_path TEXT NOT NULL,
        status TEXT NOT NULL,
        browser_status TEXT NOT NULL,
        flow_status TEXT NOT NULL DEFAULT 'UNKNOWN',
        flow_url TEXT,
        last_verified_at TEXT,
        last_active_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        last_error TEXT,
        queue_count INTEGER DEFAULT 0,
        current_job_name TEXT,
        metadata TEXT
      );

      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        source_prompt TEXT NOT NULL,
        status TEXT NOT NULL,
        output_directory TEXT NOT NULL,
        total_shots INTEGER NOT NULL DEFAULT 0,
        completed_shots INTEGER NOT NULL DEFAULT 0,
        failed_shots INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        shots_json TEXT NOT NULL,
        metadata TEXT
      );

      CREATE TABLE IF NOT EXISTS jobs (
        job_id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        shot_id TEXT NOT NULL,
        prompt TEXT NOT NULL,
        generation_type TEXT NOT NULL DEFAULT 'VIDEO',
        model TEXT,
        duration INTEGER NOT NULL DEFAULT 5,
        aspect_ratio TEXT NOT NULL DEFAULT '16:9',
        status TEXT NOT NULL,
        status_detail TEXT,
        progress INTEGER NOT NULL DEFAULT 0,
        assigned_account_id TEXT,
        worker_id TEXT,
        created_at TEXT NOT NULL,
        started_at TEXT,
        completed_at TEXT,
        retry_count INTEGER NOT NULL DEFAULT 0,
        max_retries INTEGER NOT NULL DEFAULT 3,
        output_path TEXT,
        error TEXT,
        metadata TEXT
      );

      CREATE TABLE IF NOT EXISTS activity_logs (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        severity TEXT NOT NULL,
        component TEXT NOT NULL,
        account_id TEXT,
        job_id TEXT,
        message TEXT NOT NULL,
        metadata TEXT
      );

      CREATE TABLE IF NOT EXISTS flow_projects (
        flow_project_id TEXT PRIMARY KEY,
        application_project_id TEXT NOT NULL,
        account_id TEXT NOT NULL,
        flow_project_name TEXT NOT NULL,
        flow_project_url TEXT,
        flow_project_status TEXT NOT NULL DEFAULT 'READY',
        created_at TEXT NOT NULL,
        last_used_at TEXT NOT NULL,
        metadata TEXT
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    // Safe column migrations for existing databases
    try {
      this.db.exec(`ALTER TABLE accounts ADD COLUMN flow_status TEXT NOT NULL DEFAULT 'UNKNOWN';`);
    } catch {
      // Column may already exist
    }

    try {
      this.db.exec(`ALTER TABLE accounts ADD COLUMN flow_url TEXT;`);
    } catch {
      // Column may already exist
    }

    try {
      this.db.exec(`ALTER TABLE jobs ADD COLUMN status_detail TEXT;`);
    } catch {
      // Column may already exist
    }

    try {
      this.db.exec(`ALTER TABLE jobs ADD COLUMN generation_type TEXT NOT NULL DEFAULT 'VIDEO';`);
    } catch {
      // Column may already exist
    }

    try {
      this.db.exec(`ALTER TABLE jobs ADD COLUMN model TEXT;`);
    } catch {
      // Column may already exist
    }

    try {
      this.db.exec(`ALTER TABLE jobs ADD COLUMN input_mode TEXT DEFAULT 'NONE';`);
    } catch {
      // Column may already exist
    }

    try {
      this.db.exec(`ALTER TABLE jobs ADD COLUMN generation_count INTEGER DEFAULT 1;`);
    } catch {
      // Column may already exist
    }

    try {
      this.db.exec(`ALTER TABLE jobs ADD COLUMN download_quality TEXT DEFAULT '720p';`);
    } catch {
      // Column may already exist
    }

    try {
      this.db.exec(`ALTER TABLE jobs ADD COLUMN output_paths_json TEXT;`);
    } catch {
      // Column may already exist
    }

    try {
      this.db.exec(`ALTER TABLE jobs ADD COLUMN flow_project_id TEXT;`);
    } catch {
      // Column may already exist
    }

    try {
      this.db.exec(`ALTER TABLE jobs ADD COLUMN flow_project_url TEXT;`);
    } catch {
      // Column may already exist
    }
  }

  private static persist(): void {
    if (!this.db || !this.dbFilePath) return;
    try {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(this.dbFilePath, buffer);
    } catch (err) {
      Logger.error('Database', 'Failed writing database file to disk', null, null, { error: String(err) });
    }
  }

  // ================= ACCOUNT OPERATIONS =================

  public static getAccounts(): GoogleAccount[] {
    if (!this.db) return [];
    const stmt = this.db.prepare('SELECT * FROM accounts ORDER BY created_at DESC');
    const accounts: GoogleAccount[] = [];

    while (stmt.step()) {
      const row = stmt.getAsObject() as any;
      accounts.push({
        id: row.id,
        displayName: row.display_name,
        email: row.email || null,
        profilePath: row.profile_path,
        status: row.status as AccountStatus,
        browserStatus: row.browser_status as BrowserStatus,
        flowStatus: (row.flow_status || 'UNKNOWN') as any,
        flowUrl: row.flow_url || undefined,
        lastVerifiedAt: row.last_verified_at || null,
        lastActiveAt: row.last_active_at || null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        lastError: row.last_error || null,
        queueCount: row.queue_count || 0,
        currentJobName: row.current_job_name || null,
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined
      });
    }
    stmt.free();
    return accounts;
  }

  public static getAccount(id: string): GoogleAccount | null {
    if (!this.db) return null;
    const stmt = this.db.prepare('SELECT * FROM accounts WHERE id = :id');
    stmt.bind({ ':id': id });

    if (stmt.step()) {
      const row = stmt.getAsObject() as any;
      stmt.free();
      return {
        id: row.id,
        displayName: row.display_name,
        email: row.email || null,
        profilePath: row.profile_path,
        status: row.status as AccountStatus,
        browserStatus: row.browser_status as BrowserStatus,
        flowStatus: (row.flow_status || 'UNKNOWN') as any,
        flowUrl: row.flow_url || undefined,
        lastVerifiedAt: row.last_verified_at || null,
        lastActiveAt: row.last_active_at || null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        lastError: row.last_error || null,
        queueCount: row.queue_count || 0,
        currentJobName: row.current_job_name || null,
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined
      };
    }
    stmt.free();
    return null;
  }

  public static saveAccount(account: GoogleAccount): void {
    if (!this.db) return;

    this.db.run(
      `
      INSERT INTO accounts (
        id, display_name, email, profile_path, status, browser_status,
        flow_status, flow_url, last_verified_at, last_active_at, created_at, updated_at,
        last_error, queue_count, current_job_name, metadata
      ) VALUES (
        :id, :display_name, :email, :profile_path, :status, :browser_status,
        :flow_status, :flow_url, :last_verified_at, :last_active_at, :created_at, :updated_at,
        :last_error, :queue_count, :current_job_name, :metadata
      )
      ON CONFLICT(id) DO UPDATE SET
        display_name = excluded.display_name,
        email = excluded.email,
        profile_path = excluded.profile_path,
        status = excluded.status,
        browser_status = excluded.browser_status,
        flow_status = excluded.flow_status,
        flow_url = excluded.flow_url,
        last_verified_at = excluded.last_verified_at,
        last_active_at = excluded.last_active_at,
        updated_at = excluded.updated_at,
        last_error = excluded.last_error,
        queue_count = excluded.queue_count,
        current_job_name = excluded.current_job_name,
        metadata = excluded.metadata
    `,
      {
        ':id': account.id,
        ':display_name': account.displayName,
        ':email': account.email || null,
        ':profile_path': account.profilePath,
        ':status': account.status,
        ':browser_status': account.browserStatus,
        ':flow_status': account.flowStatus || 'UNKNOWN',
        ':flow_url': account.flowUrl || null,
        ':last_verified_at': account.lastVerifiedAt || null,
        ':last_active_at': account.lastActiveAt || null,
        ':created_at': account.createdAt,
        ':updated_at': account.updatedAt,
        ':last_error': account.lastError || null,
        ':queue_count': account.queueCount ?? 0,
        ':current_job_name': account.currentJobName || null,
        ':metadata': account.metadata ? JSON.stringify(account.metadata) : null
      }
    );

    this.persist();
  }

  public static deleteAccount(id: string): void {
    if (!this.db) return;
    this.db.run('DELETE FROM accounts WHERE id = :id', { ':id': id });
    this.persist();
  }

  // ================= PROJECT OPERATIONS =================

  public static getProjects(): Project[] {
    if (!this.db) return [];
    const stmt = this.db.prepare('SELECT * FROM projects ORDER BY created_at DESC');
    const projects: Project[] = [];

    while (stmt.step()) {
      const row = stmt.getAsObject() as any;
      projects.push({
        id: row.id,
        name: row.name,
        description: row.description,
        sourcePrompt: row.source_prompt,
        status: row.status,
        outputDirectory: row.output_directory,
        totalShots: row.total_shots,
        completedShots: row.completed_shots,
        failedShots: row.failed_shots,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        shots: row.shots_json ? JSON.parse(row.shots_json) : [],
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined
      });
    }
    stmt.free();
    return projects;
  }

  public static getProject(id: string): Project | null {
    if (!this.db) return null;
    const stmt = this.db.prepare('SELECT * FROM projects WHERE id = :id');
    stmt.bind({ ':id': id });

    if (stmt.step()) {
      const row = stmt.getAsObject() as any;
      stmt.free();
      return {
        id: row.id,
        name: row.name,
        description: row.description,
        sourcePrompt: row.source_prompt,
        status: row.status,
        outputDirectory: row.output_directory,
        totalShots: row.total_shots,
        completedShots: row.completed_shots,
        failedShots: row.failed_shots,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        shots: row.shots_json ? JSON.parse(row.shots_json) : [],
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined
      };
    }
    stmt.free();
    return null;
  }

  public static saveProject(project: Project): void {
    if (!this.db) return;

    this.db.run(
      `
      INSERT INTO projects (
        id, name, description, source_prompt, status, output_directory,
        total_shots, completed_shots, failed_shots, created_at, updated_at,
        shots_json, metadata
      ) VALUES (
        :id, :name, :description, :source_prompt, :status, :output_directory,
        :total_shots, :completed_shots, :failed_shots, :created_at, :updated_at,
        :shots_json, :metadata
      )
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        description = excluded.description,
        source_prompt = excluded.source_prompt,
        status = excluded.status,
        output_directory = excluded.output_directory,
        total_shots = excluded.total_shots,
        completed_shots = excluded.completed_shots,
        failed_shots = excluded.failed_shots,
        updated_at = excluded.updated_at,
        shots_json = excluded.shots_json,
        metadata = excluded.metadata
    `,
      {
        ':id': project.id,
        ':name': project.name,
        ':description': project.description || '',
        ':source_prompt': project.sourcePrompt || '',
        ':status': project.status || 'DRAFT',
        ':output_directory': project.outputDirectory || '',
        ':total_shots': project.totalShots ?? 0,
        ':completed_shots': project.completedShots ?? 0,
        ':failed_shots': project.failedShots ?? 0,
        ':created_at': project.createdAt || new Date().toISOString(),
        ':updated_at': project.updatedAt || new Date().toISOString(),
        ':shots_json': JSON.stringify(project.shots || []),
        ':metadata': project.metadata ? JSON.stringify(project.metadata) : null
      }
    );

    this.persist();
  }

  public static deleteProject(id: string): void {
    if (!this.db) return;
    this.db.run('DELETE FROM projects WHERE id = :id', { ':id': id });
    this.db.run('DELETE FROM jobs WHERE project_id = :id', { ':id': id });
    this.persist();
  }

  // ================= JOB OPERATIONS =================

  public static getJobs(projectId?: string): Job[] {
    if (!this.db) return [];
    let query = 'SELECT * FROM jobs ORDER BY created_at ASC';
    const params: any = {};

    if (projectId) {
      query = 'SELECT * FROM jobs WHERE project_id = :project_id ORDER BY created_at ASC';
      params[':project_id'] = projectId;
    }

    const stmt = this.db.prepare(query);
    if (projectId) stmt.bind(params);

    const jobs: Job[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject() as any;
      jobs.push({
        jobId: row.job_id,
        projectId: row.project_id,
        shotId: row.shot_id,
        prompt: row.prompt,
        generationType: (row.generation_type || 'VIDEO') as any,
        inputMode: (row.input_mode || 'NONE') as any,
        model: row.model || null,
        duration: row.duration,
        aspectRatio: row.aspect_ratio,
        generationCount: row.generation_count || 1,
        downloadQuality: row.download_quality || '720p',
        status: row.status as JobStatus,
        statusDetail: row.status_detail || null,
        progress: row.progress,
        assignedAccountId: row.assigned_account_id || null,
        assignedWorkerId: row.worker_id || null,
        workerId: row.worker_id || null,
        createdAt: row.created_at,
        startedAt: row.started_at || null,
        completedAt: row.completed_at || null,
        retryCount: row.retry_count,
        maxRetries: row.max_retries,
        outputPath: row.output_path || null,
        outputPaths: row.output_paths_json ? JSON.parse(row.output_paths_json) : undefined,
        flowProjectId: row.flow_project_id || null,
        flowProjectUrl: row.flow_project_url || null,
        error: row.error || null,
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined
      });
    }
    stmt.free();
    return jobs;
  }

  public static getJob(jobId: string): Job | null {
    if (!this.db) return null;
    const stmt = this.db.prepare('SELECT * FROM jobs WHERE job_id = :job_id');
    stmt.bind({ ':job_id': jobId });

    if (stmt.step()) {
      const row = stmt.getAsObject() as any;
      stmt.free();
      return {
        jobId: row.job_id,
        projectId: row.project_id,
        shotId: row.shot_id,
        prompt: row.prompt,
        generationType: (row.generation_type || 'VIDEO') as any,
        inputMode: (row.input_mode || 'NONE') as any,
        model: row.model || null,
        duration: row.duration,
        aspectRatio: row.aspect_ratio,
        generationCount: row.generation_count || 1,
        downloadQuality: row.download_quality || '720p',
        status: row.status as JobStatus,
        statusDetail: row.status_detail || null,
        progress: row.progress,
        assignedAccountId: row.assigned_account_id || null,
        assignedWorkerId: row.worker_id || null,
        workerId: row.worker_id || null,
        createdAt: row.created_at,
        startedAt: row.started_at || null,
        completedAt: row.completed_at || null,
        retryCount: row.retry_count,
        maxRetries: row.max_retries,
        outputPath: row.output_path || null,
        outputPaths: row.output_paths_json ? JSON.parse(row.output_paths_json) : undefined,
        flowProjectId: row.flow_project_id || null,
        flowProjectUrl: row.flow_project_url || null,
        error: row.error || null,
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined
      };
    }
    stmt.free();
    return null;
  }

  public static saveJob(job: Job): void {
    if (!this.db) return;

    this.db.run(
      `
      INSERT INTO jobs (
        job_id, project_id, shot_id, prompt, generation_type, input_mode, model, duration, aspect_ratio,
        generation_count, download_quality, status, status_detail, progress, assigned_account_id, worker_id, created_at,
        started_at, completed_at, retry_count, max_retries, output_path, output_paths_json, flow_project_id, flow_project_url,
        error, metadata
      ) VALUES (
        :job_id, :project_id, :shot_id, :prompt, :generation_type, :input_mode, :model, :duration, :aspect_ratio,
        :generation_count, :download_quality, :status, :status_detail, :progress, :assigned_account_id, :worker_id, :created_at,
        :started_at, :completed_at, :retry_count, :max_retries, :output_path, :output_paths_json, :flow_project_id, :flow_project_url,
        :error, :metadata
      )
      ON CONFLICT(job_id) DO UPDATE SET
        generation_type = excluded.generation_type,
        input_mode = excluded.input_mode,
        model = excluded.model,
        duration = excluded.duration,
        aspect_ratio = excluded.aspect_ratio,
        generation_count = excluded.generation_count,
        download_quality = excluded.download_quality,
        status = excluded.status,
        status_detail = excluded.status_detail,
        progress = excluded.progress,
        assigned_account_id = excluded.assigned_account_id,
        worker_id = excluded.worker_id,
        started_at = excluded.started_at,
        completed_at = excluded.completed_at,
        retry_count = excluded.retry_count,
        max_retries = excluded.max_retries,
        output_path = excluded.output_path,
        output_paths_json = excluded.output_paths_json,
        flow_project_id = excluded.flow_project_id,
        flow_project_url = excluded.flow_project_url,
        error = excluded.error,
        metadata = excluded.metadata
    `,
      {
        ':job_id': job.jobId,
        ':project_id': job.projectId,
        ':shot_id': job.shotId,
        ':prompt': job.prompt,
        ':generation_type': job.generationType || 'VIDEO',
        ':input_mode': job.inputMode || 'NONE',
        ':model': job.model || null,
        ':duration': job.duration ?? 10,
        ':aspect_ratio': job.aspectRatio || '16:9',
        ':generation_count': job.generationCount || 1,
        ':download_quality': job.downloadQuality || '720p',
        ':status': job.status,
        ':status_detail': job.statusDetail || null,
        ':progress': job.progress ?? 0,
        ':assigned_account_id': job.assignedAccountId || null,
        ':worker_id': job.assignedWorkerId || job.workerId || null,
        ':created_at': job.createdAt,
        ':started_at': job.startedAt || null,
        ':completed_at': job.completedAt || null,
        ':retry_count': job.retryCount ?? 0,
        ':max_retries': job.maxRetries ?? 3,
        ':output_path': job.outputPath || null,
        ':output_paths_json': job.outputPaths ? JSON.stringify(job.outputPaths) : null,
        ':flow_project_id': job.flowProjectId || null,
        ':flow_project_url': job.flowProjectUrl || null,
        ':error': job.error || null,
        ':metadata': job.metadata ? JSON.stringify(job.metadata) : null
      }
    );

    this.persist();
  }

  public static deleteJob(jobId: string): void {
    if (!this.db) return;
    this.db.run('DELETE FROM jobs WHERE job_id = :job_id', { ':job_id': jobId });
    this.persist();
  }

  // ================= FLOW PROJECT OPERATIONS =================

  public static saveFlowProject(record: any): void {
    if (!this.db) return;
    this.db.run(
      `
      INSERT INTO flow_projects (
        flow_project_id, application_project_id, account_id, flow_project_name,
        flow_project_url, flow_project_status, created_at, last_used_at, metadata
      ) VALUES (
        :flow_project_id, :application_project_id, :account_id, :flow_project_name,
        :flow_project_url, :flow_project_status, :created_at, :last_used_at, :metadata
      )
      ON CONFLICT(flow_project_id) DO UPDATE SET
        flow_project_name = excluded.flow_project_name,
        flow_project_url = excluded.flow_project_url,
        flow_project_status = excluded.flow_project_status,
        last_used_at = excluded.last_used_at,
        metadata = excluded.metadata
    `,
      {
        ':flow_project_id': record.flowProjectId,
        ':application_project_id': record.applicationProjectId,
        ':account_id': record.accountId,
        ':flow_project_name': record.flowProjectName,
        ':flow_project_url': record.flowProjectUrl || null,
        ':flow_project_status': record.flowProjectStatus || 'READY',
        ':created_at': record.createdAt,
        ':last_used_at': record.lastUsedAt,
        ':metadata': record.metadata ? JSON.stringify(record.metadata) : null
      }
    );
    this.persist();
  }

  public static getFlowProject(flowProjectId: string): any | null {
    if (!this.db) return null;
    const stmt = this.db.prepare('SELECT * FROM flow_projects WHERE flow_project_id = :flow_project_id');
    stmt.bind({ ':flow_project_id': flowProjectId });

    if (stmt.step()) {
      const row = stmt.getAsObject() as any;
      stmt.free();
      return {
        flowProjectId: row.flow_project_id,
        applicationProjectId: row.application_project_id,
        accountId: row.account_id,
        flowProjectName: row.flow_project_name,
        flowProjectUrl: row.flow_project_url || null,
        flowProjectStatus: row.flow_project_status,
        createdAt: row.created_at,
        lastUsedAt: row.last_used_at,
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined
      };
    }
    stmt.free();
    return null;
  }

  public static getFlowProjectForApp(applicationProjectId: string, accountId: string): any | null {
    if (!this.db) return null;
    const stmt = this.db.prepare(
      'SELECT * FROM flow_projects WHERE application_project_id = :app_id AND account_id = :account_id ORDER BY last_used_at DESC LIMIT 1'
    );
    stmt.bind({ ':app_id': applicationProjectId, ':account_id': accountId });

    if (stmt.step()) {
      const row = stmt.getAsObject() as any;
      stmt.free();
      return {
        flowProjectId: row.flow_project_id,
        applicationProjectId: row.application_project_id,
        accountId: row.account_id,
        flowProjectName: row.flow_project_name,
        flowProjectUrl: row.flow_project_url || null,
        flowProjectStatus: row.flow_project_status,
        createdAt: row.created_at,
        lastUsedAt: row.last_used_at,
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined
      };
    }
    stmt.free();
    return null;
  }

  public static deleteFlowProject(flowProjectId: string): void {
    if (!this.db) return;
    this.db.run('DELETE FROM flow_projects WHERE flow_project_id = :id', { ':id': flowProjectId });
    this.persist();
  }

  // ================= LOG OPERATIONS =================

  public static saveActivityLog(entry: ActivityLogEntry): void {
    if (!this.db) return;
    this.db.run(
      `
      INSERT INTO activity_logs (id, timestamp, severity, component, account_id, job_id, message, metadata)
      VALUES (:id, :timestamp, :severity, :component, :account_id, :job_id, :message, :metadata)
    `,
      {
        ':id': entry.id,
        ':timestamp': entry.timestamp,
        ':severity': entry.severity,
        ':component': entry.component,
        ':account_id': entry.accountId || null,
        ':job_id': entry.jobId || null,
        ':message': entry.message,
        ':metadata': entry.metadata ? JSON.stringify(entry.metadata) : null
      }
    );
    this.persist();
  }

  public static getActivityLogs(limit = 100): ActivityLogEntry[] {
    if (!this.db) return [];
    const stmt = this.db.prepare('SELECT * FROM activity_logs ORDER BY timestamp DESC LIMIT :limit');
    stmt.bind({ ':limit': limit });
    const logs: ActivityLogEntry[] = [];

    while (stmt.step()) {
      const row = stmt.getAsObject() as any;
      logs.push({
        id: row.id,
        timestamp: row.timestamp,
        severity: row.severity,
        component: row.component,
        accountId: row.account_id || null,
        jobId: row.job_id || null,
        message: row.message,
        metadata: row.metadata ? JSON.parse(row.metadata) : undefined
      });
    }
    stmt.free();
    return logs;
  }

  public static clearActivityLogs(): void {
    if (!this.db) return;
    this.db.run('DELETE FROM activity_logs');
    this.persist();
  }

  // ================= SETTINGS OPERATIONS =================

  public static getSettings(): AppSettings {
    if (!this.db) return DEFAULT_SETTINGS;
    const stmt = this.db.prepare('SELECT key, value FROM settings');
    const settings: Partial<AppSettings> = {};

    while (stmt.step()) {
      const row = stmt.getAsObject() as { key: string; value: string };
      try {
        (settings as any)[row.key] = JSON.parse(row.value);
      } catch {
        (settings as any)[row.key] = row.value;
      }
    }
    stmt.free();

    return { ...DEFAULT_SETTINGS, ...settings };
  }

  public static saveSettings(settings: Partial<AppSettings>): AppSettings {
    if (!this.db) return DEFAULT_SETTINGS;
    const current = this.getSettings();
    const updated = { ...current, ...settings };

    for (const [key, value] of Object.entries(updated)) {
      this.db.run(
        `
        INSERT INTO settings (key, value) VALUES (:key, :value)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `,
        {
          ':key': key,
          ':value': JSON.stringify(value)
        }
      );
    }
    this.persist();
    return updated;
  }
}
