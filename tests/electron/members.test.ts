// @vitest-environment node
import fs from 'fs';
import os from 'os';
import path from 'path';
import type { MemberInput } from '@shared/types';
import * as database from '../../electron/db';

function input(overrides: Partial<MemberInput>): MemberInput {
  return {
    name: '傅測試',
    gender: 'M',
    birthday: null,
    parentId: null,
    generation: 1,
    spouseName: null,
    job: null,
    phoneNo: null,
    cellphone: null,
    branchId: null,
    deceased: false,
    ...overrides,
  };
}

function findMember(id: number) {
  return database.listMembers({ page: 1, pageSize: 200 }).rows.find((row) => row.id === id)!;
}

beforeAll(async () => {
  await database.initDatabase(fs.mkdtempSync(path.join(os.tmpdir(), 'fu-clan-test-')));
});

test('lists members page by page, ordered by generation', () => {
  const first = database.listMembers({ page: 1, pageSize: 10 });
  const second = database.listMembers({ page: 2, pageSize: 10 });
  expect(first.rows).toHaveLength(10);
  expect(first.total).toBe(34);
  expect(second.rows[0].generation).toBeGreaterThanOrEqual(first.rows[9].generation);
  expect(first.rows[1].parentName).toBe(first.rows[0].name);
});

test('filters by keyword, generation and gender', () => {
  expect(database.listMembers({ keyword: '宗翰', page: 1, pageSize: 20 }).rows.map((r) => r.name)).toEqual(['傅宗翰']);
  expect(database.listMembers({ keyword: '林美玲', page: 1, pageSize: 20 }).rows[0].name).toBe('傅志成'); // 配偶
  expect(database.listMembers({ generation: 19, page: 1, pageSize: 20 }).total).toBe(6);
  expect(database.listMembers({ gender: 'F', page: 1, pageSize: 20 }).rows.every((r) => r.gender === 'F')).toBe(true);
});

test('a new child gets its parent’s generation + 1, whatever generation was sent', () => {
  const parent = database.listMembers({ keyword: '傅宗翰', page: 1, pageSize: 1 }).rows[0];
  const id = database.createMember(input({ name: '傅新生', parentId: parent.id, generation: 99, cellphone: ' 0912000000 ' }));

  const child = findMember(id);
  expect(child.generation).toBe(parent.generation + 1);
  expect(child.parentName).toBe('傅宗翰');
  expect(child.cellphone).toBe('0912000000');
});

test('moving a member to a new parent shifts all of their descendants', () => {
  const grandparent = database.createMember(input({ name: '傅甲', generation: 5 }));
  const parent = database.createMember(input({ name: '傅乙', parentId: grandparent }));
  const child = database.createMember(input({ name: '傅丙', parentId: parent }));
  const newGrandparent = database.createMember(input({ name: '傅丁', generation: 10 }));

  database.updateMember(parent, input({ name: '傅乙', parentId: newGrandparent }));

  expect(findMember(parent).generation).toBe(11);
  expect(findMember(child).generation).toBe(12);
});

test('refuses to make a member their own ancestor', () => {
  const parent = database.createMember(input({ name: '傅父', generation: 3 }));
  const child = database.createMember(input({ name: '傅子', parentId: parent }));

  expect(() => database.updateMember(parent, input({ name: '傅父', parentId: child }))).toThrow('不能將自己或自己的子孫設為父母');
  expect(() => database.updateMember(parent, input({ name: '傅父', parentId: parent }))).toThrow();
  expect(findMember(parent).parentId).toBeNull();
});

test('rejects invalid input', () => {
  expect(() => database.createMember(input({ name: '  ' }))).toThrow('姓名');
  expect(() => database.createMember(input({ parentId: 99999 }))).toThrow('父母不存在');
  expect(() => database.createMember(input({ generation: 0 }))).toThrow('世代');
  expect(() => database.createMember(input({ birthday: '2000/01/01' }))).toThrow('生日');
  expect(() => database.updateMember(99999, input({}))).toThrow('成員不存在');
});
