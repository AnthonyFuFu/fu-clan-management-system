import { screen } from '@testing-library/react';
import App from '@/App';
import { renderWithAntd } from './helpers/electronAPI';

test('renders main navigation', async () => {
  renderWithAntd(<App />);
  // 用 findBy（在 act 裡等待）而不是 getBy：antd 的選單在第一次繪製後還會再更新一次，
  // 在較慢的機器上若測試已經結束才更新，會出現「not wrapped in act(...)」警告
  expect(await screen.findByRole('link', { name: '首頁儀表板' })).toBeInTheDocument();
  expect(await screen.findByRole('link', { name: '宗親世系圖' })).toBeInTheDocument();
});

test('shows the desktop-only hint instead of the page in a plain browser', async () => {
  // 沒有 mockElectronAPI：等同 npm start 的純瀏覽器模式
  renderWithAntd(<App />);
  expect(await screen.findByText(/請以 npm run electron:dev 開啟/)).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: '傅氏宗親會管理系統' })).toBeInTheDocument();
});
