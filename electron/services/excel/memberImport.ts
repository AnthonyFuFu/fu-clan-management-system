import * as XLSX from 'xlsx';
import type { Gender, MemberImportPreview, MemberImportRow } from '../../../shared/types';
import { getBranches, type ImportPlanItem, listAllMemberSummaries, validateMemberFields } from '../../db/members';
import { type Column, tableSheet, workbook } from './sheet';

// ---------------------------------------------------------------------------
// 範本
// ---------------------------------------------------------------------------

type Field =
  | 'name'
  | 'gender'
  | 'generation'
  | 'parentName'
  | 'birthday'
  | 'deceased'
  | 'spouseName'
  | 'job'
  | 'cellphone'
  | 'phoneNo'
  | 'branch';

const TEMPLATE_COLUMNS: Array<Column & { field: Field }> = [
  { field: 'name', header: '姓名*', width: 12 },
  { field: 'gender', header: '性別*', width: 6 },
  { field: 'generation', header: '世代', width: 6 },
  { field: 'parentName', header: '父母姓名', width: 12 },
  { field: 'birthday', header: '生日', width: 12, text: true },
  { field: 'deceased', header: '已故', width: 6 },
  { field: 'spouseName', header: '配偶', width: 12 },
  { field: 'job', header: '職業', width: 12 },
  { field: 'cellphone', header: '手機', width: 14, text: true },
  { field: 'phoneNo', header: '電話', width: 14, text: true },
  { field: 'branch', header: '分支', width: 12 },
];

// 標題列允許的寫法（去掉 * 與空白後比對），讓使用者自己整理的名單也能直接匯入
const HEADER_ALIASES: Record<Field, string[]> = {
  name: ['姓名', '名字'],
  gender: ['性別'],
  generation: ['世代', '世', '代'],
  parentName: ['父母姓名', '父母', '父親', '母親', '父親姓名', '母親姓名', '父親/母親'],
  birthday: ['生日', '出生日期', '出生年月日'],
  deceased: ['已故', '是否已故', '歿'],
  spouseName: ['配偶', '配偶姓名'],
  job: ['職業'],
  cellphone: ['手機', '行動電話'],
  phoneNo: ['電話', '市話', '住家電話'],
  branch: ['分支', '房', '房頭'],
};

const INSTRUCTIONS: string[][] = [
  ['欄位', '說明'],
  ['姓名*', '必填，最多 50 個字'],
  ['性別*', '必填，填「男」或「女」'],
  ['世代', '始祖（沒有填父母的人）必填；有填父母時可留空，系統會以「父母世代 + 1」計算'],
  ['父母姓名', '填父親或母親的姓名。可以是這份名單裡的人，也可以是系統裡已有的人。有同名的人時，請填寫世代以便區分'],
  ['生日', '格式為 1980-06-15 或 1980/6/15，可留空'],
  ['已故', '已過世填「是」，在世留空'],
  ['分支', '填分支名稱；系統沒有的分支會自動新增'],
  ['', ''],
  ['範例', ''],
  ['傅開基 / 男 / 1 / （空白）', '始祖：沒有父母，必須填世代'],
  ['傅文宗 / 男 / （空白）/ 傅開基', '傅開基的兒子：世代自動算成 2'],
  ['', ''],
  [
    '注意',
    '系統裡已有「同名且同世代」的人會被略過，不會重複新增。檔案有任何錯誤時不會匯入，請依預覽中的提示修正後重新選擇檔案。',
  ],
];

export function buildMemberTemplateWorkbook(): XLSX.WorkBook {
  const instructions = XLSX.utils.aoa_to_sheet(INSTRUCTIONS);
  instructions['!cols'] = [{ wch: 32 }, { wch: 80 }];
  return workbook([
    ['宗親名單', tableSheet(TEMPLATE_COLUMNS, [], 500)],
    ['填寫說明', instructions],
  ]);
}

// ---------------------------------------------------------------------------
// 解析
// ---------------------------------------------------------------------------

