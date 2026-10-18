// 儀表板圖表配色
export const MALE_COLOR = '#1677ff';
export const FEMALE_COLOR = '#eb2f96';
export const GENERATION_COLOR = '#722ed1';
export const BRANCH_COLOR = '#13c2c2';
export const AGE_COLOR = '#fa8c16';

export function percent(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}
