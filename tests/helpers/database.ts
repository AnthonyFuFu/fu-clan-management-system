import fs from 'fs';
import os from 'os';
import path from 'path';

// 資料庫測試共用：明確要求建立範例資料（正式版預設是空白資料庫）
export const DEMO = { seedDemo: true };

// 每個測試一個暫存資料夾，不會動到實際資料
export function tempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'fu-clan-test-'));
}
