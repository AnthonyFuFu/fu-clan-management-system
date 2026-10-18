import React from 'react';
import { render } from '@testing-library/react';
import { StyleProvider } from '@ant-design/cssinjs';
import { App as AntdApp } from 'antd';
import { Mocked } from 'vitest';
import type { ElectronAPI } from '@shared/ipc';

const YEAR = new Date().getFullYear();

// 以「什麼資料都沒有」為預設的假 window.electronAPI；各測試只覆寫自己關心的方法。
// ElectronAPI 新增方法時，這裡少了會編譯失敗，提醒補上預設值。
export function mockElectronAPI(overrides: Partial<ElectronAPI> = {}): Mocked<ElectronAPI> {
  const api: Mocked<ElectronAPI> = {
    getDashboardStats: vi.fn().mockResolvedValue({ memberCount: 0, branchCount: 0, monthlyEventCount: 0, financeTotal: 0 }),

    searchMembers: vi.fn().mockResolvedValue([]),
    listMembers: vi.fn().mockResolvedValue({ rows: [], total: 0, generations: [] }),
    createMember: vi.fn().mockResolvedValue(1),
    updateMember: vi.fn().mockResolvedValue(undefined),
    getBranches: vi.fn().mockResolvedValue([]),
    getFamilyTree: vi.fn().mockResolvedValue(null),

    getFinanceYears: vi.fn().mockResolvedValue([YEAR]),
    getFinanceSummary: vi.fn().mockResolvedValue({
      year: YEAR,
      duesMemberCount: 0,
      duesPaidCount: 0,
      duesExpected: 0,
      duesCollected: 0,
      otherIncome: 0,
      expense: 0,
      yearBalance: 0,
      closingBalance: 0,
      incomeByCategory: [],
      expenseByCategory: [],
    }),
    getDues: vi.fn().mockResolvedValue([]),
    createDuesYear: vi.fn().mockResolvedValue(0),
    addDuesMember: vi.fn().mockResolvedValue(undefined),
    removeDues: vi.fn().mockResolvedValue(undefined),
    setDuesPaid: vi.fn().mockResolvedValue(undefined),
    updateDues: vi.fn().mockResolvedValue(undefined),
    getTransactions: vi.fn().mockResolvedValue([]),
    saveTransaction: vi.fn().mockResolvedValue(undefined),
    deleteTransaction: vi.fn().mockResolvedValue(undefined),

    listDocuments: vi.fn().mockResolvedValue([]),
    uploadDocuments: vi.fn().mockResolvedValue(0),
    downloadDocument: vi.fn().mockResolvedValue(null),
    openDocument: vi.fn().mockResolvedValue(undefined),
    deleteDocument: vi.fn().mockResolvedValue(undefined),

    exportDuesStatus: vi.fn().mockResolvedValue(null),
    exportTransactions: vi.fn().mockResolvedValue(null),
    downloadMemberImportTemplate: vi.fn().mockResolvedValue(null),
    previewMemberImport: vi.fn().mockResolvedValue(null),
    confirmMemberImport: vi.fn().mockResolvedValue(0),

    listEvents: vi.fn().mockResolvedValue([]),
    saveEvent: vi.fn().mockResolvedValue(1),
    deleteEvent: vi.fn().mockResolvedValue(undefined),

    getSettings: vi.fn().mockResolvedValue({ fontSize: 'standard', reminderDays: 3 }),
    updateSettings: vi.fn().mockImplementation(async (patch) => ({ fontSize: 'standard', reminderDays: 3, ...patch })),
  };
  Object.assign(api, overrides);
  window.electronAPI = api;
  return api;
}

// antd 的 CSS-in-JS 樣式（約 500 KB）改寫進一個不在畫面上的容器。
// jsdom 每次 getComputedStyle 都會重新套用頁面上所有樣式，而 testing-library 的 getByRole
// 會對元素與所有上層元素呼叫它來判斷是否可見——樣式留在頁面上時，一次 getByRole 就要 1 秒以上，
// 在較慢的機器（例如 CI）上會超過 5 秒的測試時限。測試只驗證行為，不需要這些樣式。
const detachedStyleContainer = document.createElement('div');

// 頁面用到 App.useApp()（提示訊息），必須包在 antd 的 <App> 裡
export function renderWithAntd(ui: React.ReactElement) {
  return render(
    <StyleProvider container={detachedStyleContainer}>
      <AntdApp>{ui}</AntdApp>
    </StyleProvider>
  );
}

afterEach(() => {
  delete window.electronAPI;
});
