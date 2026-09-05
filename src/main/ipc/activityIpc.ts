import { ipcMain } from 'electron';
import { AppDatabase } from '../database/db';

export function registerActivityIpc(): void {
  ipcMain.handle('activity:list', async (_event, limit?: number) => {
    return AppDatabase.getActivityLogs(limit || 200);
  });

  ipcMain.handle('activity:clear', async () => {
    AppDatabase.clearActivityLogs();
    return true;
  });
}
