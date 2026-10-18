import { screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from '@/pages/Dashboard';
import { EMPTY_DASHBOARD_STATS, EMPTY_FINANCE_SUMMARY, mockElectronAPI, renderWithAntd } from '../helpers/electronAPI';

function renderDashboard() {
  return renderWithAntd(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>
  );
}

test('shows member, event and finance statistics with reminders', async () => {
  mockElectronAPI({
    getDashboardStats: vi.fn().mockResolvedValue({
      ...EMPTY_DASHBOARD_STATS,
      memberCount: 34,
      livingCount: 19,
      deceasedCount: 15,
      maleCount: 12,
      femaleCount: 7,
      generationCounts: [{ label: '第 16 世', count: 19 }],
      missingContactCount: 2,
      upcomingBirthdays: [{ id: 1, name: '傅壽星', generation: 17, date: '2026-10-20', age: 60, daysUntil: 2 }],
      upcomingEvents: [
        {
          id: 1,
          title: '秋季祭祖',
          eventDate: '2099-01-01',
          startTime: '09:00',
          endTime: null,
          location: '傅氏宗祠',
          note: null,
        },
      ],
      finance: {
        ...EMPTY_FINANCE_SUMMARY,
        duesMemberCount: 10,
        duesPaidCount: 7,
        duesExpected: 10000,
        duesCollected: 7000,
      },
      recentTransactions: [
        { id: 1, type: 'income', category: '樂捐', item: '宗親樂捐', amount: 5000, txDate: '2026-10-01', note: null },
      ],
    }),
  });
  renderDashboard();

  expect(await screen.findByText('在世 19 人・已故 15 人')).toBeInTheDocument();
  expect(screen.getByText(/年度會費尚有 3 人未繳，未收 3,000 元/)).toBeInTheDocument();
  expect(screen.getByText('2 位在世宗親沒有聯絡電話')).toBeInTheDocument();
  expect(screen.getByText('傅壽星')).toBeInTheDocument();
  expect(screen.getByText('秋季祭祖')).toBeInTheDocument();
  expect(screen.getByText('宗親樂捐')).toBeInTheDocument();
  expect(screen.getByText('第 16 世')).toBeInTheDocument();
});

test('asks to open this year’s dues roster when there is none', async () => {
  mockElectronAPI();
  renderDashboard();
  expect(await screen.findByText(/尚未開立 \d+ 年度會費名單/)).toBeInTheDocument();
  expect(screen.getByText('近期沒有活動')).toBeInTheDocument();
});
