"use client";

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import '../character/CharacterNodes.css';

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

interface LockToggles {
  keepFace: boolean;
  keepHair: boolean;
  keepHairColor: boolean;
  keepPose: boolean;
  keepBodyType: boolean;
  keepCameraAngle: boolean;
  keepLighting: boolean;
  keepBackground: boolean;
}

const TOGGLE_FIELDS: { key: keyof LockToggles; label: string }[] = [
  { key: 'keepFace', label: 'Keep face' },
  { key: 'keepHair', label: 'Keep hairstyle' },
  { key: 'keepHairColor', label: 'Keep hair color' },
  { key: 'keepPose', label: 'Keep pose' },
  { key: 'keepBodyType', label: 'Keep body type / build' },
  { key: 'keepCameraAngle', label: 'Keep camera angle' },
  { key: 'keepLighting', label: 'Keep lighting' },
  { key: 'keepBackground', label: 'Keep background' },
];

const DEFAULT_TOGGLES: LockToggles = {
  keepFace: true,
  keepHair: true,
  keepHairColor: true,
  keepPose: false,
  keepBodyType: true,
  keepCameraAngle: false,
  keepLighting: false,
  keepBackground: false,
};

const DEFAULT_NEGATIVES = [
  'No crown',
  'No fantasy elements',
  'No dress',
  'No cape',
  'No electronics / future technology',
];

function PreservationLockNodeInner({ id, data, selected }: Props) {
  const { setNodes } = useReactFlow();
  const localEdit = useRef(false);

  const [toggles, setToggles] = useState<LockToggles>(() => ({
    ...DEFAULT_TOGGLES,
    ...((data?.lockToggles as Partial<LockToggles>) ?? {}),
  }));
  const [negatives, setNegatives] = useState<string[]>(() =>
    (data?.lockNegatives as string[]) ?? [...DEFAULT_NEGATIVES],
  );
  const [newNeg, setNewNeg] = useState('');
  const [minimized, setMinimized] = useState(false);

  useEffect(() => {
    if (localEdit.current) { localEdit.current = false; return; }
    if (data?.lockToggles) setToggles((prev) => ({ ...prev, ...(data.lockToggles as Partial<LockToggles>) }));
    if (data?.lockNegatives) setNegatives(data.lockNegatives as string[]);
  }, [data?.lockToggles, data?.lockNegatives]);

  const persist = useCallback(
    (updates: Record<string, unknown>) => {
      localEdit.current = true;
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...updates } } : n)),
      );
    },
    [id, setNodes],
  );

  const toggleField = useCallback(
    (key: keyof LockToggles) => {
      setToggles((prev) => {
        const next = { ...prev, [key]: !prev[key] };
        persist({ lockToggles: next });
        return next;
      });
    },
    [persist],
  );

  const removeNeg = useCallback(
    (idx: number) => {
      setNegatives((prev) => {
        const next = prev.filter((_, i) => i !== idx);
        persist({ lockNegatives: next });
        return next;
      });
    },
    [persist],
  );

  const addNeg = useCallback(() => {
    const trimmed = newNeg.trim();
    if (!trimmed) return;
    setNegatives((prev) => {
      const next = [...prev, trimmed];
      persist({ lockNegatives: next });
      return next;
    });
    setNewNeg('');
  }, [newNeg, persist]);

  const activeCount = Object.values(toggles).filter(Boolean).length + negatives.length;

  return (
    <div className={`char-node ${selected ? 'selected' : ''}`} style={{ minWidth: 280, maxWidth: 360 }}
      title="Preservation Lock — Toggle constraints for what must NOT change. Auto-appends to any connected generation prompt.">
      <div className="char-node-header" style={{ background: '#37474f', cursor: 'pointer' }} onClick={() => setMinimized((m) => !m)}>
        <span>Preservation Lock</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {activeCount > 0 && (
            <span style={{ fontSize: 9, background: 'rgba(0,0,0,0.2)', padding: '1px 6px', borderRadius: 8 }}>
              {activeCount} active
            </span>
          )}
          <span style={{ fontSize: 10, opacity: 0.7 }}>{minimized ? '\u25BC' : '\u25B2'}</span>
        </span>
      </div>

      {minimized && (
        <div className="char-node-body" style={{ padding: '4px 10px' }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            {activeCount} constraint{activeCount !== 1 ? 's' : ''} active
          </span>
        </div>
      )}

      {!minimized && (
        <div className="char-node-body" style={{ gap: 6 }}>
          {/* Preserve toggles */}
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#78909c', marginBottom: 2 }}>
            Preserve
          </div>
          {TOGGLE_FIELDS.map(({ key, label }) => (
            <label key={key} className="nodrag" style={{
              display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
              padding: '3px 6px', borderRadius: 4,
              background: toggles[key] ? 'rgba(76, 175, 80, 0.08)' : 'transparent',
              border: `1px solid ${toggles[key] ? 'rgba(76, 175, 80, 0.25)' : 'transparent'}`,
              transition: 'all 0.15s',
            }}>
              <input
                type="checkbox"
                checked={toggles[key]}
                onChange={() => toggleField(key)}
                style={{ accentColor: '#4caf50', width: 14, height: 14 }}
              />
              <span style={{ fontSize: 11, color: toggles[key] ? '#c8e6c9' : 'var(--text-muted)' }}>{label}</span>
            </label>
          ))}

          {/* Negative constraints */}
          <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#78909c', marginTop: 6, marginBottom: 2 }}>
            Negative Constraints (must avoid)
          </div>
          {negatives.map((neg, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '3px 6px', borderRadius: 4,
              background: 'rgba(239, 83, 80, 0.06)',
              border: '1px solid rgba(239, 83, 80, 0.2)',
            }}>
              <span style={{ fontSize: 11, color: '#ef9a9a', flex: 1 }}>{neg}</span>
              <button
                className="nodrag"
                onClick={() => removeNeg(i)}
                style={{
                  background: 'none', border: 'none', color: '#ef5350',
                  fontSize: 14, cursor: 'pointer', padding: 0, lineHeight: 1, flexShrink: 0,
                }}
                title="Remove"
              >
                ×
              </button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 4 }}>
            <input
              className="char-input nodrag"
              value={newNeg}
              onChange={(e) => setNewNeg(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addNeg(); }}
              placeholder="Add constraint..."
              style={{ flex: 1, fontSize: 11 }}
            />
            <button
              className="char-btn nodrag"
              onClick={addNeg}
              disabled={!newNeg.trim()}
              style={{ fontSize: 10, padding: '3px 10px' }}
            >
              Add
            </button>
          </div>
        </div>
      )}

      <Handle type="target" position={Position.Left} id="input" className="char-handle" style={{ top: '50%' }} />
      <Handle type="source" position={Position.Right} id="lock-out" className="char-handle" style={{ top: '50%' }} />
    </div>
  );
}

export default memo(PreservationLockNodeInner);
