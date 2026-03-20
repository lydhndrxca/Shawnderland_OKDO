"use client";

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { PROP_ATTRIBUTE_GROUPS, type PropAttributes } from '@/lib/ideation/engine/conceptlab/propPrompts';
import '../character/CharacterNodes.css';
import './PropLabNodes.css';

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

function pickRandomFromGroup(common: string[], rare: string[]): string {
  const pool = [...common, ...rare];
  return pool[Math.floor(Math.random() * pool.length)] ?? '';
}

function PropAttributesNodeInner({ id, data, selected }: Props) {
  const { setNodes } = useReactFlow();
  const [minimized, setMinimized] = useState(false);
  const [attributes, setAttributes] = useState<PropAttributes>(
    (data?.attributes as PropAttributes) ?? {},
  );
  const [locked, setLocked] = useState<Record<string, boolean>>(
    (data?.lockedAttrs as Record<string, boolean>) ?? {},
  );
  const localEdit = useRef(false);

  useEffect(() => {
    if (localEdit.current) { localEdit.current = false; return; }
    const ext = (data?.attributes as PropAttributes) ?? {};
    const keys = new Set([...Object.keys(ext), ...Object.keys(attributes)]);
    let changed = false;
    for (const k of keys) { if (ext[k] !== attributes[k]) { changed = true; break; } }
    if (changed) {
      setAttributes(ext);
    }
  }, [data?.attributes]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const extLocked = (data?.lockedAttrs as Record<string, boolean>) ?? {};
    setLocked((prev) => ({ ...prev, ...extLocked }));
  }, [data?.lockedAttrs]);

  const persistAttrs = useCallback(
    (attrs: PropAttributes) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, attributes: attrs } } : n)),
      );
    },
    [id, setNodes],
  );

  const persistLocks = useCallback(
    (locks: Record<string, boolean>) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, lockedAttrs: locks } } : n)),
      );
    },
    [id, setNodes],
  );

  const toggleLock = useCallback(
    (key: string) => {
      const next = { ...locked, [key]: !locked[key] };
      setLocked(next);
      persistLocks(next);
    },
    [locked, persistLocks],
  );

  const setAttr = useCallback(
    (key: string, val: string) => {
      localEdit.current = true;
      const next = { ...attributes, [key]: val };
      setAttributes(next);
      persistAttrs(next);
    },
    [attributes, persistAttrs],
  );

  const randomizeKey = useCallback(
    (key: string, common: string[], rare: string[]) => {
      if (locked[key]) return;
      localEdit.current = true;
      const pick = pickRandomFromGroup(common, rare);
      const next = { ...attributes, [key]: pick };
      setAttributes(next);
      persistAttrs(next);
    },
    [attributes, locked, persistAttrs],
  );

  const filledCount = Object.values(attributes).filter((v) => Boolean(v && String(v).trim())).length;

  return (
    <div
      className={`char-node ${selected ? 'selected' : ''}`}
      title="Prop attributes — scrollable fields; randomize per row; lock to preserve on AI populate."
    >
      <div
        className="char-node-header"
        style={{ background: '#9c27b0', cursor: 'pointer' }}
        onClick={() => setMinimized((m) => !m)}
      >
        <span>Prop Attributes</span>
        <span style={{ marginLeft: 'auto', fontSize: 10, opacity: 0.7 }}>
          {minimized ? '\u25BC' : '\u25B2'} {filledCount}
        </span>
      </div>
      {minimized && (
        <div className="char-node-body" style={{ padding: '4px 10px' }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            {filledCount} field{filledCount === 1 ? '' : 's'} filled
          </span>
        </div>
      )}
      {!minimized && (
        <div className="char-node-body" style={{ gap: 6, paddingBottom: 10 }}>
          <div className="char-scroll-area nodrag nowheel">
            {PROP_ATTRIBUTE_GROUPS.map((g) => {
              const currentVal = attributes[g.key] ?? '';
              const isLocked = !!locked[g.key];
              return (
                <div key={g.key} className="char-attr-group">
                  <span className="char-attr-label" style={{ display: 'block', marginBottom: 2 }}>
                    {g.label}
                  </span>
                  <div className="char-attr-row">
                    <input
                      type="text"
                      className="char-input nodrag"
                      value={currentVal}
                      onChange={(e) => setAttr(g.key, e.target.value)}
                      disabled={isLocked}
                      placeholder={isLocked ? 'Locked' : `Describe ${g.label.toLowerCase()}...`}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        opacity: isLocked ? 0.55 : 1,
                        cursor: isLocked ? 'not-allowed' : undefined,
                      }}
                    />
                    <button
                      type="button"
                      className="char-btn-sm nodrag"
                      onClick={() => randomizeKey(g.key, g.common, g.rare)}
                      disabled={isLocked}
                      title="Randomize from common + rare pool"
                    >
                      {'\u21BB'}
                    </button>
                    <button
                      type="button"
                      className={`char-lock-btn nodrag ${isLocked ? 'locked' : ''}`}
                      onClick={() => toggleLock(g.key)}
                      title={isLocked ? 'Unlock' : 'Lock'}
                    >
                      {isLocked ? '\u{1F512}' : '\u{1F513}'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Handle type="target" position={Position.Left} id="input" className="char-handle" style={{ top: '50%' }} />
      <Handle type="source" position={Position.Right} id="attrs-out" className="char-handle" style={{ top: '50%' }} />
    </div>
  );
}

export default memo(PropAttributesNodeInner);
