import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar, Col, Row, Typography } from 'antd';
import type { CalendarProps } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { toDateString } from '@shared/events';
import type { ClanEvent, ClanEventInput } from '@shared/types';
import DesktopOnlyNotice from '@/components/DesktopOnlyNotice';
import { useUpcomingEvents } from '@/components/EventReminder/UpcomingEventsContext';
import { useSettings } from '@/components/SettingsProvider';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { DATE_FORMAT, formatEventTime } from '@/utils/format';
import DayPanel from './components/DayPanel';
import EventFormModal, { EventFormState } from './components/EventFormModal';
import UpcomingPanel, { UPCOMING_PANEL_DAYS } from './components/UpcomingPanel';
import './Events.css';

const { Text } = Typography;

// 行事曆格子裡最多列出幾筆，其餘顯示「還有 N 筆」
const MAX_EVENTS_PER_CELL = 3;

// 一次載入整年（含前後各一個月，月曆畫面頭尾會露出相鄰月份的日子），切換月份不用每次重抓
function yearRange(year: number): [string, string] {
  return [`${year - 1}-12-01`, `${year + 1}-01-31`];
}

const Events = () => {
  const api = window.electronAPI;
  const runAction = useAsyncAction();
  const { refresh: refreshReminders } = useUpcomingEvents();
  const { reminderDays } = useSettings().settings;
  const [panelDate, setPanelDate] = useState<Dayjs>(dayjs());
  const [selectedDate, setSelectedDate] = useState<Dayjs>(dayjs());
  const [events, setEvents] = useState<ClanEvent[]>([]);
  const [upcoming, setUpcoming] = useState<ClanEvent[]>([]);
  const [formState, setFormState] = useState<EventFormState>(null);
  const [version, setVersion] = useState(0);
  const year = panelDate.year();

  useEffect(() => {
    if (!api) return;
    const [from, to] = yearRange(year);
    api.listEvents(from, to).then(setEvents);
  }, [api, year, version]);

  useEffect(() => {
    if (!api) return;
    const today = new Date();
    const last = new Date(today.getFullYear(), today.getMonth(), today.getDate() + UPCOMING_PANEL_DAYS);
    api.listEvents(toDateString(today), toDateString(last)).then(setUpcoming);
  }, [api, version]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, ClanEvent[]>();
    events.forEach((event) => map.set(event.eventDate, [...(map.get(event.eventDate) ?? []), event]));
    return map;
  }, [events]);

  const reloadAll = useCallback(() => {
    setVersion((v) => v + 1);
    refreshReminders();
  }, [refreshReminders]);

  if (!api) {
    return <DesktopOnlyNotice title="活動與聚會" />;
  }

  const eventsOn = (date: Dayjs) => eventsByDate.get(date.format(DATE_FORMAT)) ?? [];

  const handleSubmit = async (input: ClanEventInput) => {
    const ok = await runAction(() => api.saveEvent(input), input.id ? '已更新活動' : '已新增活動', '儲存失敗');
    if (ok) {
      setFormState(null);
      setSelectedDate(dayjs(input.eventDate));
      reloadAll();
    }
  };

  const handleDelete = async (event: ClanEvent) => {
    if (await runAction(() => api.deleteEvent(event.id), `已刪除「${event.title}」`, '刪除失敗')) {
      reloadAll();
    }
  };

  const cellRender: CalendarProps<Dayjs>['cellRender'] = (current, info) => {
    if (info.type === 'month') {
      const prefix = current.format('YYYY-MM');
      const count = events.filter((event) => event.eventDate.startsWith(prefix)).length;
      return count > 0 ? <Text type="secondary">{count} 個活動</Text> : null;
    }
    if (info.type !== 'date') return info.originNode;

    const dayEvents = eventsOn(current);
    return (
      <ul className="calendar-events">
        {dayEvents.slice(0, MAX_EVENTS_PER_CELL).map((event) => (
          <li
            key={event.id}
            className="calendar-event"
            // 格子很窄時只放得下活動名稱，時間與地點放在滑鼠提示
            title={`${formatEventTime(event)} ${event.title}${event.location ? `（${event.location}）` : ''}`}
            onClick={(e) => {
              // 點活動直接修改，不觸發「選取這一天」
              e.stopPropagation();
              setSelectedDate(current);
              setFormState({ mode: 'edit', event });
            }}
          >
            {event.title}
          </li>
        ))}
        {dayEvents.length > MAX_EVENTS_PER_CELL && (
          <li className="calendar-event-more">還有 {dayEvents.length - MAX_EVENTS_PER_CELL} 筆</li>
        )}
      </ul>
    );
  };

  return (
    <div>
      <div className="page-header">
        <h1>活動與聚會</h1>
        <Text type="secondary">
          點選日期查看或新增活動；{reminderDays === 0 ? '活動當天' : `活動前 ${reminderDays} 天起`}
          ，開啟系統時會跳出提醒（可在「系統設定」調整）。
        </Text>
      </div>

      <Row gutter={16}>
        <Col xs={24} xl={17}>
          <Calendar
            className="events-calendar"
            value={selectedDate}
            cellRender={cellRender}
            onPanelChange={(date) => setPanelDate(date)}
            onSelect={(date, { source }) => {
              setSelectedDate(date);
              if (source !== 'date') return;
              setPanelDate(date);
              // 沒有活動的日子點下去直接新增；有活動的日子先在右側列出
              if (eventsOn(date).length === 0) {
                setFormState({ mode: 'create', date });
              }
            }}
          />
        </Col>
        <Col xs={24} xl={7}>
          <DayPanel
            date={selectedDate}
            events={eventsOn(selectedDate)}
            onAdd={() => setFormState({ mode: 'create', date: selectedDate })}
            onEdit={(event) => setFormState({ mode: 'edit', event })}
            onDelete={handleDelete}
          />
          <UpcomingPanel
            events={upcoming}
            onSelect={(event) => {
              const date = dayjs(event.eventDate);
              setSelectedDate(date);
              setPanelDate(date);
            }}
          />
        </Col>
      </Row>

      <EventFormModal state={formState} onClose={() => setFormState(null)} onSubmit={handleSubmit} />
    </div>
  );
};

export default Events;
