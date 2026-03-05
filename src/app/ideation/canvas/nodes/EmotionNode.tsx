"use client";

import { memo, useState, useCallback } from 'react';
import { Handle, Position } from '@xyflow/react';
import './EmotionNode.css';

interface EmotionNodeProps {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

function EmotionNodeInner({ id, data, selected }: EmotionNodeProps) {
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
      className={`emotion-node ${selected ? 'selected' : ''}`}
      title="Type an emotion or feeling to inject into the process \u2014 playful, serious, rebellious, etc."
    >
      <div className="emotion-node-header">
        <span className="emotion-node-dot" />
        <span className="emotion-node-label">Emotion</span>
      </div>
      <div className="emotion-node-body">
        <textarea
          className="emotion-input nodrag nowheel"
          value={text}
          onChange={handleChange}
          placeholder="How should it feel? e.g. playful, dark, rebellious..."
          spellCheck={false}
          rows={2}
        />
      </div>

      <Handle
        type="target"
        position={Position.Left}
        className="base-handle target-handle"
        style={{ background: '#e57373' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        className="base-handle source-handle"
        style={{ background: '#e57373' }}
      />
    </div>
  );
}

export default memo(EmotionNodeInner);
