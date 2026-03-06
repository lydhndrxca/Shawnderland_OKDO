"use client";

import { memo, useCallback, useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import {
  AGE_OPTIONS,
  RACE_OPTIONS,
  GENDER_OPTIONS,
  BUILD_OPTIONS,
} from '@/lib/ideation/engine/conceptlab/characterPrompts';
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

  const [name, setName] = useState((data?.name as string) ?? '');
  const [identity, setIdentity] = useState<Identity>({
    age: (data?.identity as Identity)?.age ?? '',
    race: (data?.identity as Identity)?.race ?? '',
    gender: (data?.identity as Identity)?.gender ?? '',
    build: (data?.identity as Identity)?.build ?? '',
  });

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
      const next = { ...identity, [key]: val };
      setIdentity(next);
      persist({ identity: next });
    },
    [identity, persist],
  );

  const handleRandomize = useCallback(() => {
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
    <div className={`char-node ${selected ? 'selected' : ''}`}>
      <div className="char-node-header" style={{ background: '#7c4dff' }}>
        Character Identity
      </div>
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

      <Handle type="target" position={Position.Left} id="input" className="char-handle" style={{ top: '50%' }} />
      <Handle type="source" position={Position.Right} id="identity-out" className="char-handle" style={{ top: '50%' }} />
    </div>
  );
}

export default memo(CharIdentityNodeInner);
