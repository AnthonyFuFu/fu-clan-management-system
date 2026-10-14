import { contextBridge, ipcRenderer } from 'electron';
// 只能用 `import type`：preload 在沙箱中執行，除了 electron 模組之外無法 require 其他檔案。
import type { ElectronAPI, IpcChannel } from '../shared/ipc';

function invoke<K extends IpcChannel>(channel: K, ...args: Parameters<ElectronAPI[K]>): ReturnType<ElectronAPI[K]> {
  return ipcRenderer.invoke(channel, ...args) as ReturnType<ElectronAPI[K]>;
}

const electronAPI: ElectronAPI = {
  getDashboardStats: () => invoke('getDashboardStats'),

  searchMembers: (keyword) => invoke('searchMembers', keyword),
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
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
