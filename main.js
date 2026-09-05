const { app, BrowserWindow, ipcMain, dialog, shell, protocol, net } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { getAccounts, addAccount, deleteAccount, openLoginWindow, saveAccounts, fetchRealCredits, refreshAllAccountCredits } = require('./engine/accountStore');
const { FlowAutomationEngine } = require('./engine/flowAutomation');

let mainWindow = null;
let automationEngine = null;

// Register protocol privileges before app ready
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'local-video',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true
    }
  }
]);

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1300,
    height: 920,
    minWidth: 1000,
    minHeight: 700,
    backgroundColor: '#090c15',
    title: 'Google Flow Multi-Account Video Studio',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      // Local media is served through the dedicated `local-video` protocol below.
      // Keeping Chromium web security enabled protects the renderer IPC bridge.
      webSecurity: true
    },
    icon: path.join(__dirname, 'renderer', 'icon.png')
  });

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[RENDERER CONSOLE]: ${message}`);
  });

  // Enable Ctrl+R / F5 instant refresh & Ctrl+Shift+I devtools
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if ((input.control || input.meta) && input.key.toLowerCase() === 'r') {
      mainWindow.reload();
      event.preventDefault();
    }
    if (input.key === 'F5') {
      mainWindow.reload();
      event.preventDefault();
    }
    if ((input.control || input.meta) && input.shift && input.key.toLowerCase() === 'i') {
      mainWindow.webContents.toggleDevTools();
      event.preventDefault();
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  mainWindow.setMenuBarVisibility(false);

  // ⚡ Live Hot-Reload Watcher: Auto-reloads UI instantly when any file changes!
  const rendererDir = path.join(__dirname, 'renderer');
  if (fs.existsSync(rendererDir)) {
    fs.watch(rendererDir, { recursive: true }, (eventType, filename) => {
      if (filename && !filename.startsWith('.')) {
        console.log(`[HOT-RELOAD] Auto-refreshing UI for: ${filename}`);
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.reload();
        }
      }
    });
  }
}

const { pathToFileURL } = require('url');

app.whenReady().then(() => {
  // Protocol handler for local video and image streaming with range-request seeking
  try {
    protocol.handle('local-video', (request) => {
      try {
        let raw = request.url.replace(/^local-video:\/\//i, '');
        let decoded = decodeURIComponent(raw);
        // Windows drive fix: e.g. /C:/Users/... -> C:/Users/...
        if (/^\/[a-zA-Z]:/.test(decoded)) {
          decoded = decoded.substring(1);
        }
        if (fs.existsSync(decoded)) {
          return net.fetch(pathToFileURL(decoded).toString());
        }
        return new Response('File not found', { status: 404 });
      } catch (err) {
        console.error('local-video stream error:', err);
        return new Response('Media error', { status: 500 });
      }
    });
  } catch (e) {}

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (automationEngine) {
    automationEngine.stop();
  }
  if (process.platform !== 'darwin') app.quit();
});

// IPC Handlers
ipcMain.handle('get-accounts', async () => {
  return getAccounts();
});

ipcMain.handle('add-account', async (event, customName) => {
  return addAccount(customName);
});

ipcMain.handle('delete-account', async (event, id) => {
  return deleteAccount(id);
});

ipcMain.handle('open-login-window', async (event, id) => {
  return openLoginWindow(id, (res) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('account-logged-in', {
        accountId: id,
        result: res,
        accounts: getAccounts()
      });
    }
  });
});

ipcMain.handle('save-accounts-state', async (event, accounts) => {
  saveAccounts(accounts);
  return { success: true };
});

ipcMain.handle('refresh-account-credits', async (event, id) => {
  return fetchRealCredits(id);
});

ipcMain.handle('refresh-all-credits', async () => {
  return refreshAllAccountCredits();
});

ipcMain.handle('get-default-download-path', async () => {
  return path.join(os.homedir(), 'Downloads', 'GoogleFlow_Videos');
});

ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
    title: 'Select Master Video Download Folder'
  });
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('select-image-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'] }
    ],
    title: 'Select Reference / Frame Image'
  });
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }
  return null;
});

ipcMain.handle('select-multiple-images', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'] }
    ],
    title: 'Select Batch Reference Images (Multiple Files Supported)'
  });
  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths;
  }
  return [];
});

ipcMain.handle('open-folder', async (event, folderPath) => {
  if (folderPath) {
    shell.openPath(folderPath);
  }
  return true;
});

// Direct binary buffer streaming for Native GPU Blob Video Engine
ipcMain.handle('read-video-binary', async (event, filePath) => {
  try {
    if (filePath && fs.existsSync(filePath)) {
      return fs.readFileSync(filePath);
    }
  } catch (err) {
    console.error('Error reading video binary buffer:', err);
  }
  return null;
});

// Convert saved local video file directly to Data URL for instant in-app preview
ipcMain.handle('read-video-data-url', async (event, filePath) => {
  try {
    if (filePath && fs.existsSync(filePath)) {
      const videoBuffer = fs.readFileSync(filePath);
      return `data:video/mp4;base64,${videoBuffer.toString('base64')}`;
    }
  } catch (err) {
    console.error('Error reading video data URL:', err);
  }
  return null;
});

// Scan folder for existing generated MP4 videos
ipcMain.handle('scan-download-folder', async (event, folderPath) => {
  try {
    if (!folderPath || !fs.existsSync(folderPath)) {
      return [];
    }
    const files = fs.readdirSync(folderPath);
    const mp4Files = [];
    for (const f of files) {
      if (f.endsWith('.mp4')) {
        const fullPath = path.join(folderPath, f);
        const stats = fs.statSync(fullPath);
        mp4Files.push({
          fileName: f,
          filePath: fullPath,
          sizeBytes: stats.size,
          sizeMB: (stats.size / (1024 * 1024)).toFixed(2) + ' MB',
          createdAt: stats.birthtime,
          timestamp: stats.birthtime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          dateStr: stats.birthtime.toLocaleDateString()
        });
      }
    }
    // Sort descending by creation date
    return mp4Files.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } catch (err) {
    console.error('Error scanning folder:', err);
    return [];
  }
});

// Scan folder for existing generated PNG/JPG/WEBP images
ipcMain.handle('scan-image-folder', async (event, folderPath) => {
  try {
    if (!folderPath || !fs.existsSync(folderPath)) {
      return [];
    }
    const files = fs.readdirSync(folderPath);
    const imgFiles = [];
    for (const f of files) {
      const lower = f.toLowerCase();
      if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.webp')) {
        const fullPath = path.join(folderPath, f);
        const stats = fs.statSync(fullPath);
        imgFiles.push({
          fileName: f,
          filePath: fullPath,
          sizeBytes: stats.size,
          sizeMB: (stats.size / (1024 * 1024)).toFixed(2) + ' MB',
          createdAt: stats.birthtime,
          timestamp: stats.birthtime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          dateStr: stats.birthtime.toLocaleDateString()
        });
      }
    }
    return imgFiles.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } catch (err) {
    console.error('Error scanning image folder:', err);
    return [];
  }
});

// Delete a video/image file
ipcMain.handle('delete-video-file', async (event, filePath) => {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return { success: true };
    }
  } catch (err) {
    console.error('Error deleting file:', err);
  }
  return { success: false };
});

ipcMain.handle('start-automation', async (event, config) => {
  if (automationEngine) {
    automationEngine.stop();
  }

  console.log(`\n🚀 [MAIN]: Received start-automation request: ${config?.prompts?.length || 0} prompts, ${config?.accounts?.length || 0} accounts`);

  automationEngine = new FlowAutomationEngine({
    onLog: (logData) => {
      console.log(`[LOG ${logData.type}]: ${logData.message}`);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('automation-log', logData);
      }
    },
    onProgress: (progressData) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('automation-progress', progressData);
      }
    },
    onVideoStarted: (videoData) => {
      console.log(`[VIDEO STARTED]: ${videoData.id} - ${videoData.prompt.substring(0, 30)}...`);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('video-started', videoData);
      }
    },
    onVideoProgress: (progressData) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('video-rendering-tick', progressData);
      }
    },
    onVideoCompleted: (videoData) => {
      console.log(`[VIDEO COMPLETED]: ${videoData.id} -> ${videoData.filePath}`);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('video-completed', videoData);
      }
    }
  });

  automationEngine.runQueue(
    config.prompts,
    config.settings,
    config.downloadFolder,
    config.accounts
  ).catch(err => {
    console.error(`[QUEUE FATAL ERROR]:`, err);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('automation-log', {
        message: `Queue execution error: ${err.message}`,
        type: 'error',
        timestamp: new Date().toLocaleTimeString()
      });
    }
  });

  return { success: true };
});

ipcMain.handle('stop-automation', async () => {
  if (automationEngine) {
    automationEngine.stop();
    return { success: true };
  }
  return { success: false };
});

ipcMain.handle('pause-automation', async () => {
  if (automationEngine) {
    automationEngine.pause();
    return { success: true };
  }
  return { success: false };
});

ipcMain.handle('resume-automation', async () => {
  if (automationEngine) {
    automationEngine.resume();
    return { success: true };
  }
  return { success: false };
});
