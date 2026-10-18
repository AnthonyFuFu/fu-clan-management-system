import type { ReactElement } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { App as AntdApp, ConfigProvider } from 'antd';
import zhTW from 'antd/locale/zh_TW';
import DesktopOnly from './components/DesktopOnly';
import MainLayout from './components/MainLayout';
import Dashboard from './pages/Dashboard';
import FamilyTree from './pages/FamilyTree';
import Documents from './pages/Documents';
import Events from './pages/Events';
import Finance from './pages/Finance';
import Members from './pages/Members';
import Settings from './pages/Settings';
import { SettingsProvider } from './providers/SettingsProvider';
import { UpcomingEventsProvider } from './providers/UpcomingEventsProvider';
import './App.css';

// 每個頁面都要讀寫桌面版的資料庫；title 用在純瀏覽器模式的提示畫面
const ROUTES: { path: string; title: string; element: ReactElement }[] = [
  { path: '/', title: '傅氏宗親會管理系統', element: <Dashboard /> },
  { path: '/members', title: '宗親成員管理', element: <Members /> },
  { path: '/family-tree', title: '宗親世系圖', element: <FamilyTree /> },
  { path: '/events', title: '活動與聚會', element: <Events /> },
  { path: '/finance', title: '財務管理', element: <Finance /> },
  { path: '/documents', title: '文件檔案', element: <Documents /> },
  { path: '/settings', title: '系統設定', element: <Settings /> },
];

function App() {
  return (
    <ConfigProvider locale={zhTW}>
      <AntdApp>
        <HashRouter>
          <SettingsProvider>
            <UpcomingEventsProvider>
              <MainLayout>
                <Routes>
                  {ROUTES.map(({ path, title, element }) => (
                    <Route key={path} path={path} element={<DesktopOnly title={title}>{element}</DesktopOnly>} />
                  ))}
                </Routes>
              </MainLayout>
            </UpcomingEventsProvider>
          </SettingsProvider>
        </HashRouter>
      </AntdApp>
    </ConfigProvider>
  );
}

export default App;
