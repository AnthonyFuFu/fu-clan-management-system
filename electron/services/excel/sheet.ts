import * as XLSX from 'xlsx';

export type CellValue = string | number | null;

export interface Column {
  header: string;
  // 欄寬（字元數）
  width: number;
  // 金額欄：千分位格式
  money?: boolean;
  // 文字欄：避免 Excel 把電話號碼轉成數字、吃掉開頭的 0
  text?: boolean;
}

// 建立一張「第一列是標題、可以篩選」的表格工作表。
// prefillRows：範本用，預先把文字格式套到這麼多列空白列，使用者往下填寫時電話不會被轉成數字。
export function tableSheet(columns: Column[], rows: CellValue[][], prefillRows = 0): XLSX.WorkSheet {
  const sheet = XLSX.utils.aoa_to_sheet([columns.map((c) => c.header), ...rows]);
  sheet['!cols'] = columns.map((c) => ({ wch: c.width }));

  const lastRow = rows.length; // 0-based index of the last data row (header is row 0)
  const lastFormattedRow = Math.max(lastRow, prefillRows);
  columns.forEach((column, c) => {
    const format = column.money ? '#,##0' : column.text ? '@' : null;
    if (!format) return;
    for (let r = 1; r <= (column.text ? lastFormattedRow : lastRow); r += 1) {
      const ref = XLSX.utils.encode_cell({ r, c });
      const cell = sheet[ref] ?? (column.text ? { t: 's', v: '' } : undefined);
      if (cell) {
        cell.z = format;
        sheet[ref] = cell;
      }
    }
  });
  sheet['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: lastFormattedRow, c: columns.length - 1 } });
  if (rows.length > 0) {
    sheet['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: lastRow, c: columns.length - 1 } }) };
  }
  return sheet;
}

export function workbook(sheets: Array<[name: string, sheet: XLSX.WorkSheet]>): XLSX.WorkBook {
  const book = XLSX.utils.book_new();
  sheets.forEach(([name, sheet]) => XLSX.utils.book_append_sheet(book, sheet, name));
  return book;
}

export function toBuffer(book: XLSX.WorkBook): Buffer {
  return XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}
