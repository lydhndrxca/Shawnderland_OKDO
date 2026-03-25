"use client";

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import type { TextModelId } from '@/lib/ideation/engine/conceptlab/imageGenApi';
import { generateText } from '@/lib/ideation/engine/conceptlab/imageGenApi';
import TextModelSelector from '@/components/TextModelSelector';
import { PROP_ATTRIBUTE_GROUPS } from '@/lib/ideation/engine/conceptlab/propPrompts';
import '../character/CharacterNodes.css';
import './PropLabNodes.css';

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

interface DimPreset {
  id: string;
  label: string;
  desc: string;
  h: number;
  w: number;
  d: number;
}

const DIM_PRESETS: DimPreset[] = [
  { id: 'none', label: 'No Dimensions', desc: 'No target size', h: 0, w: 0, d: 0 },
  { id: 'standing-cover', label: 'Standing Cover', desc: '180 UU tall cover', h: 180, w: 120, d: 30 },
  { id: 'crouch-cover', label: 'Crouch Cover', desc: '90 UU half-cover', h: 90, w: 120, d: 30 },
  { id: 'half-wall', label: 'Half Wall', desc: 'Hip-height barrier', h: 120, w: 200, d: 20 },
  { id: 'full-wall', label: 'Full Wall', desc: 'Floor-to-ceiling', h: 300, w: 200, d: 20 },
  { id: 'door-frame', label: 'Door Frame', desc: 'Standard doorway', h: 220, w: 100, d: 20 },
  { id: 'window', label: 'Window Frame', desc: 'Standard window', h: 120, w: 100, d: 20 },
  { id: 'chair', label: 'Chair', desc: 'Seat at ~45 UU', h: 90, w: 50, d: 50 },
  { id: 'table', label: 'Table', desc: 'Surface at ~75 UU', h: 75, w: 120, d: 60 },
  { id: 'desk', label: 'Desk', desc: 'Work surface', h: 75, w: 150, d: 70 },
  { id: 'barrel', label: 'Barrel / Drum', desc: 'Industrial drum', h: 90, w: 60, d: 60 },
  { id: 'crate-sm', label: 'Crate (Small)', desc: 'Stackable 60 UU', h: 60, w: 60, d: 60 },
  { id: 'crate-lg', label: 'Crate (Large)', desc: 'Shipping 100 UU', h: 100, w: 100, d: 100 },
  { id: 'custom', label: 'Custom', desc: 'Enter your own', h: 100, w: 100, d: 100 },
];

const ATTR_KEYS = PROP_ATTRIBUTE_GROUPS.map((g) => g.key);

const POPULATE_PROMPT = `You are a senior environment artist and prop designer. Given a prop description, fully design the prop with every detail. Use the description as your creative brief and INFER plausible details.

Output ONLY valid JSON with no markdown fencing:
{
  "identity": { "propType": string, "setting": string, "condition": string, "scale": string },
  "attributes": { ${ATTR_KEYS.map((k) => `"${k}": string`).join(', ')} }
}

Rules for identity:
- propType: the category (furniture, vehicle, weapon, etc.)
- setting: the era/period (medieval, futuristic, etc.)
- condition: wear level (pristine, moderate-wear, etc.)
- scale: size reference (hand-held, furniture-scale, etc.)

Rules for attributes:
- Be HYPER-SPECIFIC about materials, surface finish, wear patterns, color
- Describe textures, functional elements, lighting effects
- Only write "none" if truly not applicable`;

interface TargetDims { presetId: string; height: number; width: number; depth: number }

