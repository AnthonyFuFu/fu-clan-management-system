// @vitest-environment node
import fs from 'fs';
import path from 'path';
import type { MemberInput } from '@shared/types';
import { tempDir } from '../helpers/database';

// 備份服務用到 Electron 的 app / shell 與資料夾選擇對話框，這裡換成假的
const userData = tempDir();
const chosenDirectory = vi.fn<() => Promise<string | null>>();

vi.mock('electron', () => ({
  app: { getPath: () => userData },
  shell: { openPath: vi.fn().mockResolvedValue('') },
}));
vi.mock('../../electron/services/dialogs', () => ({
  askDirectory: () => chosenDirectory(),
}));
vi.mock('../../electron/services/logger', () => ({ logInfo: vi.fn(), logError: vi.fn() }));

const database = await import('../../electron/db');
const backup = await import('../../electron/services/backup');
const { documentsDir } = await import('../../electron/services/documents');

const member = (name: string): MemberInput => ({
  name,
  gender: 'M',
  birthday: null,
  parentId: null,
  generation: 1,
  spouseName: null,
  job: null,
  phoneNo: null,
  cellphone: null,
  branchId: null,
  deceased: false,
});

const memberNames = () => database.listMembers({ page: 1, pageSize: 50 }).rows.map((m) => m.name);

beforeEach(async () => {
  fs.rmSync(path.join(userData, 'clan.db'), { force: true });
  fs.rmSync(path.join(userData, 'backups'), { recursive: true, force: true });
  fs.rmSync(documentsDir(), { recursive: true, force: true });
  await database.initDatabase(userData);
});

test('a backup can be restored, replacing the database and documents', async () => {
  database.createMember(member('傅備份前'));
  fs.writeFileSync(path.join(documentsDir(), 'a.pdf'), 'v1');

  const destination = tempDir();
  chosenDirectory.mockResolvedValueOnce(destination);
  const folder = await backup.exportBackup();
  expect(folder).toMatch(/傅氏宗親會備份-\d{8}-\d{6}$/);
  expect(fs.readdirSync(folder!).sort()).toEqual(['clan.db', 'documents']);

  // 備份之後又改了資料
  database.createMember(member('傅備份後'));
  fs.writeFileSync(path.join(documentsDir(), 'b.pdf'), 'v2');
  database.saveDatabase();

  chosenDirectory.mockResolvedValueOnce(folder);
  expect(await backup.restoreBackup()).toBe(true);
  expect(memberNames()).toEqual(['傅備份前']);
  expect(fs.readdirSync(documentsDir())).toEqual(['a.pdf']);

  // 還原前的資料另外保留了一份
  const safety = fs.readdirSync(path.join(userData, 'backups')).find((name) => name.startsWith('before-restore-'));
  expect(safety).toBeDefined();
  expect(fs.readdirSync(path.join(userData, 'backups', safety!, 'documents')).sort()).toEqual(['a.pdf', 'b.pdf']);
});

test('refuses a folder that is not a backup, and leaves the data alone', async () => {
  database.createMember(member('傅原本'));
  database.saveDatabase();

  const notBackup = tempDir();
  chosenDirectory.mockResolvedValueOnce(notBackup);
  await expect(backup.restoreBackup()).rejects.toThrow('找不到 clan.db');

  fs.writeFileSync(path.join(notBackup, 'clan.db'), 'not a database');
  chosenDirectory.mockResolvedValueOnce(notBackup);
  await expect(backup.restoreBackup()).rejects.toThrow('備份檔已損毀');

  expect(memberNames()).toEqual(['傅原本']);
});

test('cancelling the folder dialog does nothing', async () => {
  chosenDirectory.mockResolvedValueOnce(null);
  expect(await backup.exportBackup()).toBeNull();
  chosenDirectory.mockResolvedValueOnce(null);
  expect(await backup.restoreBackup()).toBe(false);
});

test('auto backup keeps one copy per day and only the latest 14 days', () => {
  const dir = backup.backupsDir();
  for (let day = 1; day <= 20; day += 1) {
    fs.writeFileSync(path.join(dir, `auto-2020-01-${String(day).padStart(2, '0')}.db`), '');
  }
  backup.autoBackup();
  backup.autoBackup();

  const autoBackups = fs
    .readdirSync(dir)
    .filter((name) => name.startsWith('auto-'))
    .sort();
  expect(autoBackups).toHaveLength(14);
  expect(autoBackups.at(-1)).toMatch(/^auto-\d{4}-\d{2}-\d{2}\.db$/);
  expect(autoBackups[0]).toBe('auto-2020-01-08.db');
});
