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

const ALL_KEYS = [...ATTRIBUTE_GROUPS.map((g) => g.key), 'pose'];

function CharAttributesNodeInner({ id, data, selected }: Props) {
  const { setNodes } = useReactFlow();
  const [minimized, setMinimized] = useState(false);
  const [attributes, setAttributes] = useState<CharacterAttributes>(
    (data?.attributes as CharacterAttributes) ?? {},
  );
  const [locked, setLocked] = useState<Record<string, boolean>>(
    (data?.lockedAttrs as Record<string, boolean>) ?? { pose: true },
  );
  const [changedFields, setChangedFields] = useState<Set<string>>(
    new Set((data?.changedFields as string[]) ?? []),
  );
  const baselineRef = useRef<CharacterAttributes>({});
  const localEdit = useRef(false);

  useEffect(() => {
    if (localEdit.current) { localEdit.current = false; return; }
    const ext = (data?.attributes as CharacterAttributes) ?? {};
    const keys = new Set([...Object.keys(ext), ...Object.keys(attributes)]);
    let changed = false;
    for (const k of keys) { if (ext[k] !== attributes[k]) { changed = true; break; } }
    if (changed) {
      setAttributes(ext);
      baselineRef.current = { ...ext };
      setChangedFields(new Set());
      persistChangedFields([]);
    }
  }, [data?.attributes]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const extLocked = (data?.lockedAttrs as Record<string, boolean>) ?? {};
    setLocked((prev) => {
      const merged = { ...prev, ...extLocked };
      if (!('pose' in merged)) merged.pose = true;
      return merged;
    });
  }, [data?.lockedAttrs]);

  useEffect(() => {
    if (Object.keys(baselineRef.current).length === 0 && Object.keys(attributes).length > 0) {
      baselineRef.current = { ...attributes };
    }
  }, [attributes]);

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

  const persistChangedFields = useCallback(
    (fields: string[]) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, changedFields: fields } } : n)),
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
      localEdit.current = true;
      const next = { ...attributes, [key]: val };
      setAttributes(next);
      persistAttrs(next);

      const baseline = baselineRef.current[key] ?? '';
      setChangedFields((prev) => {
        const n = new Set(prev);
        if (val !== baseline && val.trim() !== '') n.add(key);
        else n.delete(key);
        persistChangedFields([...n]);
        return n;
      });
    },
    [attributes, persistAttrs, persistChangedFields],
  );

  const toggleHighlight = useCallback(
    (key: string) => {
      setChangedFields((prev) => {
        const n = new Set(prev);
        if (n.has(key)) n.delete(key);
        else if (attributes[key]?.trim()) n.add(key);
        persistChangedFields([...n]);
        return n;
      });
    },
    [attributes, persistChangedFields],
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
      next.pose = attributes.pose ?? '';
    } else {
      const pool = [...POSE_COMMON, ...POSE_RARE];
      next.pose = pool[Math.floor(Math.random() * pool.length)];
    }
    setAttributes(next);
    persistAttrs(next);
  }, [persistAttrs, locked, attributes]);

  useEffect(() => {
    if (!attributes.pose) {
      const next = { ...attributes, pose: 'Relaxed A-stance, hands at sides' };
      setAttributes(next);
      persistAttrs(next);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const clearHighlights = useCallback(() => {
    baselineRef.current = { ...attributes };
    setChangedFields(new Set());
    persistChangedFields([]);
  }, [attributes, persistChangedFields]);

  const renderAttributeRow = (key: string, label: string) => {
    const currentVal = attributes[key] ?? '';
    const isLocked = !!locked[key];
    const isChanged = changedFields.has(key);

    return (
      <div
        key={key}
        className="char-attr-group"
        style={{
          border: isChanged ? '1px solid rgba(255, 152, 0, 0.5)' : '1px solid transparent',
          borderRadius: 6,
          background: isChanged ? 'rgba(255, 152, 0, 0.06)' : undefined,
          padding: '4px 6px',
          transition: 'border-color 0.2s, background 0.2s',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
          <span
            className="char-attr-label"
            style={{ cursor: 'pointer', userSelect: 'none', minWidth: 0 }}
            onClick={() => toggleHighlight(key)}
            title={isChanged ? 'Click to un-highlight' : 'Click to highlight as changed'}
          >
            {isChanged && <span style={{ color: '#ff9800', marginRight: 3 }}>●</span>}
            {label}
          </span>
          <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <button
              className={`char-lock-btn nodrag ${isLocked ? 'locked' : ''}`}
              onClick={() => toggleLock(key)}
              title={isLocked ? 'Locked — click to unlock and allow editing' : 'Unlocked — click to lock'}
              style={{ width: 18, height: 18, fontSize: 10 }}
            >
              {isLocked ? '\u{1F512}' : '\u{1F513}'}
            </button>
          </div>
        </div>
        <textarea
          className="char-input nodrag nowheel"
          value={currentVal}
          onChange={(e) => setAttr(key, e.target.value)}
          disabled={isLocked}
          placeholder={isLocked ? `🔒 Unlock to edit ${label.toLowerCase()}` : `Describe ${label.toLowerCase()}...`}
          style={{
            width: '100%',
            minHeight: 80,
            resize: 'vertical',
            fontSize: 11,
            lineHeight: 1.4,
            padding: '5px 8px',
            borderColor: isChanged ? 'rgba(255, 152, 0, 0.35)' : undefined,
            opacity: isLocked ? 0.5 : 1,
            cursor: isLocked ? 'not-allowed' : undefined,
          }}
          rows={4}
        />
      </div>
    );
  };

  const changedCount = changedFields.size;

  return (
    <div className={`char-node ${selected ? 'selected' : ''}`} title={NODE_TOOLTIPS.charAttributes}>
      <div className="char-node-header" style={{ background: '#9c27b0', cursor: 'pointer' }} onClick={() => setMinimized((m) => !m)}>
        <span>
          Character Attributes
          {changedCount > 0 && (
            <span style={{ marginLeft: 6, fontSize: 9, background: 'rgba(255,152,0,0.3)', padding: '1px 5px', borderRadius: 8 }}>
              {changedCount} changed
            </span>
          )}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 10, opacity: 0.7 }}>
          {minimized ? '\u25BC' : '\u25B2'} {Object.values(attributes).filter(Boolean).length}
        </span>
      </div>
      {minimized && (
        <div className="char-node-body" style={{ padding: '4px 10px' }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            {Object.values(attributes).filter(Boolean).length} attributes set
            {changedCount > 0 && <span style={{ color: '#ff9800' }}> · {changedCount} changed</span>}
          </span>
        </div>
      )}
      {!minimized && (
        <div className="char-node-body" style={{ gap: 6 }}>
          {ATTRIBUTE_GROUPS.map((g) => renderAttributeRow(g.key, g.label))}
          {renderAttributeRow('pose', 'Pose')}

          <div className="char-btn-row" style={{ display: 'flex', gap: 4 }}>
            <button className="char-btn nodrag" onClick={randomizeAll} style={{ flex: 1 }}>
              Randomize All
            </button>
            {changedCount > 0 && (
              <button
                className="char-btn nodrag"
                onClick={clearHighlights}
                style={{ fontSize: 10, padding: '4px 8px', color: '#ff9800', borderColor: 'rgba(255,152,0,0.3)' }}
                title="Clear all change highlights and reset baseline"
              >
                Clear Changes
              </button>
            )}
          </div>
        </div>
      )}

      <Handle type="target" position={Position.Left} id="input" className="char-handle" style={{ top: '50%' }} />
      <Handle type="source" position={Position.Right} id="attrs-out" className="char-handle" style={{ top: '50%' }} />
    </div>
  );
}

export default memo(CharAttributesNodeInner);