interface ParsedRow {
  rowNumber: number;
  name: string;
  gender: Gender | null;
  generation: number | null;
  parentName: string | null;
  birthday: string | null;
  deceased: boolean;
  spouseName: string | null;
  job: string | null;
  cellphone: string | null;
  phoneNo: string | null;
  branch: string | null;
  errors: string[];
}

const pad = (n: number) => String(n).padStart(2, '0');

function text(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  return s === '' ? null : s;
}

function parseGender(value: unknown, errors: string[]): Gender | null {
  const s = text(value)?.toUpperCase();
  if (s === '男' || s === 'M' || s === 'MALE') return 'M';
  if (s === '女' || s === 'F' || s === 'FEMALE') return 'F';
  errors.push(s ? `性別「${text(value)}」無法辨識，請填「男」或「女」` : '性別為必填');
  return null;
}

function parseGeneration(value: unknown, errors: string[]): number | null {
  if (value === null || value === undefined || text(value) === null) return null;
  // 接受 3、"3"、"第3世"
  const digits = typeof value === 'number' ? value : Number(String(value).replace(/[^\d]/g, ''));
  if (!Number.isInteger(digits) || digits < 1) {
    errors.push(`世代「${text(value)}」必須是 1 以上的整數`);
    return null;
  }
  return digits;
}

function parseBirthday(value: unknown, errors: string[]): string | null {
  if (value === null || value === undefined || text(value) === null) return null;
  if (typeof value === 'number') {
    // Excel 日期儲存格是序列數字
    const date = XLSX.SSF.parse_date_code(value);
    if (date) return `${date.y}-${pad(date.m)}-${pad(date.d)}`;
  }
  const match = String(value)
    .trim()
    .match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (match) {
    const [, y, m, d] = match.map(Number);
    const date = new Date(y, m - 1, d);
    if (date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d) {
      return `${y}-${pad(m)}-${pad(d)}`;
    }
  }
  errors.push(`生日「${text(value)}」格式不正確，請填 1980-06-15`);
  return null;
}

function parseDeceased(value: unknown, errors: string[]): boolean {
  const s = text(value)?.toLowerCase();
  if (!s || ['否', 'n', 'no', '0', 'false', '在世'].includes(s)) return false;
  if (['是', 'y', 'yes', '1', 'true', '已故', 'v', '✓', '歿'].includes(s)) return true;
  errors.push(`已故欄「${text(value)}」無法辨識，已故填「是」，在世留空`);
  return false;
}

function parsePhone(value: unknown): string | null {
  // 儲存格若被設成數字，台灣手機開頭的 0 會被吃掉（912345678）——補回來
  if (typeof value === 'number') {
    const s = String(value);
    return /^9\d{8}$/.test(s) ? `0${s}` : s;
  }
  return text(value);
}

function normalizeHeader(value: unknown): string {
  return String(value ?? '').replace(/[*＊\s]/g, '');
}

function readRows(book: XLSX.WorkBook): { rows: ParsedRow[]; headerError: string | null } {
  const sheet = book.Sheets[book.SheetNames[0]];
  const grid = sheet
    ? XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: null, blankrows: true })
    : [];
  const header = (grid[0] ?? []).map(normalizeHeader);

  const columnOf = {} as Record<Field, number>;
  (Object.keys(HEADER_ALIASES) as Field[]).forEach((field) => {
    columnOf[field] = header.findIndex((h) => HEADER_ALIASES[field].includes(h));
  });
  if (columnOf.name < 0 || columnOf.gender < 0) {
    return { rows: [], headerError: '第一個工作表的第一列找不到「姓名」、「性別」欄位，請使用匯入範本' };
  }

  const rows: ParsedRow[] = [];
  grid.slice(1).forEach((cells, index) => {
    const get = (field: Field) => (columnOf[field] >= 0 ? cells[columnOf[field]] : null);
    if (cells.every((cell) => text(cell) === null)) return; // 空白列

    const errors: string[] = [];
    const row: ParsedRow = {
      rowNumber: index + 2,
      name: text(get('name')) ?? '',
      gender: parseGender(get('gender'), errors),
      generation: parseGeneration(get('generation'), errors),
      parentName: text(get('parentName')),
      birthday: parseBirthday(get('birthday'), errors),
      deceased: parseDeceased(get('deceased'), errors),
      spouseName: text(get('spouseName')),
      job: text(get('job')),
      cellphone: parsePhone(get('cellphone')),
      phoneNo: parsePhone(get('phoneNo')),
      branch: text(get('branch')),
      errors,
    };
    const { errors: fieldErrors } = validateMemberFields({ ...row, gender: row.gender ?? 'M' });
    // 性別、生日已在上面給出更具體的訊息
    errors.push(...fieldErrors.filter((e) => !e.startsWith('性別') && !e.startsWith('生日')));
    rows.push(row);
  });
  return { rows, headerError: null };
}

