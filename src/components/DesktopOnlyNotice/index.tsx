import React from 'react';
import { Alert } from 'antd';

interface DesktopOnlyNoticeProps {
  title: string;
}

// 純瀏覽器模式（npm start）沒有 window.electronAPI，讀不到資料庫時顯示這個提示。
const DesktopOnlyNotice = ({ title }: DesktopOnlyNoticeProps) => (
  <div>
    <h1>{title}</h1>
    <Alert type="info" showIcon title="資料儲存在桌面版的資料庫中，請以 npm run electron:dev 開啟。" />
  </div>
);

export default DesktopOnlyNotice;
