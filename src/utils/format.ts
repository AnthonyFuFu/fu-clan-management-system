// 資料庫與畫面統一使用的日期格式
export const DATE_FORMAT = 'YYYY-MM-DD';

export function formatMoney(amount: number): string {
  return `${amount.toLocaleString('zh-TW')} 元`;
}
