import React from 'react';
import { Card, Row, Col, Statistic } from 'antd';
import { UserOutlined, TeamOutlined, CalendarOutlined, BankOutlined } from '@ant-design/icons';

const Dashboard = () => {
  return (
    <div>
      <h1>傅氏宗親會管理系統</h1>
      <p>歡迎使用傅氏宗親會管理系統，以下是系統概況。</p>
      
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic
              title="宗親總人數"
              value={256}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="家族分支"
              value={12}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="本月活動"
              value={3}
              prefix={<CalendarOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="財務總額"
              value={128500}
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