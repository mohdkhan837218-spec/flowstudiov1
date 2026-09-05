import { ipcMain, dialog, BrowserWindow } from 'electron';
import { AppDatabase } from '../database/db';
import { AppSettings } from '../../shared/types/settings';

export function registerSettingsIpc(): void {
  ipcMain.handle('settings:get', async () => {
    return AppDatabase.getSettings();
  });

  ipcMain.handle('settings:update', async (_event, patch: Partial<AppSettings>) => {
    return AppDatabase.saveSettings(patch);
  });

  ipcMain.handle('settings:selectDownloadDirectory', async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    const result = await dialog.showOpenDialog(window || undefined as any, {
      properties: ['openDirectory', 'createDirectory'],
      title: 'Select Video Download Folder'
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    const selected = result.filePaths[0];
    AppDatabase.saveSettings({ downloadDirectory: selected });
    return selected;
  });
}
