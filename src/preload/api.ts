import { ipcRenderer } from 'electron';
import { FlowWorkspaceAPI } from '../shared/types/ipc';
import { CreateAccountInput, GoogleAccount } from '../shared/types/account';
import { AppSettings } from '../shared/types/settings';
import { ActivityLogEntry } from '../shared/types/activity';
import { CreateProjectInput, Project } from '../shared/types/project';
import { Job, WorkerSession, QueueSummary } from '../shared/types/job';
import { GenerationMedia } from '../shared/types/preview';

export const flowWorkspaceAPI: FlowWorkspaceAPI = {
  accounts: {
    list: () => ipcRenderer.invoke('accounts:list'),
    get: (id: string) => ipcRenderer.invoke('accounts:get', id),
    create: (input: CreateAccountInput) => ipcRenderer.invoke('accounts:create', input),
    connect: (id: string) => ipcRenderer.invoke('accounts:connect', id),
    open: (id: string) => ipcRenderer.invoke('accounts:open', id),
    close: (id: string) => ipcRenderer.invoke('accounts:close', id),
    pause: (id: string) => ipcRenderer.invoke('accounts:pause', id),
    resume: (id: string) => ipcRenderer.invoke('accounts:resume', id),
    remove: (id: string) => ipcRenderer.invoke('accounts:remove', id),
    openFlow: (id: string) => ipcRenderer.invoke('accounts:openFlow', id),
    checkFlow: (id: string) => ipcRenderer.invoke('accounts:checkFlow', id),
    getStatus: (id: string) => ipcRenderer.invoke('accounts:getStatus', id)
  },
  projects: {
    list: () => ipcRenderer.invoke('projects:list'),
    get: (id: string) => ipcRenderer.invoke('projects:get', id),
    create: (input: CreateProjectInput) => ipcRenderer.invoke('projects:create', input),
    delete: (id: string) => ipcRenderer.invoke('projects:delete', id),
    enqueue: (projectId: string) => ipcRenderer.invoke('projects:enqueue', projectId)
  },
  jobs: {
    list: (projectId?: string) => ipcRenderer.invoke('jobs:list', projectId),
    get: (jobId: string) => ipcRenderer.invoke('jobs:get', jobId),
    cancel: (jobId: string) => ipcRenderer.invoke('jobs:cancel', jobId),
    retry: (jobId: string) => ipcRenderer.invoke('jobs:retry', jobId)
  },
  queue: {
    getSummary: () => ipcRenderer.invoke('queue:getSummary'),
    pause: () => ipcRenderer.invoke('queue:pause'),
    resume: () => ipcRenderer.invoke('queue:resume'),
    clear: () => ipcRenderer.invoke('queue:clear'),
    process: () => ipcRenderer.invoke('queue:process')
  },
  workers: {
    list: () => ipcRenderer.invoke('workers:list')
  },
  preview: {
    getActive: () => ipcRenderer.invoke('preview:getActive'),
    getRecent: (limit?: number) => ipcRenderer.invoke('preview:getRecent', limit),
    getById: (jobId: string) => ipcRenderer.invoke('preview:getById', jobId),
    getStats: () => ipcRenderer.invoke('preview:getStats'),
    remove: (jobId: string) => ipcRenderer.invoke('preview:remove', jobId),
    getMediaDataUrl: (filePath: string) => ipcRenderer.invoke('preview:getMediaDataUrl', filePath)
  },
  groq: {
    decomposePrompt: (prompt: string, numShots?: number) =>
      ipcRenderer.invoke('groq:decomposePrompt', prompt, numShots)
  },
  generation: {
    getCapabilities: (accountId?: string) => ipcRenderer.invoke('capabilities:get', accountId),
    refreshCapabilities: (accountId: string) => ipcRenderer.invoke('capabilities:refresh', accountId),
    inspectWorkspace: (accountId: string) => ipcRenderer.invoke('capabilities:inspect', accountId),
    openNewProject: (accountId: string) => ipcRenderer.invoke('capabilities:openNewProject', accountId),
    createDirectJob: (input: any) => ipcRenderer.invoke('jobs:createDirect', input)
  },
  diagnostics: {
    getJobError: (identifier: string) => ipcRenderer.invoke('diagnostics:get-job-error', identifier),
    listErrors: () => ipcRenderer.invoke('diagnostics:list-errors'),
    exportBundle: (errorId: string) => ipcRenderer.invoke('diagnostics:export-bundle', errorId),
    retryJob: (jobId: string) => ipcRenderer.invoke('diagnostics:retry-job', jobId),
    simulateError: (type: string) => ipcRenderer.invoke('diagnostics:simulate-error', type),
    clearHistory: () => ipcRenderer.invoke('diagnostics:clear-history')
  },
  activity: {
    list: (limit?: number) => ipcRenderer.invoke('activity:list', limit),
    clear: () => ipcRenderer.invoke('activity:clear')
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    update: (patch: Partial<AppSettings>) => ipcRenderer.invoke('settings:update', patch),
    selectDownloadDirectory: () => ipcRenderer.invoke('settings:selectDownloadDirectory')
  },
  events: {
    onAccountUpdated: (callback: (account: GoogleAccount) => void) => {
      const handler = (_event: any, account: GoogleAccount) => callback(account);
      ipcRenderer.on('account:updated', handler);
      return () => {
        ipcRenderer.removeListener('account:updated', handler);
      };
    },
    onAccountRemoved: (callback: (accountId: string) => void) => {
      const handler = (_event: any, accountId: string) => callback(accountId);
      ipcRenderer.on('account:removed', handler);
      return () => {
        ipcRenderer.removeListener('account:removed', handler);
      };
    },
    onActivityLog: (callback: (log: ActivityLogEntry) => void) => {
      const handler = (_event: any, log: ActivityLogEntry) => callback(log);
      ipcRenderer.on('activity:log', handler);
      return () => {
        ipcRenderer.removeListener('activity:log', handler);
      };
    },
    onTerminalLog: (callback: (log: ActivityLogEntry) => void) => {
      const handler = (_event: any, log: ActivityLogEntry) => callback(log);
      ipcRenderer.on('terminal:log', handler);
      return () => {
        ipcRenderer.removeListener('terminal:log', handler);
      };
    },
    onJobUpdated: (callback: (job: Job) => void) => {
      const handler = (_event: any, job: Job) => callback(job);
      ipcRenderer.on('job:updated', handler);
      return () => {
        ipcRenderer.removeListener('job:updated', handler);
      };
    },
    onWorkerUpdated: (callback: (worker: WorkerSession) => void) => {
      const handler = (_event: any, worker: WorkerSession) => callback(worker);
      ipcRenderer.on('worker:updated', handler);
      return () => {
        ipcRenderer.removeListener('worker:updated', handler);
      };
    },
    onQueueUpdated: (callback: (summary: QueueSummary) => void) => {
      const handler = (_event: any, summary: QueueSummary) => callback(summary);
      ipcRenderer.on('queue:updated', handler);
      return () => {
        ipcRenderer.removeListener('queue:updated', handler);
      };
    },
    onGenerationUpdated: (callback: (media: GenerationMedia) => void) => {
      const handler = (_event: any, media: GenerationMedia) => callback(media);
      ipcRenderer.on('generation:updated', handler);
      return () => {
        ipcRenderer.removeListener('generation:updated', handler);
      };
    },
    onGenerationRemoved: (callback: (jobId: string) => void) => {
      const handler = (_event: any, jobId: string) => callback(jobId);
      ipcRenderer.on('generation:removed', handler);
      return () => {
        ipcRenderer.removeListener('generation:removed', handler);
      };
    }
  }
};
