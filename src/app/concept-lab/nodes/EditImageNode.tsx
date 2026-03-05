"use client";

import { memo, useState, useCallback } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { generateWithGeminiRef, type GeneratedImage } from '@/lib/ideation/engine/conceptlab/imageGenApi';
import { ImageContextMenu } from '@/components/ImageContextMenu';
import './ConceptLabNodes.css';

interface EditImageNodeProps {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

const EDIT_PROMPT_PREFIX = `VISUAL EDIT TASK:
Preserve 100% of the existing design, only apply the following modification:
`;

const EDIT_PROMPT_SUFFIX = `
Apply ONLY the above modification. Do NOT change anything else.
Background: Solid flat grey (#D3D3D3). No floor, no shadows, no environment.`;

function getSourceImage(
  nodeId: string,
  getNode: (id: string) => { data?: Record<string, unknown> } | undefined,
  getEdges: () => { source: string; target: string; targetHandle?: string | null }[],
): GeneratedImage | null {
  const edges = getEdges();
  const edge = edges.find((e) => e.target === nodeId && e.targetHandle === 'image-in');
  if (!edge) return null;
  const src = getNode(edge.source);
  if (!src?.data) return null;
  const img = src.data.generatedImage as GeneratedImage | undefined;
  if (img?.base64) return img;
  const b64 = src.data.imageBase64 as string | undefined;
  if (b64) return { base64: b64, mimeType: (src.data.mimeType as string) || 'image/png' };
  return null;
}

function EditImageNodeInner({ id, data, selected }: EditImageNodeProps) {
  const { getNode, getEdges, setNodes } = useReactFlow();
  const [editText, setEditText] = useState((data?.editText as string) ?? '');
  const [resultImage, setResultImage] = useState<GeneratedImage | null>(
    (data?.generatedImage as GeneratedImage) ?? null,
  );
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sourceImage = getSourceImage(id, getNode, getEdges);

  const handleApply = useCallback(async () => {
    if (!sourceImage || !editText.trim()) return;
    setGenerating(true);
    setError(null);
    try {
      const prompt = EDIT_PROMPT_PREFIX + editText.trim() + EDIT_PROMPT_SUFFIX;
      const results = await generateWithGeminiRef(prompt, sourceImage);
      const img = results[0];
      if (img) {
        setResultImage(img);
        setNodes((nds) =>
          nds.map((n) =>
            n.id === id ? { ...n, data: { ...n.data, generatedImage: img, editText } } : n,
          ),
        );
      } else {
        setError('No image returned');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  }, [sourceImage, editText, id, setNodes]);

  return (
    <div className={`cl-node ${selected ? 'selected' : ''}`}>
      <div className="cl-node-header" style={{ background: '#29b6f6' }}>
        Edit / Refine
      </div>
      <div className="cl-node-body">
        <textarea
          className="cl-textarea nodrag nowheel"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          placeholder="Describe changes to apply..."
          rows={4}
        />
        <button
          className="cl-btn primary nodrag"
          onClick={handleApply}
          disabled={generating || !sourceImage || !editText.trim()}
        >
          {generating ? 'Applying...' : 'Apply Changes'}
        </button>
        {generating && <div className="cl-progress">Editing image...</div>}
        {error && <div className="cl-error">{error}</div>}
        {resultImage && (
          <ImageContextMenu image={resultImage} alt="edited">
            <img
              src={`data:${resultImage.mimeType};base64,${resultImage.base64}`}
              alt="Edited result"
              className="cl-preview"
            />
          </ImageContextMenu>
        )}
      </div>

      <Handle type="target" position={Position.Left} id="image-in" className="cl-handle" style={{ top: '40%' }} />
      <Handle type="source" position={Position.Right} id="image-out" className="cl-handle" style={{ top: '50%' }} />
    </div>
  );
}

export default memo(EditImageNodeInner);
