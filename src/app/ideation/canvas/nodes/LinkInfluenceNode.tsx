"use client";

import { memo, useState, useCallback } from 'react';
import { Handle, Position } from '@xyflow/react';
import './LinkInfluenceNode.css';

interface LinkInfluenceNodeProps {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

function LinkInfluenceNodeInner({ id, data, selected }: LinkInfluenceNodeProps) {
  const persisted = (data.nodeText as string) ?? '';
  const [url, setUrl] = useState(persisted);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value);
    if ((window as unknown as Record<string, unknown>).__updateNodeData) {
      ((window as unknown as Record<string, unknown>).__updateNodeData as (id: string, d: Record<string, unknown>) => void)(id, { nodeText: e.target.value });
    }
  }, [id]);

  return (
    <div
      className={`link-influence-node ${selected ? 'selected' : ''}`}
      title="Paste a URL (website, article, video) as an influence. The AI will consider the linked content."
    >
      <div className="link-influence-header">
        <span className="link-influence-label">Link</span>
      </div>
      <div className="link-influence-body">
        <input
          className="link-influence-input nodrag nowheel"
          value={url}
          onChange={handleChange}
          placeholder="https://..."
          spellCheck={false}
          type="url"
        />
      </div>
      <Handle type="target" position={Position.Left} className="base-handle target-handle" style={{ background: '#4fc3f7' }} />
      <Handle type="source" position={Position.Right} className="base-handle source-handle" style={{ background: '#4fc3f7' }} />
    </div>
  );
}

export default memo(LinkInfluenceNodeInner);
