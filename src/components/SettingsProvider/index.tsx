import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { DEFAULT_SETTINGS } from '@shared/settings';
import type { AppSettings } from '@shared/types';

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

// 全系統共用的設定（文字大小、提醒天數）；純瀏覽器模式使用預設值
export const SettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(!window.electronAPI);

  useEffect(() => {
    window.electronAPI
      ?.getSettings()
      .then(setSettings)
      .finally(() => setLoaded(true));
  }, []);

  const update = useCallback(async (patch: Partial<AppSettings>) => {
    const api = window.electronAPI;
    if (!api) throw new Error('需要在桌面版中使用');
    const next = await api.updateSettings(patch);
    setSettings(next);
    return next;
  }, []);

  return <SettingsContext.Provider value={{ settings, loaded, update }}>{children}</SettingsContext.Provider>;
};

export function useSettings(): SettingsValue {
  return useContext(SettingsContext);
}
