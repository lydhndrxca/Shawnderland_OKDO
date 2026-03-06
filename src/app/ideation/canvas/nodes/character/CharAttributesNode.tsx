"use client";

import { memo, useCallback, useEffect, useRef, useState } from 'react';
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
  const [showDropdown, setShowDropdown] = useState<Record<string, boolean>>({});
  const localEdit = useRef(false);

  useEffect(() => {
    if (localEdit.current) { localEdit.current = false; return; }
    const ext = (data?.attributes as CharacterAttributes) ?? {};
    const keys = new Set([...Object.keys(ext), ...Object.keys(attributes)]);
    let changed = false;
    for (const k of keys) { if (ext[k] !== attributes[k]) { changed = true; break; } }
    if (changed) {
      setAttributes(ext);
      setCustomText({});
    }
  }, [data?.attributes]);

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
      localEdit.current = true;
      const next = { ...attributes, [key]: val };
      setAttributes(next);
      persistAttrs(next);
    },
    [attributes, persistAttrs],
  );

  const setCustom = useCallback(
    (key: string, val: string) => {
      localEdit.current = true;
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
    localEdit.current = true;
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
            const forceDropdown = showDropdown[g.key];
            return (
              <div key={g.key} className="char-attr-group">
                <div className="char-attr-row">
                  <span className="char-attr-label">{g.label}</span>
                  {isCustom && !forceDropdown ? (
                    <input
                      className="char-input nodrag"
                      style={{ flex: 1, margin: 0 }}
                      value={customText[g.key] ?? currentVal}
                      onChange={(e) => setCustom(g.key, e.target.value)}
                      placeholder={`Custom ${g.label.toLowerCase()}...`}
                      title={customText[g.key] ?? currentVal}
                    />
                  ) : (
                    <select
                      className="char-select nodrag"
                      value={isCustom ? CUSTOM_VALUE : currentVal}
                      onChange={(e) => {
                        if (e.target.value === CUSTOM_VALUE) {
                          setShowDropdown((p) => ({ ...p, [g.key]: false }));
                          return;
                        }
                        setShowDropdown((p) => ({ ...p, [g.key]: false }));
                        setAttr(g.key, e.target.value);
                      }}
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
                  )}
                  {isCustom && !forceDropdown && (
                    <button
                      className="char-btn-sm nodrag"
                      onClick={() => setShowDropdown((p) => ({ ...p, [g.key]: true }))}
                      title="Switch to preset dropdown"
                      style={{ fontSize: 10, padding: '1px 4px' }}
                    >
                      &#9662;
                    </button>
                  )}
                  <button className="char-btn-sm nodrag" onClick={() => randomizeOne(g)} title="Random">
                    R
                  </button>
                </div>
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
