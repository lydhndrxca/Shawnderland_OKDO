"use client";

import { memo, useCallback, useState, useRef, useEffect } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { NODE_TOOLTIPS } from './nodeTooltips';
import './CharacterNodes.css';

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

function ResetCharacterNodeInner({ id, data, selected }: Props) {
  const { setNodes, getEdges } = useReactFlow();
  const [done, setDone] = useState(false);
  const doneTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(doneTimerRef.current), []);

  const handleReset = useCallback(() => {
    const edges = getEdges();
    const connected = new Set<string>();
    const outgoing = edges.filter((e) => e.source === id);
    for (const e of outgoing) connected.add(e.target);
    const incoming = edges.filter((e) => e.target === id);
    for (const e of incoming) connected.add(e.source);

    setNodes((nds) =>
      nds.map((n) => {
        if (!connected.has(n.id)) return n;
        const d = n.data as Record<string, unknown>;
        const cleared: Record<string, unknown> = {};

        if (n.type === 'charIdentity') {
          cleared.name = '';
          cleared.identity = { age: '', race: '', gender: '', build: '' };
        }
        if (n.type === 'charDescription') {
          cleared.description = '';
        }
        if (n.type === 'charAttributes') {
          cleared.attributes = {};
        }
        if (n.type === 'charGenerate') {
          cleared.generatedImage = undefined;
          cleared.characterDescription = undefined;
        }
        if (n.type === 'charGenViews') {
          cleared.viewImages = {};
        }
        if (n.type === 'charViewer') {
          cleared.tabImages = {};
        }
        if (n.type === 'charHistory') {
          cleared.historyEntries = [];
        }
        if (n.type === 'charEdit') {
          cleared.editText = '';
          cleared.generatedImage = undefined;
        }

        if (Object.keys(cleared).length === 0) return n;
        return { ...n, data: { ...d, ...cleared } };
      }),
    );
    setDone(true);
    clearTimeout(doneTimerRef.current);
    doneTimerRef.current = setTimeout(() => setDone(false), 2000);
  }, [id, getEdges, setNodes]);

  return (
    <div className={`char-node ${selected ? 'selected' : ''}`} title={NODE_TOOLTIPS.charReset}>
      <div className="char-node-header" style={{ background: '#ef5350' }}>
        Reset Character
      </div>
      <div className="char-node-body">
        <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
          Clears identity, description, attributes, and generated images from all connected character nodes.
        </p>
        <button className="char-btn destructive nodrag" onClick={handleReset}>
          Reset Character
        </button>
        {done && <div style={{ fontSize: 10, color: '#69f0ae' }}>Reset complete</div>}
      </div>

      <Handle type="target" position={Position.Left} id="input" className="char-handle" style={{ top: '50%' }} />
      <Handle type="source" position={Position.Right} id="output" className="char-handle" style={{ top: '50%' }} />
    </div>
  );
}

export default memo(ResetCharacterNodeInner);
