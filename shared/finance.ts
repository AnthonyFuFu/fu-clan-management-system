// 財務規則：主程序（開立年度、範例資料）與畫面（表單預設值、類別選單）共用。

export const DEFAULT_DUES_AMOUNT = 1000;

// 第一次開立會費、沒有前一年度名單可沿用時，列入當年年齡在此範圍內的宗親
export const DUES_MIN_AGE = 20;
export const DUES_MAX_AGE = 99;

export const INCOME_CATEGORIES = ['上期結轉', '樂捐', '活動收入', '利息', '其他收入'];
export const EXPENSE_CATEGORIES = ['祭祖', '活動聯誼', '獎助學金', '婚喪慰問', '行政庶務', '修繕維護', '其他支出'];
