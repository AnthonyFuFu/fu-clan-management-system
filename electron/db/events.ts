import type { ClanEvent, ClanEventInput } from '../../shared/types';
import { db, queryAll, queryScalar } from './connection';
import { assertDate, optionalText, TIME_PATTERN } from './validation';

const SELECT_COLUMNS = `id, title, event_date AS eventDate, start_time AS startTime, end_time AS endTime, location, note`;

// 行事曆一次取一段日期範圍（含頭尾），依日期、時間排序；整天活動排在當天最前面
export function listEvents(from: string, to: string): ClanEvent[] {
  assertDate(from);
  assertDate(to);
  return queryAll<ClanEvent>(
    `SELECT ${SELECT_COLUMNS} FROM events
      WHERE event_date BETWEEN ? AND ?
      ORDER BY event_date, COALESCE(start_time, ''), id`,
    [from, to]
  );
}

function checkedText(value: string | null, maxLength: number, label: string): string | null {
  const { text, error } = optionalText(value, maxLength, label);
  if (error) {
    throw new Error(error);
  }
  return text;
}

function normalize(input: ClanEventInput) {
  const title = input.title.trim();
  if (title === '' || title.length > 100) {
    throw new Error('活動名稱為必填，最多 100 個字');
  }
  assertDate(input.eventDate);
  if (input.startTime !== null && !TIME_PATTERN.test(input.startTime)) {
    throw new Error('開始時間格式不正確');
  }
  if (input.endTime !== null && !TIME_PATTERN.test(input.endTime)) {
    throw new Error('結束時間格式不正確');
  }
  if (input.endTime !== null && input.startTime === null) {
    throw new Error('有結束時間時必須填寫開始時間');
  }
  if (input.startTime !== null && input.endTime !== null && input.endTime <= input.startTime) {
    throw new Error('結束時間必須晚於開始時間');
  }
  return [
    title,
    input.eventDate,
    input.startTime,
    input.endTime,
    checkedText(input.location, 100, '地點'),
    checkedText(input.note, 500, '備註'),
  ];
}

export function saveEvent(input: ClanEventInput): number {
  const values = normalize(input);
  if (input.id === undefined) {
    db().run(
      'INSERT INTO events (title, event_date, start_time, end_time, location, note) VALUES (?, ?, ?, ?, ?, ?)',
      values
    );
    return Number(queryScalar('SELECT last_insert_rowid()'));
  }
  db().run(
    'UPDATE events SET title = ?, event_date = ?, start_time = ?, end_time = ?, location = ?, note = ? WHERE id = ?',
    [...values, input.id]
  );
  if (db().getRowsModified() === 0) {
    throw new Error('活動不存在');
  }
  return input.id;
}

export function deleteEvent(id: number): void {
  db().run('DELETE FROM events WHERE id = ?', [id]);
}
