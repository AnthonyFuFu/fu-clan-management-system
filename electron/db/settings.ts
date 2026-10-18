import { DEFAULT_SETTINGS, FONT_SIZE_OPTIONS, MAX_REMINDER_DAYS, MIN_REMINDER_DAYS } from '../../shared/settings';
import type { AppSettings, FontSize } from '../../shared/types';
import { getMeta, setMeta } from './connection';

// 設定存在 meta 資料表（key / value），與宗親資料一起備份
const KEYS: Record<keyof AppSettings, string> = {
  fontSize: 'setting.font_size',
  reminderDays: 'setting.reminder_days',
};

function isFontSize(value: unknown): value is FontSize {
  return FONT_SIZE_OPTIONS.some((option) => option.value === value);
}

function isReminderDays(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= MIN_REMINDER_DAYS && (value as number) <= MAX_REMINDER_DAYS;
}

// 沒設定過、或存的值不合法時使用預設值
export function getSettings(): AppSettings {
  const fontSize = getMeta(KEYS.fontSize);
  const reminderDays = Number(getMeta(KEYS.reminderDays));
  return {
    fontSize: isFontSize(fontSize) ? fontSize : DEFAULT_SETTINGS.fontSize,
    reminderDays: getMeta(KEYS.reminderDays) !== null && isReminderDays(reminderDays) ? reminderDays : DEFAULT_SETTINGS.reminderDays,
  };
}

export function updateSettings(patch: Partial<AppSettings>): AppSettings {
  if (patch.fontSize !== undefined && !isFontSize(patch.fontSize)) {
    throw new Error('文字大小不正確');
  }
  if (patch.reminderDays !== undefined && !isReminderDays(patch.reminderDays)) {
    throw new Error(`提醒天數必須是 ${MIN_REMINDER_DAYS}–${MAX_REMINDER_DAYS} 的整數`);
  }
  if (patch.fontSize !== undefined) setMeta(KEYS.fontSize, patch.fontSize);
  if (patch.reminderDays !== undefined) setMeta(KEYS.reminderDays, String(patch.reminderDays));
  return getSettings();
}
