"use client";

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import {
  AGE_OPTIONS,
  RACE_OPTIONS,
  GENDER_OPTIONS,
  BUILD_OPTIONS,
} from '@/lib/ideation/engine/conceptlab/characterPrompts';
import { NODE_TOOLTIPS } from './nodeTooltips';
import './CharacterNodes.css';

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

interface Identity {
  age: string;
  race: string;
  gender: string;
  build: string;
}

function CharIdentityNodeInner({ id, data, selected }: Props) {
  const { setNodes } = useReactFlow();
  const [minimized, setMinimized] = useState(false);

  const [name, setName] = useState((data?.name as string) ?? '');
  const [identity, setIdentity] = useState<Identity>({
    age: (data?.identity as Identity)?.age ?? '',
    race: (data?.identity as Identity)?.race ?? '',
    gender: (data?.identity as Identity)?.gender ?? '',
    build: (data?.identity as Identity)?.build ?? '',
  });
  const localEdit = useRef(false);

  useEffect(() => {
    if (localEdit.current) { localEdit.current = false; return; }
    const ext = data?.identity as Identity | undefined;
    if (!ext) return;
    setIdentity((prev) => {
      if (prev.age === (ext.age ?? '') && prev.race === (ext.race ?? '') &&
          prev.gender === (ext.gender ?? '') && prev.build === (ext.build ?? '')) return prev;
      return { age: ext.age ?? '', race: ext.race ?? '', gender: ext.gender ?? '', build: ext.build ?? '' };
    });
  }, [data?.identity]);

  const persist = useCallback(
    (updates: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...updates } } : n)),
      );
    },
    [id, setNodes],
  );

  const setField = useCallback(
    (key: keyof Identity, val: string) => {
      localEdit.current = true;
      const next = { ...identity, [key]: val };
      setIdentity(next);
      persist({ identity: next });
    },
    [identity, persist],
  );

  const handleRandomize = useCallback(() => {
    localEdit.current = true;
    const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
    const next: Identity = {
      age: pick(AGE_OPTIONS),
      race: pick(RACE_OPTIONS),
      gender: pick(GENDER_OPTIONS),
      build: pick(BUILD_OPTIONS),
    };
    setIdentity(next);
    persist({ identity: next });
  }, [persist]);

  return (
    <div className={`char-node ${selected ? 'selected' : ''}`} title={NODE_TOOLTIPS.charIdentity}>
      <div className="char-node-header" style={{ background: '#7c4dff', cursor: 'pointer' }} onClick={() => setMinimized((m) => !m)}>
        Character Identity
        <span style={{ marginLeft: 'auto', fontSize: 10, opacity: 0.7 }}>
          {minimized ? '\u25BC' : '\u25B2'}
        </span>
      </div>
      {minimized && (
        <div className="char-node-body" style={{ padding: '4px 10px' }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            {[identity.age, identity.race, identity.gender, identity.build].filter(Boolean).join(' · ') || 'Not set'}
          </span>
        </div>
      )}
      {!minimized && (
        <div className="char-node-body">
          <div className="char-field">
            <span className="char-field-label">Name</span>
            <input
              className="char-input nodrag"
              value={name}
              onChange={(e) => { setName(e.target.value); persist({ name: e.target.value }); }}
              placeholder="Character name..."
            />
          </div>

          {([
            ['age', 'Age', AGE_OPTIONS],
            ['race', 'Race', RACE_OPTIONS],
            ['gender', 'Gender', GENDER_OPTIONS],
            ['build', 'Build', BUILD_OPTIONS],
          ] as [keyof Identity, string, string[]][]).map(([key, label, options]) => (
            <div className="char-field" key={key}>
              <span className="char-field-label">{label}</span>
              <select
                className="char-select nodrag"
                value={identity[key]}
                onChange={(e) => setField(key, e.target.value)}
              >
                <option value="">—</option>
                {options.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
          ))}

          <div className="char-btn-row">
            <button className="char-btn nodrag" onClick={handleRandomize}>
              Randomize
            </button>
          </div>
        </div>
      )}

      <Handle type="target" position={Position.Left} id="input" className="char-handle" style={{ top: '50%' }} />
      <Handle type="source" position={Position.Right} id="identity-out" className="char-handle" style={{ top: '50%' }} />
    </div>
  );
}

export default memo(CharIdentityNodeInner);
