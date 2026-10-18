// 各資料表寫入前共用的格式檢查

export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function assertDate(date: string): void {
  if (!DATE_PATTERN.test(date)) {
    throw new Error('日期格式不正確');
  }
}

// 選填文字：去掉前後空白，空字串存成 null；超過長度時回傳錯誤訊息（由呼叫端決定要拋出或收集）
export function optionalText(
  value: string | null,
  maxLength: number,
  label: string
): { text: string | null; error: string | null } {
  const text = value?.trim() ?? '';
  return {
    text: text === '' ? null : text,
    error: text.length > maxLength ? `${label}最多 ${maxLength} 個字` : null,
  };
}
