import fs from 'fs';
import path from 'path';
import initSqlJs, { type Database, type SqlValue } from 'sql.js';

let instance: Database;
let dbFilePath: string;

// 開啟資料庫檔案；檔案不存在時建立一個空的記憶體資料庫。
// 回傳 true 表示是新檔案（呼叫端要負責建立資料表）。
export async function openDatabase(filePath: string): Promise<boolean> {
  const SQL = await initSqlJs();
  dbFilePath = filePath;
  const isNew = !fs.existsSync(filePath);
  instance = isNew ? new SQL.Database() : new SQL.Database(fs.readFileSync(filePath));
  enableForeignKeys();
  return isNew;
}

// 檢查檔案內容是不是本系統的資料庫（還原備份前使用）：能以 SQLite 開啟，且有宗親資料表
export async function isClanDatabase(data: Uint8Array): Promise<boolean> {
  const SQL = await initSqlJs();
  try {
    const candidate = new SQL.Database(data);
    try {
      const result = candidate.exec("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'members'");
      return result.length > 0;
    } finally {
      candidate.close();
    }
  } catch {
    return false;
  }
}

export function db(): Database {
  return instance;
}

export function databaseFilePath(): string {
  return dbFilePath;
}

// SQLite 預設不檢查 REFERENCES，要每次連線自己開啟
function enableForeignKeys(): void {
  instance.run('PRAGMA foreign_keys = ON;');
}

// 改資料庫結構等有風險的操作，可以暫時關閉外鍵檢查
export function withoutForeignKeys(work: () => void): void {
  instance.run('PRAGMA foreign_keys = OFF;');
  try {
    work();
  } finally {
    enableForeignKeys();
  }
}

// 原子寫入：先完整寫到暫存檔並確實寫入磁碟，再用 rename 取代原檔。
// 寫到一半遇到停電或當機時，原本的資料庫檔案仍然完好。
export function writeFileAtomic(filePath: string, data: Uint8Array): void {
  const tmpPath = `${filePath}.tmp`;
  const fd = fs.openSync(tmpPath, 'w');
  try {
    fs.writeSync(fd, data);
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fs.renameSync(tmpPath, filePath);
}

// 任何 INSERT / UPDATE / DELETE 之後都要呼叫：sql.js 的資料只存在記憶體，不存檔就會遺失。
export function saveDatabase(): void {
  const data = db().export();
  // sql.js 的 export() 會重新開啟連線，PRAGMA 設定會被重設，要再開一次外鍵檢查
  enableForeignKeys();
  writeFileAtomic(dbFilePath, data);
}

// 在同一個資料夾的 backups/ 底下留一份目前資料庫的副本，例如改版升級前。回傳副本路徑。
export function snapshotDatabase(label: string): string {
  const dir = path.join(path.dirname(dbFilePath), 'backups');
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '-');
  const target = path.join(dir, `${label}-${stamp}.db`);
  const data = db().export();
  enableForeignKeys();
  writeFileAtomic(target, data);
  return target;
}

export function queryScalar(sql: string, params: SqlValue[] = []): SqlValue {
  const stmt = db().prepare(sql);
  stmt.bind(params);
  stmt.step();
  const row = stmt.getAsObject();
  stmt.free();
  return Object.values(row)[0];
}

export function queryAll<T>(sql: string, params: SqlValue[] = []): T[] {
  const stmt = db().prepare(sql);
  stmt.bind(params);
  const rows: T[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as unknown as T);
  }
  stmt.free();
  return rows;
}

export function queryOne<T>(sql: string, params: SqlValue[] = []): T | null {
  const rows = queryAll<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export function getMeta(key: string): string | null {
  const row = queryOne<{ value: string }>('SELECT value FROM meta WHERE key = ?', [key]);
  return row ? row.value : null;
}

export function setMeta(key: string, value: string): void {
  db().run('INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [
    key,
    value,
  ]);
}

// sql.js 沒有交易輔助函式：整批寫入要嘛全部成功、要嘛全部取消，不會只寫進半份名單。
export function inTransaction<T>(work: () => T): T {
  db().run('BEGIN');
  try {
    const result = work();
    db().run('COMMIT');
    return result;
  } catch (error) {
    db().run('ROLLBACK');
    throw error;
  }
}
