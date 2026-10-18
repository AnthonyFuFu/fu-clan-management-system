import type { ReactNode } from 'react';
import { Card, Col, Row, Statistic, Typography } from 'antd';
import { BankOutlined, CalendarOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { EXPENSE_COLOR } from '@/constants/colors';
import { formatSignedMoney } from '@/utils/format';
import type { SectionProps } from './types';

const { Text } = Typography;

// 最上方四張數字卡片，點一下進入對應頁面
const StatCards = ({ stats: s, loading }: SectionProps) => {
  const year = new Date().getFullYear();

  const card = (title: string, value: number, icon: ReactNode, note: string, to: string, suffix?: string) => (
    <Col xs={12} lg={6}>
      <Link to={to} className="dashboard-stat-link">
        <Card loading={loading} hoverable className="dashboard-stat-card">
          <Statistic
            title={title}
            value={value}
            prefix={icon}
            suffix={suffix}
            styles={{ content: { color: value < 0 ? EXPENSE_COLOR : undefined } }}
          />
          <Text type="secondary">{note}</Text>
        </Card>
      </Link>
    </Col>
  );

  return (
    <Row gutter={[16, 16]}>
      {card(
        '宗親總人數',
        s?.memberCount ?? 0,
        <UserOutlined />,
        `在世 ${s?.livingCount ?? 0} 人・已故 ${s?.deceasedCount ?? 0} 人`,
        '/members'
      )}
      {card(
        '家族分支',
        s?.branchCount ?? 0,
        <TeamOutlined />,
        `在世宗親分布於 ${s?.generationCounts.length ?? 0} 個世代`,
        '/family-tree'
      )}
      {card(
        '本月活動',
        s?.monthlyEventCount ?? 0,
        <CalendarOutlined />,
        `今年共 ${s?.yearEventCount ?? 0} 場`,
        '/events'
      )}
      {card(
        '目前結餘',
        s?.financeTotal ?? 0,
        <BankOutlined />,
        `${year} 年度 ${formatSignedMoney(s?.finance.yearBalance ?? 0)}`,
        '/finance',
        '元'
      )}
    </Row>
  );
};

export default StatCards;
