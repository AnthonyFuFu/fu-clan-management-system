import type { DashboardStats } from '../../shared/types';
import { queryScalar } from './connection';
import { getBalanceUntil } from './finance';

export function getDashboardStats(): DashboardStats {
  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  return {
    memberCount: Number(queryScalar('SELECT COUNT(*) AS count FROM members')),
    branchCount: Number(queryScalar('SELECT COUNT(*) AS count FROM branches')),
    monthlyEventCount: Number(
      queryScalar('SELECT COUNT(*) AS count FROM events WHERE event_date LIKE ?', [`${monthPrefix}%`])
    ),
    financeTotal: getBalanceUntil(null),
  };
}
