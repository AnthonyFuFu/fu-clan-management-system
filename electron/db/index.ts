import path from 'path';
import { openDatabase, saveDatabase } from './connection';
import {
  createSchema,
  migrateEventColumns,
  migrateFinanceIfNeeded,
  migrateLegacyMembers,
  migrateMemberColumns,
} from './schema';
import { seedDemoEvents, seedDemoMembers } from './seed';

export interface InitOptions {
  // 新安裝時建立範例宗親、活動與帳目。正式版為 false（從空白資料庫開始），開發模式與測試為 true。
  seedDemo?: boolean;
}

export async function initDatabase(userDataPath: string, { seedDemo = false }: InitOptions = {}): Promise<void> {
  const isNew = await openDatabase(path.join(userDataPath, 'clan.db'));
  createSchema();
  if (isNew) {
    if (seedDemo) {
      seedDemoMembers();
      seedDemoEvents();
    }
    saveDatabase();
  } else {
    migrateLegacyMembers(seedDemo);
  }
  migrateMemberColumns();
  migrateEventColumns();
  migrateFinanceIfNeeded(seedDemo);
}

export { saveDatabase } from './connection';
export { getDashboardStats } from './dashboard';
export { searchMembers, listMembers, createMember, updateMember, deleteMember, getBranches } from './members';
export { getFamilyTree } from './familyTree';
export { listEvents, saveEvent, deleteEvent } from './events';
export { getSettings, updateSettings } from './settings';
export { listDocuments } from './documents';
export {
  getFinanceYears,
  getFinanceSummary,
  getDues,
  createDuesYear,
  addDuesMember,
  removeDues,
  setDuesPaid,
  updateDues,
  getTransactions,
  saveTransaction,
  deleteTransaction,
} from './finance';
