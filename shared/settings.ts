import type { AppSettings, FontSize } from './types';

// 文字大小：以縮放整個畫面的方式放大（文字、按鈕、圖示一起變大，版面比例不變）
export const FONT_SIZE_OPTIONS: Array<{ value: FontSize; label: string; zoom: number }> = [
  { value: 'standard', label: '標準', zoom: 1 },
  { value: 'large', label: '大', zoom: 1.15 },
  { value: 'larger', label: '較大', zoom: 1.3 },
  { value: 'largest', label: '特大', zoom: 1.5 },
];

export function zoomFactorOf(fontSize: FontSize): number {
  return FONT_SIZE_OPTIONS.find((option) => option.value === fontSize)?.zoom ?? 1;
}

// 活動前幾天開始提醒（含當天）；0 表示只在活動當天提醒
export const MIN_REMINDER_DAYS = 0;
export const MAX_REMINDER_DAYS = 30;

export const DEFAULT_SETTINGS: AppSettings = {
  fontSize: 'standard',
  reminderDays: 3,
};
