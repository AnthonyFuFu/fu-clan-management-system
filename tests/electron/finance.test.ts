// @vitest-environment node
import fs from 'fs';
import os from 'os';
import path from 'path';
import initSqlJs from 'sql.js';
import * as database from '../../electron/db';

const YEAR = new Date().getFullYear();

function tempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'fu-clan-test-'));
}

describe('fresh install', () => {
  beforeAll(async () => {
    await database.initDatabase(tempDir());
  });

  test('seeds this year’s dues roster with members aged 20–99', () => {
    const roster = database.getDues(YEAR);
    expect(roster.length).toBeGreaterThan(0);
    // 歷代先祖（第 1–15 世）早已超過 99 歲，不應出現在名單上
    expect(Math.min(...roster.map((row) => row.generation))).toBeGreaterThanOrEqual(16);
    expect(roster.every((row) => row.amountDue === 1000)).toBe(true);
  });

  test('registering a payment updates the summary', () => {
    const before = database.getFinanceSummary(YEAR);
    const unpaid = database.getDues(YEAR).find((row) => row.paidDate === null)!;

    database.setDuesPaid([unpaid.id], `${YEAR}-10-01`);

    const after = database.getFinanceSummary(YEAR);
    expect(after.duesCollected).toBe(before.duesCollected + unpaid.amountDue);
    expect(after.duesPaidCount).toBe(before.duesPaidCount + 1);
    expect(after.closingBalance).toBe(before.closingBalance + unpaid.amountDue);
  });

  test('exempt members (amount 0) count toward neither paid nor unpaid', () => {
    const before = database.getFinanceSummary(YEAR);
    const unpaid = database.getDues(YEAR).find((row) => row.paidDate === null)!;

    database.updateDues(unpaid.id, 0, '清寒免繳');

    const after = database.getFinanceSummary(YEAR);
    expect(after.duesMemberCount).toBe(before.duesMemberCount - 1);
    expect(after.duesExpected).toBe(before.duesExpected - unpaid.amountDue);
  });

  test('transactions can be added, edited and deleted', () => {
    const balance = database.getFinanceSummary(YEAR).closingBalance;
    database.saveTransaction({ type: 'expense', category: '婚喪慰問', item: '白包', amount: 2000, txDate: `${YEAR}-09-01`, note: null });
    const tx = database.getTransactions(YEAR).find((row) => row.item === '白包')!;
    expect(database.getFinanceSummary(YEAR).closingBalance).toBe(balance - 2000);

    database.saveTransaction({ ...tx, amount: 3000 });
    expect(database.getFinanceSummary(YEAR).closingBalance).toBe(balance - 3000);

    database.deleteTransaction(tx.id);
    expect(database.getFinanceSummary(YEAR).closingBalance).toBe(balance);
  });

  test('rejects invalid input', () => {
    expect(() =>
      database.saveTransaction({ type: 'expense', category: '祭祖', item: 'x', amount: -5, txDate: `${YEAR}-01-01`, note: null })
    ).toThrow();
    expect(() =>
      database.saveTransaction({ type: 'expense', category: '祭祖', item: 'x', amount: 100, txDate: '2026/01/01', note: null })
    ).toThrow();
    // 同一人同一年度只能在名單上出現一次
    const member = database.getDues(YEAR)[0];
    expect(() => database.addDuesMember(YEAR, member.memberId, 1000)).toThrow();
  });

  test('a new year copies the previous roster, including removals', () => {
    const roster = database.getDues(YEAR);
    database.removeDues(roster[roster.length - 1].id);

    const created = database.createDuesYear(YEAR + 1, 1200);
    expect(created).toBe(roster.length - 1);
    expect(database.getFinanceSummary(YEAR + 1).duesExpected).toBe(created * 1200);
    // 再開立一次不會重複加入
    expect(database.createDuesYear(YEAR + 1, 1200)).toBe(0);
  });
});

describe('upgrading a database from before the finance feature', () => {
  test('carries the old finance_records total over as an opening balance', async () => {
    const dir = tempDir();
    // 先建立一個新資料庫，再把它改回舊版：拿掉財務表、放回只有總額的 finance_records
    await database.initDatabase(dir);
    const SQL = await initSqlJs();
    const file = path.join(dir, 'clan.db');
    const legacy = new SQL.Database(fs.readFileSync(file));
    legacy.run(`
      DROP TABLE dues_payments;
      DROP TABLE finance_transactions;
      DELETE FROM meta WHERE key = 'finance_version';
      CREATE TABLE finance_records (id INTEGER PRIMARY KEY, amount REAL NOT NULL, record_date TEXT NOT NULL);
      INSERT INTO finance_records (amount, record_date) VALUES (50000, '2024-05-01');
    `);
    fs.writeFileSync(file, Buffer.from(legacy.export()));

    await database.initDatabase(dir);

    const opening = database
      .getTransactions(YEAR - 1)
      .find((row) => row.category === '上期結轉');
    expect(opening?.amount).toBe(50000);
  });
});
