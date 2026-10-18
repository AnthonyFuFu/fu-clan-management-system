// @vitest-environment node
import fs from 'fs';
import os from 'os';
import path from 'path';
import * as database from '../../electron/db';

test('settings default, persist across restarts, and reject invalid values', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fu-clan-test-'));
  await database.initDatabase(dir);
  expect(database.getSettings()).toEqual({ fontSize: 'standard', reminderDays: 3 });

  expect(database.updateSettings({ fontSize: 'larger' })).toEqual({ fontSize: 'larger', reminderDays: 3 });
  expect(database.updateSettings({ reminderDays: 0 })).toEqual({ fontSize: 'larger', reminderDays: 0 });
  database.saveDatabase();

  // 重新開啟資料庫後設定仍在
  await database.initDatabase(dir);
  expect(database.getSettings()).toEqual({ fontSize: 'larger', reminderDays: 0 });

  expect(() => database.updateSettings({ reminderDays: 31 })).toThrow('提醒天數必須是 0–30 的整數');
  expect(() => database.updateSettings({ reminderDays: 1.5 })).toThrow('提醒天數');
  expect(() => database.updateSettings({ fontSize: 'huge' as never })).toThrow('文字大小不正確');
  // 不合法的更新不會改到既有設定
  expect(database.getSettings()).toEqual({ fontSize: 'larger', reminderDays: 0 });
});
