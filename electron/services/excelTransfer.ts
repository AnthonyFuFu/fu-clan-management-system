import { randomUUID } from 'crypto';
import path from 'path';
import * as XLSX from 'xlsx';
import fs from 'fs';
import type { MemberImportPreview } from '../../shared/types';
import { importMembers } from '../db/members';
import { askOpenPaths, EXCEL_FILTERS, saveWorkbook } from './dialogs';
import { buildDuesStatusWorkbook, buildTransactionsWorkbook } from './excel/exports';
import { buildMemberTemplateWorkbook, MemberImportPlan, planMemberImport } from './excel/memberImport';

export function exportDuesStatus(year: number): Promise<string | null> {
  return saveWorkbook(buildDuesStatusWorkbook(year), `${year}年度會費繳納名單.xlsx`);
}

export function exportTransactions(year: number): Promise<string | null> {
  return saveWorkbook(buildTransactionsWorkbook(year), `${year}年度收支明細.xlsx`);
}

export function downloadMemberImportTemplate(): Promise<string | null> {
  return saveWorkbook(buildMemberTemplateWorkbook(), '宗親名單匯入範本.xlsx');
}

// The checked plan waits here between preview and confirm, so what gets imported is exactly what the
// user saw — the renderer only sends back the token, never the rows themselves.
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
