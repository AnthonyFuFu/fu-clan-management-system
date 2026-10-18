import type { ElectronAPI } from '@shared/ipc';

// 頁面裡取得 window.electronAPI。純瀏覽器模式（npm start）沒有它，但 App.tsx 已經在路由層
// 改顯示 DesktopOnlyNotice，頁面不會被渲染，所以頁面裡可以直接當作一定存在。
export function useElectronAPI(): ElectronAPI {
  const api = window.electronAPI;
  if (!api) {
    throw new Error('window.electronAPI 不存在：這個元件只能在桌面版中使用');
  }
  return api;
}
