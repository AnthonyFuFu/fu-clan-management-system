import { type DependencyList, useCallback, useEffect, useRef, useState } from 'react';
import { App } from 'antd';
import type { ElectronAPI } from '@shared/ipc';
import { errorMessage } from '@shared/errors';

interface ApiQueryOptions {
  // false 時不查詢（例如還在等其他資料）；純瀏覽器模式沒有 electronAPI 時一律不查詢
  enabled?: boolean;
  errorPrefix?: string;
}

interface ApiQueryResult<T> {
  // 第一次查詢完成前為 undefined；重新查詢時保留上一次的結果，畫面不會閃成空白
  data: T | undefined;
  loading: boolean;
  // 寫入資料後呼叫，以同樣的條件重新查詢
  reload: () => void;
}

// 包裝讀取類操作（與 useAsyncAction 包裝寫入類操作成對）：
// - 管理 loading 狀態
// - 失敗時顯示錯誤訊息，不會變成沒人處理的 Promise rejection
// - deps 改變得很快時（例如連續切換篩選條件），只採用最後一次查詢的結果，比較慢回來的舊結果直接丟掉
// 需要在 antd 的 <App> 底下使用（見 src/App.tsx）。
export function useApiQuery<T>(
  query: (api: ElectronAPI) => Promise<T>,
  deps: DependencyList,
  { enabled = true, errorPrefix = '讀取資料失敗' }: ApiQueryOptions = {}
): ApiQueryResult<T> {
  const { message } = App.useApp();
  const active = enabled && window.electronAPI !== undefined;
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState(active);
  const [version, setVersion] = useState(0);

  // query 通常是每次 render 都重新建立的箭頭函式，放在 ref 裡，避免它讓 effect 每次都重跑
  const queryRef = useRef(query);
  queryRef.current = query;

  useEffect(() => {
    const api = window.electronAPI;
    if (!active || !api) {
      setLoading(false);
      return;
    }
    let stale = false;
    setLoading(true);
    queryRef
      .current(api)
      .then((result) => {
        if (!stale) setData(result);
      })
      .catch((error) => {
        if (!stale) message.error(`${errorPrefix}：${errorMessage(error)}`);
      })
      .finally(() => {
        if (!stale) setLoading(false);
      });
    return () => {
      stale = true;
    };
    // 依賴由呼叫端以 deps 傳入（與 useEffect 的用法相同），所以無法靜態檢查
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, version, message, errorPrefix, ...deps]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  return { data, loading, reload };
}
