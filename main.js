const { app, BrowserWindow, ipcMain, session, globalShortcut, dialog } = require('electron');
const path = require('path');

// Auto-updater (only in production builds)
let autoUpdater;
if (app.isPackaged) {
  try {
    autoUpdater = require('electron-updater').autoUpdater;
  } catch (e) {
    console.log('Auto-updater not available');
  }
}

// Keep a global reference of the window object to prevent garbage collection
let mainWindow;

// Global error handler
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  dialog.showErrorBox('Error', `An unexpected error occurred: ${error.message}`);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset', // macOS: hide title bar but keep traffic lights
    trafficLightPosition: { x: 16, y: 16 }, // Position traffic lights
    frame: process.platform === 'darwin' ? true : false, // Frameless on Windows/Linux
    backgroundColor: '#f5f5f5', // Match --color-neutral-150
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true, // Enable <webview> tag
      sandbox: false // Required for webview
    }
  });

  // Load the index.html file
  mainWindow.loadFile('index.html');

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // Handle window close
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Set up permission handling for webview
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = ['notifications', 'clipboard-read', 'media'];
    if (allowedPermissions.includes(permission)) {
      callback(true);
    } else {
      callback(false);
    }
  });
}

// Electron app lifecycle
app.whenReady().then(() => {
  createWindow();

  // Set up auto-updater (only in packaged app)
  if (autoUpdater) {
    setupAutoUpdater();
  }

  // macOS: Re-create window when dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Auto-updater setup
function setupAutoUpdater() {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    console.log('Checking for updates...');
  });

  autoUpdater.on('update-available', (info) => {
    console.log('Update available:', info.version);
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Available',
      message: `A new version (${info.version}) is available. Would you like to download it?`,
      buttons: ['Download', 'Later']
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.downloadUpdate();
      }
    });
  });

  autoUpdater.on('update-not-available', () => {
    console.log('No updates available');
  });

  autoUpdater.on('download-progress', (progress) => {
    mainWindow?.webContents.send('update:progress', progress.percent);
  });

  autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Ready',
      message: 'Update has been downloaded. The application will restart to install.',
      buttons: ['Restart Now', 'Later']
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall();
      }
    });
  });

  autoUpdater.on('error', (err) => {
    console.error('Auto-updater error:', err);
  });

  // Check for updates after a short delay
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(err => {
      console.log('Update check failed:', err.message);
    });
  }, 5000);
}

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// IPC Handlers for webview communication
// ═══════════════════════════════════════════════════════════════════════════════

// Navigation controls
ipcMain.handle('webview:go-back', async (event) => {
  const webContents = event.sender;
  if (webContents.canGoBack()) {
    webContents.goBack();
    return true;
  }
  return false;
});

ipcMain.handle('webview:go-forward', async (event) => {
  const webContents = event.sender;
  if (webContents.canGoForward()) {
    webContents.goForward();
    return true;
  }
  return false;
});

ipcMain.handle('webview:reload', async (event) => {
  const webContents = event.sender;
  webContents.reload();
  return true;
});

// Get page info
ipcMain.handle('webview:get-url', async (event) => {
  return event.sender.getURL();
});

ipcMain.handle('webview:get-title', async (event) => {
  return event.sender.getTitle();
});

// Execute JavaScript in webview
ipcMain.handle('webview:execute-js', async (event, code) => {
  try {
    const result = await event.sender.executeJavaScript(code);
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Window controls (for frameless window on Windows/Linux)
ipcMain.on('window:minimize', () => {
  mainWindow?.minimize();
});

ipcMain.on('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.on('window:close', () => {
  mainWindow?.close();
});

// Check for updates (can be triggered from renderer)
ipcMain.handle('app:check-for-updates', async () => {
  if (autoUpdater) {
    try {
      const result = await autoUpdater.checkForUpdates();
      return { available: !!result.updateInfo, version: result.updateInfo?.version };
    } catch (err) {
      return { available: false, error: err.message };
    }
  }
  return { available: false, error: 'Auto-updater not available' };
});

// Get app version
ipcMain.handle('app:get-version', async () => {
  return app.getVersion();
});

// Restart app
ipcMain.on('app:restart', () => {
  app.relaunch();
  app.exit(0);
});
