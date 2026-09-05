import { ipcMain } from 'electron';
import { QueueManager } from '../managers/QueueManager';
import { WorkerManager } from '../managers/WorkerManager';

export function registerQueueIpc(): void {
  ipcMain.handle('queue:getSummary', async () => {
    return QueueManager.getSummary();
  });

  ipcMain.handle('queue:pause', async () => {
    const success = QueueManager.pause();
    return { success };
  });

  ipcMain.handle('queue:resume', async () => {
    const success = QueueManager.resume();
    return { success };
  });

  ipcMain.handle('queue:clear', async () => {
    const success = QueueManager.clear();
    return { success };
  });

  ipcMain.handle('queue:process', async () => {
    QueueManager.process();
    return { success: true };
  });

  ipcMain.handle('workers:list', async () => {
    return WorkerManager.listWorkers();
  });
}
