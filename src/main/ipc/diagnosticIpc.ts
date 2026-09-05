import { ipcMain } from 'electron';
import { FlowDiagnosticBundle } from '../diagnostics/FlowDiagnosticBundle';
import { JobManager } from '../managers/JobManager';
import { QueueManager } from '../managers/QueueManager';
import { Logger } from '../logging/logger';

export function registerDiagnosticIpc(): void {
  ipcMain.handle('diagnostics:get-job-error', async (_, identifier: string) => {
    try {
      const error = FlowDiagnosticBundle.getError(identifier);
      if (error) return { success: true, error };

      const job = JobManager.getJob(identifier);
      if (job?.diagnosticError) {
        return { success: true, error: job.diagnosticError };
      }

      return { success: false, message: 'No diagnostic error found for this identifier' };
    } catch (err: any) {
      Logger.error('diagnosticIpc', `get-job-error failed: ${err.message}`);
      return { success: false, message: err.message };
    }
  });

  ipcMain.handle('diagnostics:list-errors', async () => {
    try {
      const errors = FlowDiagnosticBundle.listErrors();
      return { success: true, errors };
    } catch (err: any) {
      return { success: false, message: err.message, errors: [] };
    }
  });

  ipcMain.handle('diagnostics:export-bundle', async (_, errorId: string) => {
    try {
      const bundlePath = FlowDiagnosticBundle.exportDebugBundle(errorId);
      return { success: true, bundlePath };
    } catch (err: any) {
      Logger.error('diagnosticIpc', `export-bundle failed: ${err.message}`);
      return { success: false, message: err.message };
    }
  });

  ipcMain.handle('diagnostics:retry-job', async (_, jobId: string) => {
    try {
      const job = JobManager.getJob(jobId);
      if (!job) return { success: false, message: `Job ${jobId} not found` };

      JobManager.updateJob(jobId, {
        status: 'QUEUED',
        statusDetail: 'Manually re-queued from diagnostic console',
        progress: 0,
        error: null,
        diagnosticError: null
      });
      QueueManager.process();
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  });

  ipcMain.handle('diagnostics:simulate-error', async (_, type: string) => {
    try {
      const error = FlowDiagnosticBundle.simulateDiagnosticError(type);
      return { success: true, error };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  });

  ipcMain.handle('diagnostics:clear-history', async () => {
    try {
      FlowDiagnosticBundle.clearHistory();
      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  });
}
