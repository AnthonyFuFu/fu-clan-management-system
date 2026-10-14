import type { ElectronAPI } from '@shared/ipc';

declare global {
  interface Window {
    // 只有在 Electron 中執行時才存在；純瀏覽器模式（npm start）下為 undefined
    electronAPI?: ElectronAPI;
  }
}

export {};
