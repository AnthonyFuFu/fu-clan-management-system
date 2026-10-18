import type { SqlValue } from 'sql.js';
import type { Branch, Member, MemberInput, MemberListResult, MemberQuery, MemberSummary } from '../../shared/types';
import { db, inTransaction, queryAll, queryOne, queryScalar } from './connection';
import { DATE_PATTERN, optionalText } from './validation';

// members 資料表的原始欄位（snake_case）
export interface MemberRow {
  id: number;
  name: string;
  gender: string;
  birthday: string | null;
  parent_id: number | null;
  phone_no: string | null;
  cellphone: string | null;
  job: string | null;
  spouse_name: string | null;
  generation: number;
  branch_id: number | null;
  // SQLite 沒有布林值，0 / 1
  deceased: number;
}

const MAX_PAGE_SIZE = 200;

// 用搜尋而不是一次回傳全部成員：名冊成長到上千人時，下拉選單仍然好用。
export function searchMembers(keyword: string, limit = 20): MemberSummary[] {
  return queryAll<MemberSummary>(
    'SELECT id, name, generation FROM members WHERE name LIKE ? ORDER BY generation, id LIMIT ?',
    [`%${keyword}%`, limit]
  );
}

// 全部成員的姓名與世代：Excel 匯入時比對父母、找出重複的人
export function listAllMemberSummaries(): MemberSummary[] {
  return queryAll<MemberSummary>('SELECT id, name, generation FROM members');
}

export function getBranches(): Branch[] {
  return queryAll<Branch>('SELECT id, name FROM branches ORDER BY id');
}

// 在資料庫端分頁，名冊再大，列表也一樣快。
export function listMembers(query: MemberQuery): MemberListResult {
  const where: string[] = [];
  const params: SqlValue[] = [];

  const keyword = query.keyword?.trim();
  if (keyword) {
    where.push('(m.name LIKE ? OR m.spouse_name LIKE ? OR m.cellphone LIKE ? OR m.phone_no LIKE ?)');
    params.push(...Array(4).fill(`%${keyword}%`));
  }
  if (query.generation !== undefined) {
    where.push('m.generation = ?');
    params.push(query.generation);
  }
  if (query.gender !== undefined) {
    where.push('m.gender = ?');
    params.push(query.gender);
  }
  if (query.deceased !== undefined) {
    where.push('m.deceased = ?');
    params.push(query.deceased ? 1 : 0);
  }
  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

  const pageSize = Math.min(Math.max(1, Math.floor(query.pageSize)), MAX_PAGE_SIZE);
  const page = Math.max(1, Math.floor(query.page));

  const rows = queryAll<Omit<Member, 'deceased'> & { deceased: number }>(
    `SELECT m.id, m.name, m.gender, m.birthday, m.parent_id AS parentId, p.name AS parentName,
            m.generation, m.spouse_name AS spouseName, m.job, m.phone_no AS phoneNo, m.cellphone,
            m.branch_id AS branchId, b.name AS branchName, m.deceased
       FROM members m
       LEFT JOIN members p ON p.id = m.parent_id
       LEFT JOIN branches b ON b.id = m.branch_id
       ${whereSql}
      ORDER BY m.generation, m.id
      LIMIT ? OFFSET ?`,
    [...params, pageSize, (page - 1) * pageSize]
  );
  const total = Number(queryScalar(`SELECT COUNT(*) FROM members m ${whereSql}`, params));
  const generations = queryAll<{ generation: number }>(
    'SELECT DISTINCT generation FROM members ORDER BY generation'
  ).map((row) => row.generation);

  return { rows: rows.map((row) => ({ ...row, deceased: row.deceased === 1 })), total, generations };
}

// 成員本身加上所有子孫：修改父母時用來防止形成循環（把自己的子孫設為父母）。
function subtreeIds(memberId: number): number[] {
  return queryAll<{ id: number }>(
    `WITH RECURSIVE subtree(id) AS (
       SELECT ?
       UNION ALL
       SELECT m.id FROM members m JOIN subtree s ON m.parent_id = s.id
     )
     SELECT id FROM subtree`,
    [memberId]
  ).map((row) => row.id);
}

// 成員表單與 Excel 匯入共用的欄位檢查。回傳所有問題（不只第一個），匯入預覽才能把一列的錯誤全部列出。
// 父母、世代、分支另外處理，因為匯入時查找的方式不同。
export function validateMemberFields(
  input: Pick<MemberInput, 'name' | 'gender' | 'birthday' | 'spouseName' | 'job' | 'phoneNo' | 'cellphone' | 'deceased'>
): { errors: string[]; fields: Omit<MemberRow, 'id' | 'parent_id' | 'generation' | 'branch_id'> } {
  const errors: string[] = [];
  const name = input.name.trim();
  if (name === '' || name.length > 50) {
    errors.push('姓名為必填，最多 50 個字');
  }
  if (input.gender !== 'M' && input.gender !== 'F') {
    errors.push('性別必須是「男」或「女」');
  }
  if (input.birthday !== null && !DATE_PATTERN.test(input.birthday)) {
    errors.push('生日格式不正確（例如 1980-06-15）');
  }
  const text = (value: string | null, maxLength: number, label: string) => {
    const result = optionalText(value, maxLength, label);
    if (result.error) errors.push(result.error);
    return result.text;
  };
  const fields = {
    name,
    gender: input.gender,
    birthday: input.birthday,
    spouse_name: text(input.spouseName, 50, '配偶'),
    job: text(input.job, 50, '職業'),
    phone_no: text(input.phoneNo, 30, '電話'),
    cellphone: text(input.cellphone, 30, '手機'),
    deceased: input.deceased ? 1 : 0,
  };
  return { errors, fields };
}

