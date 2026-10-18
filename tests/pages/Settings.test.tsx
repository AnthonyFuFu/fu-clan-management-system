import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsProvider } from '@/components/SettingsProvider';
import type { AppSettings } from '@shared/types';
import Settings from '@/pages/Settings';
import { mockElectronAPI, renderWithAntd } from '../helpers/electronAPI';

function renderSettings(settings: AppSettings = { fontSize: 'standard', reminderDays: 3 }) {
  const api = mockElectronAPI({ getSettings: vi.fn().mockResolvedValue(settings) });
  renderWithAntd(
    <SettingsProvider>
      <Settings />
    </SettingsProvider>
  );
  return api;
}

test('shows a hint when not running inside Electron', () => {
  renderWithAntd(<Settings />);
  expect(screen.getByText(/請以 npm run electron:dev 開啟/)).toBeInTheDocument();
});

test('shows the saved text size and applies a new one immediately', async () => {
  const api = renderSettings({ fontSize: 'large', reminderDays: 3 });
  const options = screen.getByRole('radiogroup', { name: '文字大小' });

  // 等設定從資料庫讀進來（之前顯示的是預設的「標準」）
  expect(await within(options).findByRole('radio', { checked: true, name: /大（115%）/ })).toBeInTheDocument();

  await userEvent.click(within(options).getByRole('radio', { name: /特大/ }));
  expect(api.updateSettings).toHaveBeenCalledWith({ fontSize: 'largest' });
  expect(await screen.findByText('文字大小已改為「特大」')).toBeInTheDocument();
  expect(within(options).getByRole('radio', { checked: true })).toHaveTextContent('特大');
});

test('saves the reminder days and explains when reminders start', async () => {
  const api = renderSettings();
  const input = screen.getByLabelText('提醒天數');
  await screen.findByDisplayValue('3');
  const save = screen.getByRole('button', { name: /儲\s*存/ });
  expect(save).toBeDisabled();

  await userEvent.clear(input);
  await userEvent.type(input, '7');
  expect(screen.getByText(/會從 .+ 開始提醒，直到活動當天/)).toBeInTheDocument();
  await userEvent.click(save);

  expect(api.updateSettings).toHaveBeenCalledWith({ reminderDays: 7 });
  expect(await screen.findByText('已儲存提醒天數')).toBeInTheDocument();
});

test('0 days means only on the day of the event', async () => {
  renderSettings({ fontSize: 'standard', reminderDays: 0 });
  expect(await screen.findByText(/只在活動當天提醒/)).toBeInTheDocument();
});
