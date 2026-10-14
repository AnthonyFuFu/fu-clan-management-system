import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import {
    initDatabase,
    getDashboardStats,
    saveDatabase,
    searchMembers,
    getFamilyTree,
    getFinanceYears,
    getFinanceSummary,
    getDues,
    createDuesYear,
    addDuesMember,
    removeDues,
    setDuesPaid,
    updateDues,
    getTransactions,
    saveTransaction,
    deleteTransaction,
    FinanceTransactionInput,
} from './electron/db';

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
    ipcMain.handle('get-dashboard-stats', () => getDashboardStats());
    ipcMain.handle('search-members', (_event, keyword: string) => searchMembers(keyword));
    ipcMain.handle('get-family-tree', (_event, memberId: number) => getFamilyTree(memberId));

    // 財務：寫入類操作完成後立即存檔，避免程式異常結束時遺失帳目
    const persist = <T>(write: () => T): T => {
        const result = write();
        saveDatabase();
        return result;
    };
    ipcMain.handle('get-finance-years', () => getFinanceYears());
    ipcMain.handle('get-finance-summary', (_event, year: number) => getFinanceSummary(year));
    ipcMain.handle('get-dues', (_event, year: number) => getDues(year));
    ipcMain.handle('create-dues-year', (_event, year: number, amount: number) =>
        persist(() => createDuesYear(year, amount)));
    ipcMain.handle('add-dues-member', (_event, year: number, memberId: number, amount: number) =>
        persist(() => addDuesMember(year, memberId, amount)));
    ipcMain.handle('remove-dues', (_event, id: number) => persist(() => removeDues(id)));
    ipcMain.handle('set-dues-paid', (_event, ids: number[], paidDate: string | null) =>
        persist(() => setDuesPaid(ids, paidDate)));
    ipcMain.handle('update-dues', (_event, id: number, amountDue: number, note: string | null) =>
        persist(() => updateDues(id, amountDue, note)));
    ipcMain.handle('get-transactions', (_event, year: number) => getTransactions(year));
    ipcMain.handle('save-transaction', (_event, tx: FinanceTransactionInput) =>
        persist(() => saveTransaction(tx)));
    ipcMain.handle('delete-transaction', (_event, id: number) => persist(() => deleteTransaction(id)));
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