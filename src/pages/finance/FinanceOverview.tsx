import React, { useEffect, useState } from 'react';
import { Card, Col, Empty, Progress, Row, Statistic, Typography } from 'antd';
import { formatMoney } from './constants';

const { Text } = Typography;

interface FinanceOverviewProps {
  year: number;
  version: number;
}

const INCOME_COLOR = '#3f8600';
const EXPENSE_COLOR = '#cf1322';

const Breakdown = ({ rows, color }: { rows: CategoryTotal[]; color: string }) => {
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

const FinanceOverview = ({ year, version }: FinanceOverviewProps) => {
  const [summary, setSummary] = useState<FinanceSummary | null>(null);

  useEffect(() => {
    setSummary(null);
    window.electronAPI?.getFinanceSummary(year).then(setSummary);
  }, [year, version]);

  const loading = summary === null;
  const s = summary;
  const collectRate = s && s.duesExpected > 0 ? Math.round((s.duesCollected / s.duesExpected) * 100) : 0;
  // Dues are shown as their own slice of income so the breakdown adds up to the year's total income.
  const incomeRows: CategoryTotal[] = s
    ? [{ category: '宗親會費', amount: s.duesCollected }, ...s.incomeByCategory].filter((row) => row.amount > 0)
    : [];

  const statCard = (title: string, value: number, note: string, color?: string) => (
    <Col xs={12} lg={6}>
      <Card loading={loading} className="finance-card">
        <Statistic title={title} value={value} suffix="元" styles={{ content: { color } }} />
        <Text type="secondary">{note}</Text>
      </Card>
    </Col>
  );

  return (
    <div>
      <Row gutter={[16, 16]}>
        {statCard('宗親會費', s?.duesCollected ?? 0, `應收 ${formatMoney(s?.duesExpected ?? 0)}`)}
        {statCard('其他收入', s?.otherIncome ?? 0, '樂捐、結轉等', INCOME_COLOR)}
        {statCard('支出', s?.expense ?? 0, '祭祖、活動等', EXPENSE_COLOR)}
        {statCard(
          '累計結餘',
          s?.closingBalance ?? 0,
          `至 ${year} 年底；本年度 ${(s?.yearBalance ?? 0) >= 0 ? '+' : ''}${(s?.yearBalance ?? 0).toLocaleString('zh-TW')} 元`,
          (s?.closingBalance ?? 0) < 0 ? EXPENSE_COLOR : undefined
        )}
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={8}>
          <Card loading={loading} title="會費收繳進度" className="finance-card">
            {s && (
              <div className="finance-dues-progress">
                <Progress type="circle" percent={collectRate} size={110} />
                <div>
                  <div>
                    已繳 <Text strong>{s.duesPaidCount}</Text> 人
                  </div>
                  <div>
                    未繳 <Text strong type={s.duesMemberCount > s.duesPaidCount ? 'warning' : undefined}>
                      {s.duesMemberCount - s.duesPaidCount}
                    </Text>{' '}
                    人
                  </div>
                  <Text type="secondary">未收 {formatMoney(s.duesExpected - s.duesCollected)}</Text>
                </div>
              </div>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card loading={loading} title="收入構成" className="finance-card">
            <Breakdown rows={incomeRows} color={INCOME_COLOR} />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card loading={loading} title="支出構成" className="finance-card">
            <Breakdown rows={s?.expenseByCategory ?? []} color={EXPENSE_COLOR} />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default FinanceOverview;
