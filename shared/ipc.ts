import type {
  AppSettings,
  Branch,
  ClanEvent,
  ClanEventInput,
  DashboardStats,
  DocumentFile,
  DuesRecord,
  FamilyTreeResult,
  FinanceSummary,
  FinanceTransaction,
  FinanceTransactionInput,
  MemberInput,
  MemberListResult,
  MemberQuery,
  MemberImportPreview,
  MemberSummary,
} from './types';

// preload 透過 contextBridge 暴露給畫面的 window.electronAPI。
// 方法名稱同時就是 IPC channel 名稱：electron/ipc.ts 與 electron/preload.ts 都依這個介面做型別檢查，
// 兩邊名稱或參數對不上時編譯就會失敗。
export interface ElectronAPI {
  getDashboardStats(): Promise<DashboardStats>;

  searchMembers(keyword: string): Promise<MemberSummary[]>;
  listMembers(query: MemberQuery): Promise<MemberListResult>;
  // 回傳新成員的 id
  createMember(input: MemberInput): Promise<number>;
  updateMember(id: number, input: MemberInput): Promise<void>;
  getBranches(): Promise<Branch[]>;
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

  // 文件檔案：開啟 / 儲存檔案的對話框由主程序顯示
  listDocuments(): Promise<DocumentFile[]>;
  // 回傳上傳的檔案數；使用者取消時為 0
  uploadDocuments(): Promise<number>;
  // 回傳儲存位置；使用者取消時為 null
  downloadDocument(id: number): Promise<string | null>;
  // 以系統預設程式開啟
  openDocument(id: number): Promise<void>;
  deleteDocument(id: number): Promise<void>;

  // Excel 匯出：回傳儲存位置；使用者取消時為 null
  exportDuesStatus(year: number): Promise<string | null>;
  exportTransactions(year: number): Promise<string | null>;
  // Excel 匯入宗親名單：先下載範本填寫 → 選檔預覽 → 確認匯入
  downloadMemberImportTemplate(): Promise<string | null>;
  // 使用者取消選檔時為 null
  previewMemberImport(): Promise<MemberImportPreview | null>;
  // 回傳新增的人數
  confirmMemberImport(token: string): Promise<number>;

  // 活動與聚會：from / to 為 YYYY-MM-DD（含頭尾）
  listEvents(from: string, to: string): Promise<ClanEvent[]>;
  // 回傳活動 id
  saveEvent(input: ClanEventInput): Promise<number>;
  deleteEvent(id: number): Promise<void>;

  // 系統設定：更新後回傳完整的最新設定；文字大小會立即套用到視窗
  getSettings(): Promise<AppSettings>;
  updateSettings(patch: Partial<AppSettings>): Promise<AppSettings>;
}

export type IpcChannel = keyof ElectronAPI;
