import { db, getMeta, queryAll, queryOne, queryScalar, saveDatabase, setMeta } from './connection';
import { seedData, seedFinance } from './seed';

// Bump this whenever the members schema/seed data shape changes — triggers a reseed on existing installs.
export const SEED_VERSION = '3';

// Bump this when the finance tables need a migration — independent of SEED_VERSION so a member reseed never wipes ledger data.
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
      event_date TEXT NOT NULL
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

// Columns added to members after the first release. Existing installs get them here; new installs
// already have them from createSchema().
export function migrateMemberColumns(): void {
  const columns = queryAll<{ name: string }>('PRAGMA table_info(members)').map((column) => column.name);
  if (!columns.includes('deceased')) {
    db().run('ALTER TABLE members ADD COLUMN deceased INTEGER NOT NULL DEFAULT 0;');
    // No death records existed before this column — treat anyone born 100+ years ago as deceased.
    db().run('UPDATE members SET deceased = 1 WHERE CAST(substr(birthday, 1, 4) AS INTEGER) <= ?;', [
      new Date().getFullYear() - 100,
    ]);
    saveDatabase();
  }
}

// Existing installs may have the old (pre-genealogy) members schema — rebuild members/branches on version bump.
export function migrateMembersIfNeeded(): void {
  if (getMeta('seed_version') === SEED_VERSION) {
    return;
  }

  db().run('DROP TABLE IF EXISTS members;');
  db().run('DROP TABLE IF EXISTS branches;');
  createSchema();
  seedData();
  // Member ids are stable in MEMBER_SEED, but drop roster rows whose member no longer exists.
  db().run('DELETE FROM dues_payments WHERE member_id NOT IN (SELECT id FROM members);');
  setMeta('seed_version', SEED_VERSION);
  saveDatabase();
}

// Replaces the old single-amount finance_records table with the dues roster + transaction ledger.
// The old total is carried over as an opening-balance income so the dashboard figure is preserved.
export function migrateFinanceIfNeeded(): void {
  if (getMeta('finance_version') === FINANCE_VERSION) {
    return;
  }

  const hasLegacyTable = queryOne('SELECT name FROM sqlite_master WHERE type = ? AND name = ?', [
    'table',
    'finance_records',
  ]);
  const legacyTotal = hasLegacyTable
    ? Number(queryScalar('SELECT COALESCE(SUM(amount), 0) FROM finance_records'))
    : 0;

  if (queryScalar('SELECT COUNT(*) FROM finance_transactions') === 0) {
    seedFinance(legacyTotal);
  }
  db().run('DROP TABLE IF EXISTS finance_records;');
  setMeta('finance_version', FINANCE_VERSION);
  saveDatabase();
}
