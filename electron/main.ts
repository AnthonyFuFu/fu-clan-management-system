import { app, BrowserWindow, dialog } from 'electron';
import path from 'path';
import { getSettings, initDatabase, saveDatabase } from './db';
import { registerIpcHandlers } from './ipc';
import { autoBackup } from './services/backup';
import { initLogger, logError, logInfo } from './services/logger';
import { applyZoom } from './services/zoom';
import { errorMessage } from '../shared/errors';

// 由 npm run electron:dev 設定；有值時載入 Vite 開發伺服器，否則載入編譯好的 build/
const devServerUrl = process.env.VITE_DEV_SERVER_URL;

// 保持一個對於 window 物件的全域引用
let mainWindow: BrowserWindow | null;

function createWindow(): void {
  // 建立瀏覽器視窗
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    // 文字放大後版面需要更多空間：限制最小尺寸，並在開啟時放到最大（見下方 maximize）
    minWidth: 1024,
    minHeight: 700,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, '../../build/icon.png'),
    title: '傅氏宗親會管理系統',
  });

  // 載入應用程式
  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../build/index.html'));
  }

  // 在開發環境下開啟開發者工具
  if (devServerUrl) {
    mainWindow.webContents.openDevTools();
  }

  // 套用「系統設定」的文字大小（每次載入完成都套用，重新整理後也不會跑掉）
  mainWindow.webContents.on('did-finish-load', () => {
    if (mainWindow) applyZoom(getSettings(), [mainWindow]);
  });

  // 開啟時視窗放到最大，放大文字後也有足夠空間；準備好才顯示，避免先閃一個小視窗
  mainWindow.once('ready-to-show', () => {
    mainWindow?.maximize();
    mainWindow?.show();
  });

  // 這個程式只顯示自己的畫面：不開新視窗，也不跳到其他網址（例如誤點到外部連結）
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const current = mainWindow?.webContents.getURL() ?? '';
    if (url.split('#')[0] !== current.split('#')[0]) {
      event.preventDefault();
    }
  });

  // 移除視窗的預設選單
  mainWindow.setMenu(null);

  // 當視窗關閉時，解除對視窗物件的參考
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// 當 Electron 完成初始化並準備建立瀏覽器視窗時，呼叫此方法
app.whenReady().then(async () => {
  const userData = app.getPath('userData');
  initLogger(path.join(userData, 'logs'));
  logInfo(`啟動 ${app.getName()} ${app.getVersion()}`);

  try {
    // 開發模式（尚未打包）才建立範例資料；正式版從空白資料庫開始
    await initDatabase(userData, { seedDemo: !app.isPackaged });
  } catch (error) {
    logError('開啟資料庫', error);
    dialog.showErrorBox(
      '無法開啟資料庫',
      `${errorMessage(error)}\n\n資料位置：${userData}\n` +
        '資料夾裡的 backups 有每天的自動備份，可以把最近一份複製出來、改名為 clan.db 取代原本的檔案後再開啟程式。'
    );
    app.quit();
    return;
  }

  try {
    autoBackup();
  } catch (error) {
    // 自動備份失敗不影響使用，記錄下來即可
    logError('自動備份', error);
  }

  registerIpcHandlers();
  createWindow();
});

process.on('uncaughtException', (error) => logError('uncaughtException', error));
process.on('unhandledRejection', (reason) => logError('unhandledRejection', reason));

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
