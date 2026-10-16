// @vitest-environment node
import fs from 'fs';
import os from 'os';
import path from 'path';
import * as XLSX from 'xlsx';
import * as database from '../../electron/db';
import { importMembers } from '../../electron/db/members';
import { buildDuesStatusWorkbook, buildTransactionsWorkbook } from '../../electron/services/excel/exports';
import { buildMemberTemplateWorkbook, planMemberImport } from '../../electron/services/excel/memberImport';
import { toBuffer } from '../../electron/services/excel/sheet';

const YEAR = new Date().getFullYear();
const HEADER = ['姓名*', '性別*', '世代', '父母姓名', '生日', '已故', '配偶', '職業', '手機', '電話', '分支'];

function book(rows: unknown[][], header: unknown[] = HEADER): XLSX.WorkBook {
  const b = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(b, XLSX.utils.aoa_to_sheet([header, ...rows]), '宗親名單');
  return b;
}

// 寫成 xlsx 再讀回來，跟使用者實際存檔、匯入的路徑一樣
function roundTrip(b: XLSX.WorkBook): XLSX.WorkBook {
  return XLSX.read(toBuffer(b), { type: 'buffer' });
}

function sheetRows(b: XLSX.WorkBook, index: number): unknown[][] {
  return XLSX.utils.sheet_to_json<unknown[]>(b.Sheets[b.SheetNames[index]], { header: 1, defval: null });
}

beforeEach(async () => {
  await database.initDatabase(fs.mkdtempSync(path.join(os.tmpdir(), 'fu-clan-test-')));
});

describe('member import', () => {
  test('imports a new family line, linking parents within the file in any order', () => {
    const { preview, plan, newBranches } = planMemberImport(
      roundTrip(
        book([
          ['傅小華', '女', null, '傅大明', '2010/3/5', null, null, '學生', 912345678, null, '台中房'],
          ['傅大明', '男', 1, null, '1975-01-20', null, '林秀英', '農', '0922333444', '04-23456789', '台中房'],
          ['傅老祖', '男', 1, null, null, '是', null, null, null, null, null],
        ])
      )
    );

    expect(preview.errorCount).toBe(0);
    expect(preview.newCount).toBe(3);
    expect(newBranches).toEqual(['台中房']);
    const child = preview.rows.find((r) => r.name === '傅小華')!;
    expect(child.generation).toBe(2);
    expect(child.birthday).toBe('2010-03-05');

    expect(importMembers(plan, newBranches)).toBe(3);
    const imported = database.listMembers({ keyword: '傅小華', page: 1, pageSize: 5 }).rows[0];
    expect(imported.parentName).toBe('傅大明');
    expect(imported.generation).toBe(2);
    expect(imported.branchName).toBe('台中房');
    // Excel 把手機存成數字時吃掉的 0 會補回來
    expect(imported.cellphone).toBe('0912345678');
    expect(database.listMembers({ keyword: '傅老祖', page: 1, pageSize: 5 }).rows[0].deceased).toBe(true);
  });

  test('links to an existing member as parent and skips members that already exist', () => {
    // 傅宗翰（第 19 世）已在範例資料中
    const { preview, plan, newBranches } = planMemberImport(
      book([
        ['傅宗翰', '男', 19, null],
        ['傅新苗', '男', null, '傅宗翰'],
      ])
    );

    expect(preview.rows.map((r) => r.status)).toEqual(['skip', 'new']);
    expect(preview.rows[1].generation).toBe(20);
    importMembers(plan, newBranches);
    expect(database.listMembers({ keyword: '傅新苗', page: 1, pageSize: 5 }).rows[0].parentName).toBe('傅宗翰');
  });

  test('explains every problem with row numbers and blocks the import', () => {
    const { preview } = planMemberImport(
      book([
        ['', '男', 1],
        ['傅甲', '不明', 1],
        ['傅乙', '男', null, '查無此人'],
        ['傅丙', '男', null, null],
        ['傅丁', '男', 5, '傅開基'],
        ['傅戊', '男', 1, null, '1990-13-40'],
        ['傅己', '男', null, '傅甲'],
      ])
    );

    const messages = Object.fromEntries(preview.rows.map((r) => [r.rowNumber, r.messages.join(' / ')]));
    expect(messages[2]).toMatch('姓名為必填');
    expect(messages[3]).toMatch('性別「不明」無法辨識');
    expect(messages[4]).toMatch('找不到父母「查無此人」');
    expect(messages[5]).toMatch('沒有填父母時必須填寫世代');
    expect(messages[6]).toMatch('父母「傅開基」是第 1 世，與填寫的第 5 世不符');
    expect(messages[7]).toMatch('生日「1990-13-40」格式不正確');
    // 父母那一列有錯，子女也不能匯入
    expect(messages[8]).toMatch('父母「傅甲」（第 3 列）有錯誤');
    expect(preview.errorCount).toBe(7);
    expect(preview.newCount).toBe(0);
  });

  test('asks for a generation when the parent name is ambiguous', () => {
    database.createMember({
      name: '傅開基', gender: 'M', birthday: null, parentId: null, generation: 30,
      spouseName: null, job: null, phoneNo: null, cellphone: null, branchId: null, deceased: false,
    });
    const ambiguous = planMemberImport(book([['傅子', '男', null, '傅開基']]));
    expect(ambiguous.preview.rows[0].messages[0]).toMatch('有 2 位名叫「傅開基」的人，請填寫世代以區分');

    const disambiguated = planMemberImport(book([['傅子', '男', 31, '傅開基']]));
    expect(disambiguated.preview.errorCount).toBe(0);
  });

  test('accepts the column names people commonly use and rejects files without them', () => {
    const { preview } = planMemberImport(book([['傅庚', '男', 3]], ['名字', '性別', '世代']));
    expect(preview.newCount).toBe(1);
    expect(() => planMemberImport(book([['x']], ['foo', 'bar']))).toThrow('找不到「姓名」、「性別」欄位');
    expect(() => planMemberImport(book([]))).toThrow('沒有任何宗親資料');
  });

  test('the template can be filled in and imported as-is', () => {
    const template = roundTrip(buildMemberTemplateWorkbook());
    expect(template.SheetNames).toEqual(['宗親名單', '填寫說明']);
    expect(sheetRows(template, 0)[0]).toEqual(HEADER);
    // 範本預先格式化的空白列不算資料
    expect(() => planMemberImport(template)).toThrow('沒有任何宗親資料');
  });
});

