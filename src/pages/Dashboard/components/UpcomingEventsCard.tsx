import { Card, Empty, Tag, Typography } from 'antd';
import { ClockCircleOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { DASHBOARD_UPCOMING_DAYS, daysUntil, relativeDayLabel } from '@shared/events';
import { dayTagColor } from '@/constants/colors';
import { formatEventTime, formatMonthDay } from '@/utils/format';
import type { SectionProps } from './types';

const { Text } = Typography;

const UpcomingEventsCard = ({ stats, loading }: SectionProps) => {
  const now = new Date();
  return (
    <Card
      loading={loading}
      title={`近期活動（${DASHBOARD_UPCOMING_DAYS} 天內）`}
      extra={<Link to="/events">行事曆</Link>}
      className="dashboard-card"
    >
      {stats && stats.upcomingEvents.length === 0 && (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="近期沒有活動" />
      )}
      {stats?.upcomingEvents.map((event) => {
        const days = daysUntil(event.eventDate, now);
        return (
          <div className="dashboard-list-item" key={event.id}>
            <div className="dashboard-date">
              <Text strong>{formatMonthDay(event.eventDate)}</Text>
              <Tag color={dayTagColor(days)} style={{ marginInlineEnd: 0 }}>
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
  );
};

export default UpcomingEventsCard;
