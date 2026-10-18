// @vitest-environment node
import fs from 'fs';
import os from 'os';
import path from 'path';
import initSqlJs from 'sql.js';
import { toDateString } from '@shared/events';
import type { ClanEventInput } from '@shared/types';
import * as database from '../../electron/db';

function input(overrides: Partial<ClanEventInput>): ClanEventInput {
  return { title: '春季祭祖', eventDate: '2026-04-04', startTime: '09:00', endTime: '12:00', location: '傅氏宗祠', note: null, ...overrides };
}

beforeEach(async () => {
  await database.initDatabase(fs.mkdtempSync(path.join(os.tmpdir(), 'fu-clan-test-')));
});

test('a new install comes with sample events around today', () => {
  const today = new Date();
  const from = toDateString(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30));
  const to = toDateString(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 30));
  const titles = database.listEvents(from, to).map((e) => e.title);
  expect(titles).toEqual(['理監事會議', '秋季祭祖', '宗親聯誼餐會', '獎助學金頒發典禮']);
});

test('saves, lists by date range, edits and deletes events', () => {
  const id = database.saveEvent(input({ note: '  請著正式服裝  ', location: '' }));
  database.saveEvent(input({ title: '清明掃墓', startTime: null, endTime: null }));
  database.saveEvent(input({ title: '五月活動', eventDate: '2026-05-01' }));

  const april = database.listEvents('2026-04-01', '2026-04-30');
  // 整天活動排在當天最前面
  expect(april.map((e) => e.title)).toEqual(['清明掃墓', '春季祭祖']);
  expect(april[1]).toMatchObject({ id, note: '請著正式服裝', location: null });

  database.saveEvent({ ...april[1], title: '春季祭祖（改期）', eventDate: '2026-04-05' });
  expect(database.listEvents('2026-04-05', '2026-04-05')[0].title).toBe('春季祭祖（改期）');

  database.deleteEvent(id);
  expect(database.listEvents('2026-04-01', '2026-04-30').map((e) => e.title)).toEqual(['清明掃墓']);
});

test('rejects invalid events', () => {
  expect(() => database.saveEvent(input({ title: ' ' }))).toThrow('活動名稱為必填');
  expect(() => database.saveEvent(input({ eventDate: '2026/4/4' }))).toThrow('日期格式不正確');
  expect(() => database.saveEvent(input({ startTime: '9:00' }))).toThrow('開始時間格式不正確');
  expect(() => database.saveEvent(input({ startTime: null }))).toThrow('有結束時間時必須填寫開始時間');
  expect(() => database.saveEvent(input({ startTime: '12:00', endTime: '09:00' }))).toThrow('結束時間必須晚於開始時間');
  expect(() => database.saveEvent(input({ id: 99999 }))).toThrow('活動不存在');
});

test('existing databases get the new event columns and keep their events', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fu-clan-test-'));
  await database.initDatabase(dir);
  const SQL = await initSqlJs();
  const file = path.join(dir, 'clan.db');
  const legacy = new SQL.Database(fs.readFileSync(file));
  // 模擬舊版：events 只有 title、event_date
  legacy.run(`
    DROP TABLE events;
    CREATE TABLE events (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, event_date TEXT NOT NULL);
    INSERT INTO events (title, event_date) VALUES ('活動 1', '2026-10-05');
  `);
  fs.writeFileSync(file, Buffer.from(legacy.export()));

  await database.initDatabase(dir);
  expect(database.listEvents('2026-10-01', '2026-10-31')).toEqual([
    { id: 1, title: '活動 1', eventDate: '2026-10-05', startTime: null, endTime: null, location: null, note: null },
  ]);
  database.saveEvent(input({ eventDate: '2026-10-06' }));
  expect(database.listEvents('2026-10-06', '2026-10-06')[0].location).toBe('傅氏宗祠');
});
