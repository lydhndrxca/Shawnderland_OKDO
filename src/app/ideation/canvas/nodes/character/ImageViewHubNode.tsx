"use client";

import { memo, useCallback, useRef, useEffect, useState } from 'react';
import { Handle, Position, useReactFlow, useStore } from '@xyflow/react';
import './CharacterNodes.css';

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

export interface ViewHubToggles {
  main: boolean;
  front: boolean;
  back: boolean;
  side: boolean;
  custom: boolean;
}

export const DEFAULT_VIEW_HUB_TOGGLES: ViewHubToggles = {
  main: true,
  front: true,
  back: true,
  side: true,
  custom: true,
};

const VIEW_ENTRIES: { key: keyof ViewHubToggles; label: string; color: string; nodeTypes: string[] }[] = [
  { key: 'main',   label: 'Main Stage',  color: '#00bfa5', nodeTypes: ['charMainViewer', 'charViewer', 'charImageViewer'] },
  { key: 'front',  label: 'Front View',  color: '#42a5f5', nodeTypes: ['charFrontViewer'] },
  { key: 'back',   label: 'Back View',   color: '#ab47bc', nodeTypes: ['charBackViewer'] },
  { key: 'side',   label: 'Side View',   color: '#ff7043', nodeTypes: ['charSideViewer'] },
  { key: 'custom', label: 'Custom View', color: '#7e57c2', nodeTypes: ['charCustomView'] },
];

const VIEW_KEYS = VIEW_ENTRIES.map((v) => v.key);

function ImageViewHubNodeInner({ id, data, selected }: Props) {
  const { setNodes, getEdges, getNode } = useReactFlow();
  const localEdit = useRef(false);

  const [toggles, setToggles] = useState<ViewHubToggles>(() => ({
    ...DEFAULT_VIEW_HUB_TOGGLES,
    ...((data?.viewHubToggles as Partial<ViewHubToggles>) ?? {}),
  }));

  useEffect(() => {
    if (localEdit.current) { localEdit.current = false; return; }
    if (data?.viewHubToggles) setToggles((prev) => ({ ...prev, ...(data.viewHubToggles as Partial<ViewHubToggles>) }));
  }, [data?.viewHubToggles]);

  const persist = useCallback(
    (updates: Record<string, unknown>) => {
      localEdit.current = true;
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...updates } } : n)),
      );
    },
    [id, setNodes],
  );

  const toggle = useCallback(
    (key: keyof ViewHubToggles) => {
      const next = { ...toggles, [key]: !toggles[key] };
      setToggles(next);
      persist({ viewHubToggles: next });
    },
    [toggles, persist],
  );

  const toggleAll = useCallback(
    (on: boolean) => {
      const next: ViewHubToggles = {} as ViewHubToggles;
      for (const k of VIEW_KEYS) next[k] = on;
      setToggles(next);
      persist({ viewHubToggles: next });
    },
    [persist],
  );

  const connectedSig = useStore(
    useCallback(
      (s: { edges: Array<{ source: string; target: string }>; nodeLookup: Map<string, { type?: string }> }) => {
        const outgoing = s.edges.filter((e) => e.source === id);
        const types: string[] = [];
        for (const e of outgoing) {
          const tgt = s.nodeLookup.get(e.target);
          if (tgt?.type) types.push(tgt.type);
        }
        return types.sort().join(',');
      },
      [id],
    ),
  );

  const connectedTypes = new Set(connectedSig.split(',').filter(Boolean));
  const activeCount = VIEW_KEYS.filter((k) => toggles[k]).length;
  const allOn = activeCount === VIEW_KEYS.length;
  const allOff = activeCount === 0;

  return (
    <div className={`char-node ${selected ? 'selected' : ''}`} style={{ minWidth: 260, maxWidth: 300 }}>
      <Handle type="target" position={Position.Left} id="hub-in" className="char-handle" style={{ top: '50%' }} />
      <Handle type="source" position={Position.Right} id="hub-out" className="char-handle" style={{ top: '50%' }} />

      <div className="char-node-header" style={{ background: '#0097a7' }}>
        <span>Image View Hub</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 9, background: 'rgba(0,0,0,0.2)', padding: '1px 6px', borderRadius: 8 }}>
            {activeCount}/{VIEW_KEYS.length}
          </span>
        </span>
      </div>

      <div className="char-node-body" style={{ gap: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginBottom: 2 }}>
          <button
            className="char-btn nodrag"
            style={{ fontSize: 9, padding: '2px 8px', opacity: allOn ? 0.4 : 1 }}
            onClick={() => toggleAll(true)}
            disabled={allOn}
          >
            All On
          </button>
          <button
            className="char-btn nodrag"
            style={{ fontSize: 9, padding: '2px 8px', opacity: allOff ? 0.4 : 1 }}
            onClick={() => toggleAll(false)}
            disabled={allOff}
          >
            All Off
          </button>
        </div>

        {VIEW_ENTRIES.map((entry) => {
          const connected = entry.nodeTypes.some((t) => connectedTypes.has(t));
          return (
            <label key={entry.key} className="nodrag" style={{
              display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
              padding: '5px 8px', borderRadius: 6,
              background: toggles[entry.key] ? `${entry.color}18` : 'rgba(255,255,255,0.02)',
              border: `1px solid ${toggles[entry.key] ? `${entry.color}55` : 'rgba(255,255,255,0.06)'}`,
              transition: 'all 0.15s',
              opacity: connected ? 1 : 0.45,
            }}>
              <input
                type="checkbox"
                checked={toggles[entry.key]}
                onChange={() => toggle(entry.key)}
                style={{ accentColor: entry.color, width: 14, height: 14 }}
              />
              <span style={{
                flex: 1, fontSize: 11, fontWeight: 600,
                color: toggles[entry.key] ? '#e0e0e0' : 'var(--text-muted)',
              }}>
                {entry.label}
              </span>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: connected ? '#4caf50' : 'rgba(255,255,255,0.15)',
                flexShrink: 0,
              }} title={connected ? 'Connected' : 'Not connected'} />
            </label>
          );
        })}

        <div style={{
          fontSize: 9, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.4,
          textAlign: 'center', opacity: 0.7,
        }}>
          Controls which views auto-generate when you hit Generate.
          Unchecked views are skipped.
        </div>
      </div>
    </div>
  );
}

export default memo(ImageViewHubNodeInner);
