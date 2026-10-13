const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getDashboardStats: () => ipcRenderer.invoke('get-dashboard-stats'),
});
