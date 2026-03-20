"use client";

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import {
  GENERATION_INTENT_OPTIONS,
  RESOLUTION_MODE_OPTIONS,
  WEAR_LEVEL_OPTIONS,
  HUD_ELEMENT_OPTIONS,
  type GenerationIntent,
  type ResolutionMode,
  type WearLevel,
} from '@/lib/ideation/engine/conceptlab/uiPrompts';
import '../character/CharacterNodes.css';
import './UILabNodes.css';

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

const WEAR_IDX: Record<WearLevel, number> = { Clean: 0, 'Lightly Weathered': 1, 'Heavily Damaged': 2 };
const IDX_TO_WEAR: WearLevel[] = ['Clean', 'Lightly Weathered', 'Heavily Damaged'];

const selectStyle: React.CSSProperties = {
  width: '100%', padding: '5px 6px', fontSize: 11,
  background: '#1a1a2e', color: '#eee', border: '1px solid #444', borderRadius: 4,
};

function UIConfigNodeInner({ id, data, selected }: Props) {
  const { setNodes } = useReactFlow();
  const [collapsed, setCollapsed] = useState(false);

  const [intent, setIntent] = useState<GenerationIntent>(
    (data?.generationIntent as GenerationIntent) ?? 'Freeform',
  );
  const [resMode, setResMode] = useState<ResolutionMode>(
    (data?.resolutionMode as ResolutionMode) ?? 'Freeform',
  );
  const [wearLevel, setWearLevel] = useState<WearLevel>(
    (data?.wearLevel as WearLevel) ?? 'Clean',
  );
  const [hudElements, setHudElements] = useState<Set<string>>(
    new Set((data?.hudElements as string[]) ?? []),
  );
  const [iconSpec, setIconSpec] = useState<Record<string, unknown> | null>(
    (data?.iconSpec as Record<string, unknown>) ?? null,
  );

  const localEdit = useRef(false);

  useEffect(() => {
    if (localEdit.current) { localEdit.current = false; return; }
    const extSpec = data?.iconSpec as Record<string, unknown> | undefined;
    if (extSpec && JSON.stringify(extSpec) !== JSON.stringify(iconSpec)) {
      setIconSpec(extSpec);
    }
  }, [data?.iconSpec]); // eslint-disable-line react-hooks/exhaustive-deps

  const persist = useCallback(
    (updates: Record<string, unknown>) => {
      localEdit.current = true;
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...updates } } : n)),
      );
    },
    [id, setNodes],
  );

  const isHudUi = intent === 'HUD UI Layouts';

  return (
    <div className={`char-node ${selected ? 'selected' : ''}`}>
      <div
        className="char-node-header"
        style={{ background: '#1565c0', cursor: 'pointer' }}
        onClick={() => setCollapsed((c) => !c)}
      >
        <span>UI Config</span>
        <span style={{ marginLeft: 'auto', fontSize: 10, opacity: 0.7 }}>
          {collapsed ? '\u25BC' : '\u25B2'}
        </span>
      </div>

      {collapsed && (
        <div className="char-node-body" style={{ padding: '4px 10px' }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            {intent} · {resMode} · {wearLevel}
          </span>
        </div>
      )}

      {!collapsed && (
        <div className="char-node-body" style={{ gap: 8 }}>
          {/* Generation Intent */}
          <div>
            <label style={{ fontSize: 10, color: '#aaa', display: 'block', marginBottom: 2, fontWeight: 600 }}>
              Generation Intent
            </label>
            <select
              className="nodrag nowheel"
              value={intent}
              onChange={(e) => {
                const v = e.target.value as GenerationIntent;
                setIntent(v);
                persist({ generationIntent: v });
              }}
              style={selectStyle}
            >
              {GENERATION_INTENT_OPTIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>

          {/* Resolution Mode */}
          <div>
            <label style={{ fontSize: 10, color: '#aaa', display: 'block', marginBottom: 2, fontWeight: 600 }}>
              Resolution Mode
            </label>
            <select
              className="nodrag nowheel"
              value={resMode}
              onChange={(e) => {
                const v = e.target.value as ResolutionMode;
                setResMode(v);
                persist({ resolutionMode: v });
              }}
              style={selectStyle}
            >
              {RESOLUTION_MODE_OPTIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>

          {/* Wear Level */}
          <div>
            <label style={{ fontSize: 10, color: '#aaa', display: 'block', marginBottom: 2, fontWeight: 600 }}>
              Wear Level: {wearLevel}
            </label>
            <input
              type="range"
              className="uilab-wear-slider nodrag"
              min={0}
              max={2}
              step={1}
              value={WEAR_IDX[wearLevel]}
              onChange={(e) => {
                const v = IDX_TO_WEAR[parseInt(e.target.value)] ?? 'Clean';
                setWearLevel(v);
                persist({ wearLevel: v });
              }}
            />
          </div>

          {/* HUD Elements (conditional) */}
          {isHudUi && (
            <div>
              <label style={{ fontSize: 10, color: '#aaa', display: 'block', marginBottom: 4, fontWeight: 600 }}>
                HUD Elements
              </label>
              <div className="uilab-hud-grid">
                {HUD_ELEMENT_OPTIONS.map((el) => (
                  <label key={el} className="uilab-hud-label nodrag">
                    <input
                      type="checkbox"
                      checked={hudElements.has(el)}
                      onChange={() => {
                        setHudElements((prev) => {
                          const next = new Set(prev);
                          if (next.has(el)) next.delete(el);
                          else next.add(el);
                          persist({ hudElements: [...next] });
                          return next;
                        });
                      }}
                    />
                    {el}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Icon Spec display */}
          {iconSpec && (
            <div>
              <label style={{ fontSize: 10, color: '#aaa', display: 'block', marginBottom: 2, fontWeight: 600 }}>
                Icon Spec (from extraction)
              </label>
              <div className="char-scroll-area nodrag nowheel" style={{ maxHeight: 160 }}>
                <pre style={{ fontSize: 9, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', margin: 0 }}>
                  {JSON.stringify(iconSpec, null, 2)}
                </pre>
              </div>
              <button
                type="button"
                className="char-btn nodrag"
                onClick={() => { setIconSpec(null); persist({ iconSpec: null }); }}
                style={{ fontSize: 10, marginTop: 4, width: '100%' }}
              >
                Clear Spec
              </button>
            </div>
          )}
        </div>
      )}

      <Handle type="target" position={Position.Left} id="spec-in" className="char-handle" style={{ top: '50%' }} />
      <Handle type="source" position={Position.Right} id="config-out" className="char-handle" style={{ top: '50%' }} />
    </div>
  );
}

export default memo(UIConfigNodeInner);
