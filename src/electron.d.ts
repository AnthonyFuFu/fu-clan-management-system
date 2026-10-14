export {};

declare global {
  interface DashboardStats {
    memberCount: number;
    branchCount: number;
    monthlyEventCount: number;
    financeTotal: number;
  }

  interface MemberSummary {
    id: number;
    name: string;
    generation: number;
  }

  type FamilyRelation = 'self' | 'ancestor' | 'descendant' | 'sibling';

  interface FamilyTreeNode {
    id: number;
    name: string;
    gender: 'M' | 'F';
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

  interface FamilyTreeResult {
    focus: FamilyTreeNode;
    nodes: FamilyTreeNode[];
  }

  interface Window {
    electronAPI?: {
      getDashboardStats: () => Promise<DashboardStats>;
      searchMembers: (keyword: string) => Promise<MemberSummary[]>;
      getFamilyTree: (memberId: number) => Promise<FamilyTreeResult | null>;
    };
  }
}
