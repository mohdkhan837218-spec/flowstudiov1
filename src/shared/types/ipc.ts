import { GoogleAccount, CreateAccountInput, UpdateAccountInput, AccountStatus } from './account';
import { AppSettings } from './settings';
import { ActivityLogEntry } from './activity';
import { Project, CreateProjectInput, ShotPlanItem } from './project';
import { Job, WorkerSession, QueueSummary } from './job';
import { GenerationMedia, LiveGenerationStats } from './preview';

export interface FlowWorkspaceAPI {
  accounts: {
    list: () => Promise<GoogleAccount[]>;
    get: (id: string) => Promise<GoogleAccount | null>;
    create: (input: CreateAccountInput) => Promise<GoogleAccount>;
    connect: (id: string) => Promise<{ success: boolean; error?: string }>;
    open: (id: string) => Promise<{ success: boolean; error?: string }>;
    close: (id: string) => Promise<{ success: boolean; error?: string }>;
    pause: (id: string) => Promise<{ success: boolean; error?: string }>;
    resume: (id: string) => Promise<{ success: boolean; error?: string }>;
    remove: (id: string) => Promise<{ success: boolean; error?: string }>;
    openFlow: (id: string) => Promise<{ success: boolean; state: string; error?: string }>;
    checkFlow: (id: string) => Promise<{ state: string }>;
    getStatus: (id: string) => Promise<{ status: AccountStatus; browserStatus: string; flowStatus?: string }>;
  };
  projects: {
    list: () => Promise<Project[]>;
    get: (id: string) => Promise<Project | null>;
    create: (input: CreateProjectInput) => Promise<Project>;
    delete: (id: string) => Promise<{ success: boolean; error?: string }>;
    enqueue: (projectId: string) => Promise<{ success: boolean; jobsCount: number }>;
  };
  jobs: {
    list: (projectId?: string) => Promise<Job[]>;
    get: (jobId: string) => Promise<Job | null>;
    cancel: (jobId: string) => Promise<{ success: boolean }>;
    retry: (jobId: string) => Promise<{ success: boolean }>;
  };
  queue: {
    getSummary: () => Promise<QueueSummary>;
    pause: () => Promise<{ success: boolean }>;
    resume: () => Promise<{ success: boolean }>;
    clear: () => Promise<{ success: boolean }>;
    process: () => Promise<{ success: boolean }>;
  };
  workers: {
    list: () => Promise<WorkerSession[]>;
  };
  preview: {
    getActive: () => Promise<GenerationMedia[]>;
    getRecent: (limit?: number) => Promise<GenerationMedia[]>;
    getById: (jobId: string) => Promise<GenerationMedia | null>;
    getStats: () => Promise<LiveGenerationStats>;
    remove: (jobId: string) => Promise<{ success: boolean }>;
    getMediaDataUrl: (filePath: string) => Promise<string | null>;
  };
  groq: {
    decomposePrompt: (prompt: string, numShots?: number) => Promise<{
      projectName: string;
      description: string;
      shots: ShotPlanItem[];
    }>;
  };
  generation: {
    getCapabilities: (accountId?: string) => Promise<import('./generation').FlowCapabilities>;
    refreshCapabilities: (accountId: string) => Promise<import('./generation').FlowCapabilities>;
    inspectWorkspace: (accountId: string) => Promise<any>;
    openNewProject: (accountId: string) => Promise<{ success: boolean; state: string; error?: string }>;
    createDirectJob: (input: import('./generation').CreateDirectJobInput) => Promise<Job>;
  };
  diagnostics: {
    getJobError: (identifier: string) => Promise<{ success: boolean; error?: import('./diagnostics').FlowDiagnosticError; message?: string }>;
    listErrors: () => Promise<{ success: boolean; errors: import('./diagnostics').FlowDiagnosticError[]; message?: string }>;
    exportBundle: (errorId: string) => Promise<{ success: boolean; bundlePath?: string; message?: string }>;
    retryJob: (jobId: string) => Promise<{ success: boolean; message?: string }>;
    simulateError: (type: string) => Promise<{ success: boolean; error?: import('./diagnostics').FlowDiagnosticError; message?: string }>;
    clearHistory: () => Promise<{ success: boolean; message?: string }>;
  };
  activity: {
    list: (limit?: number) => Promise<ActivityLogEntry[]>;
    clear: () => Promise<boolean>;
  };
  settings: {
    get: () => Promise<AppSettings>;
    update: (patch: Partial<AppSettings>) => Promise<AppSettings>;
    selectDownloadDirectory: () => Promise<string | null>;
  };
  events: {
    onAccountUpdated: (callback: (account: GoogleAccount) => void) => () => void;
    onAccountRemoved: (callback: (accountId: string) => void) => () => void;
    onActivityLog: (callback: (log: ActivityLogEntry) => void) => () => void;
    onTerminalLog: (callback: (log: ActivityLogEntry) => void) => () => void;
    onJobUpdated: (callback: (job: Job) => void) => () => void;
    onWorkerUpdated: (callback: (worker: WorkerSession) => void) => () => void;
    onQueueUpdated: (callback: (summary: QueueSummary) => void) => () => void;
    onGenerationUpdated: (callback: (media: GenerationMedia) => void) => () => void;
    onGenerationRemoved: (callback: (jobId: string) => void) => () => void;
  };
}

declare global {
  interface Window {
    flowWorkspace: FlowWorkspaceAPI;
  }
}
