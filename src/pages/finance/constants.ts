export const DEFAULT_DUES_AMOUNT = 1000;

export const INCOME_CATEGORIES = ['上期結轉', '樂捐', '活動收入', '利息', '其他收入'];
export const EXPENSE_CATEGORIES = ['祭祖', '活動聯誼', '獎助學金', '婚喪慰問', '行政庶務', '修繕維護', '其他支出'];

export const TRANSACTION_TYPE_LABEL: Record<TransactionType, string> = {
  income: '收入',
  expense: '支出',
};

export const DATE_FORMAT = 'YYYY-MM-DD';

export function formatMoney(amount: number): string {
  return `${amount.toLocaleString('zh-TW')} 元`;
}

// IPC rejections arrive as "Error invoking remote method 'x': Error: <message>" — keep only the cause.
export function errorMessage(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error);
  return text.replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
}
