import { contextBridge, ipcRenderer } from 'electron';
// 只能用 `import type`：preload 在沙箱中執行，除了 electron 模組之外無法 require 其他檔案。
import type { ElectronAPI, IpcChannel } from '../shared/ipc';

function invoke<K extends IpcChannel>(channel: K, ...args: Parameters<ElectronAPI[K]>): ReturnType<ElectronAPI[K]> {
  return ipcRenderer.invoke(channel, ...args) as ReturnType<ElectronAPI[K]>;
}

const electronAPI: ElectronAPI = {
  getDashboardStats: () => invoke('getDashboardStats'),

  searchMembers: (keyword) => invoke('searchMembers', keyword),
  listMembers: (query) => invoke('listMembers', query),
  createMember: (input) => invoke('createMember', input),
  updateMember: (id, input) => invoke('updateMember', id, input),
  deleteMember: (id) => invoke('deleteMember', id),
  getBranches: () => invoke('getBranches'),
  getFamilyTree: (memberId) => invoke('getFamilyTree', memberId),

  getFinanceYears: () => invoke('getFinanceYears'),
  getFinanceSummary: (year) => invoke('getFinanceSummary', year),
  getDues: (year) => invoke('getDues', year),
  createDuesYear: (year, amount) => invoke('createDuesYear', year, amount),
  addDuesMember: (year, memberId, amount) => invoke('addDuesMember', year, memberId, amount),
  removeDues: (id) => invoke('removeDues', id),
  setDuesPaid: (ids, paidDate) => invoke('setDuesPaid', ids, paidDate),
  updateDues: (id, amountDue, note) => invoke('updateDues', id, amountDue, note),
  getTransactions: (year) => invoke('getTransactions', year),
  saveTransaction: (tx) => invoke('saveTransaction', tx),
  deleteTransaction: (id) => invoke('deleteTransaction', id),

  listDocuments: () => invoke('listDocuments'),
  uploadDocuments: () => invoke('uploadDocuments'),
  downloadDocument: (id) => invoke('downloadDocument', id),
  openDocument: (id) => invoke('openDocument', id),
  deleteDocument: (id) => invoke('deleteDocument', id),

  exportDuesStatus: (year) => invoke('exportDuesStatus', year),
  exportTransactions: (year) => invoke('exportTransactions', year),
  downloadMemberImportTemplate: () => invoke('downloadMemberImportTemplate'),
  previewMemberImport: () => invoke('previewMemberImport'),
  confirmMemberImport: (token) => invoke('confirmMemberImport', token),

  listEvents: (from, to) => invoke('listEvents', from, to),
  saveEvent: (input) => invoke('saveEvent', input),
  deleteEvent: (id) => invoke('deleteEvent', id),

  exportBackup: () => invoke('exportBackup'),
  restoreBackup: () => invoke('restoreBackup'),
  openBackupFolder: () => invoke('openBackupFolder'),

  getSettings: () => invoke('getSettings'),
  updateSettings: (patch) => invoke('updateSettings', patch),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
