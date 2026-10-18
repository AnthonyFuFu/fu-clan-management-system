import type { ClanEvent } from './events';
import type { DocumentFile } from './documents';
import type { FinanceSummary, FinanceTransaction } from './finance';

// 首頁儀表板一次取得的所有統計，各區塊的人數若無特別註明都只算在世宗親
export interface DashboardStats {
  // 全部宗親（含已故）
  memberCount: number;
  livingCount: number;
  deceasedCount: number;
  maleCount: number;
  femaleCount: number;
  branchCount: number;
  // 依世代、分支、年齡層分組的人數；年齡層只算有填生日的人
  generationCounts: CountItem[];
  branchCounts: CountItem[];
  ageGroups: CountItem[];
  // 資料待補：沒填生日、沒有任何聯絡電話
  missingBirthdayCount: number;
  missingContactCount: number;
  upcomingBirthdays: UpcomingBirthday[];

  monthlyEventCount: number;
  yearEventCount: number;
  // 接下來 DASHBOARD_UPCOMING_DAYS 天內、還沒結束的活動
  upcomingEvents: ClanEvent[];

  // 截至今天的結餘（未來日期的收支不算）
  financeTotal: number;
  // 今年度的財務概況
  finance: FinanceSummary;
  recentTransactions: FinanceTransaction[];

  documentCount: number;
  // bytes
  documentTotalSize: number;
  latestDocument: DocumentFile | null;
}

export interface CountItem {
  label: string;
  count: number;
}

export interface UpcomingBirthday {
  id: number;
  name: string;
  generation: number;
  // 下一次生日的日期 YYYY-MM-DD
  date: string;
  // 當天滿幾歲
  age: number;
  daysUntil: number;
}
