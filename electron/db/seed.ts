import type { FinanceTransactionInput } from '../../shared/types';
import { DEFAULT_DUES_AMOUNT } from '../../shared/finance';
import { toDateString } from '../../shared/events';
import { db } from './connection';
import { createDuesYear, getDues, insertTransaction, setDuesPaid } from './finance';

// Hand-authored test genealogy: a single trunk (generation 1-14), branching out toward the
// present (generation 15-19) so the family-tree feature has siblings/cousins to render.
const MEMBER_SEED: Array<{
  id: number;
  name: string;
  gender: 'M' | 'F';
  generation: number;
  parentId: number | null;
  spouseName: string | null;
}> = [
  { id: 1, name: '傅開基', gender: 'M', generation: 1, parentId: null, spouseName: '林氏' },
  { id: 2, name: '傅文宗', gender: 'M', generation: 2, parentId: 1, spouseName: '陳氏' },
  { id: 3, name: '傅世昌', gender: 'M', generation: 3, parentId: 2, spouseName: '王氏' },
  { id: 4, name: '傅本立', gender: 'M', generation: 4, parentId: 3, spouseName: '李氏' },
  { id: 5, name: '傅德厚', gender: 'M', generation: 5, parentId: 4, spouseName: '張氏' },
  { id: 6, name: '傅宏毅', gender: 'M', generation: 6, parentId: 5, spouseName: '黃氏' },
  { id: 7, name: '傅永錫', gender: 'M', generation: 7, parentId: 6, spouseName: '吳氏' },
  { id: 8, name: '傅家聲', gender: 'M', generation: 8, parentId: 7, spouseName: '劉氏' },
  { id: 9, name: '傅紹祖', gender: 'M', generation: 9, parentId: 8, spouseName: '蔡氏' },
  { id: 10, name: '傅嗣興', gender: 'M', generation: 10, parentId: 9, spouseName: '楊氏' },
  { id: 11, name: '傅肇基', gender: 'M', generation: 11, parentId: 10, spouseName: '許氏' },
  { id: 12, name: '傅振邦', gender: 'M', generation: 12, parentId: 11, spouseName: '鄭氏' },
  { id: 13, name: '傅廷選', gender: 'M', generation: 13, parentId: 12, spouseName: '謝氏' },
  { id: 14, name: '傅國棟', gender: 'M', generation: 14, parentId: 13, spouseName: '郭氏' },

  { id: 15, name: '傅建民', gender: 'M', generation: 15, parentId: 14, spouseName: '洪秀蓮' },
  { id: 16, name: '傅建邦', gender: 'M', generation: 15, parentId: 14, spouseName: '曾淑芬' },

  { id: 17, name: '傅志成', gender: 'M', generation: 16, parentId: 15, spouseName: '林美玲' },
  { id: 18, name: '傅志華', gender: 'M', generation: 16, parentId: 15, spouseName: '陳雪娥' },
  { id: 19, name: '傅志平', gender: 'M', generation: 16, parentId: 16, spouseName: '黃惠珠' },

  { id: 20, name: '傅俊宏', gender: 'M', generation: 17, parentId: 17, spouseName: '王淑娟' },
  { id: 21, name: '傅俊傑', gender: 'M', generation: 17, parentId: 17, spouseName: '李佳蓉' },
  { id: 22, name: '傅俊賢', gender: 'M', generation: 17, parentId: 18, spouseName: '張雅芳' },
  { id: 23, name: '傅俊文', gender: 'M', generation: 17, parentId: 19, spouseName: '吳怡如' },

  { id: 24, name: '傅冠宇', gender: 'M', generation: 18, parentId: 20, spouseName: '蔡依婷' },
  { id: 25, name: '傅雅婷', gender: 'F', generation: 18, parentId: 20, spouseName: '陳建宏' },
  { id: 26, name: '傅柏宏', gender: 'M', generation: 18, parentId: 21, spouseName: '林芳瑜' },
  { id: 27, name: '傅怡君', gender: 'F', generation: 18, parentId: 22, spouseName: '林志偉' },
  { id: 28, name: '傅彥廷', gender: 'M', generation: 18, parentId: 23, spouseName: '黃思婷' },

  { id: 29, name: '傅宗翰', gender: 'M', generation: 19, parentId: 24, spouseName: null },
  { id: 30, name: '傅宗義', gender: 'M', generation: 19, parentId: 24, spouseName: null },
  { id: 31, name: '傅宗翔', gender: 'M', generation: 19, parentId: 26, spouseName: null },
  { id: 32, name: '傅宗儒', gender: 'M', generation: 19, parentId: 26, spouseName: null },
  { id: 33, name: '傅宗霖', gender: 'M', generation: 19, parentId: 28, spouseName: null },
  { id: 34, name: '傅宗謙', gender: 'M', generation: 19, parentId: 28, spouseName: null },
];

const HISTORICAL_JOBS = ['務農', '私塾先生', '地方仕紳', '商人'];
const MODERN_JOBS = ['工程師', '教師', '醫師', '商人', '學生', '公務員'];

