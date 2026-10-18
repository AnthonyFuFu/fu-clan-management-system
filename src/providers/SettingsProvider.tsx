import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { DEFAULT_SETTINGS } from '@shared/settings';
import type { AppSettings } from '@shared/types';
import { useApiQuery } from '@/hooks/useApiQuery';

interface SettingsValue {
  settings: AppSettings;
  // 已從資料庫讀到設定（之前 settings 是預設值）；依設定才能正確運作的功能（例如提醒）要等它
  loaded: boolean;
  // 儲存到資料庫並更新全系統；失敗時拋出錯誤（由呼叫端顯示）
  update: (patch: Partial<AppSettings>) => Promise<AppSettings>;
}

const SettingsContext = createContext<SettingsValue>({
  settings: DEFAULT_SETTINGS,
  loaded: true,
  update: async () => DEFAULT_SETTINGS,
});

// 全系統共用的設定（文字大小、提醒天數）；純瀏覽器模式、或讀取失敗時使用預設值
export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const { data: stored, loading } = useApiQuery((api) => api.getSettings(), [], { errorPrefix: '讀取系統設定失敗' });
  // 本次執行中儲存過的設定，優先於啟動時讀到的
  const [saved, setSaved] = useState<AppSettings | null>(null);

  const update = useCallback(async (patch: Partial<AppSettings>) => {
    const api = window.electronAPI;
    if (!api) throw new Error('需要在桌面版中使用');
    const next = await api.updateSettings(patch);
    setSaved(next);
    return next;
  }, []);

  const settings = saved ?? stored ?? DEFAULT_SETTINGS;
  return <SettingsContext.Provider value={{ settings, loaded: !loading, update }}>{children}</SettingsContext.Provider>;
};

export function useSettings(): SettingsValue {
  return useContext(SettingsContext);
}
