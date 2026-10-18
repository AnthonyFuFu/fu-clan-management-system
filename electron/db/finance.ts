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
import { assertDate } from './validation';

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

// 會費收入算在「會費年度」而不是繳費日期，讓每一年的數字跟該年度的名單對得上。
export function getBalanceUntil(year: number): number {
  const dues = Number(
    queryScalar('SELECT COALESCE(SUM(amount_due), 0) FROM dues_payments WHERE paid_date IS NOT NULL AND year <= ?', [
      year,
    ])
  );
  const ledger = Number(
    queryScalar(
      `SELECT COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) FROM finance_transactions WHERE tx_date <= ?`,
      [`${year}-12-31`]
    )
  );
  return dues + ledger;
}

// 截至某一天手上實際有的錢：會費依繳費日期、收支依交易日期計算，
// 所以已登記但還沒到的未來收支不會算進來（首頁儀表板「目前結餘」用）
export function getBalanceAsOf(date: string): number {
  assertDate(date);
  const dues = Number(
    queryScalar(
      'SELECT COALESCE(SUM(amount_due), 0) FROM dues_payments WHERE paid_date IS NOT NULL AND paid_date <= ?',
      [date]
    )
  );
  const ledger = Number(
    queryScalar(
      `SELECT COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) FROM finance_transactions WHERE tx_date <= ?`,
      [date]
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
    // 免繳（amount_due = 0）沒有要收的錢，已繳、未繳人數都不算進去。
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

// 新年度的名單：沿用最近一個年度的名單（保留手動加入、移除的結果）；
// 沒有前一年度時，列入當年年齡在會費範圍內的人。已故的人一律不列入。
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

// 回傳列入名單的人數。
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

// paidDate 為 null 表示改回未繳。
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
  db().run('INSERT INTO finance_transactions (type, category, item, amount, tx_date, note) VALUES (?, ?, ?, ?, ?, ?)', [
    tx.type,
    tx.category.trim(),
    tx.item.trim(),
    tx.amount,
    tx.txDate,
    tx.note || null,
  ]);
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

// 會費匯出：每位在世宗親一列，包含不在該年度名單上的人（amountDue 為 null），
// 讓這份表能回答「每位在世宗親都繳了嗎？」。
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