describe('exports', () => {
  test('dues status lists every living member with their payment status', () => {
    const b = roundTrip(buildDuesStatusWorkbook(YEAR));
    const [header, ...rows] = sheetRows(b, 0);
    expect(header).toEqual(['世代', '姓名', '性別', '分支', '手機', '電話', '應繳金額', '繳費狀態', '繳費日期', '備註']);
    // 範例資料：第 16–19 世共 18 人在世，第 1–15 世已故不列出
    expect(rows).toHaveLength(18);
    expect(rows.every((r) => Number(r[0]) >= 16)).toBe(true);
    expect(new Set(rows.map((r) => r[7]))).toEqual(new Set(['已繳', '未繳']));

    const stats = Object.fromEntries(sheetRows(b, 1).slice(1));
    expect(stats['在世人數']).toBe(18);
    expect(stats['已繳人數'] + stats['未繳人數']).toBe(18);
  });

  test('members not on the roster show as such, deceased members are left out', () => {
    const roster = database.getDues(YEAR);
    database.removeDues(roster[0].id);
    const member = database.listMembers({ keyword: roster[1].name, page: 1, pageSize: 1 }).rows[0];
    database.updateMember(member.id, { ...member, deceased: true });

    const rows = sheetRows(roundTrip(buildDuesStatusWorkbook(YEAR)), 0).slice(1);
    expect(rows.find((r) => r[1] === roster[0].name)?.[7]).toBe('未列入名單');
    expect(rows.find((r) => r[1] === roster[1].name)).toBeUndefined();
  });

  test('transactions export lists entries oldest first plus a yearly summary', () => {
    const b = roundTrip(buildTransactionsWorkbook(YEAR));
    const [header, ...rows] = sheetRows(b, 0);
    expect(header).toEqual(['日期', '類型', '類別', '項目', '金額', '備註']);
    const dates = rows.map((r) => String(r[0]));
    expect(dates).toEqual([...dates].sort());

    const summary = database.getFinanceSummary(YEAR);
    const totals = Object.fromEntries(sheetRows(b, 1).slice(1).map((r) => [r[1], r[2]]));
    expect(totals['宗親會費']).toBe(summary.duesCollected);
    expect(totals['支出合計']).toBe(summary.expense);
    expect(totals[`累計結餘（至 ${YEAR} 年底）`]).toBe(summary.closingBalance);
  });
});

describe('deceased flag', () => {
  test('new dues years leave deceased members off the roster', () => {
    const member = database.listMembers({ generation: 19, page: 1, pageSize: 1 }).rows[0];
    database.updateMember(member.id, { ...member, deceased: true });
    const created = database.createDuesYear(YEAR + 1, 1000);
    expect(database.getDues(YEAR + 1).some((r) => r.memberId === member.id)).toBe(false);
    expect(created).toBe(database.getDues(YEAR).length - 1);
  });

  test('existing databases get the column, with people born 100+ years ago marked deceased', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fu-clan-test-'));
    await database.initDatabase(dir);
    const initSqlJs = (await import('sql.js')).default;
    const SQL = await initSqlJs();
    const file = path.join(dir, 'clan.db');
    const legacy = new SQL.Database(fs.readFileSync(file));
    // 模擬加欄位之前的資料庫：重建一個沒有 deceased 的 members 表
    legacy.run(`
      CREATE TABLE members_old AS SELECT id, name, gender, birthday, parent_id, phone_no, cellphone, job, spouse_name, generation, branch_id FROM members;
      DROP TABLE members;
      ALTER TABLE members_old RENAME TO members;
    `);
    fs.writeFileSync(file, Buffer.from(legacy.export()));

    await database.initDatabase(dir);
    const all = database.listMembers({ page: 1, pageSize: 200 }).rows;
    // 範例資料的生年：第 15 世生於 1905 年，第 16 世生於 1930 年
    expect(all.filter((m) => m.deceased).every((m) => m.generation <= 15)).toBe(true);
    expect(all.filter((m) => !m.deceased).every((m) => m.generation >= 16)).toBe(true);
    expect(all.filter((m) => m.deceased)).toHaveLength(16);
  });
});
