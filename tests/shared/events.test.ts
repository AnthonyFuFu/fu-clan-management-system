import { daysUntil, relativeDayLabel, upcomingEvents } from '@shared/events';
import type { ClanEvent } from '@shared/types';

// 固定「現在」為 2026-10-18（星期日）14:30
const NOW = new Date(2026, 9, 18, 14, 30);

function event(
  id: number,
  eventDate: string,
  startTime: string | null = null,
  endTime: string | null = null
): ClanEvent {
  return { id, title: `活動${id}`, eventDate, startTime, endTime, location: null, note: null };
}

test('counts days by calendar date, not by 24-hour periods', () => {
  expect(daysUntil('2026-10-18', NOW)).toBe(0);
  expect(daysUntil('2026-10-19', NOW)).toBe(1);
  expect(daysUntil('2026-10-21', NOW)).toBe(3);
  expect(daysUntil('2026-10-17', NOW)).toBe(-1);
  // 跨月
  expect(daysUntil('2026-11-01', new Date(2026, 9, 31, 23, 59))).toBe(1);
});

test('reminds from 3 days before until the event is over', () => {
  const events = [
    event(1, '2026-10-17'), // 昨天
    event(2, '2026-10-18', '09:00', '12:00'), // 今天，已結束
    event(3, '2026-10-18', '13:00'), // 今天，只有開始時間且已過
    event(4, '2026-10-18', '14:00', '16:00'), // 今天，進行中
    event(5, '2026-10-18'), // 今天，整天
    event(6, '2026-10-21', '18:00'), // 3 天後
    event(7, '2026-10-22'), // 4 天後，還不用提醒
  ];
  expect(upcomingEvents(events, NOW, 3).map((e) => e.id)).toEqual([5, 4, 6]);
});

test('the reminder window follows the configured number of days', () => {
  const events = [event(1, '2026-10-18'), event(2, '2026-10-19'), event(3, '2026-10-25'), event(4, '2026-10-26')];
  // 0 天：只提醒當天
  expect(upcomingEvents(events, NOW, 0).map((e) => e.id)).toEqual([1]);
  expect(upcomingEvents(events, NOW, 1).map((e) => e.id)).toEqual([1, 2]);
  expect(upcomingEvents(events, NOW, 7).map((e) => e.id)).toEqual([1, 2, 3]);
});

test('labels relative days', () => {
  expect([0, 1, 2, 3].map(relativeDayLabel)).toEqual(['今天', '明天', '後天', '3 天後']);
});
