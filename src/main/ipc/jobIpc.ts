import { ipcMain } from 'electron';
import { JobManager } from '../managers/JobManager';

export function registerJobIpc(): void {
  ipcMain.handle('jobs:list', async (_event, projectId?: string) => {
    return JobManager.listJobs(projectId);
  });

  ipcMain.handle('jobs:get', async (_event, jobId: string) => {
    return JobManager.getJob(jobId);
  });

  ipcMain.handle('jobs:cancel', async (_event, jobId: string) => {
    const success = JobManager.cancelJob(jobId);
    return { success };
  });

  ipcMain.handle('jobs:retry', async (_event, jobId: string) => {
    const success = JobManager.retryJob(jobId);
    return { success };
  });
}
