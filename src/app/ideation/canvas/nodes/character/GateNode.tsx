"use client";

import { memo, useCallback, useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import './CharacterNodes.css';

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

function GateNodeInner({ id, data, selected }: Props) {
  const { setNodes } = useReactFlow();
  const [enabled, setEnabled] = useState((data?.enabled as boolean) ?? true);
  const [label, setLabel] = useState((data?.gateLabel as string) ?? 'Gate');
  const [editing, setEditing] = useState(false);

  const toggle = useCallback(() => {
    const next = !enabled;
    setEnabled(next);
    setNodes((nds) =>
      nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, enabled: next } } : n)),
    );
  }, [enabled, id, setNodes]);

  const commitLabel = useCallback(
    (val: string) => {
      const trimmed = val.trim() || 'Gate';
      setLabel(trimmed);
      setEditing(false);
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, gateLabel: trimmed } } : n)),
      );
    },
    [id, setNodes],
  );

  return (
    <div
      className={`gate-node ${selected ? 'selected' : ''} ${enabled ? 'gate-on' : 'gate-off'}`}
    >
      <div className="gate-node-inner">
        {editing ? (
          <input
            className="gate-label-input nodrag"
            autoFocus
            defaultValue={label}
            onBlur={(e) => commitLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitLabel((e.target as HTMLInputElement).value);
              if (e.key === 'Escape') setEditing(false);
            }}
          />
        ) : (
          <span className="gate-label" onDoubleClick={() => setEditing(true)} title="Double-click to rename">
            {label}
          </span>
        )}
        <button
          className={`gate-toggle nodrag ${enabled ? 'on' : 'off'}`}
          onClick={toggle}
          title={enabled ? 'Click to disable' : 'Click to enable'}
        >
          {enabled ? 'ON' : 'OFF'}
        </button>
      </div>

      <Handle type="target" position={Position.Left} id="input" className="char-handle" style={{ top: '50%' }} />
      <Handle type="source" position={Position.Right} id="output" className="char-handle" style={{ top: '50%' }} />
    </div>
  );
}

export default memo(GateNodeInner);
