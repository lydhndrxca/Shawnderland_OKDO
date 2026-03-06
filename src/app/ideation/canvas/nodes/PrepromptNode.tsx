"use client";

import { memo, useState, useCallback } from 'react';
import { Handle, Position } from '@xyflow/react';
import './PrepromptNode.css';

interface PrepromptNodeProps {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

function PrepromptNodeInner({ id, data, selected }: PrepromptNodeProps) {
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
      className={`preprompt-node ${selected ? 'selected' : ''}`}
      title="Preprompt — this text is read FIRST, before any incoming data. Use it to set context, framing, or a lens for the AI to read everything through."
    >
      <div className="preprompt-header">
        <span className="preprompt-header-icon">&#x25B6;</span>
        <span>Preprompt</span>
      </div>
      <div className="preprompt-body">
        <span className="preprompt-hint">
          Read FIRST — sets context before incoming data
        </span>
        <textarea
          className="preprompt-input nodrag nowheel"
          value={text}
          onChange={handleChange}
          placeholder='e.g. "Keep visual aesthetics in mind when reading what follows..."'
          spellCheck={false}
          rows={4}
        />
      </div>
      <Handle type="target" position={Position.Left} className="base-handle target-handle" style={{ background: '#66bb6a' }} />
      <Handle type="source" position={Position.Right} className="base-handle source-handle" style={{ background: '#66bb6a' }} />
    </div>
  );
}

export default memo(PrepromptNodeInner);
