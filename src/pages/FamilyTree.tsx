import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Spin, Empty, Typography, Tag } from 'antd';
import './FamilyTree.css';

const { Title, Text } = Typography;

const NODE_WIDTH = 150;
const NODE_HEIGHT = 84;
const COLUMN_GAP = 20;
const ROW_GAP = 56;
const CANVAS_PADDING = 40;
const AXIS_WIDTH = 72;

// 莫蘭迪色系（低飽和、帶灰調），依關係分色，再用 nodeOpacity() 依親等調整深淺。
const RELATION_COLOR: Record<FamilyRelation, { base: [number, number, number]; border: string }> = {
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

function nodeBackground(node: FamilyTreeNode): string {
  const { base } = RELATION_COLOR[node.relation];
  const [r, g, b] = base;
  return `rgba(${r}, ${g}, ${b}, ${nodeOpacity(node.distance)})`;
}

interface Point {
  x: number;
  y: number;
}

interface LayoutResult {
  width: number;
  height: number;
  positions: Map<number, Point>;
  connectors: Array<{ key: string; x1: number; y1: number; x2: number; y2: number }>;
  axis: Array<{ generation: number; y: number }>;
}

// 完全由資料（世代、親屬關係）計算座標，不依賴量測 DOM —— 這樣連接線永遠跟節點本身同步，
// 不會因為畫面尚未 reflow 完成而漏畫。
function computeLayout(tree: FamilyTreeResult): LayoutResult {
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

const RELATION_LEGEND: Array<{ relation: FamilyRelation; label: string }> = [
  { relation: 'self', label: '本人' },
  { relation: 'ancestor', label: '祖先' },
  { relation: 'descendant', label: '子孫' },
  { relation: 'sibling', label: '兄弟姊妹／伯叔姑舅姨' },
];

const FamilyTree: React.FC = () => {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [tree, setTree] = useState<FamilyTreeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [isLocking, setIsLocking] = useState(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  // 初始載入：取第一代最前面的成員當作預設中心人物，不提供搜尋，改用點擊樹狀圖節點切換中心。
  useEffect(() => {
    const api = window.electronAPI;
    if (!api) {
      return;
    }
    api.searchMembers('').then((list) => {
      if (list.length > 0) {
        setSelectedId(list[0].id);
      }
    });
  }, []);

  useEffect(() => {
    const api = window.electronAPI;
    if (!api || selectedId === null) {
      return;
    }
    setLoading(true);
    api
      .getFamilyTree(selectedId)
      .then((result) => {
        setTree(result);
        setIsLocking(true);
      })
      .finally(() => setLoading(false));
  }, [selectedId]);

  useEffect(() => {
    if (!isLocking) {
      return;
    }
    const timer = setTimeout(() => setIsLocking(false), 500);
    return () => clearTimeout(timer);
  }, [isLocking]);

  const layout = useMemo(() => (tree ? computeLayout(tree) : null), [tree]);

  // 中心人物換成新的樹之後，平滑捲動到該節點置中，而不是瞬間跳過去。
  useEffect(() => {
    if (!layout || !tree || !scrollRef.current) {
      return;
    }
    const position = layout.positions.get(tree.focus.id);
    const container = scrollRef.current;
    if (!position) {
      return;
    }
    container.scrollTo({
      left: Math.max(0, position.x + NODE_WIDTH / 2 - container.clientWidth / 2),
      top: Math.max(0, position.y + NODE_HEIGHT / 2 - container.clientHeight / 2),
      behavior: 'smooth',
    });
  }, [layout, tree]);

  return (
    <div>
      <Title level={4}>宗親世系圖</Title>
      <Text type="secondary">
        預設顯示第一代成員，向上顯示三代祖先、向下顯示三代子孫，並帶出兄弟姊妹、伯叔姑舅姨等六親等內的旁系親屬；點擊任一節點可重新置中。關係越遠，顏色越淡。
      </Text>

      <div style={{ marginTop: 16, marginBottom: 12, display: 'flex', gap: 16, alignItems: 'center' }}>
        {RELATION_LEGEND.map(({ relation, label }) => (
          <Tag key={relation} style={{ background: nodeBackground({ relation, distance: 1 } as FamilyTreeNode) }}>
            {label}
          </Tag>
        ))}
        <Text type="secondary">關係越遠，顏色越淡</Text>
      </div>

      {loading && <Spin />}

      {!loading && !tree && <Empty description="請選擇宗親" />}

      {!loading && tree && layout && (
        <div
          ref={scrollRef}
          style={{
            position: 'relative',
            overflow: 'auto',
            maxHeight: '70vh',
            border: '1px solid #f0f0f0',
            borderRadius: 8,
          }}
        >
          <div style={{ position: 'relative', width: layout.width, height: layout.height, margin: '0 auto' }}>
            {/* 世代座標軸：固定在畫布最左側，標示每一列是第幾代 */}
            {layout.axis.map(({ generation, y }) => (
              <div
                key={generation}
                style={{
                  position: 'absolute',
                  left: 0,
                  top: y,
                  width: AXIS_WIDTH - 16,
                  transform: 'translateY(-50%)',
                  fontSize: 12,
                  color: 'rgba(0,0,0,0.55)',
                  textAlign: 'right',
                }}
              >
                第 {generation} 代
              </div>
            ))}

            <svg
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: layout.width,
                height: layout.height,
                pointerEvents: 'none',
              }}
            >
              {layout.connectors.map((connector) => (
                <line
                  key={connector.key}
                  x1={connector.x1}
                  y1={connector.y1}
                  x2={connector.x2}
                  y2={connector.y2}
                  stroke="#C4BFB6"
                  strokeWidth={1.5}
                />
              ))}
            </svg>

            {tree.nodes.map((node) => {
              const position = layout.positions.get(node.id);
              if (!position) {
                return null;
              }
              const isSelf = node.relation === 'self';
              return (
                <div
                  key={node.id}
                  className={`familyTreeNode${isSelf && isLocking ? ' familyTreeNode--locking' : ''}`}
                  onClick={() => setSelectedId(node.id)}
                  style={{
                    position: 'absolute',
                    left: position.x,
                    top: position.y,
                    width: NODE_WIDTH,
                    minHeight: NODE_HEIGHT,
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: nodeBackground(node),
                    border: isSelf ? `2px solid ${RELATION_COLOR.self.border}` : '1px solid rgba(0,0,0,0.08)',
                    cursor: 'pointer',
                    color: isSelf ? '#fff' : 'rgba(0,0,0,0.78)',
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{node.name}</div>
                  <div style={{ fontSize: 12 }}>{node.gender === 'M' ? '男' : '女'}</div>
                  {node.job && <div style={{ fontSize: 12 }}>{node.job}</div>}
                  {node.spouseName && <div style={{ fontSize: 12 }}>配偶：{node.spouseName}</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default FamilyTree;
