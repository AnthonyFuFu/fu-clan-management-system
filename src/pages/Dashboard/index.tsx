import React, { useEffect, useState } from 'react';
import { Card, Col, Empty, Progress, Row, Statistic, Tag, Typography } from 'antd';
import {
  BankOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  EnvironmentOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  GiftOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { DASHBOARD_UPCOMING_DAYS, daysUntil, relativeDayLabel } from '@shared/events';
import type { DashboardStats } from '@shared/types';
import DesktopOnlyNotice from '@/components/DesktopOnlyNotice';
import { EXPENSE_COLOR, INCOME_COLOR } from '@/pages/Finance/constants';
import { formatDateTime, formatEventTime, formatFileSize, formatMoney } from '@/utils/format';
import CountBars from './components/CountBars';
import './Dashboard.css';

const { Text, Title } = Typography;

const PAGE_TITLE = '傅氏宗親會管理系統';
const MALE_COLOR = '#1677ff';
const FEMALE_COLOR = '#eb2f96';
const GENERATION_COLOR = '#722ed1';
const BRANCH_COLOR = '#13c2c2';
const AGE_COLOR = '#fa8c16';
// 越近越醒目：今天紅色、明天橘色、之後藍色（與活動提醒一致）
const DAY_COLOR = ['red', 'orange', 'blue'];
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

type Level = 'warning' | 'success' | 'info';

interface Reminder {
  key: string;
  level: Level;
  text: string;
  to: string;
}

const LEVEL_ICON: Record<Level, React.ReactNode> = {
  warning: <ExclamationCircleOutlined style={{ color: '#faad14' }} />,
  success: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
  info: <FileTextOutlined style={{ color: '#1677ff' }} />,
};

function todayLabel(now: Date): string {
  return `今天是 ${now.getFullYear()} 年 ${now.getMonth() + 1} 月 ${now.getDate()} 日（星期${WEEKDAYS[now.getDay()]}）`;
}

function signedMoney(amount: number): string {
  return `${amount >= 0 ? '+' : '−'}${formatMoney(Math.abs(amount))}`;
}

function percent(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

// 需要處理的事情排前面，其餘為資訊
function buildReminders(s: DashboardStats): Reminder[] {
  const { finance } = s;
  const reminders: Reminder[] = [];
  const unpaid = finance.duesMemberCount - finance.duesPaidCount;

  if (finance.duesMemberCount === 0 && finance.duesExpected === 0) {
    reminders.push({ key: 'dues', level: 'warning', text: `尚未開立 ${finance.year} 年度會費名單`, to: '/finance' });
  } else if (unpaid > 0) {
    reminders.push({
      key: 'dues',
      level: 'warning',
      text: `${finance.year} 年度會費尚有 ${unpaid} 人未繳，未收 ${formatMoney(finance.duesExpected - finance.duesCollected)}`,
      to: '/finance',
    });
  } else {
    reminders.push({ key: 'dues', level: 'success', text: `${finance.year} 年度會費已全數收齊`, to: '/finance' });
  }
  if (s.financeTotal < 0) {
    reminders.push({ key: 'balance', level: 'warning', text: `財務結餘為負數（${formatMoney(s.financeTotal)}）`, to: '/finance' });
  }
  if (s.missingContactCount > 0) {
    reminders.push({ key: 'contact', level: 'warning', text: `${s.missingContactCount} 位在世宗親沒有聯絡電話`, to: '/members' });
  }
  if (s.missingBirthdayCount > 0) {
    reminders.push({ key: 'birthday', level: 'warning', text: `${s.missingBirthdayCount} 位在世宗親未填生日`, to: '/members' });
  }
  reminders.push({
    key: 'documents',
    level: 'info',
    text: s.latestDocument
      ? `文件檔案共 ${s.documentCount} 份（${formatFileSize(s.documentTotalSize)}），最近上傳「${s.latestDocument.fileName}」於 ${formatDateTime(s.latestDocument.uploadedAt).slice(0, 10)}`
      : '尚未上傳任何文件檔案',
    to: '/documents',
  });
  return reminders;
}

const Dashboard = () => {
  const api = window.electronAPI;
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    api?.getDashboardStats().then(setStats);
  }, [api]);

  if (!api) {
    return <DesktopOnlyNotice title={PAGE_TITLE} />;
  }

  const loading = stats === null;
  const s = stats;
  const now = new Date();
  const finance = s?.finance;
  const collectRate = finance ? percent(finance.duesCollected, finance.duesExpected) : 0;
  const yearIncome = finance ? finance.duesCollected + finance.otherIncome : 0;

  const statCard = (title: string, value: number, icon: React.ReactNode, note: string, to: string, suffix?: string) => (
    <Col xs={12} lg={6}>
      <Card loading={loading} hoverable className="dashboard-stat-card" onClick={() => navigate(to)}>
        <Statistic
          title={title}
          value={value}
          prefix={icon}
          suffix={suffix}
          styles={{ content: { color: value < 0 ? EXPENSE_COLOR : undefined } }}
        />
        <Text type="secondary">{note}</Text>
      </Card>
    </Col>
  );

  return (
    <div>
      <div className="page-header">
        <h1>{PAGE_TITLE}</h1>
        <Text type="secondary">{todayLabel(now)}</Text>
      </div>

      <Row gutter={[16, 16]}>
        {statCard(
          '宗親總人數',
          s?.memberCount ?? 0,
          <UserOutlined />,
          `在世 ${s?.livingCount ?? 0} 人・已故 ${s?.deceasedCount ?? 0} 人`,
          '/members'
        )}
        {statCard(
          '家族分支',
          s?.branchCount ?? 0,
          <TeamOutlined />,
          `在世宗親分布於 ${s?.generationCounts.length ?? 0} 個世代`,
          '/family-tree'
        )}
        {statCard(
          '本月活動',
          s?.monthlyEventCount ?? 0,
          <CalendarOutlined />,
          `今年共 ${s?.yearEventCount ?? 0} 場`,
          '/events'
        )}
        {statCard(
          '財務結餘',
          s?.financeTotal ?? 0,
          <BankOutlined />,
          `${now.getFullYear()} 年度 ${signedMoney(finance?.yearBalance ?? 0)}`,
          '/finance',
          '元'
        )}
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={8}>
          <Card loading={loading} title="提醒事項" className="dashboard-card">
            {s &&
              buildReminders(s).map((reminder) => (
                <div className="dashboard-list-item" key={reminder.key}>
                  {LEVEL_ICON[reminder.level]}
                  <Link to={reminder.to} className="dashboard-list-main">
                    <Text>{reminder.text}</Text>
                  </Link>
                </div>
              ))}
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card
            loading={loading}
            title={`近期活動（${DASHBOARD_UPCOMING_DAYS} 天內）`}
            extra={<Link to="/events">行事曆</Link>}
            className="dashboard-card"
          >
            {s && s.upcomingEvents.length === 0 && (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="近期沒有活動" />
            )}
            {s?.upcomingEvents.map((event) => {
              const days = daysUntil(event.eventDate, now);
              return (
                <div className="dashboard-list-item" key={event.id}>
                  <div className="dashboard-date">
                    <Text strong>{event.eventDate.slice(5).replace('-', '/')}</Text>
                    <Tag color={DAY_COLOR[days] ?? 'blue'} style={{ marginInlineEnd: 0 }}>
                      {relativeDayLabel(days)}
                    </Tag>
                  </div>
                  <div className="dashboard-list-main">
                    <Text strong>{event.title}</Text>
                    <Text type="secondary">
                      <ClockCircleOutlined /> {formatEventTime(event)}
                      {event.location && (
                        <>
                          {'　'}
                          <EnvironmentOutlined /> {event.location}
                        </>
                      )}
                    </Text>
                  </div>
                </div>
              );
            })}
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card loading={loading} title={`近期壽辰（${DASHBOARD_UPCOMING_DAYS} 天內）`} className="dashboard-card">
            {s && s.upcomingBirthdays.length === 0 && (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="近期沒有宗親生日" />
            )}
            {s?.upcomingBirthdays.map((birthday) => (
              <div className="dashboard-list-item" key={birthday.id}>
                <GiftOutlined style={{ color: FEMALE_COLOR }} />
                <div className="dashboard-list-main">
                  <Text strong>{birthday.name}</Text>
                  <Text type="secondary">
                    第 {birthday.generation} 世・{birthday.date.slice(5).replace('-', '/')} 滿 {birthday.age} 歲
                  </Text>
                </div>
                <div className="dashboard-list-side">
                  <Tag color={DAY_COLOR[birthday.daysUntil] ?? 'blue'}>{relativeDayLabel(birthday.daysUntil)}</Tag>
                </div>
              </div>
            ))}
          </Card>
        </Col>
      </Row>

      <Title level={4} className="dashboard-section-title">
        {now.getFullYear()} 年度財務
      </Title>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12} lg={6}>
          <Card loading={loading} title="會費收繳進度" className="dashboard-card">
            {finance && (
              <div className="dashboard-dues-progress">
                <Progress type="circle" percent={collectRate} size={96} />
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
                <div className="dashboard-finance-line">
                  <Text>會費收入</Text>
                  <Text className="dashboard-amount">{formatMoney(finance.duesCollected)}</Text>
                </div>
                <div className="dashboard-finance-line">
                  <Text>其他收入</Text>
                  <Text className="dashboard-amount">{formatMoney(finance.otherIncome)}</Text>
                </div>
                <div className="dashboard-finance-line">
                  <Text>總收入</Text>
                  <Text className="dashboard-amount" style={{ color: INCOME_COLOR }}>
                    {formatMoney(yearIncome)}
                  </Text>
                </div>
                <div className="dashboard-finance-line">
                  <Text>總支出</Text>
                  <Text className="dashboard-amount" style={{ color: EXPENSE_COLOR }}>
                    {formatMoney(finance.expense)}
                  </Text>
                </div>
                <div className="dashboard-finance-line">
                  <Text strong>本年度結餘</Text>
                  <Text
                    strong
                    className="dashboard-amount"
                    style={{ color: finance.yearBalance < 0 ? EXPENSE_COLOR : INCOME_COLOR }}
                  >
                    {signedMoney(finance.yearBalance)}
                  </Text>
                </div>
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
            {s && s.recentTransactions.length === 0 && (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="尚無收支紀錄" />
            )}
            {s?.recentTransactions.map((tx) => (
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

      <Title level={4} className="dashboard-section-title">
        在世宗親結構
      </Title>
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <Card loading={loading} title="世代分布" className="dashboard-card">
            {s && <CountBars rows={s.generationCounts} color={GENERATION_COLOR} />}
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card loading={loading} title="分支人數" className="dashboard-card">
            {s && <CountBars rows={s.branchCounts} color={BRANCH_COLOR} />}
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card loading={loading} title="性別與年齡" className="dashboard-card">
            {s && (
              <>
                <div className="dashboard-gender-bar" title="男女比例">
                  <div style={{ flex: s.maleCount, background: MALE_COLOR }} />
                  <div style={{ flex: s.femaleCount, background: FEMALE_COLOR }} />
                </div>
                <div className="dashboard-gender-legend">
                  <Text>
                    <span style={{ color: MALE_COLOR }}>●</span> 男 {s.maleCount} 人（{percent(s.maleCount, s.livingCount)}%）
                  </Text>
                  <Text>
                    <span style={{ color: FEMALE_COLOR }}>●</span> 女 {s.femaleCount} 人（
                    {percent(s.femaleCount, s.livingCount)}%）
                  </Text>
                </div>
                <CountBars rows={s.ageGroups} color={AGE_COLOR} emptyText="沒有生日資料" />
                {s.missingBirthdayCount > 0 && (
                  <Text type="secondary">另有 {s.missingBirthdayCount} 人未填生日</Text>
                )}
              </>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
