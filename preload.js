const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getAccounts: () => ipcRenderer.invoke('get-accounts'),
  addAccount: (name) => ipcRenderer.invoke('add-account', name),
  deleteAccount: (id) => ipcRenderer.invoke('delete-account', id),
  openLoginWindow: (id) => ipcRenderer.invoke('open-login-window', id),
  saveAccountsState: (accounts) => ipcRenderer.invoke('save-accounts-state', accounts),
  refreshAccountCredits: (id) => ipcRenderer.invoke('refresh-account-credits', id),
  refreshAllCredits: () => ipcRenderer.invoke('refresh-all-credits'),

  selectFolder: () => ipcRenderer.invoke('select-folder'),
  selectImageFile: () => ipcRenderer.invoke('select-image-file'),
  selectMultipleImages: () => ipcRenderer.invoke('select-multiple-images'),
  getDefaultDownloadPath: () => ipcRenderer.invoke('get-default-download-path'),
  openFolder: (path) => ipcRenderer.invoke('open-folder', path),
  readVideoBinary: (filePath) => ipcRenderer.invoke('read-video-binary', filePath),
  readVideoDataUrl: (filePath) => ipcRenderer.invoke('read-video-data-url', filePath),
  scanDownloadFolder: (folderPath) => ipcRenderer.invoke('scan-download-folder', folderPath),
  scanImageFolder: (folderPath) => ipcRenderer.invoke('scan-image-folder', folderPath),
  deleteVideoFile: (filePath) => ipcRenderer.invoke('delete-video-file', filePath),
  
  startAutomation: (config) => ipcRenderer.invoke('start-automation', config),
  stopAutomation: () => ipcRenderer.invoke('stop-automation'),
  pauseAutomation: () => ipcRenderer.invoke('pause-automation'),
  resumeAutomation: () => ipcRenderer.invoke('resume-automation'),
  
  onLog: (callback) => ipcRenderer.on('automation-log', (event, data) => callback(data)),
  onProgress: (callback) => ipcRenderer.on('automation-progress', (event, data) => callback(data)),
  
  // Real-time Video Rendering Lifecycle
  onVideoStarted: (callback) => ipcRenderer.on('video-started', (event, data) => callback(data)),
  onVideoRenderingTick: (callback) => ipcRenderer.on('video-rendering-tick', (event, data) => callback(data)),
  onVideoCompleted: (callback) => ipcRenderer.on('video-completed', (event, data) => callback(data)),
  
  // Real-time Account Login Event
  onAccountLoggedIn: (callback) => ipcRenderer.on('account-logged-in', (event, data) => callback(data))
});
