import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { REMINDER_DAYS, toDateString, upcomingEvents } from '@shared/events';
import type { ClanEvent } from '@shared/types';

interface UpcomingEventsValue {
  // 今天到 REMINDER_DAYS 天後、還沒結束的活動
  events: ClanEvent[];
  // 活動有新增、修改、刪除後呼叫，讓提醒立即更新
  refresh: () => void;
}

const UpcomingEventsContext = createContext<UpcomingEventsValue>({ events: [], refresh: () => {} });

// 每 10 分鐘重新整理一次：程式開著跨過午夜、或今天的活動結束後，提醒清單會跟著更新
const REFRESH_INTERVAL = 10 * 60 * 1000;

export const UpcomingEventsProvider = ({ children }: { children: React.ReactNode }) => {
  const [events, setEvents] = useState<ClanEvent[]>([]);

  const refresh = useCallback(() => {
    const api = window.electronAPI;
    if (!api) return;
    const now = new Date();
    const last = new Date(now.getFullYear(), now.getMonth(), now.getDate() + REMINDER_DAYS);
    api.listEvents(toDateString(now), toDateString(last)).then((list) => setEvents(upcomingEvents(list, new Date())));
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, REFRESH_INTERVAL);
    return () => clearInterval(timer);
  }, [refresh]);

  return <UpcomingEventsContext.Provider value={{ events, refresh }}>{children}</UpcomingEventsContext.Provider>;
};

export function useUpcomingEvents(): UpcomingEventsValue {
  return useContext(UpcomingEventsContext);
}
