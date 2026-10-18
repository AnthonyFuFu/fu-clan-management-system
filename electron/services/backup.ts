import { app, shell } from 'electron';
import fs from 'fs';
import path from 'path';
import { toDateString } from '../../shared/events';
import { initDatabase } from '../db';
import { databaseFilePath, isClanDatabase, saveDatabase, writeFileAtomic } from '../db/connection';
import { askDirectory } from './dialogs';
import { documentsDir } from './documents';
import { logInfo } from './logger';

// 自動備份保留最近幾天
const AUTO_BACKUP_KEEP = 14;
const DB_FILE = 'clan.db';
const DOCUMENTS_FOLDER = 'documents';

export function backupsDir(): string {
  const dir = path.join(app.getPath('userData'), 'backups');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// 本地時間「20261018-143005」，用在備份資料夾名稱
function timestamp(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${toDateString(date).replace(/-/g, '')}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

// 一份備份 = 一個資料夾：clan.db + documents/（上傳的文件）
function copyDataTo(target: string): void {
  fs.mkdirSync(target, { recursive: true });
  fs.copyFileSync(databaseFilePath(), path.join(target, DB_FILE));
  if (fs.existsSync(documentsDir())) {
    fs.cpSync(documentsDir(), path.join(target, DOCUMENTS_FOLDER), { recursive: true });
  }
}

// 每天第一次開啟程式時備份資料庫到 backups/auto-YYYY-MM-DD.db，保留最近 14 份。
// 只備份資料庫：上傳的文件內容不會被程式修改，手動備份時才一起複製。
export function autoBackup(): void {
  const dir = backupsDir();
  const target = path.join(dir, `auto-${toDateString(new Date())}.db`);
  if (!fs.existsSync(target)) {
    fs.copyFileSync(databaseFilePath(), target);
    logInfo(`自動備份：${target}`);
  }
  const autoBackups = fs
    .readdirSync(dir)
    .filter((name) => /^auto-\d{4}-\d{2}-\d{2}\.db$/.test(name))
    .sort();
  autoBackups.slice(0, -AUTO_BACKUP_KEEP).forEach((name) => fs.rmSync(path.join(dir, name), { force: true }));
}

// 手動備份到使用者選的資料夾（例如隨身碟）；回傳建立的備份資料夾，取消時為 null
export async function exportBackup(): Promise<string | null> {
  const parent = await askDirectory('選擇備份要存放的位置（建議使用隨身碟或雲端硬碟資料夾）', true);
  if (!parent) return null;
  saveDatabase();
  const target = path.join(parent, `傅氏宗親會備份-${timestamp()}`);
  copyDataTo(target);
  logInfo(`手動備份：${target}`);
  return target;
}

// 從備份資料夾還原，取代目前所有資料；取消時回傳 false。
// 還原前會先把目前的資料備份到 backups/before-restore-…，選錯備份也救得回來。
export async function restoreBackup(): Promise<boolean> {
  const source = await askDirectory('選擇要還原的備份資料夾（名稱為「傅氏宗親會備份-…」）');
  if (!source) return false;

  const backupDb = path.join(source, DB_FILE);
  if (!fs.existsSync(backupDb)) {
    throw new Error('這個資料夾不是備份資料夾（找不到 clan.db）');
  }
  const data = fs.readFileSync(backupDb);
  if (!(await isClanDatabase(data))) {
    throw new Error('備份檔已損毀，或不是本系統的資料庫');
  }

  saveDatabase();
  const safetyCopy = path.join(backupsDir(), `before-restore-${timestamp()}`);
  copyDataTo(safetyCopy);

  writeFileAtomic(databaseFilePath(), data);
  fs.rmSync(documentsDir(), { recursive: true, force: true });
  const backupDocuments = path.join(source, DOCUMENTS_FOLDER);
  if (fs.existsSync(backupDocuments)) {
    fs.cpSync(backupDocuments, documentsDir(), { recursive: true });
  }

  // 重新開啟資料庫：舊版本的備份也會在這裡升級成目前的結構
  await initDatabase(app.getPath('userData'));
  logInfo(`已從 ${source} 還原；還原前的資料在 ${safetyCopy}`);
  return true;
}

export async function openBackupFolder(): Promise<void> {
  const error = await shell.openPath(backupsDir());
  if (error) {
    throw new Error(`無法開啟資料夾：${error}`);
  }
}
