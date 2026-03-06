"use client";

import { memo, useCallback, useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import {
  EXTRACT_ATTRIBUTES_PROMPT,
  ATTRIBUTE_GROUPS,
} from '@/lib/ideation/engine/conceptlab/characterPrompts';
import { generateText, type GeneratedImage } from '@/lib/ideation/engine/conceptlab/imageGenApi';
import './CharacterNodes.css';

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

function findUpstreamImage(
  nodeId: string,
  getNode: ReturnType<typeof useReactFlow>['getNode'],
  getEdges: ReturnType<typeof useReactFlow>['getEdges'],
): GeneratedImage | null {
  const edges = getEdges();
  const incoming = edges.filter((e) => e.target === nodeId);
  for (const e of incoming) {
    const src = getNode(e.source);
    if (!src?.data) continue;
    const d = src.data as Record<string, unknown>;
    const img = d.generatedImage as GeneratedImage | undefined;
    if (img?.base64) return img;
    const b64 = d.imageBase64 as string | undefined;
    if (b64) return { base64: b64, mimeType: (d.mimeType as string) || 'image/png' };
  }
  return null;
}

function ExtractAttributesNodeInner({ id, data, selected }: Props) {
  const { setNodes, getNode, getEdges } = useReactFlow();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultText, setResultText] = useState((data?.resultText as string) ?? '');

  const pushToDownstream = useCallback(
    (json: Record<string, string>) => {
      const edges = getEdges();
      const outgoing = edges.filter((e) => e.source === id);

      setNodes((nds) =>
        nds.map((n) => {
          const outEdge = outgoing.find((e) => e.target === n.id);
          if (!outEdge) return n;

          const nd = n.data as Record<string, unknown>;
          const updates: Record<string, unknown> = {};

          if (n.type === 'charIdentity') {
            updates.identity = {
              age: json.age ?? '',
              race: json.race ?? '',
              gender: json.gender ?? '',
              build: json.build ?? '',
            };
          } else if (n.type === 'charDescription') {
            const descParts: string[] = [];
            if (json.age) descParts.push(json.age);
            if (json.race) descParts.push(json.race);
            if (json.gender) descParts.push(json.gender);
            if (json.build) descParts.push(`${json.build} build`);
            updates.description = descParts.join(', ');
          } else if (n.type === 'charAttributes') {
            const attrs: Record<string, string> = {};
            for (const g of ATTRIBUTE_GROUPS) {
              if (json[g.key]) attrs[g.key] = json[g.key];
            }
            updates.attributes = { ...(nd.attributes as Record<string, string> ?? {}), ...attrs };
          }

          if (Object.keys(updates).length === 0) return n;
          return { ...n, data: { ...nd, ...updates } };
        }),
      );
    },
    [id, getEdges, setNodes],
  );

  const handleExtract = useCallback(async () => {
    const img = findUpstreamImage(id, getNode, getEdges);
    if (!img) {
      setError('Connect an image source (ImageReference or generated image) first.');
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      const text = await generateText(EXTRACT_ATTRIBUTES_PROMPT, img);
      setResultText(text);
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, resultText: text } } : n)),
      );
      const json = JSON.parse(text.replace(/```json?\n?/g, '').replace(/```/g, '').trim());
      pushToDownstream(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  }, [id, getNode, getEdges, setNodes, pushToDownstream]);

  return (
    <div className={`char-node ${selected ? 'selected' : ''}`}>
      <div className="char-node-header" style={{ background: '#ffab40' }}>
        Extract Attributes
      </div>
      <div className="char-node-body">
        <button className="char-btn primary nodrag" onClick={handleExtract} disabled={generating}>
          {generating ? 'Extracting...' : 'Extract Attributes'}
        </button>
        {generating && <div className="char-progress">Analyzing image...</div>}
        {error && <div className="char-error">{error}</div>}
        {resultText && (
          <div className="char-scroll-area nodrag nowheel" style={{ maxHeight: 200 }}>
            <pre style={{ fontSize: 10, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', margin: 0 }}>
              {resultText.slice(0, 1000)}
            </pre>
          </div>
        )}
      </div>

      <Handle type="target" position={Position.Left} id="image-in" className="char-handle" style={{ top: '50%' }} />
      <Handle type="source" position={Position.Right} id="output" className="char-handle" style={{ top: '50%' }} />
    </div>
  );
}

export default memo(ExtractAttributesNodeInner);
