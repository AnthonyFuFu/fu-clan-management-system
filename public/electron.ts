import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import isDev from 'electron-is-dev';
import { initDatabase, getDashboardStats, saveDatabase, searchMembers, getFamilyTree } from '../electron/db';

let mainWindow: BrowserWindow | null;

function createWindow(): void {
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
      : `file://${path.join(__dirname, '../../build/index.html')}`
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
  ipcMain.handle('search-members', (_event, keyword: string) => searchMembers(keyword));
  ipcMain.handle('get-family-tree', (_event, memberId: number) => getFamilyTree(memberId));
  createWindow();
});

app.on('window-all-closed', () => {
  saveDatabase();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});