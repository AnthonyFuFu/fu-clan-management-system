import React from 'react';
import type { FamilyTreeNode } from '@shared/types';
import { NODE_HEIGHT, NODE_WIDTH, Point } from '../layout';
import { nodeBackground, RELATION_COLOR } from '../theme';

interface TreeNodeProps {
  node: FamilyTreeNode;
  position: Point;
  // 中心人物剛切換時播放一次放大動畫
  isLocking: boolean;
  onSelect: () => void;
}

const TreeNode = ({ node, position, isLocking, onSelect }: TreeNodeProps) => {
  const isSelf = node.relation === 'self';
  return (
    <div
      className={`familyTreeNode${isSelf && isLocking ? ' familyTreeNode--locking' : ''}`}
      onClick={onSelect}
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
};

export default TreeNode;
