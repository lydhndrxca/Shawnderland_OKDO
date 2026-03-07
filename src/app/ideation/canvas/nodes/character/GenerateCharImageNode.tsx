"use client";

import { memo, useCallback, useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import {
  buildCharacterDescription,
  buildCharacterViewPrompt,
  LOCK_OUTFIT_BLOCK,
  type CharacterIdentity,
  type CharacterAttributes,
} from '@/lib/ideation/engine/conceptlab/characterPrompts';
import {
  generateWithImagen4,
  generateWithGeminiRef,
  type GeneratedImage,
  type GeminiImageModel,
} from '@/lib/ideation/engine/conceptlab/imageGenApi';
import { resolveNodeInfluences } from '@/lib/ideation/engine/conceptlab/resolveInfluences';
import { ImageContextMenu } from '@/components/ImageContextMenu';
import './CharacterNodes.css';

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

type ViewKey = 'main' | 'front' | 'back' | 'side';

const VIEWER_TYPES: Record<string, ViewKey> = {
  charMainViewer: 'main',
  charFrontViewer: 'front',
  charBackViewer: 'back',
  charSideViewer: 'side',
};

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
  let pose = '';
  let styleText = '';
  const styleImages: GeneratedImage[] = [];
  const refImages: GeneratedImage[] = [];
  const callouts: string[] = [];
  let projectName = '';
  let outputDir = '';

  for (const e of incoming) {
    const src = getNode(e.source);
    if (!src?.data) continue;
    const d = src.data as Record<string, unknown>;

    if (src.type === 'charIdentity') {
      const id = d.identity as CharacterIdentity | undefined;
      if (id) identity = id;
      if (d.name) description = `${d.name as string}: ${description}`;
    } else if (src.type === 'charDescription') {
      if (d.description) description += (d.description as string);
    } else if (src.type === 'charAttributes') {
      if (d.attributes) attributes = { ...attributes, ...(d.attributes as CharacterAttributes) };
    } else if (src.type === 'charPose') {
      if (d.pose) pose = d.pose as string;
    } else if (src.type === 'charStyle') {
      if (d.styleText) styleText = d.styleText as string;
      const imgs = d.styleImages as GeneratedImage[] | undefined;
      if (imgs) styleImages.push(...imgs);
    } else if (src.type === 'charRefCallout') {
      if (d.calloutText) callouts.push(d.calloutText as string);
      const img = d.generatedImage as GeneratedImage | undefined;
      if (img?.base64) refImages.push(img);
      else if (d.imageBase64) refImages.push({ base64: d.imageBase64 as string, mimeType: (d.mimeType as string) || 'image/png' });
    } else if (src.type === 'charProject') {
      if (d.projectName) projectName = d.projectName as string;
      if (d.outputDir) outputDir = d.outputDir as string;
    } else {
      const img = d.generatedImage as GeneratedImage | undefined;
      if (img?.base64) refImages.push(img);
      else if (d.imageBase64) refImages.push({ base64: d.imageBase64 as string, mimeType: (d.mimeType as string) || 'image/png' });
      if (d.calloutText) callouts.push(d.calloutText as string);
    }
  }

  return { identity, description, attributes, pose, styleText, styleImages, refImages, callouts, projectName, outputDir };
}

interface DownstreamViewer {
  nodeId: string;
  viewKey: ViewKey;
}

function findDownstreamViewers(
  nodeId: string,
  getNode: ReturnType<typeof useReactFlow>['getNode'],
  getEdges: ReturnType<typeof useReactFlow>['getEdges'],
): DownstreamViewer[] {
  const edges = getEdges();
  const outgoing = edges.filter((e) => e.source === nodeId);
  const viewers: DownstreamViewer[] = [];

  for (const e of outgoing) {
    const target = getNode(e.target);
    if (!target) continue;

    if (target.type === 'charGate') {
      const gateData = target.data as Record<string, unknown>;
      if (!(gateData.enabled as boolean ?? true)) continue;
      const gateOutgoing = edges.filter((ge) => ge.source === target.id);
      for (const ge of gateOutgoing) {
        const downstream = getNode(ge.target);
        if (!downstream) continue;
        const viewKey = VIEWER_TYPES[downstream.type ?? ''];
        if (viewKey) viewers.push({ nodeId: downstream.id, viewKey });
      }
    } else {
      const viewKey = VIEWER_TYPES[target.type ?? ''];
      if (viewKey) viewers.push({ nodeId: target.id, viewKey });
    }
  }
  return viewers;
}

