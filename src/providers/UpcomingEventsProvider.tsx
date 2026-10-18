import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { toDateString, upcomingEvents } from '@shared/events';
import type { ClanEvent } from '@shared/types';
import { useApiQuery } from '@/hooks/useApiQuery';
import { useSettings } from './SettingsProvider';

interface UpcomingEventsValue {
  // 今天到「提醒天數」（系統設定）天後、還沒結束的活動
  events: ClanEvent[];
  // 活動有新增、修改、刪除後呼叫，讓提醒立即更新
  refresh: () => void;
}

const UpcomingEventsContext = createContext<UpcomingEventsValue>({ events: [], refresh: () => {} });

// 每 10 分鐘重新整理一次：程式開著跨過午夜、或今天的活動結束後，提醒清單會跟著更新
const REFRESH_INTERVAL = 10 * 60 * 1000;

export const UpcomingEventsProvider = ({ children }: { children: ReactNode }) => {
  const { settings, loaded } = useSettings();
  const { reminderDays } = settings;

  // 等讀到使用者設定的提醒天數再查詢，避免開啟時先用預設天數跳出不該出現的提醒；
  // 提醒天數改變時自動重新查詢
  const { data, reload } = useApiQuery(
    async (api) => {
      const now = new Date();
      const last = new Date(now.getFullYear(), now.getMonth(), now.getDate() + reminderDays);
      const list = await api.listEvents(toDateString(now), toDateString(last));
      return upcomingEvents(list, new Date(), reminderDays);
    },
    [reminderDays],
    { enabled: loaded, errorPrefix: '讀取活動提醒失敗' }
  );

  useEffect(() => {
    const timer = setInterval(reload, REFRESH_INTERVAL);
    return () => clearInterval(timer);
  }, [reload]);

  return (
    <UpcomingEventsContext.Provider value={{ events: data ?? [], refresh: reload }}>
      {children}
    </UpcomingEventsContext.Provider>
  );
};

export function useUpcomingEvents(): UpcomingEventsValue {
  return useContext(UpcomingEventsContext);
}
