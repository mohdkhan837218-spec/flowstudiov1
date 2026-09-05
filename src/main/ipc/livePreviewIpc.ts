import { ipcMain } from 'electron';
import { LivePreviewManager } from '../preview/LivePreviewManager';

export function registerLivePreviewIpc(): void {
  ipcMain.handle('preview:getActive', async () => {
    return LivePreviewManager.getActiveGenerations();
  });

  ipcMain.handle('preview:getRecent', async (_event, limit?: number) => {
    return LivePreviewManager.getRecentGenerations(limit);
  });

  ipcMain.handle('preview:getById', async (_event, jobId: string) => {
    return LivePreviewManager.getById(jobId);
  });

  ipcMain.handle('preview:getStats', async () => {
    return LivePreviewManager.getStats();
  });

  ipcMain.handle('preview:remove', async (_event, jobId: string) => {
    const success = LivePreviewManager.remove(jobId);
    return { success };
  });

  ipcMain.handle('preview:getMediaDataUrl', async (_event, filePath: string) => {
    return await LivePreviewManager.getMediaDataUrl(filePath);
  });
}
