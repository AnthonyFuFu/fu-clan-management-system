import React, { useState } from 'react';
import { Layout, Menu, Button } from 'antd';
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
import './MainLayout.css';

const { Header, Sider, Content } = Layout;

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
        >
          <Menu.Item key="/" icon={<UserOutlined />}>
            <Link to="/">首頁儀表板</Link>
          </Menu.Item>
          <Menu.Item key="/members" icon={<TeamOutlined />}>
            <Link to="/members">宗親成員管理</Link>
          </Menu.Item>
          <Menu.Item key="/family-tree" icon={<ApartmentOutlined />}>
            <Link to="/family-tree">宗親世系圖</Link>
          </Menu.Item>
          <Menu.Item key="/events" icon={<CalendarOutlined />}>
            <Link to="/events">活動與聚會</Link>
          </Menu.Item>
          <Menu.Item key="/finance" icon={<BankOutlined />}>
            <Link to="/finance">財務管理</Link>
          </Menu.Item>
          <Menu.Item key="/documents" icon={<FileTextOutlined />}>
            <Link to="/documents">文件檔案</Link>
          </Menu.Item>
          <Menu.Item key="/settings" icon={<SettingOutlined />}>
            <Link to="/settings">系統設定</Link>
          </Menu.Item>
        </Menu>
      </Sider>
      <Layout className="site-layout">
        <Header className="site-layout-header" style={{ padding: 0, background: '#fff' }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={toggleCollapsed}
            style={{ fontSize: '16px', width: 64, height: 64 }}
          />
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