import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { DocumentFile, MemberImportPreview } from '@shared/types';
import Documents from '@/pages/Documents';
import { mockElectronAPI, renderWithAntd } from '../helpers/electronAPI';

const FILES: DocumentFile[] = [
  { id: 1, fileName: '113年度會員大會紀錄.pdf', size: 245_760, uploadedAt: '2026-03-01T02:00:00.000Z' },
];

const PREVIEW: MemberImportPreview = {
  token: 'tok-1',
  fileName: '名單.xlsx',
  rows: [
    {
      rowNumber: 2,
      name: '傅大明',
      gender: 'M',
      generation: 1,
      parentName: null,
      birthday: null,
      deceased: false,
      status: 'new',
      messages: [],
    },
    {
      rowNumber: 3,
      name: '傅小華',
      gender: 'F',
      generation: 2,
      parentName: '傅大明',
      birthday: null,
      deceased: false,
      status: 'new',
      messages: [],
    },
  ],
  newCount: 2,
  skipCount: 0,
  errorCount: 0,
  newBranches: ['台中房'],
};

test('lists uploaded files and uploads more', async () => {
  const api = mockElectronAPI({
    listDocuments: vi.fn().mockResolvedValue(FILES),
    uploadDocuments: vi.fn().mockResolvedValue(2),
  });
  renderWithAntd(<Documents />);

  const row = (await screen.findByText('113年度會員大會紀錄.pdf')).closest('tr')!;
  expect(within(row).getByText('240.0 KB')).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: /上傳檔案/ }));
  expect(api.uploadDocuments).toHaveBeenCalled();
  expect(await screen.findByText('已上傳 2 個檔案')).toBeInTheDocument();
  expect(api.listDocuments).toHaveBeenCalledTimes(2);
});

test('exports the dues status for the chosen year', async () => {
  const api = mockElectronAPI({ exportDuesStatus: vi.fn().mockResolvedValue('/Users/me/Downloads/名單.xlsx') });
  renderWithAntd(<Documents />);
  await userEvent.click(screen.getByRole('tab', { name: /Excel/ }));

  const card = (await screen.findByText('匯出在世宗親會費繳納名單')).closest<HTMLElement>('.ant-card')!;
  await userEvent.click(within(card).getByRole('button', { name: /匯出 Excel/ }));

  expect(api.exportDuesStatus).toHaveBeenCalledWith(new Date().getFullYear());
  expect(await screen.findByText('已儲存：名單.xlsx（Downloads 資料夾）')).toBeInTheDocument();
});

test('previews an import and confirms it with the preview token', async () => {
  const api = mockElectronAPI({
    previewMemberImport: vi.fn().mockResolvedValue(PREVIEW),
    confirmMemberImport: vi.fn().mockResolvedValue(2),
  });
  renderWithAntd(<Documents />);
  await userEvent.click(screen.getByRole('tab', { name: /Excel/ }));
  await userEvent.click(await screen.findByRole('button', { name: /選擇 Excel 檔案/ }));

  const dialog = await screen.findByRole('dialog');
  expect(within(dialog).getByText('將新增 2 人')).toBeInTheDocument();
  expect(within(dialog).getByText('會自動新增分支：台中房')).toBeInTheDocument();

  await userEvent.click(within(dialog).getByRole('button', { name: /匯入 2 人/ }));
  expect(api.confirmMemberImport).toHaveBeenCalledWith('tok-1');
  expect(await screen.findByText('已匯入 2 位宗親')).toBeInTheDocument();
});

test('blocks the import while the file has errors', async () => {
  mockElectronAPI({
    previewMemberImport: vi.fn().mockResolvedValue({
      ...PREVIEW,
      rows: [{ ...PREVIEW.rows[1], status: 'error', messages: ['找不到父母「傅大明」'] }],
      newCount: 0,
      errorCount: 1,
    }),
  });
  renderWithAntd(<Documents />);
  await userEvent.click(screen.getByRole('tab', { name: /Excel/ }));
  await userEvent.click(await screen.findByRole('button', { name: /選擇 Excel 檔案/ }));

  const dialog = await screen.findByRole('dialog');
  expect(within(dialog).getByText('有 1 列需要修正，修正 Excel 後請重新選擇檔案')).toBeInTheDocument();
  expect(within(dialog).getByText('找不到父母「傅大明」')).toBeInTheDocument();
  expect(within(dialog).getByRole('button', { name: /匯入 0 人/ })).toBeDisabled();
});
