import fs from 'fs';
import path from 'path';
import initSqlJs, { Database, SqlValue } from 'sql.js';

export interface DashboardStats {
  memberCount: SqlValue;
  branchCount: SqlValue;
  monthlyEventCount: SqlValue;
  financeTotal: number;
}

export interface MemberSummary {
  id: number;
  name: string;
  generation: number;
}

export type FamilyRelation = 'self' | 'ancestor' | 'descendant' | 'sibling';

export interface FamilyTreeNode {
  id: number;
  name: string;
  gender: 'M' | 'F';
  birthday: string | null;
  job: string | null;
  phoneNo: string | null;
  cellphone: string | null;
  spouseName: string | null;
  generation: number;
  parentId: number | null;
  relation: FamilyRelation;
  distance: number;
}

export interface FamilyTreeResult {
  focus: FamilyTreeNode;
  nodes: FamilyTreeNode[];
}

export interface DuesRecord {
  id: number;
  year: number;
  memberId: number;
  name: string;
  generation: number;
  amountDue: number;
  paidDate: string | null;
  note: string | null;
}

export type TransactionType = 'income' | 'expense';

export interface FinanceTransaction {
  id: number;
  type: TransactionType;
  category: string;
  item: string;
  amount: number;
  txDate: string;
  note: string | null;
}

export type FinanceTransactionInput = Omit<FinanceTransaction, 'id'> & { id?: number };

export interface CategoryTotal {
  category: string;
  amount: number;
}

export interface FinanceSummary {
  year: number;
  duesMemberCount: number;
  duesPaidCount: number;
  duesExpected: number;
  duesCollected: number;
  otherIncome: number;
  expense: number;
  yearBalance: number;
  // Cumulative balance as of the end of `year` (all earlier years included).
  closingBalance: number;
  incomeByCategory: CategoryTotal[];
  expenseByCategory: CategoryTotal[];
}

interface MemberRow {
  id: number;
  name: string;
  gender: string;
  birthday: string | null;
  parent_id: number | null;
  phone_no: string | null;
  cellphone: string | null;
  job: string | null;
  spouse_name: string | null;
  generation: number;
  branch_id: number | null;
}

// Bump this whenever the members schema/seed data shape changes — triggers a reseed on existing installs.
const SEED_VERSION = '3';
// Bump this when the finance tables need a migration — independent of SEED_VERSION so a member reseed never wipes ledger data.
const FINANCE_VERSION = '1';
const DEFAULT_DUES_AMOUNT = 1000;
// Default dues roster for a year with no previous roster: members aged within this range that year.
const DUES_MIN_AGE = 20;
const DUES_MAX_AGE = 99;
// How many generations up/down a family tree query is allowed to walk.
const MAX_GENERATION_SPAN = 3;
// Degree-of-kinship safety cap — nodes further than this are never returned even if MAX_GENERATION_SPAN grows later.
const MAX_DISPLAY_DISTANCE = 6;

let db: Database;
let dbFilePath: string;

export async function initDatabase(userDataPath: string): Promise<Database> {
  const SQL = await initSqlJs();
  dbFilePath = path.join(userDataPath, 'clan.db');

  if (fs.existsSync(dbFilePath)) {
    db = new SQL.Database(fs.readFileSync(dbFilePath));
    createSchema();
    migrateIfNeeded();
  } else {
    db = new SQL.Database();
    createSchema();
    seedData();
    setMeta('seed_version', SEED_VERSION);
    saveDatabase();
  }
  migrateFinanceIfNeeded();

  return db;
}

function createSchema(): void {
  db.run(`
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
      branch_id INTEGER REFERENCES branches(id)
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
  `);
}

// Existing installs may have the old (pre-genealogy) members schema — rebuild members/branches on version bump.
function migrateIfNeeded(): void {
  if (getMeta('seed_version') === SEED_VERSION) {
    return;
  }

  db.run('DROP TABLE IF EXISTS members;');
  db.run('DROP TABLE IF EXISTS branches;');
  createSchema();
  seedData();
  // Member ids are stable in MEMBER_SEED, but drop roster rows whose member no longer exists.
  db.run('DELETE FROM dues_payments WHERE member_id NOT IN (SELECT id FROM members);');
  setMeta('seed_version', SEED_VERSION);
  saveDatabase();
}

