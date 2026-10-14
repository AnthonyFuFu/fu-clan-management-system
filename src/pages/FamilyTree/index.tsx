import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Spin, Empty, Typography, Tag } from 'antd';
import type { FamilyTreeResult } from '@shared/types';
import DesktopOnlyNotice from '@/components/DesktopOnlyNotice';
import TreeNode from './components/TreeNode';
import { AXIS_WIDTH, computeLayout, NODE_HEIGHT, NODE_WIDTH } from './layout';
import { nodeBackground, RELATION_LEGEND } from './theme';
import './FamilyTree.css';

const { Title, Text } = Typography;

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

  if (!window.electronAPI) {
    return <DesktopOnlyNotice title="宗親世系圖" />;
  }

  return (
    <div>
      <Title level={4}>宗親世系圖</Title>
      <Text type="secondary">
        預設顯示第一代成員，向上顯示三代祖先、向下顯示三代子孫，並帶出兄弟姊妹、伯叔姑舅姨等六親等內的旁系親屬；點擊任一節點可重新置中。關係越遠，顏色越淡。
      </Text>

      <div style={{ marginTop: 16, marginBottom: 12, display: 'flex', gap: 16, alignItems: 'center' }}>
        {RELATION_LEGEND.map(({ relation, label }) => (
          <Tag key={relation} style={{ background: nodeBackground({ relation, distance: 1 }) }}>
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
              return (
                <TreeNode
                  key={node.id}
                  node={node}
                  position={position}
                  isLocking={isLocking}
                  onSelect={() => setSelectedId(node.id)}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default FamilyTree;
