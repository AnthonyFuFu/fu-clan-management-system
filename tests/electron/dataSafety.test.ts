// @vitest-environment node
import fs from 'fs';
import path from 'path';
import initSqlJs from 'sql.js';
import type { MemberInput } from '@shared/types';
import * as database from '../../electron/db';
import { db } from '../../electron/db/connection';
import { DEMO, tempDir } from '../helpers/database';

const YEAR = new Date().getFullYear();

function input(overrides: Partial<MemberInput> = {}): MemberInput {
  return {
    name: '傅真實',
    gender: 'M',
    birthday: null,
    parentId: null,
    generation: 1,
    spouseName: null,
    job: null,
    phoneNo: null,
    cellphone: null,
    branchId: null,
    deceased: false,
    ...overrides,
  };
}

describe('a production install', () => {
  test('starts with an empty database and a working dashboard', async () => {
    await database.initDatabase(tempDir());
    expect(database.listMembers({ page: 1, pageSize: 10 }).total).toBe(0);
    expect(database.getTransactions(YEAR)).toEqual([]);
    const stats = database.getDashboardStats();
    expect(stats.memberCount).toBe(0);
    expect(stats.financeTotal).toBe(0);
  });

  test('keeps the user’s members every time the database is reopened', async () => {
    const dir = tempDir();
    await database.initDatabase(dir);
    database.createMember(input());
    database.saveDatabase();

    await database.initDatabase(dir);
    await database.initDatabase(dir);
    expect(database.listMembers({ page: 1, pageSize: 10 }).rows.map((m) => m.name)).toEqual(['傅真實']);
  });
});

describe('saving', () => {
  test('writes through a temp file and leaves no temp file behind', async () => {
    const dir = tempDir();
    await database.initDatabase(dir);
    database.createMember(input());
    database.saveDatabase();
    expect(fs.readdirSync(dir).filter((name) => name.endsWith('.tmp'))).toEqual([]);

    const SQL = await initSqlJs();
    const onDisk = new SQL.Database(fs.readFileSync(path.join(dir, 'clan.db')));
    expect(onDisk.exec('SELECT name FROM members')[0].values).toEqual([['傅真實']]);
  });

  test('foreign keys are enforced, also after a save', async () => {
    await database.initDatabase(tempDir(), DEMO);
    const addOrphanDues = () =>
      db().run('INSERT INTO dues_payments (year, member_id, amount_due) VALUES (?, ?, ?)', [YEAR, 99999, 1000]);
    expect(addOrphanDues).toThrow(/FOREIGN KEY/);
    database.saveDatabase();
    expect(addOrphanDues).toThrow(/FOREIGN KEY/);
  });

  test('the demo data itself satisfies every foreign key', async () => {
    await database.initDatabase(tempDir(), DEMO);
    expect(db().exec('PRAGMA foreign_key_check')).toEqual([]);
  });
});

describe('upgrading a database from before the genealogy feature', () => {
  test('snapshots the old file before rebuilding the members table, and keeps other data', async () => {
    const dir = tempDir();
    await database.initDatabase(dir);
    database.saveEvent({
      title: '舊活動',
      eventDate: '2025-01-01',
      startTime: null,
      endTime: null,
      location: null,
      note: null,
    });
    database.saveDatabase();

    // 模擬很早期的 members 表：沒有 generation / parent_id
    const SQL = await initSqlJs();
    const file = path.join(dir, 'clan.db');
    const legacy = new SQL.Database(fs.readFileSync(file));
    legacy.run(`
      DROP TABLE members;
      CREATE TABLE members (id INTEGER PRIMARY KEY, name TEXT NOT NULL, phone TEXT);
      INSERT INTO members (name, phone) VALUES ('舊資料', '0912');
    `);
    fs.writeFileSync(file, Buffer.from(legacy.export()));

    await database.initDatabase(dir);

    const snapshots = fs.readdirSync(path.join(dir, 'backups'));
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]).toMatch(/^before-genealogy-upgrade-.*\.db$/);
    const snapshot = new SQL.Database(fs.readFileSync(path.join(dir, 'backups', snapshots[0])));
    expect(snapshot.exec('SELECT name FROM members')[0].values).toEqual([['舊資料']]);

    expect(database.listEvents('2025-01-01', '2025-01-01').map((e) => e.title)).toEqual(['舊活動']);
  });
});

test('a production upgrade carries an old finance_records total over without adding demo entries', async () => {
  const dir = tempDir();
  await database.initDatabase(dir);
  const SQL = await initSqlJs();
  const file = path.join(dir, 'clan.db');
  const legacy = new SQL.Database(fs.readFileSync(file));
  legacy.run(`
    DROP TABLE dues_payments;
    DROP TABLE finance_transactions;
    DELETE FROM meta WHERE key = 'finance_version';
    CREATE TABLE finance_records (id INTEGER PRIMARY KEY, amount REAL NOT NULL, record_date TEXT NOT NULL);
    INSERT INTO finance_records (amount, record_date) VALUES (30000.4, '2024-05-01');
  `);
  fs.writeFileSync(file, Buffer.from(legacy.export()));

  await database.initDatabase(dir);
  expect(database.getTransactions(YEAR - 1).map((t) => [t.category, t.amount])).toEqual([['上期結轉', 30000]]);
  expect(database.getTransactions(YEAR)).toEqual([]);
});

describe('deleting a member', () => {
  beforeEach(async () => {
    await database.initDatabase(tempDir());
  });

  test('removes the member together with unpaid dues rows', () => {
    const id = database.createMember(input());
    database.addDuesMember(YEAR, id, 1000);
    database.deleteMember(id);
    expect(database.listMembers({ page: 1, pageSize: 10 }).total).toBe(0);
    expect(database.getDues(YEAR)).toEqual([]);
  });

  test('refuses when the member has children', () => {
    const parent = database.createMember(input({ name: '傅父' }));
    database.createMember(input({ name: '傅子', parentId: parent }));
    expect(() => database.deleteMember(parent)).toThrow('傅父 還有子女資料');
  });

  test('refuses when the member has already paid dues', () => {
    const id = database.createMember(input());
    database.addDuesMember(YEAR, id, 1000);
    database.setDuesPaid([database.getDues(YEAR)[0].id], `${YEAR}-03-01`);
    expect(() => database.deleteMember(id)).toThrow('已有繳費紀錄');
    expect(database.listMembers({ page: 1, pageSize: 10 }).total).toBe(1);
  });
});