export function seedData(): void {
  const insertBranch = db().prepare('INSERT INTO branches (name) VALUES (?)');
  for (let i = 1; i <= 12; i += 1) {
    insertBranch.run([`第 ${i} 分支`]);
  }
  insertBranch.free();

  const insertMember = db().prepare(`
    INSERT INTO members (id, name, gender, birthday, parent_id, phone_no, cellphone, job, spouse_name, generation, deceased)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  MEMBER_SEED.forEach((member, index) => {
    const isModern = member.generation >= 16;
    const birthYear = 2005 - (19 - member.generation) * 25;
    const birthday = `${birthYear}-06-15`;
    const phoneNo = isModern ? `04-${2300 + member.id}` : null;
    const cellphone = isModern ? `09${String(10000000 + member.id).slice(0, 8)}` : null;
    const jobPool = isModern ? MODERN_JOBS : HISTORICAL_JOBS;
    const job = jobPool[index % jobPool.length];

    insertMember.run([
      member.id,
      member.name,
      member.gender,
      birthday,
      member.parentId,
      phoneNo,
      cellphone,
      job,
      member.spouseName,
      member.generation,
      // 第 1–15 世為歷代先祖（生於百年以前），標記為已故
      isModern ? 0 : 1,
    ]);
  });
  insertMember.free();

  // 範例活動以「今天」為基準排列，讓行事曆與提醒一開啟就有內容
  const today = new Date();
  const daysFromToday = (days: number) =>
    toDateString(new Date(today.getFullYear(), today.getMonth(), today.getDate() + days));
  const insertEvent = db().prepare(
    'INSERT INTO events (title, event_date, start_time, end_time, location, note) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const demoEvents: Array<[number, string, string | null, string | null, string | null, string | null]> = [
    [-10, '理監事會議', '19:00', '21:00', '宗親會館二樓會議室', '討論年度預算'],
    [2, '秋季祭祖', '09:00', '12:00', '傅氏宗祠', '請著正式服裝，9 點前到場'],
    [9, '宗親聯誼餐會', '18:00', '21:00', '台中福華飯店', '每戶限 4 人，請先報名'],
    [20, '獎助學金頒發典禮', '14:00', null, '宗親會館大禮堂', null],
  ];
  demoEvents.forEach(([days, ...rest]) => insertEvent.run([rest[0], daysFromToday(days), ...rest.slice(1)]));
  insertEvent.free();
}

const DEMO_OPENING_BALANCE = 128500;

// Demo ledger for last year and this year so the finance page has something to show.
export function seedFinance(openingBalance: number): void {
  const thisYear = new Date().getFullYear();
  const lastYear = thisYear - 1;

  createDuesYear(lastYear, DEFAULT_DUES_AMOUNT);
  createDuesYear(thisYear, DEFAULT_DUES_AMOUNT);

  // Last year: everyone paid except the last two on the roster. This year: roughly 60% paid so far.
  const lastYearIds = getDues(lastYear).map((row) => row.id);
  setDuesPaid(lastYearIds.slice(0, -2), `${lastYear}-02-15`);
  const thisYearIds = getDues(thisYear).map((row) => row.id);
  setDuesPaid(thisYearIds.slice(0, Math.ceil(thisYearIds.length * 0.6)), `${thisYear}-02-20`);

  const demo: FinanceTransactionInput[] = [
    {
      type: 'income',
      category: '上期結轉',
      item: '上期結餘轉入',
      amount: openingBalance > 0 ? openingBalance : DEMO_OPENING_BALANCE,
      txDate: `${lastYear}-01-01`,
      note: null,
    },
    { type: 'income', category: '樂捐', item: '春祭宗親樂捐', amount: 6000, txDate: `${lastYear}-04-04`, note: null },
    { type: 'expense', category: '祭祖', item: '春季祭祖（供品、香燭）', amount: 15000, txDate: `${lastYear}-04-04`, note: null },
    { type: 'expense', category: '獎助學金', item: '宗親子弟獎助學金', amount: 12000, txDate: `${lastYear}-08-20`, note: '4 名 × 3,000 元' },
    { type: 'expense', category: '祭祖', item: '秋季祭祖（供品、香燭）', amount: 15000, txDate: `${lastYear}-10-10`, note: null },
    { type: 'expense', category: '行政庶務', item: '文具、郵資', amount: 2300, txDate: `${lastYear}-12-15`, note: null },
    { type: 'income', category: '樂捐', item: '春祭宗親樂捐', amount: 8000, txDate: `${thisYear}-04-04`, note: null },
    { type: 'expense', category: '祭祖', item: '春季祭祖（供品、香燭）', amount: 16000, txDate: `${thisYear}-04-04`, note: null },
    { type: 'expense', category: '活動聯誼', item: '宗親聯誼餐會', amount: 24000, txDate: `${thisYear}-06-08`, note: '3 桌' },
    { type: 'expense', category: '行政庶務', item: '文具、郵資', amount: 1500, txDate: `${thisYear}-06-30`, note: null },
  ];
  demo.forEach((tx) => insertTransaction(tx));
}

