import { useCallback } from 'react';
import { App } from 'antd';
import { errorMessage } from '@shared/errors';

// 包裝寫入類操作：成功顯示提示並回傳 true，失敗顯示錯誤原因並回傳 false。
// success 可以依結果產生訊息，例如 (count) => `已開立，共 ${count} 人`；
// 回傳 null 表示不顯示訊息（例如使用者在存檔對話框按了取消）。
// 需要在 antd 的 <App> 底下使用（見 src/App.tsx）。
export function useAsyncAction() {
  const { message } = App.useApp();

  return useCallback(
    async <T>(
      action: () => Promise<T>,
      success: string | ((result: T) => string | null),
      errorPrefix = '操作失敗'
    ): Promise<boolean> => {
      try {
        const result = await action();
        const text = typeof success === 'function' ? success(result) : success;
        if (text !== null) message.success(text);
        return true;
      } catch (error) {
        message.error(`${errorPrefix}：${errorMessage(error)}`);
        return false;
      }
    },
    [message]
  );
}
