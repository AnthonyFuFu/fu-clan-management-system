import { render, screen } from '@testing-library/react';
import App from '@/App';

test('renders main navigation', () => {
  render(<App />);
  expect(screen.getByRole('link', { name: '首頁儀表板' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: '宗親世系圖' })).toBeInTheDocument();
});
