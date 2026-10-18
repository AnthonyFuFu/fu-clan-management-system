import path from 'path';
import { openDatabase, saveDatabase, setMeta } from './connection';
import {
  createSchema,
  migrateEventColumns,
  migrateFinanceIfNeeded,
  migrateMemberColumns,
  migrateMembersIfNeeded,
  SEED_VERSION,
} from './schema';
import { seedData } from './seed';

export async function initDatabase(userDataPath: string): Promise<void> {
  const isNew = await openDatabase(path.join(userDataPath, 'clan.db'));
  createSchema();
  if (isNew) {
    seedData();
    setMeta('seed_version', SEED_VERSION);
    saveDatabase();
  } else {
    migrateMembersIfNeeded();
  }
  migrateMemberColumns();
  migrateEventColumns();
  migrateFinanceIfNeeded();
}

export { saveDatabase } from './connection';
export { getDashboardStats } from './dashboard';
export { searchMembers, listMembers, createMember, updateMember, getBranches } from './members';
export { getFamilyTree } from './familyTree';
export { listEvents, saveEvent, deleteEvent } from './events';
export { getSettings, updateSettings } from './settings';
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
