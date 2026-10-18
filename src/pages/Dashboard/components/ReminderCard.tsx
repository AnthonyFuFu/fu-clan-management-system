import type { ReactNode } from 'react';
import { Card, Typography } from 'antd';
import { CheckCircleOutlined, ExclamationCircleOutlined, FileTextOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import type { DashboardStats } from '@shared/types';
import { formatDateTime, formatFileSize, formatMoney } from '@/utils/format';
import type { SectionProps } from './types';

const { Text } = Typography;

type Level = 'warning' | 'success' | 'info';

interface Reminder {
  key: string;
  level: Level;
  text: string;
  to: string;
}

const LEVEL_ICON: Record<Level, ReactNode> = {
  warning: <ExclamationCircleOutlined style={{ color: '#faad14' }} />,
  success: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
  info: <FileTextOutlined style={{ color: '#1677ff' }} />,
};

// 需要處理的事情排前面，其餘為資訊
export function buildReminders(s: DashboardStats): Reminder[] {
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
    reminders.push({
      key: 'balance',
      level: 'warning',
      text: `目前結餘為負數（${formatMoney(s.financeTotal)}）`,
      to: '/finance',
    });
  }
  if (s.missingContactCount > 0) {
    reminders.push({
      key: 'contact',
      level: 'warning',
      text: `${s.missingContactCount} 位在世宗親沒有聯絡電話`,
      to: '/members',
    });
  }
  if (s.missingBirthdayCount > 0) {
    reminders.push({
      key: 'birthday',
      level: 'warning',
      text: `${s.missingBirthdayCount} 位在世宗親未填生日`,
      to: '/members',
    });
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

const ReminderCard = ({ stats, loading }: SectionProps) => (
  <Card loading={loading} title="提醒事項" className="dashboard-card">
    {stats &&
      buildReminders(stats).map((reminder) => (
        <div className="dashboard-list-item" key={reminder.key}>
          {LEVEL_ICON[reminder.level]}
          <Link to={reminder.to} className="dashboard-list-main">
            <Text>{reminder.text}</Text>
          </Link>
        </div>
      ))}
  </Card>
);

export default ReminderCard;
