"use client";

import { memo, useCallback } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { NODE_TOOLTIPS } from './nodeTooltips';
import type { GeneratedImage } from '@/lib/ideation/engine/conceptlab/imageGenApi';
import { requestOpenEditor } from '../../geminiEditorBridge';
import './CharacterNodes.css';

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

function GeminiEditorNodeInner({ id, data, selected }: Props) {
  const { getNode, getEdges } = useReactFlow();

  const activeImage = (() => {
    const edges = getEdges();
    for (const e of edges) {
      const peerId = e.target === id ? e.source : e.source === id ? e.target : null;
      if (!peerId) continue;
      const peer = getNode(peerId);
      if (!peer?.data) continue;
      const d = peer.data as Record<string, unknown>;
      const img = d.generatedImage as GeneratedImage | undefined;
      if (img?.base64) return img;
    }
    return null;
  })();

  const openEditor = useCallback(() => {
    requestOpenEditor(id);
  }, [id]);

  return (
    <div
      className={`char-node ${selected ? 'selected' : ''}`}
      style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}
      title={NODE_TOOLTIPS.imageStudio}
    >
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />

      <div className="char-node-header" style={{ background: '#00bcd4' }}>
        Image Studio
      </div>

      <div className="char-node-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 8 }}>
        {activeImage ? (
          <img
            src={`data:${activeImage.mimeType};base64,${activeImage.base64}`}
            alt="Editor preview"
            style={{ width: '100%', maxHeight: 140, objectFit: 'contain', borderRadius: 4, background: '#1a1a2e' }}
          />
        ) : (
          <div style={{ fontSize: 11, color: '#888', textAlign: 'center', padding: '16px 8px' }}>
            Connect image nodes to edit
          </div>
        )}

        <button
          type="button"
          className="char-btn nodrag nopan"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            openEditor();
          }}
          style={{
            width: '100%',
            padding: '8px 0',
            fontSize: 12,
            fontWeight: 700,
            background: '#00bcd4',
            color: '#000',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          Open Editor
        </button>
      </div>
    </div>
  );
}

const GeminiEditorNode = memo(GeminiEditorNodeInner);
export default GeminiEditorNode;
