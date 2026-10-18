import { randomUUID } from 'crypto';
import path from 'path';
import * as XLSX from 'xlsx';
import fs from 'fs';
import type { MemberImportPreview } from '../../../shared/types';
import { importMembers } from '../../db/members';
import { askOpenPaths, EXCEL_FILTERS, saveWorkbook } from '../dialogs';
import { buildDuesStatusWorkbook, buildTransactionsWorkbook } from './exports';
import { buildMemberTemplateWorkbook, type MemberImportPlan, planMemberImport } from './memberImport';

export function exportDuesStatus(year: number): Promise<string | null> {
  return saveWorkbook(buildDuesStatusWorkbook(year), `${year}年度會費繳納名單.xlsx`);
}

export function exportTransactions(year: number): Promise<string | null> {
  return saveWorkbook(buildTransactionsWorkbook(year), `${year}年度收支明細.xlsx`);
}

export function downloadMemberImportTemplate(): Promise<string | null> {
  return saveWorkbook(buildMemberTemplateWorkbook(), '宗親名單匯入範本.xlsx');
}

// 預覽與確認之間，檢查過的匯入計畫暫存在這裡：匯入的內容一定就是使用者看到的那一份，
// 畫面只送回 token，不會送回資料本身。
let pending: { token: string; plan: MemberImportPlan } | null = null;

export async function previewMemberImport(): Promise<MemberImportPreview | null> {
  const [filePath] = await askOpenPaths({ multiple: false, filters: EXCEL_FILTERS });
  if (!filePath) {
    return null;
  }
  const plan = planMemberImport(XLSX.read(fs.readFileSync(filePath), { type: 'buffer' }));
  pending = { token: randomUUID(), plan };
  return { ...plan.preview, token: pending.token, fileName: path.basename(filePath) };
}

export function confirmMemberImport(token: string): number {
  if (!pending || pending.token !== token) {
    throw new Error('匯入資料已失效，請重新選擇檔案');
  }
  const { plan } = pending;
  if (plan.preview.errorCount > 0) {
    throw new Error('檔案仍有錯誤，請修正後重新選擇檔案');
  }
  pending = null;
  return importMembers(plan.plan, plan.newBranches);
}
