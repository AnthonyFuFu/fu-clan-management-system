import fs from 'fs';
import initSqlJs, { Database, SqlValue } from 'sql.js';

let instance: Database;
let dbFilePath: string;

// Opens the database file, creating an empty in-memory database when it does not exist yet.
// Returns true when the file is new (caller is expected to create the schema and seed it).
export async function openDatabase(filePath: string): Promise<boolean> {
  const SQL = await initSqlJs();
  dbFilePath = filePath;
  const isNew = !fs.existsSync(filePath);
  instance = isNew ? new SQL.Database() : new SQL.Database(fs.readFileSync(filePath));
  return isNew;
}

export function db(): Database {
  return instance;
}

// Call this after any INSERT/UPDATE/DELETE — sql.js only keeps changes in memory otherwise.
export function saveDatabase(): void {
  fs.writeFileSync(dbFilePath, Buffer.from(db().export()));
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

// sql.js has no transaction helper — run a batch atomically so a failed write never leaves half a roster.
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
