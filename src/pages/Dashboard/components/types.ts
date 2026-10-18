import type { DashboardStats } from '@shared/types';

// 儀表板各區塊共用的 props：stats 在第一次載入完成前為 undefined
export interface SectionProps {
  stats: DashboardStats | undefined;
  loading: boolean;
}
