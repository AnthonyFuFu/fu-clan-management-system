import { Empty, Typography } from 'antd';
import type { CountItem } from '@shared/types';

const { Text } = Typography;

interface CountBarsProps {
  rows: CountItem[];
  color: string;
  emptyText?: string;
}

// 各組人數：長條長度以人數最多的一組為滿格，滑鼠移上去顯示占全體的百分比
const CountBars = ({ rows, color, emptyText = '沒有資料' }: CountBarsProps) => {
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  const max = Math.max(0, ...rows.map((row) => row.count));
  if (total === 0) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyText} />;
  }
  return (
    <div>
      {rows.map((row) => (
        <div className="dashboard-bar-row" key={row.label}>
          <Text className="dashboard-bar-label">{row.label}</Text>
          <div className="dashboard-bar" title={`${Math.round((row.count / total) * 100)}%`}>
            <div className="dashboard-bar-fill" style={{ width: `${(row.count / max) * 100}%`, background: color }} />
          </div>
          <Text className="dashboard-bar-count">{row.count} 人</Text>
        </div>
      ))}
    </div>
  );
};

export default CountBars;
