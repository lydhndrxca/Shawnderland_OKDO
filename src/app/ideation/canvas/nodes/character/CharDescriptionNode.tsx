"use client";

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import './CharacterNodes.css';

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

function CharDescriptionNodeInner({ id, data, selected }: Props) {
  const { setNodes } = useReactFlow();
  const [description, setDescription] = useState((data?.description as string) ?? '');
  const localEdit = useRef(false);

  useEffect(() => {
    const external = (data?.description as string) ?? '';
    if (!localEdit.current && external !== description) {
      setDescription(external);
    }
    localEdit.current = false;
  }, [data?.description]);

  const persist = useCallback(
    (updates: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...updates } } : n)),
      );
    },
    [id, setNodes],
  );

  return (
    <div className={`char-node ${selected ? 'selected' : ''}`}>
      <div className="char-node-header" style={{ background: '#5c6bc0' }}>
        Character Description
      </div>
      <div className="char-node-body">
        <textarea
          className="char-textarea nodrag nowheel"
          value={description}
          onChange={(e) => {
            const v = e.target.value;
            localEdit.current = true;
            setDescription(v);
            persist({ description: v });
          }}
          placeholder="Describe your character concept — appearance, personality, context..."
          rows={5}
        />
      </div>

      <Handle type="target" position={Position.Left} id="desc-in" className="char-handle" style={{ top: '50%' }} />
      <Handle type="source" position={Position.Right} id="desc-out" className="char-handle" style={{ top: '50%' }} />
    </div>
  );
}

export default memo(CharDescriptionNodeInner);
