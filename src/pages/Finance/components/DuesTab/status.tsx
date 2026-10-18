import { Tag } from 'antd';
import type { DuesRecord } from '@shared/types';

// amountDue 0 = 減免（exempt）: on the roster, but nothing to collect.
export function isSettled(row: DuesRecord): boolean {
  return row.paidDate !== null || row.amountDue === 0;
}

export function StatusTag({ row }: { row: DuesRecord }) {
  if (row.amountDue === 0) {
    return <Tag>免繳</Tag>;
  }
  return row.paidDate ? <Tag color="green">已繳</Tag> : <Tag color="orange">未繳</Tag>;
}