// Replaces the old single-amount finance_records table with the dues roster + transaction ledger.
// The old total is carried over as an opening-balance income so the dashboard figure is preserved.
function migrateFinanceIfNeeded(): void {
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
  db.run('DROP TABLE IF EXISTS finance_records;');
  setMeta('finance_version', FINANCE_VERSION);
  saveDatabase();
}

function getMeta(key: string): string | null {
  const row = queryOne<{ value: string }>('SELECT value FROM meta WHERE key = ?', [key]);
  return row ? row.value : null;
}

function setMeta(key: string, value: string): void {
  db.run('INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [
    key,
    value,
  ]);
}

// Hand-authored test genealogy: a single trunk (generation 1-14), branching out toward the
// present (generation 15-19) so the family-tree feature has siblings/cousins to render.
const MEMBER_SEED: Array<{
  id: number;
  name: string;
  gender: 'M' | 'F';
  generation: number;
  parentId: number | null;
  spouseName: string | null;
}> = [
  { id: 1, name: '傅開基', gender: 'M', generation: 1, parentId: null, spouseName: '林氏' },
  { id: 2, name: '傅文宗', gender: 'M', generation: 2, parentId: 1, spouseName: '陳氏' },
  { id: 3, name: '傅世昌', gender: 'M', generation: 3, parentId: 2, spouseName: '王氏' },
  { id: 4, name: '傅本立', gender: 'M', generation: 4, parentId: 3, spouseName: '李氏' },
  { id: 5, name: '傅德厚', gender: 'M', generation: 5, parentId: 4, spouseName: '張氏' },
  { id: 6, name: '傅宏毅', gender: 'M', generation: 6, parentId: 5, spouseName: '黃氏' },
  { id: 7, name: '傅永錫', gender: 'M', generation: 7, parentId: 6, spouseName: '吳氏' },
  { id: 8, name: '傅家聲', gender: 'M', generation: 8, parentId: 7, spouseName: '劉氏' },
  { id: 9, name: '傅紹祖', gender: 'M', generation: 9, parentId: 8, spouseName: '蔡氏' },
  { id: 10, name: '傅嗣興', gender: 'M', generation: 10, parentId: 9, spouseName: '楊氏' },
  { id: 11, name: '傅肇基', gender: 'M', generation: 11, parentId: 10, spouseName: '許氏' },
  { id: 12, name: '傅振邦', gender: 'M', generation: 12, parentId: 11, spouseName: '鄭氏' },
  { id: 13, name: '傅廷選', gender: 'M', generation: 13, parentId: 12, spouseName: '謝氏' },
  { id: 14, name: '傅國棟', gender: 'M', generation: 14, parentId: 13, spouseName: '郭氏' },

  { id: 15, name: '傅建民', gender: 'M', generation: 15, parentId: 14, spouseName: '洪秀蓮' },
  { id: 16, name: '傅建邦', gender: 'M', generation: 15, parentId: 14, spouseName: '曾淑芬' },

  { id: 17, name: '傅志成', gender: 'M', generation: 16, parentId: 15, spouseName: '林美玲' },
  { id: 18, name: '傅志華', gender: 'M', generation: 16, parentId: 15, spouseName: '陳雪娥' },
  { id: 19, name: '傅志平', gender: 'M', generation: 16, parentId: 16, spouseName: '黃惠珠' },

  { id: 20, name: '傅俊宏', gender: 'M', generation: 17, parentId: 17, spouseName: '王淑娟' },
  { id: 21, name: '傅俊傑', gender: 'M', generation: 17, parentId: 17, spouseName: '李佳蓉' },
  { id: 22, name: '傅俊賢', gender: 'M', generation: 17, parentId: 18, spouseName: '張雅芳' },
  { id: 23, name: '傅俊文', gender: 'M', generation: 17, parentId: 19, spouseName: '吳怡如' },

  { id: 24, name: '傅冠宇', gender: 'M', generation: 18, parentId: 20, spouseName: '蔡依婷' },
  { id: 25, name: '傅雅婷', gender: 'F', generation: 18, parentId: 20, spouseName: '陳建宏' },
  { id: 26, name: '傅柏宏', gender: 'M', generation: 18, parentId: 21, spouseName: '林芳瑜' },
  { id: 27, name: '傅怡君', gender: 'F', generation: 18, parentId: 22, spouseName: '林志偉' },
  { id: 28, name: '傅彥廷', gender: 'M', generation: 18, parentId: 23, spouseName: '黃思婷' },

  { id: 29, name: '傅宗翰', gender: 'M', generation: 19, parentId: 24, spouseName: null },
  { id: 30, name: '傅宗義', gender: 'M', generation: 19, parentId: 24, spouseName: null },
  { id: 31, name: '傅宗翔', gender: 'M', generation: 19, parentId: 26, spouseName: null },
  { id: 32, name: '傅宗儒', gender: 'M', generation: 19, parentId: 26, spouseName: null },
  { id: 33, name: '傅宗霖', gender: 'M', generation: 19, parentId: 28, spouseName: null },
  { id: 34, name: '傅宗謙', gender: 'M', generation: 19, parentId: 28, spouseName: null },
];

