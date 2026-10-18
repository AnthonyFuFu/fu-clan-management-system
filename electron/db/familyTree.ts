import type { FamilyRelation, FamilyTreeNode, FamilyTreeResult } from '../../shared/types';
import { queryAll, queryOne } from './connection';
import type { MemberRow } from './members';

// 世系圖往上、往下最多查幾代。
const MAX_GENERATION_SPAN = 3;

// 親等上限：即使以後把 MAX_GENERATION_SPAN 調大，超過這個親等的人也不會回傳。
const MAX_DISPLAY_DISTANCE = 6;

function toNode(row: MemberRow, relation: FamilyRelation, distance: number): FamilyTreeNode {
  return {
    id: row.id,
    name: row.name,
    gender: row.gender === 'F' ? 'F' : 'M',
    birthday: row.birthday,
    job: row.job,
    phoneNo: row.phone_no,
    cellphone: row.cellphone,
    spouseName: row.spouse_name,
    generation: row.generation,
    parentId: row.parent_id,
    relation,
    distance,
  };
}

// 同一位父母的其他子女：兄弟姊妹（對上方的祖先呼叫時，就是伯叔姑、叔公等）。
// 只對「自己的父母也在顯示範圍內」的直系節點呼叫，所以找到的人一定有連接線可以畫。
function getSiblingsOf(node: FamilyTreeNode): FamilyTreeNode[] {
  if (node.parentId === null) {
    return [];
  }
  const siblingRows = queryAll<MemberRow>('SELECT * FROM members WHERE parent_id = ? AND id != ?', [
    node.parentId,
    node.id,
  ]);
  const siblingDistance = Math.min(node.distance + 2, MAX_DISPLAY_DISTANCE);
  return siblingRows.map((row) => toNode(row, 'sibling', siblingDistance));
}

function getAncestors(startId: number, maxLevels: number): FamilyTreeNode[] {
  const nodes: FamilyTreeNode[] = [];
  let currentId: number | null = startId;

  for (let distance = 1; distance <= maxLevels; distance += 1) {
    const current: MemberRow | null = queryOne<MemberRow>('SELECT * FROM members WHERE id = ?', [currentId as number]);
    if (!current || current.parent_id === null) {
      break;
    }
    const parent: MemberRow | null = queryOne<MemberRow>('SELECT * FROM members WHERE id = ?', [current.parent_id]);
    if (!parent) {
      break;
    }
    nodes.push(toNode(parent, 'ancestor', distance));
    currentId = parent.id;
  }

  return nodes;
}

function getDescendants(startId: number, maxLevels: number): FamilyTreeNode[] {
  const nodes: FamilyTreeNode[] = [];
  let currentLevelIds = [startId];

  for (let distance = 1; distance <= maxLevels; distance += 1) {
    if (currentLevelIds.length === 0) {
      break;
    }
    const placeholders = currentLevelIds.map(() => '?').join(',');
    const children = queryAll<MemberRow>(`SELECT * FROM members WHERE parent_id IN (${placeholders})`, currentLevelIds);
    if (children.length === 0) {
      break;
    }
    children.forEach((child) => nodes.push(toNode(child, 'descendant', distance)));
    currentLevelIds = children.map((child) => child.id);
  }

  return nodes;
}

export function getFamilyTree(memberId: number): FamilyTreeResult | null {
  const row = queryOne<MemberRow>('SELECT * FROM members WHERE id = ?', [memberId]);
  if (!row) {
    return null;
  }

  const span = Math.min(MAX_GENERATION_SPAN, MAX_DISPLAY_DISTANCE);
  const focus = toNode(row, 'self', 0);
  const ancestors = getAncestors(memberId, span);
  const descendants = getDescendants(memberId, span);

  // 旁系親屬（兄弟姊妹、伯叔姑、叔公等）：只對「自己的父母也在顯示範圍內」的直系節點查詢，
  // 這樣每位兄弟姊妹都有連接線。
  const siblings = [focus, ...ancestors].filter((node) => node.distance < span).flatMap((node) => getSiblingsOf(node));

  return { focus, nodes: [focus, ...ancestors, ...descendants, ...siblings] };
}
