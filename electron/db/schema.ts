import {
  db,
  getMeta,
  queryAll,
  queryOne,
  queryScalar,
  saveDatabase,
  setMeta,
  snapshotDatabase,
  withoutForeignKeys,
} from './connection';
import { insertTransaction } from './finance';
import { seedDemoFinance, seedDemoMembers } from './seed';

// 財務資料表的版本；需要遷移時調高，遷移程式必須保留既有資料
const FINANCE_VERSION = '1';

export function createSchema(): void {
  db().run(`
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS branches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      gender TEXT NOT NULL CHECK (gender IN ('M', 'F')),
      birthday TEXT,
      parent_id INTEGER REFERENCES members(id),
      phone_no TEXT,
      cellphone TEXT,
      job TEXT,
      spouse_name TEXT,
      generation INTEGER NOT NULL,
      branch_id INTEGER REFERENCES branches(id),
      -- 1 = 已故：不列入會費應繳名單，也不出現在「在世者繳費名單」
      deceased INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      event_date TEXT NOT NULL,
      -- HH:mm；NULL 表示整天
      start_time TEXT,
      end_time TEXT,
      location TEXT,
      note TEXT
    );
    -- One row per member per year: the member is on that year's dues roster.
    CREATE TABLE IF NOT EXISTS dues_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      year INTEGER NOT NULL,
      member_id INTEGER NOT NULL REFERENCES members(id),
      amount_due INTEGER NOT NULL CHECK (amount_due >= 0),
      paid_date TEXT,
      note TEXT,
      UNIQUE (year, member_id)
    );
    -- Everything other than dues: donations, carried-over balance, ceremony costs, scholarships...
    CREATE TABLE IF NOT EXISTS finance_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
      category TEXT NOT NULL,
      item TEXT NOT NULL,
      amount INTEGER NOT NULL CHECK (amount > 0),
      tx_date TEXT NOT NULL,
      note TEXT
    );
    -- 上傳的文件：檔案本身存在 userData/documents/<stored_name>，這裡只存中繼資料
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_name TEXT NOT NULL,
      stored_name TEXT NOT NULL UNIQUE,
      size INTEGER NOT NULL,
      uploaded_at TEXT NOT NULL
    );
  `);
}

// 第一版之後才加入 events 的欄位（最早只有 title、event_date）。
export function migrateEventColumns(): void {
  const columns = queryAll<{ name: string }>('PRAGMA table_info(events)').map((column) => column.name);
  const missing = ['start_time', 'end_time', 'location', 'note'].filter((name) => !columns.includes(name));
  missing.forEach((name) => db().run(`ALTER TABLE events ADD COLUMN ${name} TEXT;`));
  if (missing.length > 0) {
    saveDatabase();
  }
}

// 第一版之後才加入 members 的欄位。既有的資料庫在這裡補上；新安裝的資料庫在 createSchema() 就已經有了。
export function migrateMemberColumns(): void {
  const columns = queryAll<{ name: string }>('PRAGMA table_info(members)').map((column) => column.name);
  if (!columns.includes('deceased')) {
    db().run('ALTER TABLE members ADD COLUMN deceased INTEGER NOT NULL DEFAULT 0;');
    // 加這個欄位之前沒有過世紀錄：生於 100 年以前的人一律視為已故。
    db().run('UPDATE members SET deceased = 1 WHERE CAST(substr(birthday, 1, 4) AS INTEGER) <= ?;', [
      new Date().getFullYear() - 100,
    ]);
    saveDatabase();
  }
}

// 很早期的版本（還沒有世系功能）的 members 表沒有 generation、parent_id，資料結構完全不同，無法逐欄升級。
// 遇到時先把整個資料庫快照到 backups/，再重建 members / branches；其他資料表保持不動。
// 除此之外的結構變更一律用 ALTER TABLE 等方式保留資料（見上方的 migrate*Columns），絕對不要刪除使用者資料。
export function migrateLegacyMembers(seedDemo: boolean): void {
  const columns = queryAll<{ name: string }>('PRAGMA table_info(members)').map((column) => column.name);
  if (columns.includes('generation') && columns.includes('parent_id')) {
    return;
  }

  snapshotDatabase('before-genealogy-upgrade');
  withoutForeignKeys(() => {
    db().run('DROP TABLE IF EXISTS members;');
    db().run('DROP TABLE IF EXISTS branches;');
    createSchema();
    db().run('DELETE FROM dues_payments WHERE member_id NOT IN (SELECT id FROM members);');
  });
  if (seedDemo) {
    seedDemoMembers();
  }
  saveDatabase();
}

// 把舊版只有總額的 finance_records 換成「會費名單 + 收支明細」。
// 舊的總額轉成一筆「上期結轉」收入，結餘維持不變。
export function migrateFinanceIfNeeded(seedDemo: boolean): void {
  if (getMeta('finance_version') === FINANCE_VERSION) {
    return;
  }

  const hasLegacyTable = queryOne('SELECT name FROM sqlite_master WHERE type = ? AND name = ?', [
    'table',
    'finance_records',
  ]);
  const legacyTotal = hasLegacyTable ? Number(queryScalar('SELECT COALESCE(SUM(amount), 0) FROM finance_records')) : 0;

  if (queryScalar('SELECT COUNT(*) FROM finance_transactions') === 0) {
    if (seedDemo) {
      seedDemoFinance(legacyTotal);
    } else if (legacyTotal > 0) {
      insertTransaction({
        type: 'income',
        category: '上期結轉',
        item: '舊版系統結餘轉入',
        amount: Math.round(legacyTotal),
        txDate: `${new Date().getFullYear() - 1}-01-01`,
        note: null,
      });
    }
  }
  db().run('DROP TABLE IF EXISTS finance_records;');
  setMeta('finance_version', FINANCE_VERSION);
  saveDatabase();
}
