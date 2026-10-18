import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HashRouter } from 'react-router-dom';
import type { ClanEvent } from '@shared/types';
import EventReminder from '@/components/EventReminder';
import { UpcomingEventsProvider } from '@/components/EventReminder/UpcomingEventsContext';
import { mockElectronAPI, renderWithAntd } from '../helpers/electronAPI';

const EVENTS: ClanEvent[] = [
  { id: 1, title: '秋季祭祖', eventDate: '2026-10-20', startTime: '09:00', endTime: '12:00', location: '傅氏宗祠', note: null },
  { id: 2, title: '理監事會議', eventDate: '2026-10-18', startTime: '19:00', endTime: null, location: null, note: null },
];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 18, 10, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

test('pops up the reminder list once when there are events within 3 days, and keeps it under the bell', async () => {
  const api = mockElectronAPI({ listEvents: vi.fn().mockResolvedValue(EVENTS) });
  renderWithAntd(
    <HashRouter>
      <UpcomingEventsProvider>
        <EventReminder />
      </UpcomingEventsProvider>
    </HashRouter>
  );

  // 只查詢今天到 3 天後
  expect(api.listEvents).toHaveBeenCalledWith('2026-10-18', '2026-10-21');

  const dialog = await screen.findByRole('dialog');
  const items = within(dialog).getAllByText(/^提醒您/).map((el) => el.textContent);
  // 依日期排序：今天的理監事會議在前
  expect(items).toEqual(['提醒您「理監事會議」活動即將到來', '提醒您「秋季祭祖」活動即將到來']);
  expect(within(dialog).getByText('今天')).toBeInTheDocument();
  expect(within(dialog).getByText('後天')).toBeInTheDocument();

  await userEvent.click(within(dialog).getByRole('button', { name: /知道了/ }));
  const bell = screen.getByRole('button', { name: '活動提醒' });
  expect(within(bell).getByText('2')).toBeInTheDocument();
});
