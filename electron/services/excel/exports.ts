import type * as XLSX from 'xlsx';
import { GENDER_LABEL } from '../../../shared/labels';
import type { Gender } from '../../../shared/types';
import { getFinanceSummary, getLivingDuesStatus, getTransactions } from '../../db/finance';
import type { LivingDuesStatus } from '../../db/finance';
import { CellValue, Column, tableSheet, workbook } from './sheet';

export function duesStatusLabel(row: Pick<LivingDuesStatus, 'amountDue' | 'paidDate'>): string {
  if (row.amountDue === null) return '未列入名單';
  if (row.amountDue === 0) return '免繳';
  return row.paidDate ? '已繳' : '未繳';
}

// 在世宗親的會費繳納名單：每位在世成員一列，未列入當年度應繳名單的也列出（例如未成年）。
export function buildDuesStatusWorkbook(year: number): XLSX.WorkBook {
  const rows = getLivingDuesStatus(year);

  const columns: Column[] = [
    { header: '世代', width: 8 },
    { header: '姓名', width: 12 },
    { header: '性別', width: 6 },
    { header: '分支', width: 12 },
    { header: '手機', width: 14, text: true },
    { header: '電話', width: 14, text: true },
    { header: '應繳金額', width: 10, money: true },
    { header: '繳費狀態', width: 12 },
    { header: '繳費日期', width: 12 },
    { header: '備註', width: 24 },
  ];
  const data: CellValue[][] = rows.map((row) => [
    row.generation,
    row.name,
    GENDER_LABEL[row.gender as Gender] ?? row.gender,
    row.branchName,
    row.cellphone,
    row.phoneNo,
    row.amountDue,
    duesStatusLabel(row),
    row.paidDate,
    row.note,
  ]);

  const count = (label: string) => rows.filter((row) => duesStatusLabel(row) === label).length;
  const expected = rows.reduce((sum, row) => sum + (row.amountDue ?? 0), 0);
  const collected = rows.reduce((sum, row) => sum + (row.paidDate ? row.amountDue ?? 0 : 0), 0);
  const summary = tableSheet(
    [
      { header: '項目', width: 16 },
      { header: '數值', width: 14, money: true },
    ],
    [
      ['在世人數', rows.length],
      ['已繳人數', count('已繳')],
      ['未繳人數', count('未繳')],
      ['免繳人數', count('免繳')],
      ['未列入名單人數', count('未列入名單')],
      ['應收金額（元）', expected],
      ['已收金額（元）', collected],
      ['未收金額（元）', expected - collected],
    ]
  );

  return workbook([
    [`${year} 會費繳納名單`, tableSheet(columns, data)],
    ['統計', summary],
  ]);
}

// 收支明細：會費以外的每一筆收支，另附年度彙總（含會費收入）。
export function buildTransactionsWorkbook(year: number): XLSX.WorkBook {
  const transactions = getTransactions(year);
  const summary = getFinanceSummary(year);

  const columns: Column[] = [
    { header: '日期', width: 12 },
    { header: '類型', width: 6 },
    { header: '類別', width: 12 },
    { header: '項目', width: 28 },
    { header: '金額', width: 12, money: true },
    { header: '備註', width: 24 },
  ];
  // 依日期由舊到新，方便對帳
  const data: CellValue[][] = [...transactions]
    .sort((a, b) => a.txDate.localeCompare(b.txDate) || a.id - b.id)
    .map((tx) => [tx.txDate, tx.type === 'income' ? '收入' : '支出', tx.category, tx.item, tx.amount, tx.note]);

  const totals: CellValue[][] = [
    ['收入', '宗親會費', summary.duesCollected],
    ...summary.incomeByCategory.map((row): CellValue[] => ['收入', row.category, row.amount]),
    ['收入', '收入合計', summary.duesCollected + summary.otherIncome],
    ...summary.expenseByCategory.map((row): CellValue[] => ['支出', row.category, row.amount]),
    ['支出', '支出合計', summary.expense],
    ['結餘', `${year} 年度結餘`, summary.yearBalance],
    ['結餘', `累計結餘（至 ${year} 年底）`, summary.closingBalance],
  ];

  return workbook([
    [`${year} 收支明細`, tableSheet(columns, data)],
    [
      '年度彙總',
      tableSheet(
        [
          { header: '分類', width: 8 },
          { header: '項目', width: 24 },
          { header: '金額', width: 14, money: true },
        ],
        totals
      ),
    ],
  ]);
}
