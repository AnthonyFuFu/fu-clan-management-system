import { GENDER_LABEL } from '@shared/labels';
import type { FamilyTreeNode } from '@shared/types';
import { NODE_HEIGHT, NODE_WIDTH, type Point } from '../layout';
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
    <button
      type="button"
      title={`以 ${node.name} 為中心`}
      className={`plain-button familyTreeNode${isSelf && isLocking ? ' familyTreeNode--locking' : ''}`}
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
        textAlign: 'left',
        color: isSelf ? '#fff' : 'rgba(0,0,0,0.78)',
      }}
    >
      <span style={{ display: 'block', fontWeight: 600 }}>{node.name}</span>
      <span style={{ display: 'block', fontSize: 12 }}>{GENDER_LABEL[node.gender]}</span>
      {node.job && <span style={{ display: 'block', fontSize: 12 }}>{node.job}</span>}
      {node.spouseName && <span style={{ display: 'block', fontSize: 12 }}>配偶：{node.spouseName}</span>}
    </button>
  );
};

export default TreeNode;
