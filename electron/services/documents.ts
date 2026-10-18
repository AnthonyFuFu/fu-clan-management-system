import { app, shell } from 'electron';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { inTransaction } from '../db/connection';
import { deleteDocumentRow, getStoredDocument, insertDocument } from '../db/documents';
import { askOpenPaths, askSavePath } from './dialogs';

// 單一檔案上限，避免誤選超大檔案把使用者資料夾塞滿
const MAX_FILE_SIZE = 200 * 1024 * 1024;

// 與 clan.db 放在同一個使用者資料夾，備份時一起複製即可
export function documentsDir(): string {
  const dir = path.join(app.getPath('userData'), 'documents');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function storedPath(storedName: string): string {
  return path.join(documentsDir(), storedName);
}

// 把選擇的檔案複製到程式的文件資料夾，檔名不會互相衝突。
// 全部成功才算數：任何一個檔案複製失敗，已複製的檔案都會刪除，資料庫也不會寫入。
// 回傳上傳的檔案數（使用者取消時為 0）。
export async function uploadDocuments(): Promise<number> {
  const sources = await askOpenPaths({ multiple: true });
  const files = sources.map((source) => ({ source, size: fs.statSync(source).size }));
  const tooLarge = files.filter((file) => file.size > MAX_FILE_SIZE);
  if (tooLarge.length > 0) {
    throw new Error(`檔案超過 200 MB，無法上傳：${tooLarge.map((f) => path.basename(f.source)).join('、')}`);
  }

  const copied: { fileName: string; storedName: string; size: number }[] = [];
  try {
    files.forEach(({ source, size }) => {
      const storedName = `${randomUUID()}${path.extname(source).toLowerCase()}`;
      fs.copyFileSync(source, storedPath(storedName));
      copied.push({ fileName: path.basename(source), storedName, size });
    });
    inTransaction(() => copied.forEach((file) => insertDocument(file.fileName, file.storedName, file.size)));
  } catch (error) {
    copied.forEach((file) => fs.rmSync(storedPath(file.storedName), { force: true }));
    throw error;
  }
  return copied.length;
}

export async function downloadDocument(id: number): Promise<string | null> {
  const doc = getStoredDocument(id);
  const target = await askSavePath(doc.fileName);
  if (target) {
    fs.copyFileSync(storedPath(doc.storedName), target);
  }
  return target;
}

export async function openDocument(id: number): Promise<void> {
  const doc = getStoredDocument(id);
  const error = await shell.openPath(storedPath(doc.storedName));
  if (error) {
    throw new Error(`無法開啟檔案：${error}`);
  }
}

export function deleteDocument(id: number): void {
  const doc = getStoredDocument(id);
  deleteDocumentRow(id);
  fs.rmSync(storedPath(doc.storedName), { force: true });
}
