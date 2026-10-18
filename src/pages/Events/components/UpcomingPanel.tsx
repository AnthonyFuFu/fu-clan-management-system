import { Card, Empty, Typography } from 'antd';
import { daysUntil, relativeDayLabel } from '@shared/events';
import type { ClanEvent } from '@shared/types';
import { formatEventTime, formatMonthDay } from '@/utils/format';

const { Text } = Typography;

export const UPCOMING_PANEL_DAYS = 30;

interface UpcomingPanelProps {
  events: ClanEvent[];
  onSelect: (event: ClanEvent) => void;
}

// 行事曆右側：接下來 30 天的行程，方便安排時間；點一下跳到那一天
const UpcomingPanel = ({ events, onSelect }: UpcomingPanelProps) => {
  const now = new Date();
  return (
    <Card title={`近期行程（${UPCOMING_PANEL_DAYS} 天內）`} style={{ marginTop: 16 }}>
      {events.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="近期沒有活動" />
      ) : (
        events.map((event) => {
          const days = daysUntil(event.eventDate, now);
          return (
            <button
              type="button"
              key={event.id}
              className="plain-button upcoming-panel-event"
              onClick={() => onSelect(event)}
            >
              <span className="upcoming-panel-date">
                <Text strong>{formatMonthDay(event.eventDate)}</Text>
                <Text type="secondary">{relativeDayLabel(days)}</Text>
              </span>
              <span>
                <span style={{ display: 'block' }}>{event.title}</span>
                <Text type="secondary">
                  {formatEventTime(event)}
                  {event.location ? `・${event.location}` : ''}
                </Text>
              </span>
            </button>
          );
        })
      )}
    </Card>
  );
};

export default UpcomingPanel;
