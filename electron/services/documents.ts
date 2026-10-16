import { app, shell } from 'electron';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { deleteDocumentRow, getStoredDocument, insertDocument } from '../db/documents';
import { askOpenPaths, askSavePath } from './dialogs';

// 單一檔案上限，避免誤選超大檔案把使用者資料夾塞滿
const MAX_FILE_SIZE = 200 * 1024 * 1024;

// 與 clan.db 放在同一個使用者資料夾，備份時一起複製即可
function documentsDir(): string {
  const dir = path.join(app.getPath('userData'), 'documents');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function storedPath(storedName: string): string {
  return path.join(documentsDir(), storedName);
}

// Copies the chosen files into the app's documents folder under collision-free names.
// Returns how many were uploaded (0 when the user cancels).
export async function uploadDocuments(): Promise<number> {
  const sources = await askOpenPaths({ multiple: true });
  const tooLarge = sources.filter((source) => fs.statSync(source).size > MAX_FILE_SIZE);
  if (tooLarge.length > 0) {
    throw new Error(`檔案超過 200 MB，無法上傳：${tooLarge.map((s) => path.basename(s)).join('、')}`);
  }
  sources.forEach((source) => {
    const storedName = `${randomUUID()}${path.extname(source).toLowerCase()}`;
    fs.copyFileSync(source, storedPath(storedName));
    insertDocument(path.basename(source), storedName, fs.statSync(source).size);
  });
  return sources.length;
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
