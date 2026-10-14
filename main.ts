import { app, BrowserWindow } from 'electron';
import path from 'path';
import { initDatabase, saveDatabase } from './electron/db';
import { registerIpcHandlers } from './electron/ipc';

// 由 npm run electron:dev 設定；有值時載入 Vite 開發伺服器，否則載入編譯好的 build/
const devServerUrl = process.env.VITE_DEV_SERVER_URL;

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
    if (devServerUrl) {
        mainWindow.loadURL(devServerUrl);
    } else {
        mainWindow.loadFile(path.join(__dirname, '../build/index.html'));
    }

    // 在開發環境下開啟開發者工具
    if (devServerUrl) {
        mainWindow.webContents.openDevTools();
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
    registerIpcHandlers();
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