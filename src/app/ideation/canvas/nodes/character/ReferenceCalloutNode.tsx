"use client";

import { memo, useCallback, useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import type { GeneratedImage } from '@/lib/ideation/engine/conceptlab/imageGenApi';
import './CharacterNodes.css';

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

function ReferenceCalloutNodeInner({ id, data, selected }: Props) {
  const { setNodes, getNode, getEdges } = useReactFlow();
  const [calloutText, setCalloutText] = useState((data?.calloutText as string) ?? '');

  const persist = useCallback(
    (updates: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...updates } } : n)),
      );
    },
    [id, setNodes],
  );

  const edges = getEdges();
  const incoming = edges.filter((e) => e.target === id);
  let hasImage = false;
  for (const e of incoming) {
    const src = getNode(e.source);
    if (!src?.data) continue;
    const d = src.data as Record<string, unknown>;
    if ((d.generatedImage as GeneratedImage)?.base64 || d.imageBase64) {
      hasImage = true;
      break;
    }
  }

  return (
    <div className={`char-node ${selected ? 'selected' : ''}`}>
      <div className="char-node-header" style={{ background: '#26a69a' }}>
        Reference Callout
      </div>
      <div className="char-node-body">
        <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: 0 }}>
          Describe what to reference from the connected image. This text will be included in the generation prompt.
        </p>
        <textarea
          className="char-textarea nodrag nowheel"
          value={calloutText}
          onChange={(e) => {
            const v = e.target.value;
            setCalloutText(v);
            persist({ calloutText: v });
          }}
          placeholder="e.g., Use the jacket design from this reference, match the color palette..."
          rows={3}
        />
        {hasImage && (
          <div style={{ fontSize: 10, color: '#69f0ae' }}>Image connected</div>
        )}
        {!hasImage && (
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>No image connected</div>
        )}
      </div>

      <Handle type="target" position={Position.Left} id="image-in" className="char-handle" style={{ top: '50%' }} />
      <Handle type="source" position={Position.Right} id="output" className="char-handle" style={{ top: '50%' }} />
    </div>
  );
}

export default memo(ReferenceCalloutNodeInner);
