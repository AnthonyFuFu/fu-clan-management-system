import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic } from 'antd';
import { UserOutlined, TeamOutlined, CalendarOutlined, BankOutlined } from '@ant-design/icons';

// Fallback values shown when not running inside Electron (e.g. `npm start` in a plain browser)
const EMPTY_STATS: DashboardStats = {
  memberCount: 0,
  branchCount: 0,
  monthlyEventCount: 0,
  financeTotal: 0,
};

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!window.electronAPI) {
      setLoading(false);
      return;
    }

    window.electronAPI
      .getDashboardStats()
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1>傅氏宗親會管理系統</h1>
      <p>歡迎使用傅氏宗親會管理系統，以下是系統概況。</p>
      
      <Row gutter={16}>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic
              title="宗親總人數"
              value={stats.memberCount}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic
              title="家族分支"
              value={stats.branchCount}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic
              title="本月活動"
              value={stats.monthlyEventCount}
              prefix={<CalendarOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card loading={loading}>
            <Statistic
              title="財務總額"
              value={stats.financeTotal}
              prefix={<BankOutlined />}
              suffix="元"
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;