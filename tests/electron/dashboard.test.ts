// @vitest-environment node
import { toDateString } from '@shared/events';
import type { MemberInput } from '@shared/types';
import * as database from '../../electron/db';
import { DEMO, tempDir } from '../helpers/database';

function input(overrides: Partial<MemberInput>): MemberInput {
  return {
    name: '傅測試',
    gender: 'F',
    birthday: null,
    parentId: null,
    generation: 20,
    spouseName: null,
    job: null,
    phoneNo: null,
    cellphone: null,
    branchId: null,
    deceased: false,
    ...overrides,
  };
}

// n 天後的日期，年份換成 birthYear
function birthdayIn(days: number, birthYear: number): string {
  const today = new Date();
  const date = toDateString(new Date(today.getFullYear(), today.getMonth(), today.getDate() + days));
  return `${birthYear}${date.slice(4)}`;
}

beforeEach(async () => {
  await database.initDatabase(tempDir(), DEMO);
});

test('member totals add up across living / deceased, gender, generation and branch', () => {
  const stats = database.getDashboardStats();
  expect(stats.memberCount).toBe(34);
  expect(stats.livingCount + stats.deceasedCount).toBe(stats.memberCount);
  expect(stats.maleCount + stats.femaleCount).toBe(stats.livingCount);
  const sum = (rows: { count: number }[]) => rows.reduce((total, row) => total + row.count, 0);
  expect(sum(stats.generationCounts)).toBe(stats.livingCount);
  expect(sum(stats.branchCounts)).toBe(stats.livingCount);
  expect(sum(stats.ageGroups) + stats.missingBirthdayCount).toBe(stats.livingCount);
  expect(stats.generationCounts[0].label).toBe('第 16 世');
});

test('lists upcoming birthdays of living members, nearest first', () => {
  const birthYear = new Date().getFullYear() - 30;
  database.createMember(input({ name: '傅十天', birthday: birthdayIn(10, birthYear), cellphone: '0912000000' }));
  database.createMember(input({ name: '傅今天', birthday: birthdayIn(0, birthYear), cellphone: '0912000001' }));
  database.createMember(input({ name: '傅已故', birthday: birthdayIn(1, birthYear), deceased: true }));
  database.createMember(input({ name: '傅太遠', birthday: birthdayIn(60, birthYear), cellphone: '0912000002' }));

  const birthdays = database
    .getDashboardStats()
    .upcomingBirthdays.filter((b) => b.name.startsWith('傅') && b.generation === 20);
  expect(birthdays.map((b) => b.name)).toEqual(['傅今天', '傅十天']);
  expect(birthdays[0]).toMatchObject({ daysUntil: 0, age: 30 });
  expect(birthdays[1].daysUntil).toBe(10);
});

test('counts living members missing a birthday or any phone number', () => {
  const before = database.getDashboardStats();
  database.createMember(input({ name: '傅缺資料' }));
  database.createMember(input({ name: '傅已故', deceased: true }));
  const after = database.getDashboardStats();
  expect(after.missingBirthdayCount).toBe(before.missingBirthdayCount + 1);
  expect(after.missingContactCount).toBe(before.missingContactCount + 1);
});

test('includes this year’s finance summary and the latest transactions', () => {
  const year = new Date().getFullYear();
  database.saveTransaction({
    type: 'expense',
    category: '婚喪慰問',
    item: '最新一筆',
    amount: 1200,
    txDate: `${year + 1}-01-01`,
    note: null,
  });
  const stats = database.getDashboardStats();
  expect(stats.finance.year).toBe(year);
  expect(stats.recentTransactions[0].item).toBe('最新一筆');
  expect(stats.recentTransactions.length).toBeLessThanOrEqual(5);
});

test('the current balance counts only money received or spent up to today', () => {
  const today = toDateString(new Date());
  const nextYear = new Date().getFullYear() + 1;
  const before = database.getDashboardStats().financeTotal;

  database.saveTransaction({
    type: 'expense',
    category: '祭祖',
    item: '明年的支出',
    amount: 1200,
    txDate: `${nextYear}-01-01`,
    note: null,
  });
  expect(database.getDashboardStats().financeTotal).toBe(before);

  database.saveTransaction({
    type: 'income',
    category: '樂捐',
    item: '今天的樂捐',
    amount: 500,
    txDate: today,
    note: null,
  });
  expect(database.getDashboardStats().financeTotal).toBe(before + 500);
});

test('upcoming events are the not-yet-finished ones within 30 days', () => {
  const stats = database.getDashboardStats();
  const today = toDateString(new Date());
  expect(stats.upcomingEvents.length).toBeGreaterThan(0);
  expect(stats.upcomingEvents.every((e) => e.eventDate >= today)).toBe(true);
});
