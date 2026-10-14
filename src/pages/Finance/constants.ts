import type { TransactionType } from '@shared/types';

export const TRANSACTION_TYPE_LABEL: Record<TransactionType, string> = {
  income: '收入',
  expense: '支出',
};

export const INCOME_COLOR = '#3f8600';
export const EXPENSE_COLOR = '#cf1322';
