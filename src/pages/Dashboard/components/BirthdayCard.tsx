import { Card, Empty, Tag, Typography } from 'antd';
import { GiftOutlined } from '@ant-design/icons';
import { DASHBOARD_UPCOMING_DAYS, relativeDayLabel } from '@shared/events';
import { dayTagColor } from '@/constants/colors';
import { formatMonthDay } from '@/utils/format';
import { FEMALE_COLOR } from '../constants';
import type { SectionProps } from './types';

const { Text } = Typography;

const BirthdayCard = ({ stats, loading }: SectionProps) => (
  <Card loading={loading} title={`近期壽辰（${DASHBOARD_UPCOMING_DAYS} 天內）`} className="dashboard-card">
    {stats && stats.upcomingBirthdays.length === 0 && (
      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="近期沒有宗親生日" />
    )}
    {stats?.upcomingBirthdays.map((birthday) => (
      <div className="dashboard-list-item" key={birthday.id}>
        <GiftOutlined style={{ color: FEMALE_COLOR }} />
        <div className="dashboard-list-main">
          <Text strong>{birthday.name}</Text>
          <Text type="secondary">
            第 {birthday.generation} 世・{formatMonthDay(birthday.date)} 滿 {birthday.age} 歲
          </Text>
        </div>
        <div className="dashboard-list-side">
          <Tag color={dayTagColor(birthday.daysUntil)}>{relativeDayLabel(birthday.daysUntil)}</Tag>
        </div>
      </div>
    ))}
  </Card>
);

export default BirthdayCard;
