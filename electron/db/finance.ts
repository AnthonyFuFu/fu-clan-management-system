import { DUES_MAX_AGE, DUES_MIN_AGE } from '../../shared/finance';
import type {
  CategoryTotal,
  DuesRecord,
  FinanceSummary,
  FinanceTransaction,
  FinanceTransactionInput,
  TransactionType,
} from '../../shared/types';
import { db, inTransaction, queryAll, queryOne, queryScalar } from './connection';

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

// Dues collected are attributed to the dues year (not the payment date) so each year's
// figures line up with that year's roster.
export function getBalanceUntil(year: number | null): number {
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
// otherwise fall back to members within the dues age range that year. Deceased members are never included.
function defaultDuesRoster(year: number): number[] {
  const previousYear = queryScalar('SELECT MAX(year) FROM dues_payments WHERE year < ?', [year]);
  if (previousYear !== null) {
    return queryAll<{ id: number }>(
      'SELECT member_id AS id FROM dues_payments WHERE year = ? AND member_id IN (SELECT id FROM members WHERE deceased = 0)',
      [previousYear]
    ).map((row) => row.id);
  }
  return queryAll<{ id: number }>(
    `SELECT id FROM members
      WHERE deceased = 0
        AND (birthday IS NULL OR (? - CAST(substr(birthday, 1, 4) AS INTEGER)) BETWEEN ? AND ?)
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
    const insert = db().prepare('INSERT OR IGNORE INTO dues_payments (year, member_id, amount_due) VALUES (?, ?, ?)');
    let created = 0;
    memberIds.forEach((memberId) => {
      insert.run([year, memberId, amount]);
      created += db().getRowsModified();
    });
    insert.free();
    return created;
  });
}

export function addDuesMember(year: number, memberId: number, amount: number): void {
  assertYear(year);
  assertAmount(amount, true);
  db().run('INSERT INTO dues_payments (year, member_id, amount_due) VALUES (?, ?, ?)', [year, memberId, amount]);
}

export function removeDues(id: number): void {
  db().run('DELETE FROM dues_payments WHERE id = ?', [id]);
}

// paidDate === null marks the records unpaid again.
export function setDuesPaid(ids: number[], paidDate: string | null): void {
  if (paidDate !== null) {
    assertDate(paidDate);
  }
  inTransaction(() => {
    const update = db().prepare('UPDATE dues_payments SET paid_date = ? WHERE id = ?');
    ids.forEach((id) => update.run([paidDate, id]));
    update.free();
  });
}

export function updateDues(id: number, amountDue: number, note: string | null): void {
  assertAmount(amountDue, true);
  db().run('UPDATE dues_payments SET amount_due = ?, note = ? WHERE id = ?', [amountDue, note || null, id]);
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

export function insertTransaction(tx: FinanceTransactionInput): void {
  validateTransaction(tx);
  db().run(
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
  db().run(
    'UPDATE finance_transactions SET type = ?, category = ?, item = ?, amount = ?, tx_date = ?, note = ? WHERE id = ?',
    [tx.type, tx.category.trim(), tx.item.trim(), tx.amount, tx.txDate, tx.note || null, tx.id]
  );
}

export function deleteTransaction(id: number): void {
  db().run('DELETE FROM finance_transactions WHERE id = ?', [id]);
}

// One row per living member for the dues export — including members not on that year's roster
// (amountDue is null for them), so the sheet answers "has every living clan member paid?".
export interface LivingDuesStatus {
  name: string;
  generation: number;
  gender: string;
  cellphone: string | null;
  phoneNo: string | null;
  branchName: string | null;
  amountDue: number | null;
  paidDate: string | null;
  note: string | null;
}

export function getLivingDuesStatus(year: number): LivingDuesStatus[] {
  assertYear(year);
  return queryAll<LivingDuesStatus>(
    `SELECT m.name, m.generation, m.gender, m.cellphone, m.phone_no AS phoneNo, b.name AS branchName,
            d.amount_due AS amountDue, d.paid_date AS paidDate, d.note
       FROM members m
       LEFT JOIN dues_payments d ON d.member_id = m.id AND d.year = ?
       LEFT JOIN branches b ON b.id = m.branch_id
      WHERE m.deceased = 0
      ORDER BY m.generation, m.id`,
    [year]
  );
}
