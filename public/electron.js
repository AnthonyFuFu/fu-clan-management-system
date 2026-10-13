const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const isDev = require('electron-is-dev');
const { initDatabase, getDashboardStats } = require('../electron/db');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, '../electron/preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadURL(
    isDev
      ? 'http://localhost:3000'
      : `file://${path.join(__dirname, '../build/index.html')}`
  );

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
  // 設置 ICU 數據目錄
  if (!isDev) {
    // 在打包應用中指定 ICU 數據路徑
    process.env.ICU_DATA_DIR = path.join(process.resourcesPath, 'resources');
  
    // 檢查路徑是否存在
    console.log('ICU 數據目錄:', process.env.ICU_DATA_DIR);
    if (fs.existsSync(process.env.ICU_DATA_DIR)) {
      console.log('ICU 數據目錄存在');
    } else {
      console.error('ICU 數據目錄不存在');
    }
  }
  
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  await initDatabase(app.getPath('userData'));
  ipcMain.handle('get-dashboard-stats', () => getDashboardStats());
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});