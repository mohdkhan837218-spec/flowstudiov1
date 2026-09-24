const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Accounts & Proxies
  getAccounts: () => ipcRenderer.invoke('get-accounts'),
  addAccount: (name) => ipcRenderer.invoke('add-account', name),
  deleteAccount: (id) => ipcRenderer.invoke('delete-account', id),
  deleteAllAccounts: () => ipcRenderer.invoke('delete-all-accounts'),
  updateAccountCredits: (data) => ipcRenderer.invoke('update-account-credits', data),
  updateAccountProxy: (data) => ipcRenderer.invoke('update-account-proxy', data),
  openLoginWindow: (id) => ipcRenderer.invoke('open-login-window', id),
  saveAccountsState: (accounts) => ipcRenderer.invoke('save-accounts-state', accounts),
  refreshAccountCredits: (id) => ipcRenderer.invoke('refresh-account-credits', id),
  refreshAllCredits: () => ipcRenderer.invoke('refresh-all-credits'),
  getInstalledChromeProfiles: () => ipcRenderer.invoke('get-installed-chrome-profiles'),
  importInstalledChromeProfile: (data) => ipcRenderer.invoke('import-installed-chrome-profile', data),
  importAllInstalledChromeProfiles: () => ipcRenderer.invoke('import-all-installed-chrome-profiles'),

  // Portable Session Bundles
  exportSessionsBundle: () => ipcRenderer.invoke('export-sessions-bundle'),
  importSessionsBundle: () => ipcRenderer.invoke('import-sessions-bundle'),

  // Files & Media
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  selectImageFile: () => ipcRenderer.invoke('select-image-file'),
  selectMultipleImages: () => ipcRenderer.invoke('select-multiple-images'),
  getDefaultDownloadPath: () => ipcRenderer.invoke('get-default-download-path'),
  openFolder: (path) => ipcRenderer.invoke('open-folder', path),
  readVideoBinary: (filePath) => ipcRenderer.invoke('read-video-binary', filePath),
  scanDownloadFolder: (folderPath) => ipcRenderer.invoke('scan-download-folder', folderPath),
  scanImageFolder: (folderPath) => ipcRenderer.invoke('scan-image-folder', folderPath),
  deleteVideoFile: (filePath) => ipcRenderer.invoke('delete-video-file', filePath),

  // App Settings & Chrome Path
  getSetting: (key, defaultValue) => ipcRenderer.invoke('get-setting', { key, defaultValue }),
  setSetting: (key, value) => ipcRenderer.invoke('set-setting', { key, value }),
  getChromePath: () => ipcRenderer.invoke('get-chrome-path'),
  selectChromeExe: () => ipcRenderer.invoke('select-chrome-exe'),

  // FFmpeg Services
  stitchVideos: (data) => ipcRenderer.invoke('stitch-videos', data),
  stripMetadata: (filePath) => ipcRenderer.invoke('strip-metadata', filePath),
  cleanVideoWatermark: (filePath) => ipcRenderer.invoke('clean-video-watermark', filePath),

  // Failed Queue & History
  getFailedTasks: () => ipcRenderer.invoke('get-failed-tasks'),
  retryFailedTasks: (taskIds) => ipcRenderer.invoke('retry-failed-tasks', taskIds),
  clearFailedTasks: () => ipcRenderer.invoke('clear-failed-tasks'),
  getHistory: (limit) => ipcRenderer.invoke('get-history', limit),

  // Diagnostics & Health Monitor
  runHealthCheck: (payload) => ipcRenderer.invoke('diagnostics:run-health-check', payload),
  releaseLocks: () => ipcRenderer.invoke('diagnostics:release-locks'),
  autoHeal: (payload) => ipcRenderer.invoke('diagnostics:auto-heal', payload),
  getDiagnosticsTelemetry: () => ipcRenderer.invoke('diagnostics:get-telemetry'),
  getDiagnosticsErrors: () => ipcRenderer.invoke('diagnostics:get-errors'),
  clearDiagnosticsErrors: () => ipcRenderer.invoke('diagnostics:clear-errors'),

  // Automation Engine & Worker Pool
  startAutomation: (config) => ipcRenderer.invoke('start-automation', config),
  stopAutomation: () => ipcRenderer.invoke('stop-automation'),
  pauseAutomation: () => ipcRenderer.invoke('pause-automation'),
  resumeAutomation: () => ipcRenderer.invoke('resume-automation'),

  // Real-time Event Subscriptions
  onLog: (callback) => ipcRenderer.on('automation-log', (event, data) => callback(data)),
  onProgress: (callback) => ipcRenderer.on('automation-progress', (event, data) => callback(data)),
  onWorkerUpdate: (callback) => ipcRenderer.on('worker-update', (event, data) => callback(data)),
  onStitchProgress: (callback) => ipcRenderer.on('stitch-progress', (event, data) => callback(data)),

  onVideoStarted: (callback) => ipcRenderer.on('video-started', (event, data) => callback(data)),
  onVideoRenderingTick: (callback) => ipcRenderer.on('video-rendering-tick', (event, data) => callback(data)),
  onVideoCompleted: (callback) => ipcRenderer.on('video-completed', (event, data) => callback(data)),
  onAccountLoggedIn: (callback) => ipcRenderer.on('account-logged-in', (event, data) => callback(data)),
  onAccountUpdated: (callback) => ipcRenderer.on('account-updated', (event, data) => callback(data)),
  onCreditsUpdated: (callback) => ipcRenderer.on('credits-updated', (event, data) => callback(data))
});
