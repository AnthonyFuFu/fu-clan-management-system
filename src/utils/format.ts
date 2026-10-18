// 資料庫與畫面統一使用的日期格式
export const DATE_FORMAT = 'YYYY-MM-DD';

export function formatMoney(amount: number): string {
  return `${amount.toLocaleString('zh-TW')} 元`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// ISO 時間字串 → 本地時間「2026-10-16 14:05」
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// 存檔成功的提示：完整路徑太長，只顯示檔名與所在資料夾名稱
export function savedFileMessage(savedTo: string | null): string | null {
  if (!savedTo) return null;
  const parts = savedTo.split(/[\\/]/).filter(Boolean);
  const file = parts[parts.length - 1];
  const folder = parts[parts.length - 2];
  return folder ? `已儲存：${file}（${folder} 資料夾）` : `已儲存：${file}`;
}

// 活動時間：「09:00–12:00」、「14:00 起」或「整天」
export function formatEventTime(event: { startTime: string | null; endTime: string | null }): string {
  if (!event.startTime) return '整天';
  return event.endTime ? `${event.startTime}–${event.endTime}` : `${event.startTime} 起`;
}
