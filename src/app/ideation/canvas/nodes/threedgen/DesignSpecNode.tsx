"use client";

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Handle, Position, useReactFlow, useStore } from '@xyflow/react';
import './ThreeDNodes.css';

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

export interface DesignSpec {
  presetId: string;
  height: number;
  width: number;
  depth: number;
  notes: string;
}

interface DimPreset {
  id: string;
  label: string;
  desc: string;
  h: number;
  w: number;
  d: number;
}

const PRESETS: DimPreset[] = [
  { id: 'standing-cover', label: 'Standing Cover', desc: 'Full-height cover (180 UU)', h: 180, w: 120, d: 30 },
  { id: 'crouch-cover', label: 'Crouch Cover', desc: 'Crouch-height cover (90 UU)', h: 90, w: 120, d: 30 },
  { id: 'half-wall', label: 'Half Wall', desc: 'Hip-height barrier (120 UU)', h: 120, w: 200, d: 20 },
  { id: 'full-wall', label: 'Full Wall', desc: 'Floor-to-ceiling (300 UU)', h: 300, w: 200, d: 20 },
  { id: 'door-frame', label: 'Door Frame', desc: 'Standard doorway (220 UU)', h: 220, w: 100, d: 20 },
  { id: 'window', label: 'Window Frame', desc: 'Standard window (120 UU)', h: 120, w: 100, d: 20 },
  { id: 'chair', label: 'Chair', desc: 'Seat at ~45 UU (90 total)', h: 90, w: 50, d: 50 },
  { id: 'table', label: 'Table', desc: 'Surface at ~75 UU', h: 75, w: 120, d: 60 },
  { id: 'desk', label: 'Desk', desc: 'Work surface (75 UU)', h: 75, w: 150, d: 70 },
  { id: 'barrel', label: 'Barrel / Drum', desc: 'Industrial drum (90 UU)', h: 90, w: 60, d: 60 },
  { id: 'crate-sm', label: 'Crate (Small)', desc: 'Stackable (60 UU)', h: 60, w: 60, d: 60 },
  { id: 'crate-lg', label: 'Crate (Large)', desc: 'Shipping (100 UU)', h: 100, w: 100, d: 100 },
];

