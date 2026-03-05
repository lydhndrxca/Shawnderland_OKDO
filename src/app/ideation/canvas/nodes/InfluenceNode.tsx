"use client";

import { memo, useState, useCallback } from 'react';
import { Handle, Position } from '@xyflow/react';
import './InfluenceNode.css';

interface InfluenceNodeProps {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

function InfluenceNodeInner({ id, data, selected }: InfluenceNodeProps) {
  const persisted = (data.nodeText as string) ?? '';
  const persistedNotes = (data.nodeNotes as string) ?? '';
  const [name, setName] = useState(persisted);
  const [notes, setNotes] = useState(persistedNotes);

  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    if ((window as unknown as Record<string, unknown>).__updateNodeData) {
      ((window as unknown as Record<string, unknown>).__updateNodeData as (id: string, d: Record<string, unknown>) => void)(id, { nodeText: e.target.value, nodeNotes: notes });
    }
  }, [id, notes]);

  const handleNotesChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value);
    if ((window as unknown as Record<string, unknown>).__updateNodeData) {
      ((window as unknown as Record<string, unknown>).__updateNodeData as (id: string, d: Record<string, unknown>) => void)(id, { nodeText: name, nodeNotes: e.target.value });
    }
  }, [id, name]);

  return (
    <div
      className={`influence-node ${selected ? 'selected' : ''}`}
      title="Type a person's name to channel their creative style. The AI will weave their known decision-making, creative philosophy, and stylistic signatures into the pipeline from this point onward."
    >
      <div className="influence-node-header">
        <span className="influence-node-dot" />
        <span className="influence-node-label">Influence</span>
      </div>
      <div className="influence-node-body">
        <input
          className="influence-name-input nodrag nowheel"
          value={name}
          onChange={handleNameChange}
          placeholder="e.g. David Lynch, Miyamoto..."
          spellCheck={false}
        />
        <textarea
          className="influence-notes-input nodrag nowheel"
          value={notes}
          onChange={handleNotesChange}
          placeholder="What aspects of their style? (optional)"
          spellCheck={false}
          rows={2}
        />
      </div>

      <Handle
        type="target"
        position={Position.Left}
        className="base-handle target-handle"
        style={{ background: '#ab47bc' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        className="base-handle source-handle"
        style={{ background: '#ab47bc' }}
      />
    </div>
  );
}

export default memo(InfluenceNodeInner);
