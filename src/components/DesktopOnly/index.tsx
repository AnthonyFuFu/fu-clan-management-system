import type { ReactNode } from 'react';
import { Alert } from 'antd';

interface DesktopOnlyProps {
  title: string;
  children: ReactNode;
}

// 純瀏覽器模式（npm start）沒有 window.electronAPI、讀不到資料庫，改顯示提示而不渲染頁面。
// 在 App.tsx 的路由層統一套用，所以頁面裡可以直接用 useElectronAPI()，不必各自檢查。
const DesktopOnly = ({ title, children }: DesktopOnlyProps) => {
  if (window.electronAPI) {
    return <>{children}</>;
  }
  return (
    <div>
      <h1>{title}</h1>
      <Alert type="info" showIcon title="資料儲存在桌面版的資料庫中，請以 npm run electron:dev 開啟。" />
    </div>
  );
};

export default DesktopOnly;
