import { ipcMain } from 'electron';
import type { ElectronAPI, IpcChannel } from '../shared/ipc';
import * as database from './db';
import * as backup from './services/backup';
import * as documents from './services/documents';
import * as excel from './services/excel';
import { logError } from './services/logger';
import { applyZoom } from './services/zoom';

type Handler<K extends IpcChannel> = (
  ...args: Parameters<ElectronAPI[K]>
) => Awaited<ReturnType<ElectronAPI[K]>> | ReturnType<ElectronAPI[K]>;

// 錯誤寫進記錄檔後照樣拋回畫面，由畫面顯示給使用者
function register<K extends IpcChannel>(channel: K, run: (...args: Parameters<ElectronAPI[K]>) => unknown): void {
  ipcMain.handle(channel, async (_event, ...args) => {
    try {
      return await run(...(args as Parameters<ElectronAPI[K]>));
    } catch (error) {
      logError(`IPC ${channel}`, error);
      throw error;
    }
  });
}

function handle<K extends IpcChannel>(channel: K, handler: Handler<K>): void {
  register(channel, handler);
}

// 寫入類操作：完成後立即存檔，避免程式異常結束時遺失資料
function handleWrite<K extends IpcChannel>(channel: K, handler: Handler<K>): void {
  register<K>(channel, async (...args) => {
    const result = await handler(...args);
    database.saveDatabase();
    return result;
  });
}

export function registerIpcHandlers(): void {
  handle('getDashboardStats', database.getDashboardStats);

  handle('searchMembers', (keyword) => database.searchMembers(keyword));
  handle('listMembers', database.listMembers);
  handleWrite('createMember', database.createMember);
  handleWrite('updateMember', database.updateMember);
  handleWrite('deleteMember', database.deleteMember);
  handle('getBranches', database.getBranches);
  handle('getFamilyTree', database.getFamilyTree);

  handle('getFinanceYears', database.getFinanceYears);
  handle('getFinanceSummary', database.getFinanceSummary);
  handle('getDues', database.getDues);
  handleWrite('createDuesYear', database.createDuesYear);
  handleWrite('addDuesMember', database.addDuesMember);
  handleWrite('removeDues', database.removeDues);
  handleWrite('setDuesPaid', database.setDuesPaid);
  handleWrite('updateDues', database.updateDues);
  handle('getTransactions', database.getTransactions);
  handleWrite('saveTransaction', database.saveTransaction);
  handleWrite('deleteTransaction', database.deleteTransaction);

  handle('listDocuments', database.listDocuments);
  handleWrite('uploadDocuments', documents.uploadDocuments);
  handle('downloadDocument', documents.downloadDocument);
  handle('openDocument', documents.openDocument);
  handleWrite('deleteDocument', documents.deleteDocument);

  handle('exportDuesStatus', excel.exportDuesStatus);
  handle('exportTransactions', excel.exportTransactions);
  handle('downloadMemberImportTemplate', excel.downloadMemberImportTemplate);
  handle('previewMemberImport', excel.previewMemberImport);
  handleWrite('confirmMemberImport', excel.confirmMemberImport);

  handle('listEvents', database.listEvents);
  handleWrite('saveEvent', database.saveEvent);
  handleWrite('deleteEvent', database.deleteEvent);

  handle('exportBackup', backup.exportBackup);
  handle('restoreBackup', backup.restoreBackup);
  handle('openBackupFolder', backup.openBackupFolder);

  handle('getSettings', database.getSettings);
  handleWrite('updateSettings', (patch) => {
    const settings = database.updateSettings(patch);
    applyZoom(settings);
    return settings;
  });
}
