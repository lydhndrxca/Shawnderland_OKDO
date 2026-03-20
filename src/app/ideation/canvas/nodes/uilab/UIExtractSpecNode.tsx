"use client";

import { memo, useCallback, useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { EXTRACT_ICON_SPEC_PROMPT } from '@/lib/ideation/engine/conceptlab/uiPrompts';
import {
  generateText,
  type GeneratedImage,
  type TextModelId,
} from '@/lib/ideation/engine/conceptlab/imageGenApi';
import TextModelSelector from '@/components/TextModelSelector';
import '../character/CharacterNodes.css';
import './UILabNodes.css';

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
    const edited = d.editedImage as GeneratedImage | undefined;
    if (edited?.base64) return edited;
    const bulk = d._bulkImages as GeneratedImage[] | undefined;
    if (bulk && bulk.length > 0 && bulk[0].base64) return bulk[0];
    const b64 = d.imageBase64 as string | undefined;
    if (b64) return { base64: b64, mimeType: (d.mimeType as string) || 'image/png' };
  }
  return null;
}

function UIExtractSpecNodeInner({ id, data, selected }: Props) {
  const { setNodes, getNode, getEdges } = useReactFlow();
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultJson, setResultJson] = useState<string>((data?.resultJson as string) ?? '');
  const [textModel, setTextModel] = useState<TextModelId>((data?.textModel as TextModelId) ?? 'fast');

  const pushSpecToConfig = useCallback(
    (spec: Record<string, unknown>) => {
      const edges = getEdges();
      const outgoing = edges.filter((e) => e.source === id);
      setNodes((nds) =>
        nds.map((n) => {
          const outEdge = outgoing.find((e) => e.target === n.id);
          if (!outEdge) return n;
          if (n.type === 'uiConfig') {
            return { ...n, data: { ...n.data, iconSpec: spec } };
          }
          return n;
        }),
      );
    },
    [id, getEdges, setNodes],
  );

  const handleExtract = useCallback(async () => {
    const img = findUpstreamImage(id, getNode, getEdges);
    if (!img) { setError('Connect an image source first.'); return; }
    setExtracting(true);
    setError(null);
    try {
      const raw = await generateText(EXTRACT_ICON_SPEC_PROMPT, img, textModel);
      const cleaned = raw.replace(/```json?\n?/g, '').replace(/```/g, '').trim();

      let spec: Record<string, unknown>;
      try {
        spec = JSON.parse(cleaned);
      } catch {
        setError('Failed to parse AI response as JSON. Try again.');
        setResultJson(cleaned);
        return;
      }

      setResultJson(JSON.stringify(spec, null, 2));
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, resultJson: JSON.stringify(spec, null, 2) } } : n)),
      );
      pushSpecToConfig(spec);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setExtracting(false);
    }
  }, [id, getNode, getEdges, textModel, setNodes, pushSpecToConfig]);

  return (
    <div className={`char-node ${selected ? 'selected' : ''}`}>
      <div className="char-node-header" style={{ background: '#ff6f00', gap: 6 }}>
        <span>Extract Icon Spec</span>
        <TextModelSelector
          value={textModel}
          onChange={(m) => { setTextModel(m); setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, textModel: m } } : n)); }}
          disabled={extracting}
        />
      </div>
      <div className="char-node-body">
        <button
          className="char-btn primary nodrag"
          onClick={handleExtract}
          disabled={extracting}
          style={{ width: '100%' }}
        >
          {extracting ? 'Extracting\u2026' : 'Extract Icon Spec'}
        </button>
        {error && <div className="char-error">{error}</div>}
        {resultJson && (
          <div className="char-scroll-area nodrag nowheel" style={{ maxHeight: 220 }}>
            <pre style={{ fontSize: 9, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', margin: 0 }}>
              {resultJson}
            </pre>
          </div>
        )}
      </div>

      <Handle type="target" position={Position.Left} id="image-in" className="char-handle" style={{ top: '50%' }} />
      <Handle type="source" position={Position.Right} id="spec-out" className="char-handle" style={{ top: '50%' }} />
    </div>
  );
}

export default memo(UIExtractSpecNodeInner);
