import type { FamilyRelation, FamilyTreeNode, FamilyTreeResult, MemberSummary } from '../../shared/types';
import { queryAll, queryOne } from './connection';

interface MemberRow {
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
}

// How many generations up/down a family tree query is allowed to walk.
const MAX_GENERATION_SPAN = 3;

// Degree-of-kinship safety cap — nodes further than this are never returned even if MAX_GENERATION_SPAN grows later.
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

// Other children of the same parent — siblings (or, when called for an ancestor further up
// the chain, uncles/aunts/granduncles). Only called for chain nodes whose own parent is still
// within the displayed ancestor range, so the resulting nodes always have a connector to draw to.
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
    const current: MemberRow | null = queryOne<MemberRow>('SELECT * FROM members WHERE id = ?', [
      currentId as number,
    ]);
    if (!current || current.parent_id === null) {
      break;
    }
    const parent: MemberRow | null = queryOne<MemberRow>('SELECT * FROM members WHERE id = ?', [
      current.parent_id,
    ]);
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
    const children = queryAll<MemberRow>(
      `SELECT * FROM members WHERE parent_id IN (${placeholders})`,
      currentLevelIds
    );
    if (children.length === 0) {
      break;
    }
    children.forEach((child) => nodes.push(toNode(child, 'descendant', distance)));
    currentLevelIds = children.map((child) => child.id);
  }

  return nodes;
}

// Search-based lookup instead of returning every member — keeps the picker usable once the
// clan register grows into the thousands of records.
export function searchMembers(keyword: string, limit = 20): MemberSummary[] {
  return queryAll<MemberSummary>(
    'SELECT id, name, generation FROM members WHERE name LIKE ? ORDER BY generation, id LIMIT ?',
    [`%${keyword}%`, limit]
  );
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

  // Collateral kin (siblings / aunts-uncles / granduncles): only for chain nodes whose own
  // parent is still within the displayed ancestor range, so every sibling has a connector.
  const siblings = [focus, ...ancestors]
    .filter((node) => node.distance < span)
    .flatMap((node) => getSiblingsOf(node));

  return { focus, nodes: [focus, ...ancestors, ...descendants, ...siblings] };
}
