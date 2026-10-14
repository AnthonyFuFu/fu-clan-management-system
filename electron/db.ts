import fs from 'fs';
import path from 'path';
import initSqlJs, { Database, SqlValue } from 'sql.js';

export interface DashboardStats {
  memberCount: SqlValue;
  branchCount: SqlValue;
  monthlyEventCount: SqlValue;
  financeTotal: SqlValue;
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
    CREATE TABLE IF NOT EXISTS finance_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL NOT NULL,
      record_date TEXT NOT NULL
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
  setMeta('seed_version', SEED_VERSION);
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

  const insertFinance = db.prepare('INSERT INTO finance_records (amount, record_date) VALUES (?, ?)');
  insertFinance.run([128500, now.toISOString().slice(0, 10)]);
  insertFinance.free();
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
    financeTotal: queryScalar('SELECT COALESCE(SUM(amount), 0) AS total FROM finance_records'),
  };
}