async function autoSaveImage(
  image: GeneratedImage,
  viewName: string,
  charName: string,
  outputDir: string,
) {
  if (!outputDir && !charName) return;
  try {
    await fetch('/api/character-save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        base64: image.base64,
        mimeType: image.mimeType,
        charName: charName || 'character',
        viewName,
        outputDir: outputDir || undefined,
      }),
    });
  } catch {
    // non-critical
  }
}

function GenerateCharImageNodeInner({ id, data, selected }: Props) {
  const { setNodes, getNode, getEdges } = useReactFlow();
  const [images, setImages] = useState<GeneratedImage[]>(
    (data?.generatedImages as GeneratedImage[]) ?? [],
  );
  const [viewIdx, setViewIdx] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setError(null);
    setProgress('Gathering inputs...');

    try {
      const inputs = gatherInputs(id, getNode, getEdges);
      const { identity, attributes, pose, styleText, callouts, projectName, outputDir } = inputs;
      let { description } = inputs;

      if (pose) {
        attributes.pose = pose;
      }

      const desc = buildCharacterDescription(identity, attributes, description);

      const influenceBlock = resolveNodeInfluences(
        id,
        getNode as (id: string) => { id: string; type?: string; data: Record<string, unknown> } | undefined,
        getEdges as () => { source: string; target: string }[],
      );

      let fullPrompt = buildCharacterViewPrompt('main', desc) + influenceBlock;
      if (styleText) fullPrompt += `\n\n[STYLE OVERRIDE]\n${styleText}`;
      if (callouts.length > 0) fullPrompt += '\n\nReference image callouts:\n' + callouts.join('\n');

      const viewers = findDownstreamViewers(id, getNode, getEdges);
      const hasMainViewer = viewers.some((v) => v.viewKey === 'main');
      const otherViewers = viewers.filter((v) => v.viewKey !== 'main');

      setProgress('Generating main image...');
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, generating: true } } : n)),
      );

      const result = await generateWithImagen4(fullPrompt, '9:16', 1);
      const mainImage = result[0];
      setImages(result);
      setViewIdx(0);

      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === id) {
            return {
              ...n,
              data: {
                ...n.data,
                generatedImages: result,
                generatedImage: mainImage,
                characterDescription: desc,
              },
            };
          }
          return n;
        }),
      );

      if (hasMainViewer) {
        const mainViewerIds = viewers.filter((v) => v.viewKey === 'main').map((v) => v.nodeId);
        setNodes((nds) =>
          nds.map((n) =>
            mainViewerIds.includes(n.id)
              ? { ...n, data: { ...n.data, generatedImage: mainImage } }
              : n,
          ),
        );
        if (projectName || outputDir) {
          autoSaveImage(mainImage, 'main_stage', projectName, outputDir);
        }
      }

      if (otherViewers.length > 0 && mainImage) {
        const viewPromises = otherViewers.map(async (viewer) => {
          setProgress(`Generating ${viewer.viewKey} view...`);
          const viewPrompt = buildCharacterViewPrompt(viewer.viewKey, desc)
            + '\n\n' + LOCK_OUTFIT_BLOCK
            + influenceBlock;

          const viewResult = await generateWithGeminiRef(
            viewPrompt,
            mainImage,
            'gemini-3-pro' as GeminiImageModel,
          );

          if (viewResult.length > 0) {
            setNodes((nds) =>
              nds.map((n) =>
                n.id === viewer.nodeId
                  ? { ...n, data: { ...n.data, generatedImage: viewResult[0] } }
                  : n,
              ),
            );
            if (projectName || outputDir) {
              autoSaveImage(viewResult[0], viewer.viewKey, projectName, outputDir);
            }
          }
        });

        await Promise.all(viewPromises);
      }

      setProgress('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, generating: false } } : n)),
      );
    }
  }, [id, getNode, getEdges, setNodes]);

  const currentImage = images[viewIdx];

  return (
    <div className={`char-node ${selected ? 'selected' : ''} ${generating ? 'char-node-processing' : ''}`}>
      <div className="char-node-header" style={{ background: '#e91e63' }}>
        Generate Character Image
      </div>
      <div className="char-node-body">
        <button className="char-btn primary nodrag" onClick={handleGenerate} disabled={generating}>
          {generating ? 'Generating...' : 'Generate Character Image'}
        </button>
        {generating && <div className="char-progress">{progress || 'Creating character...'}</div>}
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

      <Handle type="target" position={Position.Left} id="input" className="char-handle" style={{ top: '50%' }} />
      <Handle type="source" position={Position.Right} id="image-out" className="char-handle" style={{ top: '50%' }} />
    </div>
  );
}

export default memo(GenerateCharImageNodeInner);
