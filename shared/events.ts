import type { ClanEvent } from './types';

// 活動前幾天開始提醒（含當天）
export const REMINDER_DAYS = 3;

const pad = (n: number) => String(n).padStart(2, '0');

// 本地日期的 YYYY-MM-DD
export function toDateString(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// 距離活動還有幾天：今天 0、明天 1…；已過去為負數
export function daysUntil(eventDate: string, now: Date): number {
  const [y, m, d] = eventDate.split('-').map(Number);
  const event = new Date(y, m - 1, d);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((event.getTime() - today.getTime()) / 86_400_000);
}

// 需要提醒的活動：今天到 REMINDER_DAYS 天後，今天已經結束的不算。依日期、時間排序。
export function upcomingEvents(events: ClanEvent[], now: Date): ClanEvent[] {
  const currentTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  return events
    .filter((event) => {
      const days = daysUntil(event.eventDate, now);
      if (days < 0 || days > REMINDER_DAYS) return false;
      if (days > 0) return true;
      // 今天：有結束時間看結束時間，只有開始時間看開始時間，整天活動整天都提醒
      const finishedAt = event.endTime ?? event.startTime;
      return finishedAt === null || finishedAt >= currentTime;
    })
    .sort(compareEvents);
}

// 依日期、開始時間排序；整天活動排在當天最前面
export function compareEvents(a: ClanEvent, b: ClanEvent): number {
  return a.eventDate.localeCompare(b.eventDate) || (a.startTime ?? '').localeCompare(b.startTime ?? '') || a.id - b.id;
}

export function relativeDayLabel(days: number): string {
  if (days === 0) return '今天';
  if (days === 1) return '明天';
  if (days === 2) return '後天';
  return `${days} 天後`;
}
