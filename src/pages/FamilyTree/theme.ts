import type { FamilyRelation, FamilyTreeNode } from '@shared/types';

// 莫蘭迪色系（低飽和、帶灰調），依關係分色，再用 nodeOpacity() 依親等調整深淺。
export const RELATION_COLOR: Record<FamilyRelation, { base: [number, number, number]; border: string }> = {
  self: { base: [117, 148, 160], border: '#4F707C' },
  ancestor: { base: [196, 160, 120], border: '#9C7B4E' },
  descendant: { base: [142, 160, 122], border: '#6E8359' },
  sibling: { base: [179, 148, 150], border: '#8E6B6E' },
};

// distance 0（本人）/1（父母、子女）= 100%；之後每多一等親降 20%，最低 20%。
function nodeOpacity(distance: number): number {
  if (distance <= 1) {
    return 1;
  }
  return Math.max(0.2, 1 - 0.2 * (distance - 1));
}

// 只需要關係與親等，圖例也能直接傳入 { relation, distance }
export function nodeBackground(node: Pick<FamilyTreeNode, 'relation' | 'distance'>): string {
  const { base } = RELATION_COLOR[node.relation];
  const [r, g, b] = base;
  return `rgba(${r}, ${g}, ${b}, ${nodeOpacity(node.distance)})`;
}

export const RELATION_LEGEND: Array<{ relation: FamilyRelation; label: string }> = [
  { relation: 'self', label: '本人' },
  { relation: 'ancestor', label: '祖先' },
  { relation: 'descendant', label: '子孫' },
  { relation: 'sibling', label: '兄弟姊妹／伯叔姑舅姨' },
];
