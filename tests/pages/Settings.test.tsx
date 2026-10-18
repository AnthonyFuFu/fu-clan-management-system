import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsProvider } from '@/providers/SettingsProvider';
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

test('backs up to a chosen folder', async () => {
  const api = renderSettings();
  api.exportBackup.mockResolvedValue('/Volumes/USB/傅氏宗親會備份-20261018-143005');

  await userEvent.click(screen.getByRole('button', { name: /立即備份/ }));
  expect(await screen.findByText('已備份到：/Volumes/USB/傅氏宗親會備份-20261018-143005')).toBeInTheDocument();
});

test('asks for confirmation before restoring, and shows why a restore failed', async () => {
  const api = renderSettings();
  api.restoreBackup.mockRejectedValue(
    new Error("Error invoking remote method 'restoreBackup': Error: 備份檔已損毀，或不是本系統的資料庫")
  );

  await userEvent.click(screen.getByRole('button', { name: /從備份還原/ }));
  expect(api.restoreBackup).not.toHaveBeenCalled();
  await userEvent.click(await screen.findByRole('button', { name: '選擇備份資料夾' }));
  expect(api.restoreBackup).toHaveBeenCalled();
  expect(await screen.findByText('還原失敗：備份檔已損毀，或不是本系統的資料庫')).toBeInTheDocument();
});
