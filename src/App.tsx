import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { App as AntdApp, ConfigProvider } from 'antd';
import zhTW from 'antd/locale/zh_TW';
import { UpcomingEventsProvider } from './components/EventReminder/UpcomingEventsContext';
import MainLayout from './components/MainLayout';
import { SettingsProvider } from './components/SettingsProvider';
import Dashboard from './pages/Dashboard';
import FamilyTree from './pages/FamilyTree';
import Documents from './pages/Documents';
import Events from './pages/Events';
import Finance from './pages/Finance';
import Members from './pages/Members';
import Settings from './pages/Settings';
import './App.css';

function App() {
  return (
    <ConfigProvider locale={zhTW}>
      <AntdApp>
        <HashRouter>
          <SettingsProvider>
            <UpcomingEventsProvider>
              <MainLayout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/members" element={<Members />} />
                  <Route path="/family-tree" element={<FamilyTree />} />
                  <Route path="/events" element={<Events />} />
                  <Route path="/finance" element={<Finance />} />
                  <Route path="/documents" element={<Documents />} />
                  <Route path="/settings" element={<Settings />} />
                  {/* 其他路由將在後續添加 */}
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
