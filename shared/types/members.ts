// 宗親 / 世系圖

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
