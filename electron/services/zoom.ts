import { BrowserWindow } from 'electron';
import { zoomFactorOf } from '../../shared/settings';
import type { AppSettings } from '../../shared/types';

// 文字大小以縮放整個視窗實作：文字、按鈕、圖示一起放大，版面比例不變
export function applyZoom(settings: AppSettings, windows = BrowserWindow.getAllWindows()): void {
  const factor = zoomFactorOf(settings.fontSize);
  windows.forEach((window) => window.webContents.setZoomFactor(factor));
}
