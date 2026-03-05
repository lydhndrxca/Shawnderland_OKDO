"use client";

import { memo, useCallback, useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { ATTRIBUTE_GROUPS, type CharacterAttributes } from '@/lib/ideation/engine/conceptlab/characterPrompts';
import './ConceptLabNodes.css';

interface CharAttributesNodeProps {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

const CUSTOM_VALUE = '__custom__';

function CharAttributesNodeInner({ id, data, selected }: CharAttributesNodeProps) {
  const { setNodes } = useReactFlow();
  const [attributes, setAttributes] = useState<CharacterAttributes>(
    (data?.attributes as CharacterAttributes) ?? {},
  );
  const [customText, setCustomText] = useState<Record<string, string>>({});

  const persistData = useCallback(
    (attrs: CharacterAttributes) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, attributes: attrs } } : n)),
      );
    },
    [id, setNodes],
  );

  const setAttr = useCallback(
    (key: string, val: string) => {
      if (val === CUSTOM_VALUE) return;
      const next = { ...attributes, [key]: val };
      setAttributes(next);
      persistData(next);
    },
    [attributes, persistData],
  );

  const setCustom = useCallback(
    (key: string, val: string) => {
      setCustomText((p) => ({ ...p, [key]: val }));
      const next = { ...attributes, [key]: val };
      setAttributes(next);
      persistData(next);
    },
    [attributes, persistData],
  );

  const randomizeOne = useCallback(
    (g: (typeof ATTRIBUTE_GROUPS)[0]) => {
      const pool = [...g.common, ...g.rare];
      const val = pool[Math.floor(Math.random() * pool.length)];
      setAttr(g.key, val);
    },
    [setAttr],
  );

  const randomizeAll = useCallback(() => {
    const next: CharacterAttributes = {};
    for (const g of ATTRIBUTE_GROUPS) {
      const pool = Math.random() < 0.7 ? g.common : g.rare;
      next[g.key] = pool[Math.floor(Math.random() * pool.length)];
    }
    setAttributes(next);
    setCustomText({});
    persistData(next);
  }, [persistData]);

  return (
    <div className={`cl-node ${selected ? 'selected' : ''}`}>
      <div className="cl-node-header" style={{ background: '#9c27b0' }}>
        Character Attributes
      </div>
      <div className="cl-node-body">
        <div className="cl-scroll-area">
          {ATTRIBUTE_GROUPS.map((g) => {
            const currentVal = attributes[g.key] ?? '';
            const allOpts = [...g.common, ...g.rare];
            const isCustom = currentVal && !allOpts.includes(currentVal);
            return (
              <div key={g.key} className="cl-field">
                <span className="cl-field-label wide">{g.label}</span>
                <div style={{ flex: 1, display: 'flex', gap: 4, alignItems: 'center' }}>
                  <select
                    className="cl-select nodrag"
                    value={isCustom ? CUSTOM_VALUE : currentVal}
                    onChange={(e) => setAttr(g.key, e.target.value)}
                  >
                    <option value="">—</option>
                    <optgroup label="Common">
                      {g.common.map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Rare">
                      {g.rare.map((o) => (
                        <option key={o} value={o}>{o}</option>
                      ))}
                    </optgroup>
                    <option value={CUSTOM_VALUE}>Custom...</option>
                  </select>
                  <button className="cl-btn-sm nodrag" onClick={() => randomizeOne(g)} title="Random">
                    R
                  </button>
                </div>
                {isCustom && (
                  <input
                    className="cl-input nodrag"
                    style={{ marginTop: 4, width: '100%' }}
                    value={customText[g.key] ?? currentVal}
                    onChange={(e) => setCustom(g.key, e.target.value)}
                    placeholder={`Custom ${g.label.toLowerCase()}...`}
                  />
                )}
              </div>
            );
          })}
        </div>
        <div className="cl-btn-row">
          <button className="cl-btn nodrag" onClick={randomizeAll}>
            Randomize All
          </button>
        </div>
      </div>
      <Handle type="source" position={Position.Right} id="attrs-out" className="cl-handle" />
    </div>
  );
}

export default memo(CharAttributesNodeInner);
