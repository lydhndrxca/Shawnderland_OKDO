"use client";

import { memo, useState, useCallback } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';

interface PromptNodeProps {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

function PromptNodeInner({ id, selected }: PromptNodeProps) {
  const { setNodes } = useReactFlow();
  const [text, setText] = useState('');

  const handleChange = useCallback(
    (val: string) => {
      setText(val);
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, promptText: val } } : n,
        ),
      );
    },
    [id, setNodes],
  );

  return (
    <div className={`gs-prompt-node ${selected ? 'selected' : ''}`}>
      <div className="gs-node-header">
        <span className="gs-node-title">Prompt</span>
      </div>
      <div className="gs-node-tldr">Text input for image or video generation</div>
      <div className="gs-node-body">
        <textarea
          className="gs-prompt-textarea nodrag nowheel"
          value={text}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Describe what you want to create..."
          rows={4}
        />
      </div>
      <Handle
        type="source"
        position={Position.Right}
        id="prompt-out"
        style={{ background: '#64b5f6' }}
      />
    </div>
  );
}

export default memo(PromptNodeInner);