function DesignSpecNodeInner({ id, data, selected }: Props) {
  const { setNodes, getNode } = useReactFlow();

  const didMount = useRef(false);
  const persist = useCallback(
    (patch: Record<string, unknown>) => {
      setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)));
    },
    [id, setNodes],
  );

  const initSpec = (data.designSpec as DesignSpec | undefined) ?? { presetId: 'standing-cover', height: 180, width: 120, depth: 30, notes: '' };
  const [presetId, setPresetId] = useState(initSpec.presetId);
  const [height, setHeight] = useState(initSpec.height);
  const [width, setWidth] = useState(initSpec.width);
  const [depth, setDepth] = useState(initSpec.depth);
  const [notes, setNotes] = useState(initSpec.notes);

  const isCustom = presetId === 'custom';

  const applyPreset = useCallback((pid: string) => {
    setPresetId(pid);
    if (pid !== 'custom') {
      const p = PRESETS.find((pr) => pr.id === pid);
      if (p) { setHeight(p.h); setWidth(p.w); setDepth(p.d); }
    }
  }, []);

  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      if (!data?.designSpec) {
        persist({ designSpec: { presetId, height, width, depth, notes } });
      }
      return;
    }
    const spec: DesignSpec = { presetId, height, width, depth, notes };
    persist({ designSpec: spec });
  }, [presetId, height, width, depth, notes, persist]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Passthrough: sync generatedImage from upstream ── */
  const edgesRef = useRef<Array<{ source: string; target: string }>>([]);
  useStore(useCallback((state: { edges: Array<{ source: string; target: string }> }) => {
    edgesRef.current = state.edges;
    return state.edges.length;
  }, []));

  const upstreamImageSig = useStore(useCallback((state: { nodes: Array<{ id: string; data: Record<string, unknown> }>; edges: Array<{ source: string; target: string }> }) => {
    for (const e of state.edges) {
      if (e.target !== id) continue;
      const src = state.nodes.find((n) => n.id === e.source);
      const img = (src?.data as Record<string, unknown>)?.generatedImage as { base64?: string } | undefined;
      if (img?.base64) return img.base64.slice(0, 32);
    }
    return '';
  }, [id]));

  useEffect(() => {
    for (const e of edgesRef.current) {
      if (e.target !== id) continue;
      const src = getNode(e.source);
      const img = (src?.data as Record<string, unknown>)?.generatedImage as { base64?: string; mimeType?: string } | undefined;
      if (img?.base64) {
        persist({ generatedImage: img });
        return;
      }
    }
  }, [upstreamImageSig, id, getNode, persist]);

  const preset = PRESETS.find((p) => p.id === presetId);
  const maxDim = Math.max(height, width, depth, 1);

  return (
    <div className={`threed-node ${selected ? 'selected' : ''}`} style={{ width: 320 }}>
      <div className="threed-node-header" style={{ background: 'linear-gradient(135deg, #ff6e40, #ff3d00)' }}>
        <span>Design Spec</span>
        <span style={{ fontSize: 9, fontWeight: 400, opacity: 0.7 }}>UE5 Dimensions</span>
      </div>

      <div className="threed-node-body">
        {/* Preset */}
        <div className="threed-field">
          <span className="threed-field-label">Preset</span>
          <select className="threed-select nodrag" value={presetId} onChange={(e) => applyPreset(e.target.value)}>
            {PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            <option value="custom">Custom</option>
          </select>
        </div>

        {preset && (
          <div style={{ fontSize: 9, color: 'var(--text-muted)', padding: '0 2px' }}>{preset.desc}</div>
        )}

        {/* H / W / D */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end' }}>
          <DimCol label="H" value={height} onChange={isCustom ? setHeight : undefined} color="#6c63ff" pct={(height / maxDim) * 100} />
          <DimCol label="W" value={width} onChange={isCustom ? setWidth : undefined} color="#4db6ac" pct={(width / maxDim) * 100} />
          <DimCol label="D" value={depth} onChange={isCustom ? setDepth : undefined} color="#ff6e40" pct={(depth / maxDim) * 100} />
          <div style={{ fontSize: 9, color: 'var(--text-muted)', paddingBottom: 2 }}>
            UU<br />(cm)
          </div>
        </div>

        {/* Summary */}
        <div style={{ fontSize: 10, fontFamily: 'monospace', color: 'var(--text-muted)', textAlign: 'center' }}>
          {height} &times; {width} &times; {depth} UU
        </div>

        {/* Notes */}
        <div className="threed-field-col">
          <span className="threed-field-label">Designer Notes</span>
          <textarea
            className="threed-input nodrag nowheel"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes for 3D generation (fed to Meshy texture_prompt)..."
            rows={3}
            style={{ resize: 'vertical', fontFamily: 'inherit', fontSize: 11, lineHeight: 1.4 }}
          />
        </div>
      </div>

      <Handle type="target" position={Position.Left} id="input" className="char-handle" style={{ top: '50%' }} />
      <Handle type="source" position={Position.Right} id="output" className="char-handle" style={{ top: '50%' }} />
    </div>
  );
}

function DimCol({ label, value, onChange, color, pct }: {
  label: string;
  value: number;
  onChange?: (v: number) => void;
  color: string;
  pct: number;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, flex: 1 }}>
      <div style={{ width: '100%', height: 40, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        <div style={{ width: '100%', height: `${Math.max(4, pct)}%`, background: color, opacity: 0.6, borderRadius: '3px 3px 0 0', minHeight: 4 }} />
      </div>
      <input
        type="number"
        className="threed-input nodrag"
        value={value}
        readOnly={!onChange}
        onChange={onChange ? (e) => onChange(Math.max(1, Number(e.target.value))) : undefined}
        style={{ width: '100%', textAlign: 'center', fontSize: 11, padding: '3px 4px', opacity: onChange ? 1 : 0.6 }}
        min={1}
        max={10000}
      />
      <span style={{ fontSize: 8, fontWeight: 700, color, textTransform: 'uppercase' }}>{label}</span>
    </div>
  );
}

export default memo(DesignSpecNodeInner);