// ---------------------------------------------------------------------------
// 父母與世代的推算
// ---------------------------------------------------------------------------

type Candidate = { kind: 'file'; row: ParsedRow } | { kind: 'db'; id: number; generation: number };

interface Resolution {
  generation: number;
  parent: Candidate | null;
}

// 推算每一列的父母與世代。父母可能是同一個檔案的其他列（順序不拘），也可能是系統裡已有的人，
// 所以會反覆推算到沒有新的結果為止；最後仍推算不出來的列會附上原因。
function resolveRows(rows: ParsedRow[]): Map<ParsedRow, Resolution> {
  const existing = listAllMemberSummaries();
  const resolved = new Map<ParsedRow, Resolution>();
  const generationOf = (c: Candidate) => (c.kind === 'db' ? c.generation : (resolved.get(c.row)?.generation ?? null));

  const candidatesFor = (row: ParsedRow): Candidate[] => {
    const fromFile: Candidate[] = rows
      .filter((other) => other !== row && other.name === row.parentName)
      .map((other) => ({ kind: 'file', row: other }));
    const fromDb = existing
      .filter((m) => m.name === row.parentName)
      .map((m) => ({ kind: 'db' as const, id: m.id, generation: m.generation }));
    // 檔案裡與既有成員重複的列是同一個人，不要算兩次。
    const fileGenerations = new Set(fromFile.map(generationOf).filter((g) => g !== null));
    return [...fromFile, ...fromDb.filter((c) => !fileGenerations.has(c.generation))];
  };

  rows.forEach((row) => {
    if (row.parentName === null && row.generation !== null) {
      resolved.set(row, { generation: row.generation, parent: null });
    }
  });

  let progress = true;
  while (progress) {
    progress = false;
    rows.forEach((row) => {
      if (resolved.has(row) || row.parentName === null) return;
      const candidates = candidatesFor(row);
      const pending = candidates.filter((c) => generationOf(c) === null);
      const matching = candidates.filter((c) => {
        const g = generationOf(c);
        return g !== null && (row.generation === null || g === row.generation - 1);
      });
      if (pending.length === 0 && matching.length === 1) {
        resolved.set(row, { generation: generationOf(matching[0])! + 1, parent: matching[0] });
        progress = true;
      }
    });
  }

  rows.forEach((row) => {
    if (resolved.has(row)) return;
    if (row.parentName === null) {
      row.errors.push('沒有填父母時必須填寫世代');
      return;
    }
    const candidates = candidatesFor(row);
    const known = candidates.filter((c) => generationOf(c) !== null);
    const matching = known.filter((c) => row.generation === null || generationOf(c) === row.generation - 1);
    if (candidates.length === 0) {
      row.errors.push(`找不到父母「${row.parentName}」：這份名單和系統裡都沒有這個名字`);
    } else if (matching.length > 1) {
      row.errors.push(
        row.generation === null
          ? `有 ${matching.length} 位名叫「${row.parentName}」的人，請填寫世代以區分`
          : `有 ${matching.length} 位名叫「${row.parentName}」的第 ${row.generation - 1} 世成員，無法判斷是哪一位`
      );
    } else if (known.length > 0 && matching.length === 0) {
      const generations = [...new Set(known.map(generationOf))].join('、');
      row.errors.push(`父母「${row.parentName}」是第 ${generations} 世，與填寫的第 ${row.generation} 世不符`);
    } else {
      row.errors.push(`無法判斷父母「${row.parentName}」的世代（那一列有錯誤，或彼此互為父母）`);
    }
  });
  return resolved;
}

