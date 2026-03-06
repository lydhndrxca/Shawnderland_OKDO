"use client";

import { memo, useCallback, useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { ATTRIBUTE_GROUPS, type CharacterAttributes } from '@/lib/ideation/engine/conceptlab/characterPrompts';
import './CharacterNodes.css';

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

const CUSTOM_VALUE = '__custom__';

function CharAttributesNodeInner({ id, data, selected }: Props) {
  const { setNodes } = useReactFlow();
  const [attributes, setAttributes] = useState<CharacterAttributes>(
    (data?.attributes as CharacterAttributes) ?? {},
  );
  const [customText, setCustomText] = useState<Record<string, string>>({});

  const persistAttrs = useCallback(
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
      persistAttrs(next);
    },
    [attributes, persistAttrs],
  );

  const setCustom = useCallback(
    (key: string, val: string) => {
      setCustomText((p) => ({ ...p, [key]: val }));
      const next = { ...attributes, [key]: val };
      setAttributes(next);
      persistAttrs(next);
    },
    [attributes, persistAttrs],
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
    persistAttrs(next);
  }, [persistAttrs]);

  return (
    <div className={`char-node ${selected ? 'selected' : ''}`}>
      <div className="char-node-header" style={{ background: '#9c27b0' }}>
        Character Attributes
      </div>
      <div className="char-node-body">
        <div className="char-scroll-area nodrag nowheel">
          {ATTRIBUTE_GROUPS.map((g) => {
            const currentVal = attributes[g.key] ?? '';
            const allOpts = [...g.common, ...g.rare];
            const isCustom = currentVal !== '' && !allOpts.includes(currentVal);
            return (
              <div key={g.key} className="char-attr-group">
                <div className="char-attr-row">
                  <span className="char-attr-label">{g.label}</span>
                  <select
                    className="char-select nodrag"
                    value={isCustom ? CUSTOM_VALUE : currentVal}
                    onChange={(e) => setAttr(g.key, e.target.value)}
                    style={{ flex: 1 }}
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
                  <button className="char-btn-sm nodrag" onClick={() => randomizeOne(g)} title="Random">
                    R
                  </button>
                </div>
                {isCustom && (
                  <input
                    className="char-input nodrag"
                    style={{ marginTop: 2 }}
                    value={customText[g.key] ?? currentVal}
                    onChange={(e) => setCustom(g.key, e.target.value)}
                    placeholder={`Custom ${g.label.toLowerCase()}...`}
                  />
                )}
              </div>
            );
          })}
        </div>
        <div className="char-btn-row">
          <button className="char-btn nodrag" onClick={randomizeAll}>
            Randomize All
          </button>
        </div>
      </div>

      <Handle type="target" position={Position.Left} id="input" className="char-handle" style={{ top: '50%' }} />
      <Handle type="source" position={Position.Right} id="attrs-out" className="char-handle" style={{ top: '50%' }} />
    </div>
  );
}

export default memo(CharAttributesNodeInner);
