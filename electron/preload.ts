import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getDashboardStats: () => ipcRenderer.invoke('get-dashboard-stats'),
  searchMembers: (keyword: string) => ipcRenderer.invoke('search-members', keyword),
  getFamilyTree: (memberId: number) => ipcRenderer.invoke('get-family-tree', memberId),
});
