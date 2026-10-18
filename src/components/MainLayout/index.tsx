import React, { useState } from 'react';
import { Layout, Menu, Button } from 'antd';
import type { MenuProps } from 'antd';
import {
  UserOutlined,
  TeamOutlined,
  CalendarOutlined,
  BankOutlined,
  FileTextOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ApartmentOutlined,
} from '@ant-design/icons';
import { Link, useLocation } from 'react-router-dom';
import EventReminder from '@/components/EventReminder';
import './MainLayout.css';

const { Header, Sider, Content } = Layout;

const menuItems: MenuProps['items'] = [
  { key: '/', icon: <UserOutlined />, label: <Link to="/">首頁儀表板</Link> },
  { key: '/members', icon: <TeamOutlined />, label: <Link to="/members">宗親成員管理</Link> },
  { key: '/family-tree', icon: <ApartmentOutlined />, label: <Link to="/family-tree">宗親世系圖</Link> },
  { key: '/events', icon: <CalendarOutlined />, label: <Link to="/events">活動與聚會</Link> },
  { key: '/finance', icon: <BankOutlined />, label: <Link to="/finance">財務管理</Link> },
  { key: '/documents', icon: <FileTextOutlined />, label: <Link to="/documents">文件檔案</Link> },
  { key: '/settings', icon: <SettingOutlined />, label: <Link to="/settings">系統設定</Link> },
];

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const toggleCollapsed = () => {
    setCollapsed(!collapsed);
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed} theme="light">
        <div className="logo">
          {!collapsed && <span>傅氏宗親會管理系統</span>}
        </div>
        <Menu
          theme="light"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
        />
      </Sider>
      <Layout className="site-layout">
        <Header className="site-layout-header" style={{ padding: 0, background: '#fff' }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={toggleCollapsed}
            style={{ fontSize: '16px', width: 64, height: 64 }}
          />
          <EventReminder />
        </Header>
        <Content
          className="site-layout-content"
          style={{ margin: '24px 16px', padding: 24, minHeight: 280 }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;