"use client";

import { memo, useCallback, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import './GroupNode.css';

interface GroupNodeProps {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

function GroupNodeInner({ id, data, selected }: GroupNodeProps) {
  const groupName = (data.groupName as string) ?? 'Group';
  const childNodeIds = (data.childNodeIds as string[]) ?? [];
  const [expanded, setExpanded] = useState((data.expanded as boolean) ?? false);
  const [nameEditing, setNameEditing] = useState(false);
  const [localName, setLocalName] = useState(groupName);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const newExpanded = !expanded;
    setExpanded(newExpanded);
    if ((window as unknown as Record<string, unknown>).__updateNodeData) {
      ((window as unknown as Record<string, unknown>).__updateNodeData as (id: string, d: Record<string, unknown>) => void)(
        id,
        { expanded: newExpanded },
      );
    }
  }, [id, expanded]);

  const handleNameSave = useCallback(() => {
    setNameEditing(false);
    if ((window as unknown as Record<string, unknown>).__updateNodeData) {
      ((window as unknown as Record<string, unknown>).__updateNodeData as (id: string, d: Record<string, unknown>) => void)(
        id,
        { groupName: localName },
      );
    }
  }, [id, localName]);

  return (
    <div
      className={`group-node ${selected ? 'selected' : ''} ${expanded ? 'expanded' : 'collapsed'}`}
      onDoubleClick={handleDoubleClick}
      title="Double-click to expand or collapse. This is a visual grouping of nodes — they still run individually inside."
    >
      <div className="group-node-header">
        <span className="group-node-dot" />
        {nameEditing ? (
          <input
            className="group-node-name-input nodrag nowheel"
            value={localName}
            onChange={(e) => setLocalName(e.target.value)}
            onBlur={handleNameSave}
            onKeyDown={(e) => { if (e.key === 'Enter') handleNameSave(); }}
            autoFocus
          />
        ) : (
          <span
            className="group-node-label"
            onDoubleClick={(e) => { e.stopPropagation(); setNameEditing(true); }}
          >
            {localName}
          </span>
        )}
        <span className="group-node-badge">{childNodeIds.length} nodes</span>
      </div>

      {!expanded && (
        <div className="group-node-collapsed-body">
          <div className="group-node-hint">
            Double-click to expand
          </div>
        </div>
      )}

      {expanded && (
        <div className="group-node-expanded-body">
          <div className="group-node-children-area">
            {childNodeIds.map((cid) => (
              <div key={cid} className="group-node-child-tag">{cid}</div>
            ))}
          </div>
        </div>
      )}

      <Handle
        type="target"
        position={Position.Left}
        className="base-handle target-handle"
        style={{ background: '#607d8b' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        className="base-handle source-handle"
        style={{ background: '#607d8b' }}
      />
    </div>
  );
}

export default memo(GroupNodeInner);
