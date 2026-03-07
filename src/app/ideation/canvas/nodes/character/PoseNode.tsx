"use client";

import { memo, useCallback, useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import './CharacterNodes.css';

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

const CUSTOM_VALUE = '__custom__';

const POSE_COMMON = [
  'Pose — relaxed A-stance, hands at sides',
  'Pose — hands on hips, grounded',
  'Pose — one hand pocket, casual',
  'Pose — slight contrapposto',
  'Pose — feet shoulder width, neutral',
  'Pose — arms crossed, relaxed',
  'Pose — thumbs hooked on belt',
  'Pose — light step forward',
  'Pose — squared to camera',
  'Pose — head tilt, attentive',
];

const POSE_RARE = [
  'Pose — checking watch, subtle',
  'Pose — adjusting cuff',
  'Pose — lifting hood slightly',
  'Pose — slinging pack on',
  'Pose — leaning on foot, ready',
  'Pose — securing strap',
  'Pose — scanning horizon',
  'Pose — rolling sleeve',
  'Pose — kneeling to check boot',
  'Pose — pinching bridge of nose',
];

function PoseNodeInner({ id, data, selected }: Props) {
  const { setNodes } = useReactFlow();
  const [pose, setPose] = useState((data?.pose as string) ?? '');
  const [customText, setCustomText] = useState('');
  const [showDropdown, setShowDropdown] = useState(true);

  const persist = useCallback(
    (val: string) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, pose: val } } : n)),
      );
    },
    [id, setNodes],
  );

  const allOpts = [...POSE_COMMON, ...POSE_RARE];
  const isCustom = pose !== '' && !allOpts.includes(pose);

  const randomize = useCallback(() => {
    const pool = [...POSE_COMMON, ...POSE_RARE];
    const val = pool[Math.floor(Math.random() * pool.length)];
    setPose(val);
    persist(val);
  }, [persist]);

  return (
    <div className={`char-node ${selected ? 'selected' : ''}`}>
      <div className="char-node-header" style={{ background: '#8e24aa' }}>
        Pose
      </div>
      <div className="char-node-body">
        {isCustom && !showDropdown ? (
          <div className="char-attr-row">
            <input
              className="char-input nodrag"
              value={customText || pose}
              onChange={(e) => {
                setCustomText(e.target.value);
                setPose(e.target.value);
                persist(e.target.value);
              }}
              placeholder="Custom pose description..."
            />
            <button
              className="char-btn-sm nodrag"
              onClick={() => setShowDropdown(true)}
              title="Switch to preset dropdown"
            >
              &#9662;
            </button>
          </div>
        ) : (
          <select
            className="char-select nodrag"
            value={isCustom ? CUSTOM_VALUE : pose}
            onChange={(e) => {
              if (e.target.value === CUSTOM_VALUE) {
                setShowDropdown(false);
                setCustomText('');
                return;
              }
              setPose(e.target.value);
              persist(e.target.value);
            }}
          >
            <option value="">— Select Pose —</option>
            <optgroup label="Common">
              {POSE_COMMON.map((o) => <option key={o} value={o}>{o}</option>)}
            </optgroup>
            <optgroup label="Rare">
              {POSE_RARE.map((o) => <option key={o} value={o}>{o}</option>)}
            </optgroup>
            <option value={CUSTOM_VALUE}>Custom...</option>
          </select>
        )}
        <button className="char-btn nodrag" onClick={randomize}>Random Pose</button>
      </div>

      <Handle type="target" position={Position.Left} id="input" className="char-handle" style={{ top: '50%' }} />
      <Handle type="source" position={Position.Right} id="output" className="char-handle" style={{ top: '50%' }} />
    </div>
  );
}

export default memo(PoseNodeInner);
