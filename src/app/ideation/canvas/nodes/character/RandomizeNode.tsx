"use client";

import { memo, useCallback, useState, useRef, useEffect } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import {
  ATTRIBUTE_GROUPS,
  AGE_OPTIONS,
  RACE_OPTIONS,
  GENDER_OPTIONS,
  BUILD_OPTIONS,
  POSE_COMMON,
  POSE_RARE,
  type CharacterAttributes,
  type CharacterIdentity,
} from '@/lib/ideation/engine/conceptlab/characterPrompts';
import { NODE_TOOLTIPS } from './nodeTooltips';
import './CharacterNodes.css';

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function RandomizeNodeInner({ id, data, selected }: Props) {
  const { setNodes, getEdges, getNode } = useReactFlow();
  const [status, setStatus] = useState('');
  const statusTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(statusTimerRef.current), []);

  const handleRandomize = useCallback(() => {
    const edges = getEdges();
    const outgoing = edges.filter((e) => e.source === id);
    let affected = 0;

    setNodes((nds) =>
      nds.map((n) => {
        const edge = outgoing.find((e) => e.target === n.id);
        if (!edge) return n;

        const nd = n.data as Record<string, unknown>;
        const lockedAttrs = (nd.lockedAttrs as Record<string, boolean>) ?? {};
        const updates: Record<string, unknown> = {};

        if (n.type === 'charIdentity') {
          const identity = (nd.identity as CharacterIdentity) ?? {};
          updates.identity = {
            age: lockedAttrs.age ? identity.age : pickRandom(AGE_OPTIONS),
            race: lockedAttrs.race ? identity.race : pickRandom(RACE_OPTIONS),
            gender: lockedAttrs.gender ? identity.gender : pickRandom(GENDER_OPTIONS),
            build: lockedAttrs.build ? identity.build : pickRandom(BUILD_OPTIONS),
          };
          affected++;
        } else if (n.type === 'charAttributes') {
          const attrs: CharacterAttributes = {};
          const current = (nd.attributes as CharacterAttributes) ?? {};
          for (const g of ATTRIBUTE_GROUPS) {
            if (lockedAttrs[g.key]) {
              attrs[g.key] = current[g.key] ?? '';
            } else {
              const pool = Math.random() < 0.7 ? g.common : g.rare;
              attrs[g.key] = pickRandom(pool);
            }
          }
          const posePool = [...POSE_COMMON, ...POSE_RARE];
          attrs.pose = lockedAttrs.pose ? (current.pose ?? posePool[0]) : pickRandom(posePool);
          updates.attributes = attrs;
          affected++;
        }

        if (Object.keys(updates).length === 0) return n;
        return { ...n, data: { ...nd, ...updates } };
      }),
    );

    setStatus(affected > 0 ? `Randomized ${affected} node(s)` : 'No compatible nodes connected');
    clearTimeout(statusTimerRef.current);
    statusTimerRef.current = setTimeout(() => setStatus(''), 2000);
  }, [id, getEdges, setNodes, getNode]);

  return (
    <div className={`char-node ${selected ? 'selected' : ''}`} title={NODE_TOOLTIPS.charRandomize}>
      <div className="char-node-header" style={{ background: '#ff5722' }}>
        Randomize
      </div>
      <div className="char-node-body" style={{ padding: '8px 14px' }}>
        <button type="button" className="char-btn primary nodrag" onClick={handleRandomize} style={{ width: '100%' }}>
          Randomize
        </button>
        {status && <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center' }}>{status}</div>}
      </div>

      <Handle type="target" position={Position.Left} id="input" className="char-handle" style={{ top: '50%' }} />
      <Handle type="source" position={Position.Right} id="output" className="char-handle" style={{ top: '50%' }} />
    </div>
  );
}

export default memo(RandomizeNodeInner);
