// @vitest-environment node
import fs from 'fs';
import path from 'path';
import { initLogger, logError, logInfo } from '../../electron/services/logger';
import { tempDir } from '../helpers/database';

test('writes info and error lines, including the stack trace', () => {
  const dir = tempDir();
  const file = initLogger(dir);
  vi.spyOn(console, 'error').mockImplementation(() => {});

  logInfo('啟動');
  logError('IPC saveEvent', new Error('日期格式不正確'));

  const content = fs.readFileSync(file, 'utf8');
  expect(content).toMatch(/\[INFO\] 啟動/);
  expect(content).toMatch(/\[ERROR\] IPC saveEvent: Error: 日期格式不正確\n\s+at /);
});

test('rotates a log file that has grown past 1 MB', () => {
  const dir = tempDir();
  fs.writeFileSync(path.join(dir, 'main.log'), 'x'.repeat(1024 * 1024 + 1));
  initLogger(dir);
  expect(fs.existsSync(path.join(dir, 'main.old.log'))).toBe(true);
  expect(fs.existsSync(path.join(dir, 'main.log'))).toBe(false);
});
