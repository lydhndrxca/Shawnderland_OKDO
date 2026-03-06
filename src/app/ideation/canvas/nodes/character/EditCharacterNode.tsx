"use client";

import { memo, useState, useCallback } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { generateWithGeminiRef, type GeneratedImage } from '@/lib/ideation/engine/conceptlab/imageGenApi';
import { ImageContextMenu } from '@/components/ImageContextMenu';
import './CharacterNodes.css';

interface Props {
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

function EditCharacterNodeInner({ id, data, selected }: Props) {
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
    <div className={`char-node ${selected ? 'selected' : ''}`}>
      <div className="char-node-header" style={{ background: '#29b6f6' }}>
        Edit Character
      </div>
      <div className="char-node-body">
        <textarea
          className="char-textarea nodrag nowheel"
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          placeholder="Describe changes to apply..."
          rows={4}
        />
        <button
          className="char-btn primary nodrag"
          onClick={handleApply}
          disabled={generating || !sourceImage || !editText.trim()}
        >
          {generating ? 'Applying...' : 'Apply Changes'}
        </button>
        {generating && <div className="char-progress">Editing image...</div>}
        {error && <div className="char-error">{error}</div>}
        {resultImage && (
          <ImageContextMenu image={resultImage} alt="edited">
            <img
              src={`data:${resultImage.mimeType};base64,${resultImage.base64}`}
              alt="Edited result"
              className="char-preview"
            />
          </ImageContextMenu>
        )}
      </div>

      <Handle type="target" position={Position.Left} id="image-in" className="char-handle" style={{ top: '40%' }} />
      <Handle type="source" position={Position.Right} id="image-out" className="char-handle" style={{ top: '50%' }} />
    </div>
  );
}

export default memo(EditCharacterNodeInner);
