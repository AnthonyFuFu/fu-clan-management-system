import fs from 'fs';
import path from 'path';

// 主程序的記錄檔：使用者回報問題時，可以從使用者資料夾的 logs/main.log 查到錯誤的完整內容。
// 超過 1 MB 時，舊的內容改名為 main.old.log（只保留一份），避免無限成長。
const MAX_SIZE = 1024 * 1024;

let logPath: string | null = null;

export function initLogger(dir: string): string {
  fs.mkdirSync(dir, { recursive: true });
  logPath = path.join(dir, 'main.log');
  if (fs.existsSync(logPath) && fs.statSync(logPath).size > MAX_SIZE) {
    fs.renameSync(logPath, path.join(dir, 'main.old.log'));
  }
  return logPath;
}

function write(level: 'INFO' | 'ERROR', message: string): void {
  const line = `${new Date().toISOString()} [${level}] ${message}\n`;
  if (level === 'ERROR') {
    console.error(line.trimEnd());
  }
  if (!logPath) return;
  try {
    fs.appendFileSync(logPath, line);
  } catch {
    // 記錄檔寫不進去（例如磁碟滿了）時不能讓程式跟著出錯
  }
}

export function logInfo(message: string): void {
  write('INFO', message);
}

export function logError(context: string, error: unknown): void {
  const detail = error instanceof Error ? (error.stack ?? error.message) : String(error);
  write('ERROR', `${context}: ${detail}`);
}
