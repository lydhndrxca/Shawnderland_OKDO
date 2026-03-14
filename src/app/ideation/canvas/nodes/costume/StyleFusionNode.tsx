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
  const fileRefs = useRef<(HTMLInputElement | null)[]>([null, null]);

  const [slots, setSlots] = useState<RefSlot[]>(() => {
    const saved = data?.fusionSlots as RefSlot[] | undefined;
    if (saved?.length && saved.length >= 2) return [saved[0], saved[1]];
    return [{ ...EMPTY_SLOT }, { ...EMPTY_SLOT }];
  });
  const [blend, setBlend] = useState<number>(() => {
    const saved = data?.fusionBlend as number | undefined;
    return saved ?? 50;
  });
  const [minimized, setMinimized] = useState(false);

  useEffect(() => {
    if (localEdit.current) { localEdit.current = false; return; }
    const saved = data?.fusionSlots as RefSlot[] | undefined;
    if (saved?.length && saved.length >= 2) setSlots([saved[0], saved[1]]);
    const savedBlend = data?.fusionBlend as number | undefined;
    if (savedBlend !== undefined) setBlend(savedBlend);
  }, [data?.fusionSlots, data?.fusionBlend]);

  const persist = useCallback(
    (updated: RefSlot[], blendVal: number) => {
      localEdit.current = true;
      const ref1Weight = 100 - blendVal;
      const ref2Weight = blendVal;

      const briefParts: string[] = [];
      const s1 = updated[0];
      const s2 = updated[1];
      const has1 = s1.label.trim() || s1.imageBase64;
      const has2 = s2.label.trim() || s2.imageBase64;

      if (has1 && has2) {
        briefParts.push(`Fashion blend: "${s1.label || 'Reference 1'}" (${ref1Weight}%) + "${s2.label || 'Reference 2'}" (${ref2Weight}%)`);
        briefParts.push(`  From "${s1.label || 'Reference 1'}": ${s1.takeFrom}`);
        briefParts.push(`  From "${s2.label || 'Reference 2'}": ${s2.takeFrom}`);
      } else if (has1) {
        briefParts.push(`Fashion style: "${s1.label || 'Reference 1'}" — ${s1.takeFrom}`);
      } else if (has2) {
        briefParts.push(`Fashion style: "${s2.label || 'Reference 2'}" — ${s2.takeFrom}`);
      }

      const brief = briefParts.join('\n');
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id
            ? { ...n, data: { ...n.data, fusionSlots: updated, fusionBlend: blendVal, fusionBrief: brief } }
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
        persist(next, blend);
        return next;
      });
    },
    [persist, blend],
  );

  const handleBlendChange = useCallback(
    (val: number) => {
      setBlend(val);
      persist(slots, val);
    },
    [persist, slots],
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
  const ref1Weight = 100 - blend;
  const ref2Weight = blend;

  return (
    <div className={`char-node ${selected ? 'selected' : ''}`} style={{ minWidth: 320, maxWidth: 420 }}
      title="Style Fusion — Blend two fashion reference styles with a single slider. Outputs a structured style brief.">
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
        <div className="char-node-body" style={{ gap: 10 }}>
          {/* Reference 1 */}
          {renderRefSlot(0, slots[0], updateSlot, handleFile, handlePaste, fileRefs, ref1Weight)}

          {/* Blend slider */}
          <div style={{
            background: 'rgba(106,27,154,0.1)',
            border: '1px solid rgba(106,27,154,0.25)',
            borderRadius: 8, padding: '8px 10px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 9, color: '#ce93d8', fontWeight: 700 }}>{slots[0].label || 'Ref 1'} ({ref1Weight}%)</span>
              <span style={{ fontSize: 9, color: '#ce93d8', fontWeight: 700 }}>({ref2Weight}%) {slots[1].label || 'Ref 2'}</span>
            </div>
            <input
              type="range" min={0} max={100} value={blend}
              className="nodrag" style={{ width: '100%', accentColor: '#ce93d8' }}
              onChange={(e) => handleBlendChange(Number(e.target.value))}
            />
            <div style={{ fontSize: 8, color: 'var(--text-muted)', textAlign: 'center', marginTop: 2 }}>
              Drag to blend fashion influences
            </div>
          </div>

          {/* Reference 2 */}
          {renderRefSlot(1, slots[1], updateSlot, handleFile, handlePaste, fileRefs, ref2Weight)}
        </div>
      )}

      <Handle type="target" position={Position.Left} id="input" className="char-handle" style={{ top: '50%' }} />
      <Handle type="source" position={Position.Right} id="fusion-out" className="char-handle" style={{ top: '50%' }} />
    </div>
  );
}

function renderRefSlot(
  idx: number,
  slot: RefSlot,
  updateSlot: (idx: number, partial: Partial<RefSlot>) => void,
  handleFile: (idx: number, file: File) => void,
  handlePaste: (idx: number) => void,
  fileRefs: React.MutableRefObject<(HTMLInputElement | null)[]>,
  weight: number,
) {
  return (
    <div style={{
      background: 'rgba(106,27,154,0.06)',
      border: '1px solid rgba(106,27,154,0.2)',
      borderRadius: 6, padding: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#ce93d8' }}>Reference {idx + 1}</span>
        <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{weight}%</span>
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
        {slot.imageBase64 ? (
          <img
            src={`data:${slot.imageMime};base64,${slot.imageBase64}`}
            alt={`Ref ${idx + 1}`}
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
          <button className="char-btn nodrag" onClick={() => fileRefs.current[idx]?.click()}
            style={{ fontSize: 9, padding: '2px 6px' }}>Upload</button>
          <button className="char-btn nodrag" onClick={() => handlePaste(idx)}
            style={{ fontSize: 9, padding: '2px 6px' }}>Paste</button>
          {slot.imageBase64 && (
            <button className="char-btn nodrag" onClick={() => updateSlot(idx, { imageBase64: '', imageMime: '' })}
              style={{ fontSize: 9, padding: '2px 6px', color: '#ef5350' }}>Clear</button>
          )}
          <input ref={(el) => { fileRefs.current[idx] = el; }} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(idx, f); }} />
        </div>
      </div>

      <input className="char-input nodrag" value={slot.label}
        onChange={(e) => updateSlot(idx, { label: e.target.value })}
        placeholder={idx === 0 ? 'e.g. "military chic"' : 'e.g. "frontier survivalist"'}
        style={{ width: '100%', fontSize: 10, marginBottom: 4 }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
        <span style={{ fontSize: 9, color: 'var(--text-muted)', flexShrink: 0 }}>Take</span>
        <select className="char-select nodrag" value={slot.takeFrom}
          onChange={(e) => updateSlot(idx, { takeFrom: e.target.value })}
          style={{ flex: 1, fontSize: 10 }}>
          {TAKE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
    </div>
  );
}

export default memo(StyleFusionNodeInner);