// 檢查輸入並決定世代：有父母時為父母世代 + 1，始祖則用輸入的世代。
function normalize(input: MemberInput): Omit<MemberRow, 'id'> {
  const { errors, fields } = validateMemberFields(input);
  if (errors.length > 0) {
    throw new Error(errors[0]);
  }
  if (input.branchId !== null && !queryOne('SELECT id FROM branches WHERE id = ?', [input.branchId])) {
    throw new Error('分支不存在');
  }

  let generation = input.generation;
  if (input.parentId !== null) {
    const parent = queryOne<{ generation: number }>('SELECT generation FROM members WHERE id = ?', [input.parentId]);
    if (!parent) {
      throw new Error('父母不存在');
    }
    generation = parent.generation + 1;
  } else if (!Number.isInteger(generation) || generation < 1) {
    throw new Error('世代必須是 1 以上的整數');
  }

  return { ...fields, parent_id: input.parentId, generation, branch_id: input.branchId };
}

function insertMemberRow(row: Omit<MemberRow, 'id'>): number {
  db().run(
    `INSERT INTO members (name, gender, birthday, parent_id, generation, spouse_name, job, phone_no, cellphone, branch_id, deceased)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.name,
      row.gender,
      row.birthday,
      row.parent_id,
      row.generation,
      row.spouse_name,
      row.job,
      row.phone_no,
      row.cellphone,
      row.branch_id,
      row.deceased,
    ]
  );
  return Number(queryScalar('SELECT last_insert_rowid()'));
}

export function createMember(input: MemberInput): number {
  return insertMemberRow(normalize(input));
}

export function updateMember(id: number, input: MemberInput): void {
  const current = queryOne<MemberRow>('SELECT * FROM members WHERE id = ?', [id]);
  if (!current) {
    throw new Error('成員不存在');
  }
  if (input.parentId !== null && subtreeIds(id).includes(input.parentId)) {
    throw new Error('不能將自己或自己的子孫設為父母');
  }
  const row = normalize(input);

  inTransaction(() => {
    db().run(
      `UPDATE members SET name = ?, gender = ?, birthday = ?, parent_id = ?, generation = ?,
              spouse_name = ?, job = ?, phone_no = ?, cellphone = ?, branch_id = ?, deceased = ?
        WHERE id = ?`,
      [
        row.name,
        row.gender,
        row.birthday,
        row.parent_id,
        row.generation,
        row.spouse_name,
        row.job,
        row.phone_no,
        row.cellphone,
        row.branch_id,
        row.deceased,
        id,
      ]
    );
    // 成員換了世代時，所有子孫跟著一起移動。
    const shift = row.generation - current.generation;
    if (shift !== 0) {
      const descendants = subtreeIds(id).filter((memberId) => memberId !== id);
      if (descendants.length > 0) {
        db().run(
          `UPDATE members SET generation = generation + ? WHERE id IN (${descendants.map(() => '?').join(',')})`,
          [shift, ...descendants]
        );
      }
    }
  });
}

// 刪除成員。為了不破壞世系與帳目：
// - 有子女的人不能刪（子女的父母會變成不存在）
// - 已有繳費紀錄的人不能刪（會讓過去年度的收入對不上）；過世的人請改標記為已故
// 還沒繳費的會費名單列會一併刪除。
export function deleteMember(id: number): void {
  const member = queryOne<{ name: string }>('SELECT name FROM members WHERE id = ?', [id]);
  if (!member) {
    throw new Error('成員不存在');
  }
  if (Number(queryScalar('SELECT COUNT(*) FROM members WHERE parent_id = ?', [id])) > 0) {
    throw new Error(`${member.name} 還有子女資料，請先刪除子女或修改子女的父母`);
  }
  if (
    Number(queryScalar('SELECT COUNT(*) FROM dues_payments WHERE member_id = ? AND paid_date IS NOT NULL', [id])) > 0
  ) {
    throw new Error(`${member.name} 已有繳費紀錄，刪除會影響帳目；如已過世請改標記為「已故」`);
  }
  inTransaction(() => {
    db().run('DELETE FROM dues_payments WHERE member_id = ?', [id]);
    db().run('DELETE FROM members WHERE id = ?', [id]);
  });
}

// Excel 匯入的一位成員（已檢查過）。parent 指向既有成員，或同一批匯入的另一列（用 key）；父母一定排在子女前面。
export interface ImportPlanItem {
  key: number;
  fields: Omit<MemberRow, 'id' | 'parent_id' | 'branch_id'>;
  parent: { existingId: number } | { key: number } | null;
  branchName: string | null;
}

// 整批匯入是原子操作：要嘛全部寫入、要嘛完全不寫。回傳新增的人數。
export function importMembers(plan: ImportPlanItem[], newBranches: string[]): number {
  return inTransaction(() => {
    newBranches.forEach((name) => db().run('INSERT INTO branches (name) VALUES (?)', [name]));
    const branchIds = new Map(getBranches().map((branch) => [branch.name, branch.id]));

    const insertedIds = new Map<number, number>();
    plan.forEach((item) => {
      let parentId: number | null = null;
      if (item.parent && 'existingId' in item.parent) {
        parentId = item.parent.existingId;
      } else if (item.parent) {
        parentId = insertedIds.get(item.parent.key) ?? null;
        if (parentId === null) {
          throw new Error(`Import order error: parent row ${item.parent.key} not inserted yet`);
        }
      }
      const branchId = item.branchName ? (branchIds.get(item.branchName) ?? null) : null;
      insertedIds.set(item.key, insertMemberRow({ ...item.fields, parent_id: parentId, branch_id: branchId }));
    });
    return plan.length;
  });
}
