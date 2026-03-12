"use client";

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import '../character/CharacterNodes.css';

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

interface RefSlot {
  label: string;
  weight: number;
  takeFrom: string;
  imageBase64: string;
  imageMime: string;
}

const TAKE_OPTIONS = [
  'overall vibe',
  'silhouette',
  'material & texture',
  'color palette',
  'detail work & hardware',
  'cultural reference',
  'attitude & energy',
];

const EMPTY_SLOT: RefSlot = { label: '', weight: 50, takeFrom: 'overall vibe', imageBase64: '', imageMime: '' };

function StyleFusionNodeInner({ id, data, selected }: Props) {
  const { setNodes } = useReactFlow();
  const localEdit = useRef(false);
  const fileRefs = useRef<(HTMLInputElement | null)[]>([null, null, null, null]);

  const [slots, setSlots] = useState<RefSlot[]>(() => {
    const saved = data?.fusionSlots as RefSlot[] | undefined;
    if (saved?.length) return saved;
    return [{ ...EMPTY_SLOT }, { ...EMPTY_SLOT }];
  });
  const [minimized, setMinimized] = useState(false);

  useEffect(() => {
    if (localEdit.current) { localEdit.current = false; return; }
    const saved = data?.fusionSlots as RefSlot[] | undefined;
    if (saved?.length) setSlots(saved);
  }, [data?.fusionSlots]);

  const persist = useCallback(
    (updated: RefSlot[]) => {
      localEdit.current = true;
      const brief = updated
        .filter((s) => s.label.trim() || s.imageBase64)
        .map((s, i) => {
          const parts: string[] = [];
          parts.push(`Reference ${i + 1}: "${s.label || 'unnamed'}" (weight ${s.weight}%)`);
          parts.push(`  Take from this: ${s.takeFrom}`);
          return parts.join('\n');
        })
        .join('\n');

      setNodes((nds) =>
        nds.map((n) =>
          n.id === id
            ? { ...n, data: { ...n.data, fusionSlots: updated, fusionBrief: brief } }
            : n,
        ),
      );
    },
    [id, setNodes],
  );

  const updateSlot = useCallback(
    (idx: number, partial: Partial<RefSlot>) => {
      setSlots((prev) => {
        const next = prev.map((s, i) => (i === idx ? { ...s, ...partial } : s));
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const addSlot = useCallback(() => {
    if (slots.length >= 4) return;
    setSlots((prev) => {
      const next = [...prev, { ...EMPTY_SLOT }];
      persist(next);
      return next;
    });
  }, [slots.length, persist]);

  const removeSlot = useCallback(
    (idx: number) => {
      if (slots.length <= 2) return;
      setSlots((prev) => {
        const next = prev.filter((_, i) => i !== idx);
        persist(next);
        return next;
      });
    },
    [slots.length, persist],
  );

  const handleFile = useCallback(
    (idx: number, file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        const url = reader.result as string;
        const parts = url.split(',');
        const mime = parts[0].match(/:(.*?);/)?.[1] ?? 'image/png';
        updateSlot(idx, { imageBase64: parts[1], imageMime: mime });
      };
      reader.readAsDataURL(file);
    },
    [updateSlot],
  );

  const handlePaste = useCallback(
    async (idx: number) => {
      try {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          const imgType = item.types.find((t) => t.startsWith('image/'));
          if (imgType) {
            const blob = await item.getType(imgType);
            const reader = new FileReader();
            reader.onload = () => {
              const url = reader.result as string;
              const parts = url.split(',');
              const mime = parts[0].match(/:(.*?);/)?.[1] ?? 'image/png';
              updateSlot(idx, { imageBase64: parts[1], imageMime: mime });
            };
            reader.readAsDataURL(blob);
            return;
          }
        }
      } catch { /* clipboard may fail */ }
    },
    [updateSlot],
  );

  const filledCount = slots.filter((s) => s.label.trim() || s.imageBase64).length;

  return (
    <div className={`char-node ${selected ? 'selected' : ''}`} style={{ minWidth: 320, maxWidth: 420 }}
      title="Style Fusion — Combine 2-4 reference images with per-reference labels and weight sliders. Outputs a structured style brief.">
      <div className="char-node-header" style={{ background: '#6a1b9a', cursor: 'pointer' }} onClick={() => setMinimized((m) => !m)}>
        <span>Style Fusion</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {filledCount > 0 && (
            <span style={{ fontSize: 9, background: 'rgba(0,0,0,0.2)', padding: '1px 6px', borderRadius: 8 }}>
              {filledCount} ref{filledCount !== 1 ? 's' : ''}
            </span>
          )}
          <span style={{ fontSize: 10, opacity: 0.7 }}>{minimized ? '\u25BC' : '\u25B2'}</span>
        </span>
      </div>

      {minimized && (
        <div className="char-node-body" style={{ padding: '4px 10px' }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            {filledCount} reference{filledCount !== 1 ? 's' : ''} configured
          </span>
        </div>
      )}

      {!minimized && (
        <div className="char-node-body" style={{ gap: 8 }}>
          {slots.map((slot, i) => (
            <div key={i} style={{
              background: 'rgba(106,27,154,0.06)',
              border: '1px solid rgba(106,27,154,0.2)',
              borderRadius: 6, padding: 8,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#ce93d8' }}>Reference {i + 1}</span>
                {slots.length > 2 && (
                  <button className="nodrag" onClick={() => removeSlot(i)}
                    style={{ background: 'none', border: 'none', color: '#ef5350', fontSize: 14, cursor: 'pointer', padding: 0, lineHeight: 1 }}>×</button>
                )}
              </div>

              {/* Image preview / upload */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                {slot.imageBase64 ? (
                  <img
                    src={`data:${slot.imageMime};base64,${slot.imageBase64}`}
                    alt={`Ref ${i + 1}`}
                    style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 4, border: '1px solid rgba(255,255,255,0.1)' }}
                  />
                ) : (
                  <div style={{
                    width: 60, height: 60, borderRadius: 4,
                    border: '1px dashed rgba(255,255,255,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 9, color: 'var(--text-muted)', textAlign: 'center',
                  }}>
                    No image
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
                  <button className="char-btn nodrag" onClick={() => fileRefs.current[i]?.click()}
                    style={{ fontSize: 9, padding: '2px 6px' }}>Upload</button>
                  <button className="char-btn nodrag" onClick={() => handlePaste(i)}
                    style={{ fontSize: 9, padding: '2px 6px' }}>Paste</button>
                  {slot.imageBase64 && (
                    <button className="char-btn nodrag" onClick={() => updateSlot(i, { imageBase64: '', imageMime: '' })}
                      style={{ fontSize: 9, padding: '2px 6px', color: '#ef5350' }}>Clear</button>
                  )}
                  <input ref={(el) => { fileRefs.current[i] = el; }} type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(i, f); }} />
                </div>
              </div>

              {/* Label */}
              <input className="char-input nodrag" value={slot.label}
                onChange={(e) => updateSlot(i, { label: e.target.value })}
                placeholder='e.g. "high fashion eclipse silhouette"'
                style={{ width: '100%', fontSize: 10, marginBottom: 4 }} />

              {/* Weight slider */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 9, color: 'var(--text-muted)', flexShrink: 0 }}>Weight</span>
                <input type="range" min={0} max={100} value={slot.weight}
                  className="nodrag" style={{ flex: 1, accentColor: '#ce93d8' }}
                  onChange={(e) => updateSlot(i, { weight: Number(e.target.value) })} />
                <span style={{ fontSize: 10, color: '#ce93d8', fontWeight: 600, minWidth: 30, textAlign: 'right' }}>{slot.weight}%</span>
              </div>

              {/* Take from */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                <span style={{ fontSize: 9, color: 'var(--text-muted)', flexShrink: 0 }}>Take</span>
                <select className="char-select nodrag" value={slot.takeFrom}
                  onChange={(e) => updateSlot(i, { takeFrom: e.target.value })}
                  style={{ flex: 1, fontSize: 10 }}>
                  {TAKE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
          ))}

          {slots.length < 4 && (
            <button className="char-btn nodrag" onClick={addSlot}
              style={{ width: '100%', fontSize: 10, color: '#ce93d8', borderColor: 'rgba(106,27,154,0.3)' }}>
              + Add Reference Slot
            </button>
          )}
        </div>
      )}

      <Handle type="target" position={Position.Left} id="input" className="char-handle" style={{ top: '50%' }} />
      <Handle type="source" position={Position.Right} id="fusion-out" className="char-handle" style={{ top: '50%' }} />
    </div>
  );
}

export default memo(StyleFusionNodeInner);
