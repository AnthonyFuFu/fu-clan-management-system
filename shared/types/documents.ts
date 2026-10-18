// 文件檔案 / Excel 匯入匯出

import type { Gender } from './members';

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