const HISTORICAL_JOBS = ['務農', '私塾先生', '地方仕紳', '商人'];
const MODERN_JOBS = ['工程師', '教師', '醫師', '商人', '學生', '公務員'];

function seedData(): void {
  const insertBranch = db.prepare('INSERT INTO branches (name) VALUES (?)');
  for (let i = 1; i <= 12; i += 1) {
    insertBranch.run([`第 ${i} 分支`]);
  }
  insertBranch.free();

  const insertMember = db.prepare(`
    INSERT INTO members (id, name, gender, birthday, parent_id, phone_no, cellphone, job, spouse_name, generation)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  MEMBER_SEED.forEach((member, index) => {
    const isModern = member.generation >= 16;
    const birthYear = 2005 - (19 - member.generation) * 25;
    const birthday = `${birthYear}-06-15`;
    const phoneNo = isModern ? `04-${2300 + member.id}` : null;
    const cellphone = isModern ? `09${String(10000000 + member.id).slice(0, 8)}` : null;
    const jobPool = isModern ? MODERN_JOBS : HISTORICAL_JOBS;
    const job = jobPool[index % jobPool.length];

    insertMember.run([
      member.id,
      member.name,
      member.gender,
      birthday,
      member.parentId,
      phoneNo,
      cellphone,
      job,
      member.spouseName,
      member.generation,
    ]);
  });
  insertMember.free();

  const now = new Date();
  const insertEvent = db.prepare('INSERT INTO events (title, event_date) VALUES (?, ?)');
  for (let i = 1; i <= 3; i += 1) {
    const eventDate = new Date(now.getFullYear(), now.getMonth(), i * 5);
    insertEvent.run([`活動 ${i}`, eventDate.toISOString().slice(0, 10)]);
  }
  insertEvent.free();
}

const DEMO_OPENING_BALANCE = 128500;

// Demo ledger for last year and this year so the finance page has something to show.
function seedFinance(openingBalance: number): void {
  const thisYear = new Date().getFullYear();
  const lastYear = thisYear - 1;

  createDuesYear(lastYear, DEFAULT_DUES_AMOUNT);
  createDuesYear(thisYear, DEFAULT_DUES_AMOUNT);

  // Last year: everyone paid except the last two on the roster. This year: roughly 60% paid so far.
  const lastYearIds = getDues(lastYear).map((row) => row.id);
  setDuesPaid(lastYearIds.slice(0, -2), `${lastYear}-02-15`);
  const thisYearIds = getDues(thisYear).map((row) => row.id);
  setDuesPaid(thisYearIds.slice(0, Math.ceil(thisYearIds.length * 0.6)), `${thisYear}-02-20`);

  const demo: FinanceTransactionInput[] = [
    {
      type: 'income',
      category: '上期結轉',
      item: '上期結餘轉入',
      amount: openingBalance > 0 ? openingBalance : DEMO_OPENING_BALANCE,
      txDate: `${lastYear}-01-01`,
      note: null,
    },
    { type: 'income', category: '樂捐', item: '春祭宗親樂捐', amount: 6000, txDate: `${lastYear}-04-04`, note: null },
    { type: 'expense', category: '祭祖', item: '春季祭祖（供品、香燭）', amount: 15000, txDate: `${lastYear}-04-04`, note: null },
    { type: 'expense', category: '獎助學金', item: '宗親子弟獎助學金', amount: 12000, txDate: `${lastYear}-08-20`, note: '4 名 × 3,000 元' },
    { type: 'expense', category: '祭祖', item: '秋季祭祖（供品、香燭）', amount: 15000, txDate: `${lastYear}-10-10`, note: null },
    { type: 'expense', category: '行政庶務', item: '文具、郵資', amount: 2300, txDate: `${lastYear}-12-15`, note: null },
    { type: 'income', category: '樂捐', item: '春祭宗親樂捐', amount: 8000, txDate: `${thisYear}-04-04`, note: null },
    { type: 'expense', category: '祭祖', item: '春季祭祖（供品、香燭）', amount: 16000, txDate: `${thisYear}-04-04`, note: null },
    { type: 'expense', category: '活動聯誼', item: '宗親聯誼餐會', amount: 24000, txDate: `${thisYear}-06-08`, note: '3 桌' },
    { type: 'expense', category: '行政庶務', item: '文具、郵資', amount: 1500, txDate: `${thisYear}-06-30`, note: null },
  ];
  demo.forEach((tx) => insertTransaction(tx));
}

// Call this after any INSERT/UPDATE/DELETE — sql.js only keeps changes in memory otherwise.
export function saveDatabase(): void {
  fs.writeFileSync(dbFilePath, Buffer.from(db.export()));
}

function queryScalar(sql: string, params: SqlValue[] = []): SqlValue {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  stmt.step();
  const row = stmt.getAsObject();
  stmt.free();
  return Object.values(row)[0];
}

function queryAll<T>(sql: string, params: SqlValue[] = []): T[] {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows: T[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as unknown as T);
  }
  stmt.free();
  return rows;
}

function queryOne<T>(sql: string, params: SqlValue[] = []): T | null {
  const rows = queryAll<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

function toNode(row: MemberRow, relation: FamilyRelation, distance: number): FamilyTreeNode {
  return {
    id: row.id,
    name: row.name,
    gender: row.gender === 'F' ? 'F' : 'M',
    birthday: row.birthday,
    job: row.job,
    phoneNo: row.phone_no,
    cellphone: row.cellphone,
    spouseName: row.spouse_name,
    generation: row.generation,
    parentId: row.parent_id,
    relation,
    distance,
  };
}

// Other children of the same parent — siblings (or, when called for an ancestor further up
// the chain, uncles/aunts/granduncles). Only called for chain nodes whose own parent is still
// within the displayed ancestor range, so the resulting nodes always have a connector to draw to.
function getSiblingsOf(node: FamilyTreeNode): FamilyTreeNode[] {
  if (node.parentId === null) {
    return [];
  }
  const siblingRows = queryAll<MemberRow>('SELECT * FROM members WHERE parent_id = ? AND id != ?', [
    node.parentId,
    node.id,
  ]);
  const siblingDistance = Math.min(node.distance + 2, MAX_DISPLAY_DISTANCE);
  return siblingRows.map((row) => toNode(row, 'sibling', siblingDistance));
}

function getAncestors(startId: number, maxLevels: number): FamilyTreeNode[] {
  const nodes: FamilyTreeNode[] = [];
  let currentId: number | null = startId;

  for (let distance = 1; distance <= maxLevels; distance += 1) {
    const current: MemberRow | null = queryOne<MemberRow>('SELECT * FROM members WHERE id = ?', [
      currentId as number,
    ]);
    if (!current || current.parent_id === null) {
      break;
    }
    const parent: MemberRow | null = queryOne<MemberRow>('SELECT * FROM members WHERE id = ?', [
      current.parent_id,
    ]);
    if (!parent) {
      break;
    }
    nodes.push(toNode(parent, 'ancestor', distance));
    currentId = parent.id;
  }

  return nodes;
}

function getDescendants(startId: number, maxLevels: number): FamilyTreeNode[] {
  const nodes: FamilyTreeNode[] = [];
  let currentLevelIds = [startId];

  for (let distance = 1; distance <= maxLevels; distance += 1) {
    if (currentLevelIds.length === 0) {
      break;
    }
    const placeholders = currentLevelIds.map(() => '?').join(',');
    const children = queryAll<MemberRow>(
      `SELECT * FROM members WHERE parent_id IN (${placeholders})`,
      currentLevelIds
    );
    if (children.length === 0) {
      break;
    }
    children.forEach((child) => nodes.push(toNode(child, 'descendant', distance)));
    currentLevelIds = children.map((child) => child.id);
  }

  return nodes;
}

// Search-based lookup instead of returning every member — keeps the picker usable once the
// clan register grows into the thousands of records.
export function searchMembers(keyword: string, limit = 20): MemberSummary[] {
  return queryAll<MemberSummary>(
    'SELECT id, name, generation FROM members WHERE name LIKE ? ORDER BY generation, id LIMIT ?',
    [`%${keyword}%`, limit]
  );
}

export function getFamilyTree(memberId: number): FamilyTreeResult | null {
  const row = queryOne<MemberRow>('SELECT * FROM members WHERE id = ?', [memberId]);
  if (!row) {
    return null;
  }

  const span = Math.min(MAX_GENERATION_SPAN, MAX_DISPLAY_DISTANCE);
  const focus = toNode(row, 'self', 0);
  const ancestors = getAncestors(memberId, span);
  const descendants = getDescendants(memberId, span);

  // Collateral kin (siblings / aunts-uncles / granduncles): only for chain nodes whose own
  // parent is still within the displayed ancestor range, so every sibling has a connector.
  const siblings = [focus, ...ancestors]
    .filter((node) => node.distance < span)
    .flatMap((node) => getSiblingsOf(node));

  return { focus, nodes: [focus, ...ancestors, ...descendants, ...siblings] };
}

export function getDashboardStats(): DashboardStats {
  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  return {
    memberCount: queryScalar('SELECT COUNT(*) AS count FROM members'),
    branchCount: queryScalar('SELECT COUNT(*) AS count FROM branches'),
    monthlyEventCount: queryScalar(
      'SELECT COUNT(*) AS count FROM events WHERE event_date LIKE ?',
      [`${monthPrefix}%`]
    ),
    financeTotal: getBalanceUntil(null),
  };
}

// ---------------------------------------------------------------------------
// Finance: annual dues roster + income/expense ledger
// ---------------------------------------------------------------------------

function assertYear(year: number): void {
  if (!Number.isInteger(year) || year < 1900 || year > 2200) {
    throw new Error(`Invalid year: ${year}`);
  }
}

function assertAmount(amount: number, allowZero: boolean): void {
  if (!Number.isInteger(amount) || amount < 0 || (!allowZero && amount === 0)) {
    throw new Error(`Invalid amount: ${amount}`);
  }
}

function assertDate(date: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`Invalid date: ${date}`);
  }
}

// sql.js has no transaction helper — run a batch atomically so a failed write never leaves half a roster.
function inTransaction<T>(work: () => T): T {
  db.run('BEGIN');
  try {
    const result = work();
    db.run('COMMIT');
    return result;
  } catch (error) {
    db.run('ROLLBACK');
    throw error;
  }
}

// Dues collected are attributed to the dues year (not the payment date) so each year's
// figures line up with that year's roster.
function getBalanceUntil(year: number | null): number {
  const duesFilter = year === null ? '' : 'AND year <= ?';
  const txFilter = year === null ? '' : 'WHERE tx_date <= ?';
  const dues = Number(
    queryScalar(
      `SELECT COALESCE(SUM(amount_due), 0) FROM dues_payments WHERE paid_date IS NOT NULL ${duesFilter}`,
      year === null ? [] : [year]
    )
  );
  const ledger = Number(
    queryScalar(
      `SELECT COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) FROM finance_transactions ${txFilter}`,
      year === null ? [] : [`${year}-12-31`]
    )
  );
  return dues + ledger;
}

export function getFinanceYears(): number[] {
  const rows = queryAll<{ year: number }>(`
    SELECT year FROM dues_payments
    UNION
    SELECT CAST(substr(tx_date, 1, 4) AS INTEGER) AS year FROM finance_transactions
    ORDER BY year DESC
  `);
  const years = rows.map((row) => row.year);
  const thisYear = new Date().getFullYear();
  if (!years.includes(thisYear)) {
    years.unshift(thisYear);
  }
  return years.sort((a, b) => b - a);
}

export function getFinanceSummary(year: number): FinanceSummary {
  assertYear(year);
  const dues = queryOne<{ memberCount: number; paidCount: number; expected: number; collected: number }>(
    // Exempt rows (amount_due = 0) have nothing to collect, so they count toward neither headcount.
    `SELECT COALESCE(SUM(CASE WHEN amount_due > 0 THEN 1 ELSE 0 END), 0) AS memberCount,
            COALESCE(SUM(CASE WHEN amount_due > 0 AND paid_date IS NOT NULL THEN 1 ELSE 0 END), 0) AS paidCount,
            COALESCE(SUM(amount_due), 0) AS expected,
            COALESCE(SUM(CASE WHEN paid_date IS NOT NULL THEN amount_due ELSE 0 END), 0) AS collected
       FROM dues_payments WHERE year = ?`,
    [year]
  );
  const byCategory = (type: TransactionType) =>
    queryAll<CategoryTotal>(
      `SELECT category, SUM(amount) AS amount FROM finance_transactions
        WHERE type = ? AND tx_date LIKE ? GROUP BY category ORDER BY amount DESC`,
      [type, `${year}-%`]
    );
  const incomeByCategory = byCategory('income');
  const expenseByCategory = byCategory('expense');
  const sum = (rows: CategoryTotal[]) => rows.reduce((total, row) => total + row.amount, 0);

  const duesCollected = dues?.collected ?? 0;
  const otherIncome = sum(incomeByCategory);
  const expense = sum(expenseByCategory);

  return {
    year,
    duesMemberCount: dues?.memberCount ?? 0,
    duesPaidCount: dues?.paidCount ?? 0,
    duesExpected: dues?.expected ?? 0,
    duesCollected,
    otherIncome,
    expense,
    yearBalance: duesCollected + otherIncome - expense,
    closingBalance: getBalanceUntil(year),
    incomeByCategory,
    expenseByCategory,
  };
}

export function getDues(year: number): DuesRecord[] {
  assertYear(year);
  return queryAll<DuesRecord>(
    `SELECT d.id, d.year, d.member_id AS memberId, m.name, m.generation,
            d.amount_due AS amountDue, d.paid_date AS paidDate, d.note
       FROM dues_payments d JOIN members m ON m.id = d.member_id
      WHERE d.year = ?
      ORDER BY m.generation, m.id`,
    [year]
  );
}

// Roster for a new year: copy the most recent earlier roster (keeps manual additions/removals),
// otherwise fall back to members within the dues age range that year.
function defaultDuesRoster(year: number): number[] {
  const previousYear = queryScalar('SELECT MAX(year) FROM dues_payments WHERE year < ?', [year]);
  if (previousYear !== null) {
    return queryAll<{ id: number }>(
      'SELECT member_id AS id FROM dues_payments WHERE year = ? AND member_id IN (SELECT id FROM members)',
      [previousYear]
    ).map((row) => row.id);
  }
  return queryAll<{ id: number }>(
    `SELECT id FROM members
      WHERE birthday IS NULL
         OR (? - CAST(substr(birthday, 1, 4) AS INTEGER)) BETWEEN ? AND ?
      ORDER BY generation, id`,
    [year, DUES_MIN_AGE, DUES_MAX_AGE]
  ).map((row) => row.id);
}

// Returns how many members were put on the roster.
export function createDuesYear(year: number, amount: number): number {
  assertYear(year);
  assertAmount(amount, true);
  const memberIds = defaultDuesRoster(year);
  return inTransaction(() => {
    const insert = db.prepare('INSERT OR IGNORE INTO dues_payments (year, member_id, amount_due) VALUES (?, ?, ?)');
    let created = 0;
    memberIds.forEach((memberId) => {
      insert.run([year, memberId, amount]);
      created += db.getRowsModified();
    });
    insert.free();
    return created;
  });
}

export function addDuesMember(year: number, memberId: number, amount: number): void {
  assertYear(year);
  assertAmount(amount, true);
  db.run('INSERT INTO dues_payments (year, member_id, amount_due) VALUES (?, ?, ?)', [year, memberId, amount]);
}

export function removeDues(id: number): void {
  db.run('DELETE FROM dues_payments WHERE id = ?', [id]);
}

// paidDate === null marks the records unpaid again.
export function setDuesPaid(ids: number[], paidDate: string | null): void {
  if (paidDate !== null) {
    assertDate(paidDate);
  }
  inTransaction(() => {
    const update = db.prepare('UPDATE dues_payments SET paid_date = ? WHERE id = ?');
    ids.forEach((id) => update.run([paidDate, id]));
    update.free();
  });
}

export function updateDues(id: number, amountDue: number, note: string | null): void {
  assertAmount(amountDue, true);
  db.run('UPDATE dues_payments SET amount_due = ?, note = ? WHERE id = ?', [amountDue, note || null, id]);
}

export function getTransactions(year: number): FinanceTransaction[] {
  assertYear(year);
  return queryAll<FinanceTransaction>(
    `SELECT id, type, category, item, amount, tx_date AS txDate, note
       FROM finance_transactions WHERE tx_date LIKE ?
      ORDER BY tx_date DESC, id DESC`,
    [`${year}-%`]
  );
}

function validateTransaction(tx: FinanceTransactionInput): void {
  if (tx.type !== 'income' && tx.type !== 'expense') {
    throw new Error(`Invalid transaction type: ${tx.type}`);
  }
  if (!tx.category.trim() || !tx.item.trim()) {
    throw new Error('Category and item are required');
  }
  assertAmount(tx.amount, false);
  assertDate(tx.txDate);
}

function insertTransaction(tx: FinanceTransactionInput): void {
  validateTransaction(tx);
  db.run(
    'INSERT INTO finance_transactions (type, category, item, amount, tx_date, note) VALUES (?, ?, ?, ?, ?, ?)',
    [tx.type, tx.category.trim(), tx.item.trim(), tx.amount, tx.txDate, tx.note || null]
  );
}

export function saveTransaction(tx: FinanceTransactionInput): void {
  if (tx.id === undefined) {
    insertTransaction(tx);
    return;
  }
  validateTransaction(tx);
  db.run(
    'UPDATE finance_transactions SET type = ?, category = ?, item = ?, amount = ?, tx_date = ?, note = ? WHERE id = ?',
    [tx.type, tx.category.trim(), tx.item.trim(), tx.amount, tx.txDate, tx.note || null, tx.id]
  );
}

export function deleteTransaction(id: number): void {
  db.run('DELETE FROM finance_transactions WHERE id = ?', [id]);
}

