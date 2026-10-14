import { contextBridge, ipcRenderer } from 'electron';
import type { FinanceTransactionInput } from './db';

contextBridge.exposeInMainWorld('electronAPI', {
  getDashboardStats: () => ipcRenderer.invoke('get-dashboard-stats'),
  searchMembers: (keyword: string) => ipcRenderer.invoke('search-members', keyword),
  getFamilyTree: (memberId: number) => ipcRenderer.invoke('get-family-tree', memberId),

  getFinanceYears: () => ipcRenderer.invoke('get-finance-years'),
  getFinanceSummary: (year: number) => ipcRenderer.invoke('get-finance-summary', year),
  getDues: (year: number) => ipcRenderer.invoke('get-dues', year),
  createDuesYear: (year: number, amount: number) => ipcRenderer.invoke('create-dues-year', year, amount),
  addDuesMember: (year: number, memberId: number, amount: number) =>
    ipcRenderer.invoke('add-dues-member', year, memberId, amount),
  removeDues: (id: number) => ipcRenderer.invoke('remove-dues', id),
  setDuesPaid: (ids: number[], paidDate: string | null) => ipcRenderer.invoke('set-dues-paid', ids, paidDate),
  updateDues: (id: number, amountDue: number, note: string | null) =>
    ipcRenderer.invoke('update-dues', id, amountDue, note),
  getTransactions: (year: number) => ipcRenderer.invoke('get-transactions', year),
  saveTransaction: (tx: FinanceTransactionInput) => ipcRenderer.invoke('save-transaction', tx),
  deleteTransaction: (id: number) => ipcRenderer.invoke('delete-transaction', id),
});
