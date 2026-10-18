import { ipcMain } from 'electron';
import type { ElectronAPI, IpcChannel } from '../shared/ipc';
import * as database from './db';
import { listDocuments } from './db/documents';
import * as documents from './services/documents';
import * as excel from './services/excelTransfer';

type Handler<K extends IpcChannel> = (
  ...args: Parameters<ElectronAPI[K]>
) => Awaited<ReturnType<ElectronAPI[K]>> | ReturnType<ElectronAPI[K]>;

function handle<K extends IpcChannel>(channel: K, handler: Handler<K>): void {
  ipcMain.handle(channel, (_event, ...args) => handler(...(args as Parameters<ElectronAPI[K]>)));
}

// 寫入類操作：完成後立即存檔，避免程式異常結束時遺失資料
function handleWrite<K extends IpcChannel>(channel: K, handler: Handler<K>): void {
  ipcMain.handle(channel, async (_event, ...args) => {
    const result = await handler(...(args as Parameters<ElectronAPI[K]>));
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

  handle('listDocuments', listDocuments);
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
}
