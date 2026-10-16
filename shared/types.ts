// 主程序（electron/）與畫面（src/）共用的資料型別 —— IPC 兩端都以這裡為準。

export interface DashboardStats {
  memberCount: number;
  branchCount: number;
  monthlyEventCount: number;
  financeTotal: number;
}

// ---------------------------------------------------------------------------
// 宗親 / 世系圖
// ---------------------------------------------------------------------------

export interface MemberSummary {
  id: number;
  name: string;
  generation: number;
}

export type Gender = 'M' | 'F';

export interface Branch {
  id: number;
  name: string;
}

// 成員名單的一列：成員本身的欄位，加上父母與分支名稱方便顯示
export interface Member {
  id: number;
  name: string;
  gender: Gender;
  birthday: string | null;
  parentId: number | null;
  parentName: string | null;
  generation: number;
  spouseName: string | null;
  job: string | null;
  phoneNo: string | null;
  cellphone: string | null;
  branchId: number | null;
  branchName: string | null;
  deceased: boolean;
}

// 新增 / 修改成員時送出的資料。有父母時 generation 會被忽略，改為「父母世代 + 1」。
export interface MemberInput {
  name: string;
  gender: Gender;
  birthday: string | null;
  parentId: number | null;
  generation: number;
  spouseName: string | null;
  job: string | null;
  phoneNo: string | null;
  cellphone: string | null;
  branchId: number | null;
  deceased: boolean;
}

export interface MemberQuery {
  // 比對姓名、配偶、電話、手機
  keyword?: string;
  generation?: number;
  gender?: Gender;
  // 不指定時在世、已故都列出
  deceased?: boolean;
  page: number;
  pageSize: number;
}

export interface MemberListResult {
  rows: Member[];
  // 符合條件的總筆數（分頁用）
  total: number;
  // 資料庫中所有出現過的世代，給篩選選單用
  generations: number[];
}

export type FamilyRelation = 'self' | 'ancestor' | 'descendant' | 'sibling';

export interface FamilyTreeNode {
  id: number;
  name: string;
  gender: Gender;
  birthday: string | null;
  job: string | null;
  phoneNo: string | null;
  cellphone: string | null;
  spouseName: string | null;
  generation: number;
  parentId: number | null;
  relation: FamilyRelation;
  distance: number;
}

export interface FamilyTreeResult {
  focus: FamilyTreeNode;
  nodes: FamilyTreeNode[];
}

// ---------------------------------------------------------------------------
// 財務
// ---------------------------------------------------------------------------

export interface DuesRecord {
  id: number;
  year: number;
  memberId: number;
  name: string;
  generation: number;
  // 0 = 減免（免繳）：仍在名單上，但沒有要收的金額
  amountDue: number;
  paidDate: string | null;
  note: string | null;
}

export type TransactionType = 'income' | 'expense';

export interface FinanceTransaction {
  id: number;
  type: TransactionType;
  category: string;
  item: string;
  amount: number;
  txDate: string;
  note: string | null;
}

// 沒有 id 時新增，有 id 時更新
export type FinanceTransactionInput = Omit<FinanceTransaction, 'id'> & { id?: number };

export interface CategoryTotal {
  category: string;
  amount: number;
}

export interface FinanceSummary {
  year: number;
  duesMemberCount: number;
  duesPaidCount: number;
  duesExpected: number;
  duesCollected: number;
  otherIncome: number;
  expense: number;
  yearBalance: number;
  // 截至 `year` 年底的累計結餘（含之前所有年度）
  closingBalance: number;
  incomeByCategory: CategoryTotal[];
  expenseByCategory: CategoryTotal[];
}

// ---------------------------------------------------------------------------
// 文件檔案 / Excel 匯入匯出
// ---------------------------------------------------------------------------

export interface DocumentFile {
  id: number;
  fileName: string;
  // bytes
  size: number;
  // ISO 8601，例如 2026-10-16T08:30:00.000Z
  uploadedAt: string;
}

export type MemberImportStatus = 'new' | 'skip' | 'error';

// 匯入預覽的一列：對應 Excel 的一列資料
export interface MemberImportRow {
  // Excel 的列號（含標題列，第一筆資料為第 2 列），方便使用者回頭修改檔案
  rowNumber: number;
  name: string;
  gender: Gender | null;
  // 依父母推算後的世代；無法推算時為 null
  generation: number | null;
  parentName: string | null;
  birthday: string | null;
  deceased: boolean;
  // new：將新增；skip：資料庫已有同名同世代成員，略過；error：有錯誤，需修正檔案
  status: MemberImportStatus;
  messages: string[];
}

export interface MemberImportPreview {
  // 確認匯入時帶回，主程序據此找到這份已檢查過的資料
  token: string;
  fileName: string;
  rows: MemberImportRow[];
  newCount: number;
  skipCount: number;
  errorCount: number;
  // 檔案中出現、但資料庫還沒有的分支，匯入時會自動建立
  newBranches: string[];
}
