// 全系統共用的語意色。色碼定義在 src/App.css 的 :root（CSS 與元件 style 用同一份），
// 這裡用 CSS 變數引用，給需要在 style 屬性或 antd 元件上指定顏色的地方使用。
export const INCOME_COLOR = 'var(--color-income)';
export const EXPENSE_COLOR = 'var(--color-expense)';

// 距離今天的天數 → antd Tag 顏色：今天紅色、明天橘色、之後藍色（活動提醒、儀表板共用）
export function dayTagColor(days: number): string {
  if (days <= 0) return 'red';
  if (days === 1) return 'orange';
  return 'blue';
}
