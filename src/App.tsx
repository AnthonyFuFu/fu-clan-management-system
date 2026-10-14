import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhTW from 'antd/lib/locale/zh_TW';
import MainLayout from './components/layout/MainLayout';
import Dashboard from './pages/Dashboard';
import FamilyTree from './pages/FamilyTree';
import './App.css';

function App() {
  return (
    <ConfigProvider locale={zhTW}>
      <BrowserRouter>
        <MainLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/family-tree" element={<FamilyTree />} />
            {/* 其他路由將在後續添加 */}
          </Routes>
        </MainLayout>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;
