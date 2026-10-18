import React from 'react';
import { Tag, Typography } from 'antd';
import { ClockCircleOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { daysUntil, relativeDayLabel } from '@shared/events';
import type { ClanEvent } from '@shared/types';
import { formatEventTime } from '@/utils/format';

const { Text } = Typography;

// 越近越醒目：今天紅色、明天橘色、之後藍色
const DAY_COLOR = ['red', 'orange', 'blue', 'blue'];

// 提醒清單：「提醒您「XXX」活動即將到來」
const UpcomingEventList = ({ events }: { events: ClanEvent[] }) => {
  const now = new Date();
  return (
    <div className="upcoming-event-list">
      {events.map((event) => {
        const days = daysUntil(event.eventDate, now);
        return (
          <div key={event.id} className="upcoming-event">
            <div>
              <Tag color={DAY_COLOR[days] ?? 'blue'}>{relativeDayLabel(days)}</Tag>
              <Text strong>提醒您「{event.title}」活動即將到來</Text>
            </div>
            <div className="upcoming-event-meta">
              <Text type="secondary">
                <ClockCircleOutlined /> {event.eventDate}　{formatEventTime(event)}
              </Text>
              {event.location && (
                <Text type="secondary">
                  <EnvironmentOutlined /> {event.location}
                </Text>
              )}
            </div>
            {event.note && <Text type="secondary">{event.note}</Text>}
          </div>
        );
      })}
    </div>
  );
};

export default UpcomingEventList;
