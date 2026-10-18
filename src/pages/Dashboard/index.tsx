import { Col, Row, Typography } from 'antd';
import { useApiQuery } from '@/hooks/useApiQuery';
import BirthdayCard from './components/BirthdayCard';
import FinanceSection from './components/FinanceSection';
import ReminderCard from './components/ReminderCard';
import StatCards from './components/StatCards';
import StructureSection from './components/StructureSection';
import UpcomingEventsCard from './components/UpcomingEventsCard';
import './Dashboard.css';

const { Text } = Typography;

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

function todayLabel(now: Date): string {
  return `今天是 ${now.getFullYear()} 年 ${now.getMonth() + 1} 月 ${now.getDate()} 日（星期${WEEKDAYS[now.getDay()]}）`;
}

const Dashboard = () => {
  const { data: stats, loading } = useApiQuery((api) => api.getDashboardStats(), []);
  const section = { stats, loading };

  return (
    <div>
      <div className="page-header">
        <h1>傅氏宗親會管理系統</h1>
        <Text type="secondary">{todayLabel(new Date())}</Text>
      </div>

      <StatCards {...section} />

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={8}>
          <ReminderCard {...section} />
        </Col>
        <Col xs={24} lg={8}>
          <UpcomingEventsCard {...section} />
        </Col>
        <Col xs={24} lg={8}>
          <BirthdayCard {...section} />
        </Col>
      </Row>

      <FinanceSection {...section} />
      <StructureSection {...section} />
    </div>
  );
};

export default Dashboard;
