const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

let db;
let dbFilePath;

async function initDatabase(userDataPath) {
  const SQL = await initSqlJs();
  dbFilePath = path.join(userDataPath, 'clan.db');

  if (fs.existsSync(dbFilePath)) {
    db = new SQL.Database(fs.readFileSync(dbFilePath));
  } else {
    db = new SQL.Database();
    createSchema();
    seedData();
    saveDatabase();
  }

  return db;
}

function createSchema() {
  db.run(`
    CREATE TABLE IF NOT EXISTS branches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
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

// Seed data mirrors the previous hardcoded Dashboard numbers so first run looks the same.
function seedData() {
  const insertBranch = db.prepare('INSERT INTO branches (name) VALUES (?)');
  for (let i = 1; i <= 12; i += 1) {
    insertBranch.run([`第 ${i} 分支`]);
  }
  insertBranch.free();

  const insertMember = db.prepare('INSERT INTO members (name, branch_id) VALUES (?, ?)');
  for (let i = 1; i <= 256; i += 1) {
    insertMember.run([`宗親 ${i}`, (i % 12) + 1]);
  }
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

function saveDatabase() {
  fs.writeFileSync(dbFilePath, Buffer.from(db.export()));
}

function queryScalar(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  stmt.step();
  const row = stmt.getAsObject();
  stmt.free();
  return Object.values(row)[0];
}

function getDashboardStats() {
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

module.exports = { initDatabase, getDashboardStats, saveDatabase };
