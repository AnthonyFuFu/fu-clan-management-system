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

  interface DuesRecord {
    id: number;
    year: number;
    memberId: number;
    name: string;
    generation: number;
    amountDue: number;
    paidDate: string | null;
    note: string | null;
  }

  type TransactionType = 'income' | 'expense';

  interface FinanceTransaction {
    id: number;
    type: TransactionType;
    category: string;
    item: string;
    amount: number;
    txDate: string;
    note: string | null;
  }

  type FinanceTransactionInput = Omit<FinanceTransaction, 'id'> & { id?: number };

  interface CategoryTotal {
    category: string;
    amount: number;
  }

  interface FinanceSummary {
    year: number;
    duesMemberCount: number;
    duesPaidCount: number;
    duesExpected: number;
    duesCollected: number;
    otherIncome: number;
    expense: number;
    yearBalance: number;
    closingBalance: number;
    incomeByCategory: CategoryTotal[];
    expenseByCategory: CategoryTotal[];
  }

  interface Window {
    electronAPI?: {
      getDashboardStats: () => Promise<DashboardStats>;
      searchMembers: (keyword: string) => Promise<MemberSummary[]>;
      getFamilyTree: (memberId: number) => Promise<FamilyTreeResult | null>;

      getFinanceYears: () => Promise<number[]>;
      getFinanceSummary: (year: number) => Promise<FinanceSummary>;
      getDues: (year: number) => Promise<DuesRecord[]>;
      createDuesYear: (year: number, amount: number) => Promise<number>;
      addDuesMember: (year: number, memberId: number, amount: number) => Promise<void>;
      removeDues: (id: number) => Promise<void>;
      setDuesPaid: (ids: number[], paidDate: string | null) => Promise<void>;
      updateDues: (id: number, amountDue: number, note: string | null) => Promise<void>;
      getTransactions: (year: number) => Promise<FinanceTransaction[]>;
      saveTransaction: (tx: FinanceTransactionInput) => Promise<void>;
      deleteTransaction: (id: number) => Promise<void>;
    };
  }
}
