// 系統設定

export type FontSize = 'standard' | 'large' | 'larger' | 'largest';

export interface AppSettings {
  fontSize: FontSize;
  // 活動前幾天開始提醒（含當天）
  reminderDays: number;
}
