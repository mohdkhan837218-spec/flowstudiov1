import { app, BrowserWindow, shell } from 'electron';
import path from 'path';
import { PathSecurity } from './security/paths';
import { Logger } from './logging/logger';
import { AppDatabase } from './database/db';
import { registerAllIpc } from './ipc';
import { BrowserManager } from './managers/BrowserManager';
import { JobManager } from './managers/JobManager';
import { QueueManager } from './managers/QueueManager';

let mainWindow: BrowserWindow | null = null;

async function createWindow(): Promise<BrowserWindow> {
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1080,
    minHeight: 700,
    backgroundColor: '#090d16',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#090d16',
      symbolColor: '#94a3b8',
      height: 38
    },
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      devTools: isDev
    }
  });

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  if (isDev && process.env['VITE_DEV_SERVER_URL']) {
    await mainWindow.loadURL(process.env['VITE_DEV_SERVER_URL']);
  } else if (isDev) {
    await mainWindow.loadURL('http://localhost:5173');
  } else {
    await mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    PathSecurity.initialize();
    Logger.initialize();
    await AppDatabase.initialize();
    
    // Crash recovery scan
    JobManager.recoverDanglingJobs();
    
    registerAllIpc();
    QueueManager.initialize();

    Logger.info('App', 'Flow Workspace starting up');
    await createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });

  app.on('window-all-closed', async () => {
    QueueManager.stop();
    await BrowserManager.closeAll();
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('before-quit', async () => {
    QueueManager.stop();
    await BrowserManager.closeAll();
  });
}
