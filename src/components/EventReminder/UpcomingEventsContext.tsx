import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { toDateString, upcomingEvents } from '@shared/events';
import type { ClanEvent } from '@shared/types';
import { useSettings } from '@/components/SettingsProvider';

interface UpcomingEventsValue {
  // 今天到「提醒天數」（系統設定）天後、還沒結束的活動
  events: ClanEvent[];
  // 活動有新增、修改、刪除後呼叫，讓提醒立即更新
  refresh: () => void;
}

const UpcomingEventsContext = createContext<UpcomingEventsValue>({ events: [], refresh: () => {} });

// 每 10 分鐘重新整理一次：程式開著跨過午夜、或今天的活動結束後，提醒清單會跟著更新
const REFRESH_INTERVAL = 10 * 60 * 1000;

export const UpcomingEventsProvider = ({ children }: { children: React.ReactNode }) => {
  const [events, setEvents] = useState<ClanEvent[]>([]);
  const { settings, loaded } = useSettings();
  const { reminderDays } = settings;

  // 提醒天數改變時 refresh 會換新，下面的 effect 隨即重新查詢
  const refresh = useCallback(() => {
    const api = window.electronAPI;
    // 等讀到使用者設定的提醒天數再查詢，避免開啟時先用預設天數跳出不該出現的提醒
    if (!api || !loaded) return;
    const now = new Date();
    const last = new Date(now.getFullYear(), now.getMonth(), now.getDate() + reminderDays);
    api
      .listEvents(toDateString(now), toDateString(last))
      .then((list) => setEvents(upcomingEvents(list, new Date(), reminderDays)));
  }, [reminderDays, loaded]);

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
