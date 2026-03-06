"use client";

import { memo, useCallback, useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import {
  buildCharacterDescription,
  buildCharacterViewPrompt,
  type CharacterIdentity,
  type CharacterAttributes,
} from '@/lib/ideation/engine/conceptlab/characterPrompts';
import {
  generateWithImagen4,
  type GeneratedImage,
} from '@/lib/ideation/engine/conceptlab/imageGenApi';
import { resolveNodeInfluences } from '@/lib/ideation/engine/conceptlab/resolveInfluences';
import { ImageContextMenu } from '@/components/ImageContextMenu';
import './CharacterNodes.css';

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

function gatherInputs(
  nodeId: string,
  getNode: ReturnType<typeof useReactFlow>['getNode'],
  getEdges: ReturnType<typeof useReactFlow>['getEdges'],
) {
  const edges = getEdges();
  const incoming = edges.filter((e) => e.target === nodeId);

  let identity: CharacterIdentity = { age: '', race: '', gender: '', build: '' };
  let description = '';
  let attributes: CharacterAttributes = {};
  const refImages: GeneratedImage[] = [];
  const callouts: string[] = [];

  for (const e of incoming) {
    const src = getNode(e.source);
    if (!src?.data) continue;
    const d = src.data as Record<string, unknown>;

    if (src.type === 'charIdentity' || e.targetHandle === 'identity-in') {
      const id = d.identity as CharacterIdentity | undefined;
      if (id) identity = id;
      if (d.name) description = `${d.name as string}: ${description}`;
    }

    if (src.type === 'charDescription' || e.targetHandle === 'desc-in') {
      if (d.description) description += (d.description as string);
    }

    if (src.type === 'charAttributes' || e.targetHandle === 'attrs-in') {
      if (d.attributes) attributes = { ...attributes, ...(d.attributes as CharacterAttributes) };
    }

    if (e.targetHandle === 'ref-a' || e.targetHandle === 'ref-b' || e.targetHandle === 'ref-c') {
      const img = d.generatedImage as GeneratedImage | undefined;
      if (img?.base64) refImages.push(img);
      else if (d.imageBase64) refImages.push({ base64: d.imageBase64 as string, mimeType: (d.mimeType as string) || 'image/png' });
    }

    if (src.type === 'charRefCallout') {
      if (d.calloutText) callouts.push(d.calloutText as string);
      const img = d.generatedImage as GeneratedImage | undefined;
      if (img?.base64) refImages.push(img);
      else if (d.imageBase64) refImages.push({ base64: d.imageBase64 as string, mimeType: (d.mimeType as string) || 'image/png' });
    }
  }

  return { identity, description, attributes, refImages, callouts };
}

function GenerateCharImageNodeInner({ id, data, selected }: Props) {
  const { setNodes, getNode, getEdges } = useReactFlow();
  const [images, setImages] = useState<GeneratedImage[]>(
    (data?.generatedImages as GeneratedImage[]) ?? [],
  );
  const [viewIdx, setViewIdx] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setError(null);
    try {
      const { identity, description, attributes, callouts } = gatherInputs(id, getNode, getEdges);
      const desc = buildCharacterDescription(identity, attributes, description);

      const influenceBlock = resolveNodeInfluences(
        id,
        getNode as (id: string) => { id: string; type?: string; data: Record<string, unknown> } | undefined,
        getEdges as () => { source: string; target: string }[],
      );

      let fullPrompt = buildCharacterViewPrompt('main', desc) + influenceBlock;
      if (callouts.length > 0) {
        fullPrompt += '\n\nReference image callouts:\n' + callouts.join('\n');
      }

      const result = await generateWithImagen4(fullPrompt, '9:16', 1);
      setImages(result);
      setViewIdx(0);
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id
            ? {
                ...n,
                data: {
                  ...n.data,
                  generatedImages: result,
                  generatedImage: result[0],
                  characterDescription: desc,
                },
              }
            : n,
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  }, [id, getNode, getEdges, setNodes]);

  const currentImage = images[viewIdx];

  return (
    <div className={`char-node ${selected ? 'selected' : ''}`}>
      <div className="char-node-header" style={{ background: '#e91e63' }}>
        Generate Character Image
      </div>
      <div className="char-node-body">
        <button className="char-btn primary nodrag" onClick={handleGenerate} disabled={generating}>
          {generating ? 'Generating...' : 'Generate Character Image'}
        </button>
        {generating && <div className="char-progress">Creating character...</div>}
        {error && <div className="char-error">{error}</div>}
        {currentImage && (
          <>
            <ImageContextMenu image={currentImage} alt="character">
              <img
                src={`data:${currentImage.mimeType};base64,${currentImage.base64}`}
                alt="Generated character"
                className="char-preview"
              />
            </ImageContextMenu>
            {images.length > 1 && (
              <div className="char-gallery-nav">
                <button className="nodrag" onClick={() => setViewIdx((i) => (i - 1 + images.length) % images.length)}>&lt;</button>
                <span>{viewIdx + 1}/{images.length}</span>
                <button className="nodrag" onClick={() => setViewIdx((i) => (i + 1) % images.length)}>&gt;</button>
              </div>
            )}
          </>
        )}
      </div>

      <Handle type="target" position={Position.Left} id="identity-in" className="char-handle" style={{ top: '15%' }} />
      <Handle type="target" position={Position.Left} id="desc-in" className="char-handle" style={{ top: '30%' }} />
      <Handle type="target" position={Position.Left} id="attrs-in" className="char-handle" style={{ top: '45%' }} />
      <Handle type="target" position={Position.Left} id="ref-a" className="char-handle" style={{ top: '60%' }} />
      <Handle type="target" position={Position.Left} id="ref-b" className="char-handle" style={{ top: '75%' }} />
      <Handle type="target" position={Position.Left} id="ref-c" className="char-handle" style={{ top: '90%' }} />
      <Handle type="source" position={Position.Right} id="image-out" className="char-handle" style={{ top: '50%' }} />
    </div>
  );
}

export default memo(GenerateCharImageNodeInner);