// ---------------------------------------------------------------------------
// 預覽與匯入計畫
// ---------------------------------------------------------------------------

export interface MemberImportPlan {
  preview: Omit<MemberImportPreview, 'token' | 'fileName'>;
  plan: ImportPlanItem[];
  newBranches: string[];
}

export function planMemberImport(book: XLSX.WorkBook): MemberImportPlan {
  const { rows, headerError } = readRows(book);
  if (headerError) {
    throw new Error(headerError);
  }
  if (rows.length === 0) {
    throw new Error('檔案中沒有任何宗親資料');
  }

  const resolved = resolveRows(rows);
  const existing = listAllMemberSummaries();

  // 與既有成員重複（同名同世代）的列會略過；指向它的子女改接到那位既有成員。
  const duplicateOf = new Map<ParsedRow, number>();
  const seenInFile = new Map<string, ParsedRow>();
  rows.forEach((row) => {
    const resolution = resolved.get(row);
    if (!resolution) return;
    const key = `${row.name}\u0000${resolution.generation}`;
    const match = existing.find((m) => m.name === row.name && m.generation === resolution.generation);
    if (match) {
      duplicateOf.set(row, match.id);
    } else if (seenInFile.has(key)) {
      row.errors.push(`與第 ${seenInFile.get(key)!.rowNumber} 列重複（同名同世代）`);
    } else {
      seenInFile.set(key, row);
    }
  });

  // 父母那一列有錯誤時，這一列也無法匯入。
  let changed = true;
  while (changed) {
    changed = false;
    rows.forEach((row) => {
      const parent = resolved.get(row)?.parent;
      if (row.errors.length === 0 && parent?.kind === 'file' && parent.row.errors.length > 0) {
        row.errors.push(`父母「${parent.row.name}」（第 ${parent.row.rowNumber} 列）有錯誤`);
        changed = true;
      }
    });
  }

  const statusOf = (row: ParsedRow) => (row.errors.length > 0 ? 'error' : duplicateOf.has(row) ? 'skip' : 'new');

  const previewRows: MemberImportRow[] = rows.map((row) => ({
    rowNumber: row.rowNumber,
    name: row.name,
    gender: row.gender,
    generation: resolved.get(row)?.generation ?? row.generation,
    parentName: row.parentName,
    birthday: row.birthday,
    deceased: row.deceased,
    status: statusOf(row),
    messages: row.errors.length > 0 ? row.errors : duplicateOf.has(row) ? ['系統已有同名同世代的成員，略過'] : [],
  }));

  // 寫入順序：父母先於子女，所以依世代排序。
  const newRows = rows
    .filter((row) => statusOf(row) === 'new')
    .sort((a, b) => resolved.get(a)!.generation - resolved.get(b)!.generation);
  const plan: ImportPlanItem[] = newRows.map((row) => {
    const { generation, parent } = resolved.get(row)!;
    const { fields } = validateMemberFields({ ...row, gender: row.gender! });
    let parentRef: ImportPlanItem['parent'] = null;
    if (parent?.kind === 'db') parentRef = { existingId: parent.id };
    if (parent?.kind === 'file') {
      parentRef = duplicateOf.has(parent.row)
        ? { existingId: duplicateOf.get(parent.row)! }
        : { key: parent.row.rowNumber };
    }
    return { key: row.rowNumber, fields: { ...fields, generation }, parent: parentRef, branchName: row.branch };
  });

  const knownBranches = new Set(getBranches().map((b) => b.name));
  const newBranches = [
    ...new Set(newRows.map((row) => row.branch).filter((b): b is string => b !== null && !knownBranches.has(b))),
  ];

  return {
    preview: {
      rows: previewRows,
      newCount: previewRows.filter((r) => r.status === 'new').length,
      skipCount: previewRows.filter((r) => r.status === 'skip').length,
      errorCount: previewRows.filter((r) => r.status === 'error').length,
      newBranches,
    },
    plan,
    newBranches,
  };
}
