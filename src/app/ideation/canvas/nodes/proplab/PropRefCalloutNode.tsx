"use client";

import { memo, useCallback, useState, useEffect } from 'react';
import { Handle, Position, useReactFlow, useStore } from '@xyflow/react';
import type { GeneratedImage } from '@/lib/ideation/engine/conceptlab/imageGenApi';
import '../character/CharacterNodes.css';
import './PropLabNodes.css';

const REF_TYPES = new Set(['charRefCallout', 'propRefCallout']);
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

function PropRefCalloutNodeInner({ id, data, selected }: Props) {
  const { setNodes, getNode, getEdges } = useReactFlow();
  const [calloutText, setCalloutText] = useState((data?.calloutText as string) ?? '');

  useEffect(() => {
    const external = (data?.calloutText as string) ?? '';
    if (external !== calloutText) setCalloutText(external);
  }, [data?.calloutText]); // eslint-disable-line react-hooks/exhaustive-deps

  const refLetter = useStore((state) => {
    const refNodes = state.nodes
      .filter((n) => REF_TYPES.has(n.type ?? ''))
      .sort((a, b) => {
        if (a.position.y !== b.position.y) return a.position.y - b.position.y;
        return a.position.x - b.position.x;
      });
    const idx = refNodes.findIndex((n) => n.id === id);
    return idx >= 0 ? LETTERS[idx % LETTERS.length] : 'A';
  });

  useEffect(() => {
    if (data?.refLetter !== refLetter) {
      setNodes((nds) =>
        nds.map((n) => n.id === id ? { ...n, data: { ...n.data, refLetter } } : n),
      );
    }
  }, [refLetter, id, data?.refLetter, setNodes]);

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
        Prop Reference Callout {refLetter}
      </div>
      <div className="char-node-body">
        <p style={{ fontSize: 10, color: 'var(--text-muted)', margin: 0 }}>
          Describe what to reference from the connected image for prop generation.
        </p>
        <textarea
          className="char-textarea nodrag nowheel"
          value={calloutText}
          onChange={(e) => {
            const v = e.target.value;
            setCalloutText(v);
            persist({ calloutText: v });
          }}
          placeholder="e.g., Use the handle design from this reference, match the weathering pattern..."
          rows={3}
        />
        {hasImage && <div style={{ fontSize: 10, color: '#69f0ae' }}>Image connected</div>}
        {!hasImage && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>No image connected</div>}
      </div>

      <Handle type="target" position={Position.Left} id="image-in" className="char-handle" style={{ top: '50%' }} />
      <Handle type="source" position={Position.Right} id="output" className="char-handle" style={{ top: '50%' }} />
    </div>
  );
}

export default memo(PropRefCalloutNodeInner);
