import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App as AntdApp } from 'antd';
import type { DuesRecord } from '@shared/types';
import Finance from '@/pages/Finance';

const YEAR = new Date().getFullYear();

const DUES: DuesRecord[] = [
  { id: 1, year: YEAR, memberId: 10, name: '傅志成', generation: 16, amountDue: 1000, paidDate: `${YEAR}-02-20`, note: null },
  { id: 2, year: YEAR, memberId: 11, name: '傅俊宏', generation: 17, amountDue: 1000, paidDate: null, note: null },
  { id: 3, year: YEAR, memberId: 12, name: '傅宗翰', generation: 19, amountDue: 0, paidDate: null, note: '學生免繳' },
];

function mockApi(overrides: Partial<NonNullable<Window['electronAPI']>> = {}) {
  window.electronAPI = {
    getDashboardStats: vi.fn(),
    searchMembers: vi.fn().mockResolvedValue([]),
    getFamilyTree: vi.fn(),
    getFinanceYears: vi.fn().mockResolvedValue([YEAR]),
    getFinanceSummary: vi.fn().mockResolvedValue({
      year: YEAR,
      duesMemberCount: 2,
      duesPaidCount: 1,
      duesExpected: 2000,
      duesCollected: 1000,
      otherIncome: 0,
      expense: 0,
      yearBalance: 1000,
      closingBalance: 1000,
      incomeByCategory: [],
      expenseByCategory: [],
    }),
    getDues: vi.fn().mockResolvedValue(DUES),
    createDuesYear: vi.fn().mockResolvedValue(0),
    addDuesMember: vi.fn(),
    removeDues: vi.fn(),
    setDuesPaid: vi.fn().mockResolvedValue(undefined),
    updateDues: vi.fn(),
    getTransactions: vi.fn().mockResolvedValue([]),
    saveTransaction: vi.fn(),
    deleteTransaction: vi.fn(),
    ...overrides,
  };
  return window.electronAPI;
}

function renderFinance() {
  return render(
    <AntdApp>
      <Finance />
    </AntdApp>
  );
}

afterEach(() => {
  delete window.electronAPI;
});

test('shows a hint when not running inside Electron', () => {
  renderFinance();
  expect(screen.getByText(/請以 npm run electron:dev 開啟/)).toBeInTheDocument();
});

test('lists the dues roster with paid / unpaid / exempt status', async () => {
  mockApi();
  renderFinance();
  await userEvent.click(screen.getByRole('tab', { name: '會費收繳' }));

  const paidRow = (await screen.findByText('傅志成')).closest('tr')!;
  expect(within(paidRow).getByText('已繳')).toBeInTheDocument();
  expect(within(screen.getByText('傅俊宏').closest('tr')!).getByText('未繳')).toBeInTheDocument();
  expect(within(screen.getByText('傅宗翰').closest('tr')!).getByText('免繳')).toBeInTheDocument();
});

test('registers a payment for an unpaid member', async () => {
  const api = mockApi();
  renderFinance();
  await userEvent.click(screen.getByRole('tab', { name: '會費收繳' }));

  const row = (await screen.findByText('傅俊宏')).closest('tr')!;
  await userEvent.click(within(row).getByRole('button', { name: '登記繳費' }));
  await userEvent.click(await screen.findByRole('button', { name: /OK|確\s*定/ }));

  expect(api.setDuesPaid).toHaveBeenCalledWith([2], expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/));
});

test('offers to open the year when it has no dues roster yet', async () => {
  mockApi({ getDues: vi.fn().mockResolvedValue([]) });
  renderFinance();
  await userEvent.click(screen.getByRole('tab', { name: '會費收繳' }));

  expect(await screen.findByRole('button', { name: new RegExp(`開立 ${YEAR} 年度會費`) })).toBeInTheDocument();
});
