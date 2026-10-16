import React from 'react';
import { render } from '@testing-library/react';
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
  };
  Object.assign(api, overrides);
  window.electronAPI = api;
  return api;
}

// 頁面用到 App.useApp()（提示訊息），必須包在 antd 的 <App> 裡
export function renderWithAntd(ui: React.ReactElement) {
  return render(<AntdApp>{ui}</AntdApp>);
}

afterEach(() => {
  delete window.electronAPI;
});
