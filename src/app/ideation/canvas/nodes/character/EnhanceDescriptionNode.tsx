"use client";

import { memo, useCallback, useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { generateText, type TextModelId } from '@/lib/ideation/engine/conceptlab/imageGenApi';
import TextModelSelector from '@/components/TextModelSelector';
import { NODE_TOOLTIPS } from './nodeTooltips';
import './CharacterNodes.css';

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

function EnhanceDescriptionNodeInner({ id, data, selected }: Props) {
  const { setNodes, getNode, getEdges } = useReactFlow();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [textModel, setTextModel] = useState<TextModelId>((data?.textModel as TextModelId) ?? 'fast');

  const handleEnhance = useCallback(async () => {
    const edges = getEdges();
    const outgoing = edges.filter((e) => e.source === id);

    let targetNodeId: string | null = null;
    let description = '';

    for (const e of outgoing) {
      const tgt = getNode(e.target);
      if (!tgt?.data) continue;
      const d = tgt.data as Record<string, unknown>;
      if (typeof d.description === 'string' && d.description.trim()) {
        targetNodeId = tgt.id;
        description = d.description;
        break;
      }
    }

    if (!targetNodeId || !description.trim()) {
      setError('Connect the output to a description node that has text in it.');
      return;
    }

    setGenerating(true);
    setError(null);
    try {
      const prompt = `Enhance and expand this character description for image generation. Keep the same tone and style. Make it more vivid and detailed while preserving all original elements. Return ONLY the enhanced description, no preamble:\n\n${description}`;
      const enhanced = await generateText(prompt, undefined, textModel);
      const v = enhanced.trim();

      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === targetNodeId) {
            return { ...n, data: { ...n.data, description: v } };
          }
          if (n.id === id) {
            return { ...n, data: { ...n.data, lastEnhanced: v } };
          }
          return n;
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  }, [id, getNode, getEdges, setNodes, textModel]);

  return (
    <div className={`char-node ${selected ? 'selected' : ''}`} title={NODE_TOOLTIPS.charEnhanceDesc}>
      <div className="char-node-header" style={{ background: '#66bb6a', gap: 6 }}>
        <span>Enhance Description</span>
        <TextModelSelector value={textModel} onChange={(m) => { setTextModel(m); setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, textModel: m } } : n)); }} disabled={generating} />
      </div>
      <div className="char-node-body">
        <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
          Connect the output to a description node. Click Enhance to read its text, improve it with AI, and write the result back.
        </p>
        <button className="char-btn primary nodrag" onClick={handleEnhance} disabled={generating}>
          {generating ? 'Enhancing...' : 'Enhance'}
        </button>
        {generating && <div className="char-progress">Enhancing text...</div>}
        {error && <div className="char-error">{error}</div>}
        {(data?.lastEnhanced as string) && (
          <div style={{ fontSize: 10, color: '#69f0ae' }}>
            Enhanced successfully
          </div>
        )}
      </div>

      <Handle type="target" position={Position.Left} id="input" className="char-handle" style={{ top: '50%' }} />
      <Handle type="source" position={Position.Right} id="output" className="char-handle" style={{ top: '50%' }} />
    </div>
  );
}

export default memo(EnhanceDescriptionNodeInner);
