export {};

declare global {
  interface DashboardStats {
    memberCount: number;
    branchCount: number;
    monthlyEventCount: number;
    financeTotal: number;
  }

  interface Window {
    electronAPI?: {
      getDashboardStats: () => Promise<DashboardStats>;
    };
  }
}