function PropDescriptionNodeInner({ id, data, selected }: Props) {
  const { setNodes, getEdges } = useReactFlow();
  const [description, setDescription] = useState((data?.description as string) ?? '');
  const [textModel, setTextModel] = useState<TextModelId>((data?.textModel as TextModelId) ?? 'fast');
  const [populating, setPopulating] = useState(false);
  const [populateError, setPopulateError] = useState<string | null>(null);
  const localEdit = useRef(false);

  const initDims = (data?.targetDimensions as TargetDims | undefined) ?? { presetId: 'none', height: 0, width: 0, depth: 0 };
  const [dimPresetId, setDimPresetId] = useState(initDims.presetId);
  const [dimH, setDimH] = useState(initDims.height);
  const [dimW, setDimW] = useState(initDims.width);
  const [dimD, setDimD] = useState(initDims.depth);
  const [showDims, setShowDims] = useState(initDims.presetId !== 'none');

  useEffect(() => {
    const external = (data?.description as string) ?? '';
    if (!localEdit.current && external !== description) {
      setDescription(external);
    }
    localEdit.current = false;
  }, [data?.description]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const restored = (data?.textModel as TextModelId) ?? 'fast';
    if (restored !== textModel) setTextModel(restored);
  }, [data?.textModel]); // eslint-disable-line react-hooks/exhaustive-deps

  const persist = useCallback(
    (updates: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...updates } } : n)),
      );
    },
    [id, setNodes],
  );

  const persistDims = useCallback((pid: string, h: number, w: number, d: number) => {
    persist({ targetDimensions: { presetId: pid, height: h, width: w, depth: d } });
  }, [persist]);

  const handleDimPreset = useCallback((pid: string) => {
    setDimPresetId(pid);
    if (pid === 'none') {
      setDimH(0); setDimW(0); setDimD(0);
      setShowDims(false);
      persistDims(pid, 0, 0, 0);
    } else if (pid !== 'custom') {
      const p = DIM_PRESETS.find((pr) => pr.id === pid);
      if (p) { setDimH(p.h); setDimW(p.w); setDimD(p.d); persistDims(pid, p.h, p.w, p.d); }
      setShowDims(true);
    } else {
      setShowDims(true);
      persistDims(pid, dimH, dimW, dimD);
    }
  }, [dimH, dimW, dimD, persistDims]);

  const handlePopulate = useCallback(async () => {
    const desc = description.trim();
    if (!desc) return;
    setPopulating(true);
    setPopulateError(null);

    try {
      const result = await generateText(
        `${POPULATE_PROMPT}\n\nPROP DESCRIPTION:\n${desc}`,
        undefined,
        textModel,
      );

      const jsonStr = result.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(jsonStr);

      const identity = parsed.identity && typeof parsed.identity === 'object'
        ? {
            propType: String(parsed.identity.propType ?? ''),
            setting: String(parsed.identity.setting ?? ''),
            condition: String(parsed.identity.condition ?? ''),
            scale: String(parsed.identity.scale ?? ''),
          }
        : null;

      const attributes = parsed.attributes && typeof parsed.attributes === 'object'
        ? parsed.attributes as Record<string, string>
        : null;

      const edges = getEdges();
      const connectedIds = new Set<string>();
      const queue = [id];
      while (queue.length > 0) {
        const cur = queue.shift()!;
        if (connectedIds.has(cur)) continue;
        connectedIds.add(cur);
        for (const e of edges) {
          if (e.source === cur && !connectedIds.has(e.target)) queue.push(e.target);
          if (e.target === cur && !connectedIds.has(e.source)) queue.push(e.source);
        }
      }

      setNodes((nds) =>
        nds.map((n) => {
          if (!connectedIds.has(n.id)) return n;

          if (n.type === 'propIdentity' && identity) {
            const nd = n.data as Record<string, unknown>;
            const locks = (nd.lockedAttrs as Record<string, boolean>) ?? {};
            const existing = (nd.identity as Record<string, string>) ?? {};
            const mergedIdentity = {
              propType: locks.propType ? existing.propType : identity.propType,
              setting: locks.setting ? existing.setting : identity.setting,
              condition: locks.condition ? existing.condition : identity.condition,
              scale: locks.scale ? existing.scale : identity.scale,
            };
            return { ...n, data: { ...n.data, identity: mergedIdentity, name: nd.name ?? '' } };
          }
          if (n.type === 'propAttributes' && attributes) {
            const existing = (n.data as Record<string, unknown>).attributes as Record<string, string> | undefined;
            const locks = (n.data as Record<string, unknown>).lockedAttrs as Record<string, boolean> | undefined;
            const merged = { ...(existing ?? {}) };
            for (const [key, val] of Object.entries(attributes)) {
              if (locks?.[key]) continue;
              merged[key] = typeof val === 'string' ? val : String(val ?? '');
            }
            return { ...n, data: { ...n.data, attributes: merged } };
          }
          return n;
        }),
      );
    } catch (e) {
      setPopulateError(e instanceof Error ? e.message : String(e));
    } finally {
      setPopulating(false);
    }
  }, [id, description, textModel, getEdges, setNodes]);

  return (
    <div
      className={`char-node ${selected ? 'selected' : ''}`}
      title="Prop description — connect to Prop Identity and Prop Attributes; use Populate to fill from AI."
    >
      <div className="char-node-header" style={{ background: '#5c6bc0', gap: 6 }}>
        <span>Prop Description</span>
        <span style={{ marginLeft: 'auto' }}>
          <TextModelSelector
            value={textModel}
            onChange={(m) => { setTextModel(m); persist({ textModel: m }); }}
            disabled={populating}
          />
        </span>
      </div>
      <div className="char-node-body">
        <textarea
          className="char-textarea nodrag nowheel"
          value={description}
          onChange={(e) => {
            const v = e.target.value;
            localEdit.current = true;
            setDescription(v);
            persist({ description: v });
          }}
          placeholder="Describe the prop — what it is, its purpose, visual appearance, context..."
          rows={5}
        />
        <button
          type="button"
          className="char-btn nodrag"
          onClick={handlePopulate}
          disabled={populating || !description.trim()}
          title="Analyze description with AI and populate connected Prop Identity and Prop Attributes nodes"
          style={{ width: '100%', marginTop: 4, fontWeight: 600 }}
        >
          {populating ? 'Populating…' : 'Populate Identity & Attributes'}
        </button>

        {/* Target Dimensions */}
        <div className="prop-dims-section" style={{ marginTop: 6 }}>
          <button
            type="button"
            className="nodrag"
            onClick={() => {
              if (showDims && dimPresetId !== 'none') {
                handleDimPreset('none');
              } else {
                setShowDims(!showDims);
                if (!showDims && dimPresetId === 'none') handleDimPreset('standing-cover');
              }
            }}
            style={{
              width: '100%', padding: '4px 8px', fontSize: 10, fontWeight: 600,
              background: showDims ? 'rgba(108,99,255,0.15)' : 'transparent',
              border: `1px solid ${showDims ? '#6c63ff' : '#444'}`,
              borderRadius: 4, color: showDims ? '#6c63ff' : '#888', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}
          >
            <span>Target Dimensions</span>
            <span style={{ fontSize: 9, opacity: 0.7 }}>
              {dimPresetId !== 'none' ? `${dimH}×${dimW}×${dimD} UU` : 'OFF'}
            </span>
          </button>

          {showDims && (
            <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <select
                className="nodrag nowheel"
                value={dimPresetId}
                onChange={(e) => handleDimPreset(e.target.value)}
                style={{
                  width: '100%', padding: '4px 6px', fontSize: 10,
                  background: '#1a1a2e', color: '#eee', border: '1px solid #444', borderRadius: 4,
                }}
              >
                {DIM_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}{p.id !== 'none' && p.id !== 'custom' ? ` — ${p.desc}` : ''}</option>
                ))}
              </select>

              {dimPresetId !== 'none' && (
                <div style={{ display: 'flex', gap: 4 }}>
                  {([
                    { label: 'H', value: dimH, set: setDimH, color: '#6c63ff' },
                    { label: 'W', value: dimW, set: setDimW, color: '#4db6ac' },
                    { label: 'D', value: dimD, set: setDimD, color: '#ff6e40' },
                  ] as const).map(({ label, value, set, color }) => (
                    <div key={label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                      <span style={{ fontSize: 8, fontWeight: 700, color, textTransform: 'uppercase' }}>{label}</span>
                      <input
                        type="number"
                        className="nodrag"
                        value={value}
                        readOnly={dimPresetId !== 'custom'}
                        onChange={dimPresetId === 'custom' ? (e) => {
                          const v = Math.max(1, Number(e.target.value));
                          set(v);
                          const dims = { H: dimH, W: dimW, D: dimD, [label]: v };
                          persistDims('custom', dims.H, dims.W, dims.D);
                        } : undefined}
                        min={1}
                        max={10000}
                        style={{
                          width: '100%', textAlign: 'center', fontSize: 11, padding: '3px 4px',
                          background: '#1a1a2e', color: '#eee', border: '1px solid #444', borderRadius: 4,
                          opacity: dimPresetId === 'custom' ? 1 : 0.6,
                        }}
                      />
                    </div>
                  ))}
                  <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 2 }}>
                    <span style={{ fontSize: 8, color: '#666' }}>UU</span>
                  </div>
                </div>
              )}

              {dimPresetId !== 'none' && (
                <div style={{ fontSize: 9, color: '#666', textAlign: 'center', fontFamily: 'monospace' }}>
                  {dimH} × {dimW} × {dimD} UU ({(dimH / 100).toFixed(1)} × {(dimW / 100).toFixed(1)} × {(dimD / 100).toFixed(1)} m)
                </div>
              )}
            </div>
          )}
        </div>

        {populateError && <div className="char-error" style={{ fontSize: 10, marginTop: 4 }}>{populateError}</div>}
      </div>

      <Handle type="target" position={Position.Left} id="desc-in" className="char-handle" style={{ top: '50%' }} />
      <Handle type="source" position={Position.Right} id="desc-out" className="char-handle" style={{ top: '50%' }} />
    </div>
  );
}

export default memo(PropDescriptionNodeInner);
