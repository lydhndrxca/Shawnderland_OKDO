"use client";

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { ATTRIBUTE_GROUPS, POSE_COMMON, POSE_RARE, type CharacterAttributes } from '@/lib/ideation/engine/conceptlab/characterPrompts';
import { NODE_TOOLTIPS } from './nodeTooltips';
import './CharacterNodes.css';

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

const CUSTOM_VALUE = '__custom__';

const POSE_PRESETS = [
  { label: 'Relaxed A-stance, hands at sides', value: 'Pose — relaxed A-stance, hands at sides' },
  { label: 'T-pose (classic game)', value: 'Pose — classic T-pose, arms straight out' },
  { label: 'Hands at sides', value: 'Pose — standing straight, hands at sides' },
  { label: 'Action stance with weapon', value: 'Pose — action stance, weapon drawn' },
  { label: 'Custom (AI decides)', value: '__ai_custom__' },
];

const ALL_POSE_OPTIONS = [...POSE_COMMON, ...POSE_RARE];

function CharAttributesNodeInner({ id, data, selected }: Props) {
  const { setNodes } = useReactFlow();
  const [minimized, setMinimized] = useState(false);
  const [attributes, setAttributes] = useState<CharacterAttributes>(
    (data?.attributes as CharacterAttributes) ?? {},
  );
  const [locked, setLocked] = useState<Record<string, boolean>>(
    (data?.lockedAttrs as Record<string, boolean>) ?? { pose: true },
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

  useEffect(() => {
    const extLocked = (data?.lockedAttrs as Record<string, boolean>) ?? {};
    setLocked((prev) => {
      const merged = { ...prev, ...extLocked };
      if (!('pose' in merged)) merged.pose = true;
      return merged;
    });
  }, [data?.lockedAttrs]);

  const persistAttrs = useCallback(
    (attrs: CharacterAttributes) => {
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
      setLocked((prev) => {
        const next = { ...prev, [key]: !prev[key] };
        persistLocks(next);
        return next;
      });
    },
    [persistLocks],
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
    (g: { key: string; common: string[]; rare: string[] }) => {
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
      if (locked[g.key]) {
        next[g.key] = attributes[g.key] ?? '';
        continue;
      }
      const pool = Math.random() < 0.7 ? g.common : g.rare;
      next[g.key] = pool[Math.floor(Math.random() * pool.length)];
    }
    if (locked.pose) {
      next.pose = attributes.pose ?? POSE_PRESETS[0].value;
    } else {
      const pool = ALL_POSE_OPTIONS;
      next.pose = pool[Math.floor(Math.random() * pool.length)];
    }
    setAttributes(next);
    setCustomText({});
    persistAttrs(next);
  }, [persistAttrs, locked, attributes]);

  useEffect(() => {
    if (!attributes.pose) {
      const next = { ...attributes, pose: POSE_PRESETS[0].value };
      setAttributes(next);
      persistAttrs(next);
    }
  }, []);

  const renderAttributeRow = (g: { key: string; label: string; common: string[]; rare: string[] }) => {
    const currentVal = attributes[g.key] ?? '';
    const allOpts = [...g.common, ...g.rare];
    const isCustom = currentVal !== '' && !allOpts.includes(currentVal);
    const forceDropdown = showDropdown[g.key];
    const isLocked = !!locked[g.key];

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
          <button
            className={`char-lock-btn nodrag ${isLocked ? 'locked' : ''}`}
            onClick={() => toggleLock(g.key)}
            title={isLocked ? 'Locked — AI will not overwrite' : 'Unlocked — AI may overwrite'}
          >
            {isLocked ? '\u{1F512}' : '\u{1F513}'}
          </button>
        </div>
      </div>
    );
  };

  const poseVal = attributes.pose ?? POSE_PRESETS[0].value;
  const poseIsCustom = poseVal !== '' && !ALL_POSE_OPTIONS.includes(poseVal) && !POSE_PRESETS.some((p) => p.value === poseVal);
  const poseLocked = !!locked.pose;

  return (
    <div className={`char-node ${selected ? 'selected' : ''}`} title={NODE_TOOLTIPS.charAttributes}>
      <div className="char-node-header" style={{ background: '#9c27b0', cursor: 'pointer' }} onClick={() => setMinimized((m) => !m)}>
        Character Attributes
        <span style={{ marginLeft: 'auto', fontSize: 10, opacity: 0.7 }}>
          {minimized ? '\u25BC' : '\u25B2'} {Object.values(attributes).filter(Boolean).length}
        </span>
      </div>
      {minimized && (
        <div className="char-node-body" style={{ padding: '4px 10px' }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            {Object.values(attributes).filter(Boolean).length} attributes set
          </span>
        </div>
      )}
      {!minimized && (
        <div className="char-node-body">
          {ATTRIBUTE_GROUPS.map((g) => renderAttributeRow(g))}

          <div className="char-attr-group" style={{ borderTop: '1px solid var(--border)', paddingTop: 6, marginTop: 4 }}>
            <div className="char-attr-row">
              <span className="char-attr-label">Pose</span>
              {poseIsCustom ? (
                <input
                  className="char-input nodrag"
                  style={{ flex: 1, margin: 0 }}
                  value={poseVal}
                  onChange={(e) => setAttr('pose', e.target.value)}
                  placeholder="Custom pose description..."
                />
              ) : (
                <select
                  className="char-select nodrag"
                  value={poseVal}
                  onChange={(e) => {
                    if (e.target.value === CUSTOM_VALUE) {
                      setAttr('pose', '');
                      return;
                    }
                    setAttr('pose', e.target.value);
                  }}
                  style={{ flex: 1 }}
                >
                  {POSE_PRESETS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                  <optgroup label="Common">
                    {POSE_COMMON.filter((o) => !POSE_PRESETS.some((p) => p.value === o)).map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Rare">
                    {POSE_RARE.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </optgroup>
                  <option value={CUSTOM_VALUE}>Custom...</option>
                </select>
              )}
              <button className="char-btn-sm nodrag" onClick={() => randomizeOne({ key: 'pose', common: POSE_COMMON, rare: POSE_RARE })} title="Random Pose">
                R
              </button>
              <button
                className={`char-lock-btn nodrag ${poseLocked ? 'locked' : ''}`}
                onClick={() => toggleLock('pose')}
                title={poseLocked ? 'Locked — AI will not overwrite' : 'Unlocked — AI may overwrite'}
              >
                {poseLocked ? '\u{1F512}' : '\u{1F513}'}
              </button>
            </div>
          </div>
          <div className="char-btn-row">
            <button className="char-btn nodrag" onClick={randomizeAll}>
              Randomize All
            </button>
          </div>
        </div>
      )}

      <Handle type="target" position={Position.Left} id="input" className="char-handle" style={{ top: '50%' }} />
      <Handle type="source" position={Position.Right} id="attrs-out" className="char-handle" style={{ top: '50%' }} />
    </div>
  );
}

export default memo(CharAttributesNodeInner);
