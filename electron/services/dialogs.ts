import { app, BrowserWindow, dialog, FileFilter } from 'electron';
import fs from 'fs';
import path from 'path';
import type * as XLSX from 'xlsx';
import { toBuffer } from './excel/sheet';

export const EXCEL_FILTERS: FileFilter[] = [{ name: 'Excel 活頁簿', extensions: ['xlsx'] }];

// 對話框掛在目前的視窗上（modal），不會跑到視窗後面
function parentWindow(): BrowserWindow | undefined {
  return BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
}

// 預設存到「下載」資料夾；回傳使用者選的路徑，取消時為 null
export async function askSavePath(defaultName: string, filters?: FileFilter[]): Promise<string | null> {
  const options = { defaultPath: path.join(app.getPath('downloads'), defaultName), filters };
  const window = parentWindow();
  const result = window ? await dialog.showSaveDialog(window, options) : await dialog.showSaveDialog(options);
  return result.canceled || !result.filePath ? null : result.filePath;
}

export async function askOpenPaths(options: { multiple: boolean; filters?: FileFilter[] }): Promise<string[]> {
  const dialogOptions: Electron.OpenDialogOptions = {
    properties: options.multiple ? ['openFile', 'multiSelections'] : ['openFile'],
    filters: options.filters,
  };
  const window = parentWindow();
  const result = window ? await dialog.showOpenDialog(window, dialogOptions) : await dialog.showOpenDialog(dialogOptions);
  return result.canceled ? [] : result.filePaths;
}

export async function saveWorkbook(book: XLSX.WorkBook, defaultName: string): Promise<string | null> {
  const filePath = await askSavePath(defaultName, EXCEL_FILTERS);
  if (filePath) {
    fs.writeFileSync(filePath, toBuffer(book));
  }
  return filePath;
}
