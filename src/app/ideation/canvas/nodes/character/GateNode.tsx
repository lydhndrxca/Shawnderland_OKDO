"use client";

import { memo, useCallback, useEffect, useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { NODE_TOOLTIPS } from './nodeTooltips';
import './CharacterNodes.css';

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

function collectDownstream(nodeId: string, edges: { source: string; target: string }[]): Set<string> {
  const visited = new Set<string>();
  const queue = [nodeId];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const e of edges) {
      if (e.source === cur && !visited.has(e.target)) {
        visited.add(e.target);
        queue.push(e.target);
      }
    }
  }
  return visited;
}

function GateNodeInner({ id, data, selected }: Props) {
  const { setNodes, getEdges } = useReactFlow();
  const [enabled, setEnabled] = useState((data?.enabled as boolean) ?? true);
  const [label, setLabel] = useState((data?.gateLabel as string) ?? 'Gate');
  const [editing, setEditing] = useState(false);

  const applyDownstreamDim = useCallback(
    (on: boolean) => {
      const edges = getEdges();
      const downstream = collectDownstream(id, edges);
      if (downstream.size === 0) return;
      setNodes((nds) =>
        nds.map((n) => {
          if (!downstream.has(n.id)) return n;
          return { ...n, className: on ? (n.className ?? '').replace('gate-disabled', '').trim() : `${n.className ?? ''} gate-disabled`.trim() };
        }),
      );
    },
    [id, getEdges, setNodes],
  );

  const toggle = useCallback(() => {
    const next = !enabled;
    setEnabled(next);
    setNodes((nds) =>
      nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, enabled: next } } : n)),
    );
    applyDownstreamDim(next);
  }, [enabled, id, setNodes, applyDownstreamDim]);

  useEffect(() => {
    if (!enabled) applyDownstreamDim(false);
  }, []);

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
    <div className={`char-node gate-node-wrap ${selected ? 'selected' : ''} ${enabled ? 'gate-on' : 'gate-off'}`} title={NODE_TOOLTIPS.charGate}>
      <div className="char-node-header" style={{ background: enabled ? '#69f0ae' : '#555' }}>
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
          <span onDoubleClick={() => setEditing(true)} title="Double-click to rename">
            {label}
          </span>
        )}
      </div>
      <div className="char-node-body" style={{ padding: 0 }}>
        <button
          type="button"
          className={`gate-toggle-full nodrag ${enabled ? 'on' : 'off'}`}
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
