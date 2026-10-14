import type { FamilyTreeNode, FamilyTreeResult } from '@shared/types';

export const NODE_WIDTH = 150;
export const NODE_HEIGHT = 84;
const COLUMN_GAP = 20;
const ROW_GAP = 56;
const CANVAS_PADDING = 40;
export const AXIS_WIDTH = 72;

export interface Point {
  x: number;
  y: number;
}

export interface LayoutResult {
  width: number;
  height: number;
  positions: Map<number, Point>;
  connectors: Array<{ key: string; x1: number; y1: number; x2: number; y2: number }>;
  axis: Array<{ generation: number; y: number }>;
}

// 完全由資料（世代、親屬關係）計算座標，不依賴量測 DOM —— 這樣連接線永遠跟節點本身同步，
// 不會因為畫面尚未 reflow 完成而漏畫。
export function computeLayout(tree: FamilyTreeResult): LayoutResult {
  const byGeneration = new Map<number, FamilyTreeNode[]>();
  tree.nodes.forEach((node) => {
    const list = byGeneration.get(node.generation) ?? [];
    list.push(node);
    byGeneration.set(node.generation, list);
  });

  const rows = Array.from(byGeneration.entries())
    .sort(([a], [b]) => a - b)
    .map(([generation, nodes]) => ({
      generation,
      nodes: [...nodes].sort((a, b) => (a.parentId ?? 0) - (b.parentId ?? 0) || a.id - b.id),
    }));

  const rowWidths = rows.map((row) => row.nodes.length * NODE_WIDTH + (row.nodes.length - 1) * COLUMN_GAP);
  const contentWidth = Math.max(NODE_WIDTH, ...rowWidths);
  const width = contentWidth + CANVAS_PADDING * 2 + AXIS_WIDTH;
  const centerX = AXIS_WIDTH + CANVAS_PADDING + contentWidth / 2;

  const positions = new Map<number, Point>();
  const axis: LayoutResult['axis'] = [];

  rows.forEach((row, rowIndex) => {
    const y = CANVAS_PADDING + rowIndex * (NODE_HEIGHT + ROW_GAP);
    axis.push({ generation: row.generation, y: y + NODE_HEIGHT / 2 });

    const rowWidth = row.nodes.length * NODE_WIDTH + (row.nodes.length - 1) * COLUMN_GAP;
    const rowLeft = centerX - rowWidth / 2;

    row.nodes.forEach((node, index) => {
      const x = rowLeft + index * (NODE_WIDTH + COLUMN_GAP);
      positions.set(node.id, { x, y });
    });
  });

  const nodeById = new Map(tree.nodes.map((node) => [node.id, node]));
  const connectors: LayoutResult['connectors'] = [];
  tree.nodes.forEach((node) => {
    if (node.parentId === null) {
      return;
    }
    const parent = nodeById.get(node.parentId);
    const parentPos = parent ? positions.get(parent.id) : undefined;
    const childPos = positions.get(node.id);
    if (!parent || !parentPos || !childPos) {
      return;
    }
    connectors.push({
      key: `${parent.id}-${node.id}`,
      x1: parentPos.x + NODE_WIDTH / 2,
      y1: parentPos.y + NODE_HEIGHT,
      x2: childPos.x + NODE_WIDTH / 2,
      y2: childPos.y,
    });
  });

  const height = CANVAS_PADDING * 2 + rows.length * NODE_HEIGHT + (rows.length - 1) * ROW_GAP;

  return { width, height, positions, connectors, axis };
}
