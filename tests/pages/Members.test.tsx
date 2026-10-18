import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Member } from '@shared/types';
import Members from '@/pages/Members';
import { mockElectronAPI, renderWithAntd } from '../helpers/electronAPI';

const MEMBERS: Member[] = [
  {
    id: 1,
    name: '傅開基',
    gender: 'M',
    birthday: null,
    parentId: null,
    parentName: null,
    generation: 1,
    spouseName: '林氏',
    job: '務農',
    phoneNo: null,
    cellphone: null,
    branchId: null,
    branchName: null,
    deceased: true,
  },
  {
    id: 2,
    name: '傅文宗',
    gender: 'M',
    birthday: '1580-06-15',
    parentId: 1,
    parentName: '傅開基',
    generation: 2,
    spouseName: '陳氏',
    job: null,
    phoneNo: null,
    cellphone: '0912345678',
    branchId: 1,
    branchName: '第 1 分支',
    deceased: false,
  },
];

function mockApi() {
  return mockElectronAPI({
    listMembers: vi.fn().mockResolvedValue({ rows: MEMBERS, total: 2, generations: [1, 2] }),
    getBranches: vi.fn().mockResolvedValue([{ id: 1, name: '第 1 分支' }]),
    searchMembers: vi.fn().mockResolvedValue([{ id: 1, name: '傅開基', generation: 1 }]),
  });
}

test('lists members with parent, spouse and branch', async () => {
  mockApi();
  renderWithAntd(<Members />);

  const row = (await screen.findByText('傅文宗')).closest('tr')!;
  expect(within(row).getByText('傅開基')).toBeInTheDocument();
  expect(within(row).getByText('陳氏')).toBeInTheDocument();
  expect(within(row).getByText('第 1 分支')).toBeInTheDocument();
  const rootRow = screen.getByText('林氏').closest('tr')!;
  expect(within(rootRow).getByText('（始祖）')).toBeInTheDocument();
  expect(within(rootRow).getByText('已故')).toBeInTheDocument();
  expect(screen.getByText('共 2 人')).toBeInTheDocument();
});

test('searching sends the keyword and resets to the first page', async () => {
  const api = mockApi();
  renderWithAntd(<Members />);
  await screen.findByText('傅文宗');

  await userEvent.type(screen.getByPlaceholderText('搜尋姓名、配偶、電話'), '文宗{enter}');

  expect(api.listMembers).toHaveBeenLastCalledWith(expect.objectContaining({ keyword: '文宗', page: 1 }));
});

test('adds a child with the parent and generation filled in', async () => {
  const api = mockApi();
  renderWithAntd(<Members />);

  const row = (await screen.findByText('林氏')).closest('tr')!;
  await userEvent.click(within(row).getByRole('button', { name: /新增子女/ }));
  const dialog = await screen.findByRole('dialog');
  expect(within(dialog).getByText('新增 傅開基 的子女')).toBeInTheDocument();

  await userEvent.type(within(dialog).getByLabelText('姓名'), '傅新丁');
  await userEvent.click(within(dialog).getByRole('button', { name: /儲\s*存/ }));

  expect(api.createMember).toHaveBeenCalledWith(
    expect.objectContaining({ name: '傅新丁', parentId: 1, generation: 2, gender: 'M' })
  );
});

test('edits an existing member', async () => {
  const api = mockApi();
  renderWithAntd(<Members />);

  const row = (await screen.findByText('傅文宗')).closest('tr')!;
  await userEvent.click(within(row).getByRole('button', { name: '修改' }));
  const dialog = await screen.findByRole('dialog');

  const job = within(dialog).getByLabelText('職業');
  await userEvent.type(job, '私塾先生');
  await userEvent.click(within(dialog).getByRole('button', { name: /儲\s*存/ }));

  expect(api.updateMember).toHaveBeenCalledWith(
    2,
    expect.objectContaining({ name: '傅文宗', job: '私塾先生', parentId: 1, branchId: 1, cellphone: '0912345678' })
  );
});

// 回歸測試：表單實例曾在每次開啟之間共用，上一次輸入的內容會殘留到下一次
// （例如修改成員時，顯示的是剛才新增子女時輸入的姓名）。
test('opening the edit form after another form shows the edited member, not leftover input', async () => {
  mockApi();
  renderWithAntd(<Members />);

  const firstRow = (await screen.findByText('林氏')).closest('tr')!;
  await userEvent.click(within(firstRow).getByRole('button', { name: /新增子女/ }));
  let dialog = await screen.findByRole('dialog');
  await userEvent.type(within(dialog).getByLabelText('姓名'), '傅暫存');
  await userEvent.click(within(dialog).getByRole('button', { name: /取\s*消|Cancel/ }));

  const secondRow = screen.getByText('傅文宗').closest('tr')!;
  await userEvent.click(within(secondRow).getByRole('button', { name: '修改' }));
  // 前一個對話框可能還在播放關閉動畫，以標題找出這次開啟的對話框
  dialog = (await screen.findByText('修改成員：傅文宗')).closest<HTMLElement>('[role="dialog"]')!;

  expect(within(dialog).getByLabelText('姓名')).toHaveValue('傅文宗');
  expect(within(dialog).getByLabelText('配偶')).toHaveValue('陳氏');
});

test('imports members from Excel right from the member list', async () => {
  const api = mockElectronAPI({
    previewMemberImport: vi.fn().mockResolvedValue({
      token: 't1',
      fileName: '名單.xlsx',
      rows: [],
      newCount: 1,
      skipCount: 0,
      errorCount: 0,
      newBranches: [],
    }),
    confirmMemberImport: vi.fn().mockResolvedValue(1),
  });
  renderWithAntd(<Members />);

  await userEvent.hover(screen.getByRole('button', { name: /Excel 匯入/ }));
  await userEvent.click(await screen.findByText('選擇 Excel 檔案匯入'));
  expect(api.previewMemberImport).toHaveBeenCalled();
  expect(await screen.findByText(/名單\.xlsx/)).toBeInTheDocument();
});

test('deletes a member after confirming, and explains why when it is refused', async () => {
  const api = mockApi();
  api.deleteMember
    .mockRejectedValueOnce(
      new Error("Error invoking remote method 'deleteMember': Error: 傅開基 還有子女資料，請先刪除子女或修改子女的父母")
    )
    .mockResolvedValueOnce(undefined);
  renderWithAntd(<Members />);

  const rootRow = (await screen.findByText('林氏')).closest('tr')!;
  await userEvent.click(within(rootRow).getByRole('button', { name: '刪除' }));
  await userEvent.click(await screen.findByRole('button', { name: '刪 除' }));
  expect(api.deleteMember).toHaveBeenCalledWith(1);
  expect(await screen.findByText('刪除失敗：傅開基 還有子女資料，請先刪除子女或修改子女的父母')).toBeInTheDocument();

  const childRow = screen.getByText('陳氏').closest('tr')!;
  await userEvent.click(within(childRow).getByRole('button', { name: '刪除' }));
  const confirmButtons = await screen.findAllByRole('button', { name: '刪 除' });
  await userEvent.click(confirmButtons[confirmButtons.length - 1]);
  expect(await screen.findByText('已刪除 傅文宗')).toBeInTheDocument();
  // 刪除後重新載入名單
  expect(api.listMembers).toHaveBeenCalledTimes(2);
});
