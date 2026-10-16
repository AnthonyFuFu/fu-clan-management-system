import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { App as AntdApp, ConfigProvider } from 'antd';
import zhTW from 'antd/locale/zh_TW';
import MainLayout from './components/MainLayout';
import Dashboard from './pages/Dashboard';
import FamilyTree from './pages/FamilyTree';
import Documents from './pages/Documents';
import Finance from './pages/Finance';
import Members from './pages/Members';
import './App.css';

function App() {
  return (
    <ConfigProvider locale={zhTW}>
      <AntdApp>
        <HashRouter>
          <MainLayout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/members" element={<Members />} />
              <Route path="/family-tree" element={<FamilyTree />} />
              <Route path="/finance" element={<Finance />} />
              <Route path="/documents" element={<Documents />} />
              {/* 其他路由將在後續添加 */}
            </Routes>
          </MainLayout>
        </HashRouter>
      </AntdApp>
    </ConfigProvider>
  );
}

export default App;
