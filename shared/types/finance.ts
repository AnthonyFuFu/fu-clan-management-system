// 財務

export interface DuesRecord {
  id: number;
  year: number;
  memberId: number;
  name: string;
  generation: number;
  // 0 = 減免（免繳）：仍在名單上，但沒有要收的金額
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

// 沒有 id 時新增，有 id 時更新
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
  // 截至 `year` 年底的累計結餘（含之前所有年度）
  closingBalance: number;
  incomeByCategory: CategoryTotal[];
  expenseByCategory: CategoryTotal[];
}
