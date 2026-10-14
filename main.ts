import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import isDev from 'electron-is-dev';
import { initDatabase, getDashboardStats, saveDatabase, searchMembers, getFamilyTree } from './electron/db';

// 保持一個對於 window 物件的全域引用
let mainWindow: BrowserWindow | null;

function createWindow(): void {
    // 建立瀏覽器視窗
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'electron/preload.js'),
            nodeIntegration: false,
            contextIsolation: true
        },
        icon: path.join(__dirname, '../build/icon.png'),
        title: '傅氏宗親會管理系統'
    });

    // 載入應用程式
    mainWindow.loadURL(
        isDev ?
        'http://localhost:3000' :
        `file://${path.join(__dirname, '../build/index.html')}`
    );

    // 在開發環境下開啟開發者工具
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

    // 移除視窗的預設選單
    mainWindow.setMenu(null);

    // 當視窗關閉時，解除對視窗物件的參考
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// 當 Electron 完成初始化並準備建立瀏覽器視窗時，呼叫此方法
app.whenReady().then(async () => {
    await initDatabase(app.getPath('userData'));
    ipcMain.handle('get-dashboard-stats', () => getDashboardStats());
    ipcMain.handle('search-members', (_event, keyword: string) => searchMembers(keyword));
    ipcMain.handle('get-family-tree', (_event, memberId: number) => getFamilyTree(memberId));
    createWindow();
});

// 當所有視窗都關閉時結束程序
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