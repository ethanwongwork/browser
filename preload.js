const { contextBridge, ipcRenderer } = require('electron');

// ═══════════════════════════════════════════════════════════════════════════════
// Expose secure APIs to the renderer process
// ═══════════════════════════════════════════════════════════════════════════════

contextBridge.exposeInMainWorld('electronAPI', {
  // Platform info
  platform: process.platform,
  isElectron: true,

  // Window controls (for frameless window)
  windowMinimize: () => ipcRenderer.send('window:minimize'),
  windowMaximize: () => ipcRenderer.send('window:maximize'),
  windowClose: () => ipcRenderer.send('window:close'),

  // Webview navigation helpers (used by renderer to communicate with webview)
  // Note: Most webview control is done directly via the webview DOM element
  // These are here for any main process operations needed

  // IPC for communicating with main process
  invoke: (channel, ...args) => {
    const allowedChannels = [
      'webview:go-back',
      'webview:go-forward', 
      'webview:reload',
      'webview:get-url',
      'webview:get-title',
      'webview:execute-js'
    ];
    if (allowedChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    }
    throw new Error(`IPC channel '${channel}' is not allowed`);
  },

  // Listen for events from main process
  on: (channel, callback) => {
    const allowedChannels = [
      'webview:did-navigate',
      'webview:page-title-updated',
      'webview:page-favicon-updated',
      'webview:did-start-loading',
      'webview:did-stop-loading'
    ];
    if (allowedChannels.includes(channel)) {
      ipcRenderer.on(channel, (event, ...args) => callback(...args));
    }
  },

  // Remove event listener
  removeListener: (channel, callback) => {
    ipcRenderer.removeListener(channel, callback);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// Expose blocks API for NTP content system
// ═══════════════════════════════════════════════════════════════════════════════

contextBridge.exposeInMainWorld('blocksAPI', {
  getBlocks: (count) => ipcRenderer.invoke('blocks:get', count),
  refreshPool: () => ipcRenderer.invoke('blocks:refresh'),
  getPoolStatus: () => ipcRenderer.invoke('blocks:status'),
  setAIConfig: (config) => ipcRenderer.invoke('blocks:set-ai-config', config),
  onBlocksReady: (cb) => ipcRenderer.on('blocks:ready', () => cb()),
  onBlocksError: (cb) => ipcRenderer.on('blocks:error', (_e, msg) => cb(msg))
});

// Log when preload script runs
console.log('Preload script loaded');
