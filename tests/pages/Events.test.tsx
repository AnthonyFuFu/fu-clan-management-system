import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ClanEvent } from '@shared/types';
import { UpcomingEventsProvider } from '@/components/EventReminder/UpcomingEventsContext';
import Events from '@/pages/Events';
import { mockElectronAPI, renderWithAntd } from '../helpers/electronAPI';

const EVENTS: ClanEvent[] = [
  { id: 1, title: '秋季祭祖', eventDate: '2026-10-20', startTime: '09:00', endTime: '12:00', location: '傅氏宗祠', note: '請著正式服裝' },
  { id: 2, title: '理監事會議', eventDate: '2026-10-20', startTime: '19:00', endTime: null, location: null, note: null },
];

beforeEach(() => {
  // 只固定日期，不影響 antd 動畫用的計時器
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 18, 10, 0));
});

afterEach(() => {
  vi.useRealTimers();
});

function renderEvents(events = EVENTS) {
  const api = mockElectronAPI({ listEvents: vi.fn().mockResolvedValue(events) });
  renderWithAntd(
    <UpcomingEventsProvider>
      <Events />
    </UpcomingEventsProvider>
  );
  return api;
}

function dayCell(date: string): HTMLElement {
  return document.querySelector<HTMLElement>(`td[title="${date}"]`)!;
}

test('shows each day’s events in the calendar', async () => {
  renderEvents();
  const cell = dayCell('2026-10-20');
  expect(await within(cell).findByText('秋季祭祖')).toBeInTheDocument();
  expect(within(cell).getByText('理監事會議')).toBeInTheDocument();
  expect(within(cell).getByText('秋季祭祖')).toHaveAttribute('title', '09:00–12:00 秋季祭祖（傅氏宗祠）');
});

test('clicking a day with events lists them in the side panel', async () => {
  renderEvents();
  await within(dayCell('2026-10-20')).findByText('秋季祭祖');
  await userEvent.click(dayCell('2026-10-20'));

  const panel = screen.getByText('10/20（二）').closest<HTMLElement>('.ant-card')!;
  expect(within(panel).getByText('09:00–12:00')).toBeInTheDocument();
  expect(within(panel).getByText('請著正式服裝')).toBeInTheDocument();
  expect(within(panel).getByText('19:00 起')).toBeInTheDocument();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('clicking an empty day opens the form with that date and saves the event', async () => {
  const api = renderEvents();
  await within(dayCell('2026-10-20')).findByText('秋季祭祖');
  await userEvent.click(dayCell('2026-10-25'));

  const dialog = await screen.findByRole('dialog');
  expect(within(dialog).getByText('新增活動')).toBeInTheDocument();
  await userEvent.type(within(dialog).getByLabelText('活動名稱'), '宗親聯誼餐會');
  await userEvent.type(within(dialog).getByLabelText('地點'), '台中福華飯店');
  await userEvent.click(within(dialog).getByRole('button', { name: /儲\s*存/ }));

  expect(api.saveEvent).toHaveBeenCalledWith({
    id: undefined,
    title: '宗親聯誼餐會',
    eventDate: '2026-10-25',
    startTime: null,
    endTime: null,
    location: '台中福華飯店',
    note: null,
  });
});

test('clicking an event in the calendar opens it for editing', async () => {
  const api = renderEvents();
  await userEvent.click(await within(dayCell('2026-10-20')).findByText('秋季祭祖'));

  const dialog = await screen.findByRole('dialog');
  expect(within(dialog).getByLabelText('活動名稱')).toHaveValue('秋季祭祖');
  expect(within(dialog).getByLabelText('地點')).toHaveValue('傅氏宗祠');
  await userEvent.click(within(dialog).getByRole('button', { name: /儲\s*存/ }));

  expect(api.saveEvent).toHaveBeenCalledWith(expect.objectContaining({ id: 1, startTime: '09:00', endTime: '12:00' }));
});
