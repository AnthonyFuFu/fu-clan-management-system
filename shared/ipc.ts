import type {
  DashboardStats,
  DuesRecord,
  FamilyTreeResult,
  FinanceSummary,
  FinanceTransaction,
  FinanceTransactionInput,
  MemberSummary,
} from './types';

// preload 透過 contextBridge 暴露給畫面的 window.electronAPI。
// 方法名稱同時就是 IPC channel 名稱：electron/ipc.ts 與 electron/preload.ts 都依這個介面做型別檢查，
// 兩邊名稱或參數對不上時編譯就會失敗。
export interface ElectronAPI {
  getDashboardStats(): Promise<DashboardStats>;

  searchMembers(keyword: string): Promise<MemberSummary[]>;
  getFamilyTree(memberId: number): Promise<FamilyTreeResult | null>;

  getFinanceYears(): Promise<number[]>;
  getFinanceSummary(year: number): Promise<FinanceSummary>;
  getDues(year: number): Promise<DuesRecord[]>;
  // 回傳加入名單的人數
  createDuesYear(year: number, amount: number): Promise<number>;
  addDuesMember(year: number, memberId: number, amount: number): Promise<void>;
  removeDues(id: number): Promise<void>;
  // paidDate 為 null 表示取消繳費
  setDuesPaid(ids: number[], paidDate: string | null): Promise<void>;
  updateDues(id: number, amountDue: number, note: string | null): Promise<void>;
  getTransactions(year: number): Promise<FinanceTransaction[]>;
  saveTransaction(tx: FinanceTransactionInput): Promise<void>;
  deleteTransaction(id: number): Promise<void>;
}

export type IpcChannel = keyof ElectronAPI;
