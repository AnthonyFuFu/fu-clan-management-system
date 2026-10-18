import type { ReactNode } from 'react';
import { Card, Col, Empty, Progress, Row, Tag, Typography } from 'antd';
import { Link } from 'react-router-dom';
import { EXPENSE_COLOR, INCOME_COLOR } from '@/constants/colors';
import { formatMoney, formatSignedMoney } from '@/utils/format';
import { percent } from '../constants';
import type { SectionProps } from './types';

const { Text, Title } = Typography;

// 今年度：會費收繳進度、收支明細、最近收支紀錄
const FinanceSection = ({ stats, loading }: SectionProps) => {
  const finance = stats?.finance;
  const line = (label: ReactNode, amount: ReactNode, color?: string, strong?: boolean) => (
    <div className="dashboard-finance-line">
      <Text strong={strong}>{label}</Text>
      <Text strong={strong} className="dashboard-amount" style={{ color }}>
        {amount}
      </Text>
    </div>
  );

  return (
    <>
      <Title level={4} className="dashboard-section-title">
        {new Date().getFullYear()} 年度財務
      </Title>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12} lg={6}>
          <Card loading={loading} title="會費收繳進度" className="dashboard-card">
            {finance && (
              <div className="dashboard-dues-progress">
                <Progress type="circle" percent={percent(finance.duesCollected, finance.duesExpected)} size={96} />
                <div>
                  <div>
                    已繳 <Text strong>{finance.duesPaidCount}</Text> 人
                  </div>
                  <div>
                    未繳{' '}
                    <Text strong type={finance.duesMemberCount > finance.duesPaidCount ? 'warning' : undefined}>
                      {finance.duesMemberCount - finance.duesPaidCount}
                    </Text>{' '}
                    人
                  </div>
                  <Text type="secondary">應收 {formatMoney(finance.duesExpected)}</Text>
                </div>
              </div>
            )}
          </Card>
        </Col>

        <Col xs={24} md={12} lg={6}>
          <Card loading={loading} title="本年度收支" className="dashboard-card">
            {finance && (
              <>
                {line('會費收入', formatMoney(finance.duesCollected))}
                {line('其他收入', formatMoney(finance.otherIncome))}
                {line('總收入', formatMoney(finance.duesCollected + finance.otherIncome), INCOME_COLOR)}
                {line('總支出', formatMoney(finance.expense), EXPENSE_COLOR)}
                {line(
                  '本年度結餘',
                  formatSignedMoney(finance.yearBalance),
                  finance.yearBalance < 0 ? EXPENSE_COLOR : INCOME_COLOR,
                  true
                )}
              </>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            loading={loading}
            title="最近收支紀錄"
            extra={<Link to="/finance">財務管理</Link>}
            className="dashboard-card"
          >
            {stats && stats.recentTransactions.length === 0 && (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="尚無收支紀錄" />
            )}
            {stats?.recentTransactions.map((tx) => (
              <div className="dashboard-list-item" key={tx.id}>
                <Text type="secondary" className="dashboard-amount">
                  {tx.txDate}
                </Text>
                <div className="dashboard-list-main">
                  <Text>
                    <Tag>{tx.category}</Tag>
                    {tx.item}
                  </Text>
                </div>
                <Text
                  className="dashboard-amount dashboard-list-side"
                  style={{ color: tx.type === 'income' ? INCOME_COLOR : EXPENSE_COLOR }}
                >
                  {tx.type === 'income' ? '+' : '−'}
                  {formatMoney(tx.amount)}
                </Text>
              </div>
            ))}
          </Card>
        </Col>
      </Row>
    </>
  );
};

export default FinanceSection;
