"use client";

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import {
  PROP_TYPE_OPTIONS,
  SETTING_OPTIONS,
  CONDITION_OPTIONS,
  SCALE_OPTIONS,
} from '@/lib/ideation/engine/conceptlab/propPrompts';
import '../character/CharacterNodes.css';
import './PropLabNodes.css';

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

interface PropIdentity {
  propType: string;
  setting: string;
  condition: string;
  scale: string;
}

const IDENTITY_FIELDS: { key: keyof PropIdentity; label: string; options: string[] }[] = [
  { key: 'propType', label: 'Prop Type', options: PROP_TYPE_OPTIONS },
  { key: 'setting', label: 'Setting / Era', options: SETTING_OPTIONS },
  { key: 'condition', label: 'Condition', options: CONDITION_OPTIONS },
  { key: 'scale', label: 'Scale', options: SCALE_OPTIONS },
];

function PropIdentityNodeInner({ id, data, selected }: Props) {
  const { setNodes } = useReactFlow();
  const [minimized, setMinimized] = useState(false);

  const [name, setName] = useState((data?.name as string) ?? '');
  const [identity, setIdentity] = useState<PropIdentity>({
    propType: (data?.identity as PropIdentity)?.propType ?? '',
    setting: (data?.identity as PropIdentity)?.setting ?? '',
    condition: (data?.identity as PropIdentity)?.condition ?? '',
    scale: (data?.identity as PropIdentity)?.scale ?? '',
  });
  const [changedFields, setChangedFields] = useState<Set<string>>(
    new Set((data?.identityChangedFields as string[]) ?? []),
  );
  const baselineRef = useRef<PropIdentity>({ propType: '', setting: '', condition: '', scale: '' });
  const localEdit = useRef(false);

  useEffect(() => {
    if (localEdit.current) { localEdit.current = false; return; }
    const ext = data?.identity as PropIdentity | undefined;
    if (!ext) return;
    setIdentity((prev) => {
      if (prev.propType === (ext.propType ?? '') && prev.setting === (ext.setting ?? '') &&
          prev.condition === (ext.condition ?? '') && prev.scale === (ext.scale ?? '')) return prev;
      return {
        propType: ext.propType ?? '',
        setting: ext.setting ?? '',
        condition: ext.condition ?? '',
        scale: ext.scale ?? '',
      };
    });
    baselineRef.current = {
      propType: ext.propType ?? '',
      setting: ext.setting ?? '',
      condition: ext.condition ?? '',
      scale: ext.scale ?? '',
    };
    setChangedFields(new Set());
    persistChangedFields([]);
  }, [data?.identity]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!baselineRef.current.propType && identity.propType) {
      baselineRef.current = { ...identity };
    }
  }, [identity]);

  const persist = useCallback(
    (updates: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...updates } } : n)),
      );
    },
    [id, setNodes],
  );

  const persistChangedFields = useCallback(
    (fields: string[]) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, identityChangedFields: fields } } : n)),
      );
    },
    [id, setNodes],
  );

  const setField = useCallback(
    (key: keyof PropIdentity, val: string) => {
      localEdit.current = true;
      const next = { ...identity, [key]: val };
      setIdentity(next);
      persist({ identity: next });

      const baseline = baselineRef.current[key] ?? '';
      setChangedFields((prev) => {
        const n = new Set(prev);
        if (val !== baseline && val.trim() !== '') n.add(key);
        else n.delete(key);
        persistChangedFields([...n]);
        return n;
      });
    },
    [identity, persist, persistChangedFields],
  );

  const toggleHighlight = useCallback(
    (key: string) => {
      setChangedFields((prev) => {
        const n = new Set(prev);
        if (n.has(key)) n.delete(key);
        else if (identity[key as keyof PropIdentity]?.trim()) n.add(key);
        persistChangedFields([...n]);
        return n;
      });
    },
    [identity, persistChangedFields],
  );

  const handleRandomize = useCallback(() => {
    localEdit.current = true;
    const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
    const next: PropIdentity = {
      propType: pick(PROP_TYPE_OPTIONS),
      setting: pick(SETTING_OPTIONS),
      condition: pick(CONDITION_OPTIONS),
      scale: pick(SCALE_OPTIONS),
    };
    setIdentity(next);
    persist({ identity: next });
  }, [persist]);

  const clearHighlights = useCallback(() => {
    baselineRef.current = { ...identity };
    setChangedFields(new Set());
    persistChangedFields([]);
  }, [identity, persistChangedFields]);

  const changedCount = changedFields.size;

  return (
    <div
      className={`char-node proplab-accent ${selected ? 'selected' : ''}`}
      title="Set prop type, setting, condition, and scale. Connect output → downstream prop nodes."
    >
      <div className="char-node-header" style={{ background: '#009688', cursor: 'pointer' }} onClick={() => setMinimized((m) => !m)}>
        <span>
          Prop Identity
          {changedCount > 0 && (
            <span style={{ marginLeft: 6, fontSize: 9, background: 'rgba(255,152,0,0.3)', padding: '1px 5px', borderRadius: 8 }}>
              {changedCount} changed
            </span>
          )}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 10, opacity: 0.7 }}>
          {minimized ? '\u25BC' : '\u25B2'}
        </span>
      </div>
      {minimized && (
        <div className="char-node-body" style={{ padding: '4px 10px' }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            {[identity.propType, identity.setting, identity.condition, identity.scale].filter(Boolean).join(' · ') || 'Not set'}
            {changedCount > 0 && <span style={{ color: '#ff9800' }}> · {changedCount} changed</span>}
          </span>
        </div>
      )}
      {!minimized && (
        <div className="char-node-body" style={{ gap: 6 }}>
          <div className="char-field" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 3 }}>
            <span className="char-field-label" style={{ minWidth: 0 }}>Name</span>
            <input
              className="char-input nodrag"
              value={name}
              onChange={(e) => { setName(e.target.value); persist({ name: e.target.value }); }}
              placeholder="Prop name..."
              style={{ width: '100%' }}
            />
          </div>

          {IDENTITY_FIELDS.map(({ key, label }) => {
            const isChanged = changedFields.has(key);
            return (
              <div
                key={key}
                style={{
                  border: isChanged ? '1px solid rgba(255, 152, 0, 0.5)' : '1px solid transparent',
                  borderRadius: 6,
                  background: isChanged ? 'rgba(255, 152, 0, 0.06)' : undefined,
                  padding: '4px 6px',
                  transition: 'border-color 0.2s, background 0.2s',
                }}
              >
                <span
                  className="char-field-label"
                  style={{ display: 'block', marginBottom: 3, cursor: 'pointer', userSelect: 'none', minWidth: 0 }}
                  onClick={() => toggleHighlight(key)}
                  title={isChanged ? 'Click to un-highlight' : 'Click to highlight as changed'}
                >
                  {isChanged && <span style={{ color: '#ff9800', marginRight: 3 }}>●</span>}
                  {label}
                </span>
                <input
                  className="char-input nodrag"
                  value={identity[key]}
                  onChange={(e) => setField(key, e.target.value)}
                  placeholder={`Enter ${label.toLowerCase()}...`}
                  style={{
                    width: '100%',
                    fontSize: 11,
                    borderColor: isChanged ? 'rgba(255, 152, 0, 0.35)' : undefined,
                  }}
                />
              </div>
            );
          })}

          <div className="char-btn-row" style={{ display: 'flex', gap: 4 }}>
            <button className="char-btn nodrag" onClick={handleRandomize} style={{ flex: 1 }}>
              Randomize
            </button>
            {changedCount > 0 && (
              <button
                className="char-btn nodrag"
                onClick={clearHighlights}
                style={{ fontSize: 10, padding: '4px 8px', color: '#ff9800', borderColor: 'rgba(255,152,0,0.3)' }}
                title="Clear all change highlights"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      <Handle type="target" position={Position.Left} id="input" className="char-handle" style={{ top: '50%' }} />
      <Handle type="source" position={Position.Right} id="identity-out" className="char-handle" style={{ top: '50%' }} />
    </div>
  );
}

export default memo(PropIdentityNodeInner);
