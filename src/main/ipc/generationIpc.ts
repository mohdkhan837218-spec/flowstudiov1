import { ipcMain } from 'electron';
import { FlowCapabilityDetector } from '../providers/FlowCapabilityDetector';
import { FlowProvider } from '../providers/FlowProvider';
import { JobManager } from '../managers/JobManager';
import { CreateDirectJobInput } from '../../shared/types/generation';

export function registerGenerationIpc(): void {
  ipcMain.handle('capabilities:get', async (_event, accountId?: string) => {
    return FlowCapabilityDetector.getCachedCapabilities(accountId || 'default');
  });

  ipcMain.handle('capabilities:refresh', async (_event, accountId: string) => {
    return await FlowProvider.refreshCapabilities(accountId);
  });

  ipcMain.handle('capabilities:inspect', async (_event, accountId: string) => {
    return await FlowProvider.inspectWorkspace(accountId);
  });

  ipcMain.handle('capabilities:openNewProject', async (_event, accountId: string) => {
    return await FlowProvider.openNewProjectForAccount(accountId);
  });

  ipcMain.handle('jobs:createDirect', async (_event, input: CreateDirectJobInput) => {
    return JobManager.createDirectJob(input);
  });
}
