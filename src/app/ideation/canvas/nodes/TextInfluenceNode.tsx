"use client";

import { memo, useState, useCallback } from 'react';
import { Handle, Position } from '@xyflow/react';
import './TextInfluenceNode.css';

interface TextInfluenceNodeProps {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

function TextInfluenceNodeInner({ id, data, selected }: TextInfluenceNodeProps) {
  const persisted = (data.nodeText as string) ?? '';
  const [text, setText] = useState(persisted);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    if ((window as unknown as Record<string, unknown>).__updateNodeData) {
      ((window as unknown as Record<string, unknown>).__updateNodeData as (id: string, d: Record<string, unknown>) => void)(id, { nodeText: e.target.value });
    }
  }, [id]);

  return (
    <div
      className={`text-influence-node ${selected ? 'selected' : ''}`}
      title="Paste any text to use as an influence \u2014 articles, notes, transcripts, or any reference material."
    >
      <div className="text-influence-header">
        <span className="text-influence-label">Text</span>
      </div>
      <div className="text-influence-body">
        <textarea
          className="text-influence-input nodrag nowheel"
          value={text}
          onChange={handleChange}
          placeholder="Paste text here as influence..."
          spellCheck={false}
          rows={4}
        />
      </div>
      <Handle type="target" position={Position.Left} className="base-handle target-handle" style={{ background: '#7986cb' }} />
      <Handle type="source" position={Position.Right} className="base-handle source-handle" style={{ background: '#7986cb' }} />
    </div>
  );
}

export default memo(TextInfluenceNodeInner);
