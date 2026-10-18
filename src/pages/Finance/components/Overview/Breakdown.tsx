import { Empty, Typography } from 'antd';
import type { CategoryTotal } from '@shared/types';
import { formatMoney } from '@/utils/format';

const { Text } = Typography;

interface BreakdownProps {
  rows: CategoryTotal[];
  color: string;
}

// 各類別金額占比：長條長度代表比例，滑鼠移上去顯示百分比
const Breakdown = ({ rows, color }: BreakdownProps) => {
  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  if (total === 0) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="本年度沒有資料" />;
  }
  return (
    <div>
      {rows.map((row) => (
        <div className="finance-breakdown-row" key={row.category}>
          <Text className="finance-breakdown-name">{row.category}</Text>
          <div className="finance-bar" title={`${Math.round((row.amount / total) * 100)}%`}>
            <div className="finance-bar-fill" style={{ width: `${(row.amount / total) * 100}%`, background: color }} />
          </div>
          <Text className="finance-breakdown-amount">{formatMoney(row.amount)}</Text>
        </div>
      ))}
    </div>
  );
};

export default Breakdown;
