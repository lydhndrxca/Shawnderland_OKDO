"use client";

import { memo, useCallback, useState, useRef, useEffect } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import {
  buildPropDescription,
  buildPropViewPrompt,
  type PropIdentity,
  type PropAttributes,
} from '@/lib/ideation/engine/conceptlab/propPrompts';
import {
  generateWithGeminiRef,
  generateWithImagen4,
  type GeneratedImage,
  type GeminiImageModel,
} from '@/lib/ideation/engine/conceptlab/imageGenApi';
import { createProcessingAnimator } from '@/lib/processingAnimation';
import { IMAGE_GEN_MODELS, MULTIMODAL_MODELS, PRESET_KEY, loadPreset, IMG_TO_MULTIMODAL_API } from '../character/modelData';
import type { PresetData } from '../character/modelData';
import '../character/CharacterNodes.css';
import './PropLabNodes.css';

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

const ASPECT_RATIOS = [
  { value: '1:1', label: 'Square 1:1' },
  { value: '9:16', label: 'Portrait 9:16' },
  { value: '16:9', label: 'Landscape 16:9' },
  { value: '3:4', label: 'Portrait 3:4' },
  { value: '4:3', label: 'Landscape 4:3' },
];

interface ContentRef {
  image: GeneratedImage;
  callout: string;
}

function gatherPropInputs(
  nodeId: string,
  getNode: ReturnType<typeof useReactFlow>['getNode'],
  getEdges: ReturnType<typeof useReactFlow>['getEdges'],
) {
  const edges = getEdges();
  const incoming = edges.filter((e) => e.target === nodeId);

  let identity: PropIdentity = { propType: '', setting: '', condition: '', scale: '' };
  let description = '';
  let attributes: PropAttributes = {};
  let styleText = '';
  const styleImages: GeneratedImage[] = [];
  const contentRefs: ContentRef[] = [];
  let isolateSubject = '';

  for (const e of incoming) {
    const src = getNode(e.source);
    if (!src?.data) continue;
    const d = src.data as Record<string, unknown>;
    if ((d as Record<string, unknown>)._sleeping) continue;

    if (src.type === 'propIdentity') {
      const id = d.identity as PropIdentity | undefined;
      if (id) identity = id;
      if (d.name) description = `${d.name as string}: ${description}`;
    } else if (src.type === 'propDescription') {
      if (d.description) description += (d.description as string);
    } else if (src.type === 'propAttributes') {
      if (d.attributes) attributes = { ...attributes, ...(d.attributes as PropAttributes) };
    } else if (src.type === 'propStyle') {
      const mode = (d.styleMode as string) || 'images';
      const hasText = !!(d.styleText as string)?.trim();
      const imgs = d.styleImages as GeneratedImage[] | undefined;
      const hasImgs = !!(imgs && imgs.length > 0);
      const useText = mode === 'text' || mode === 'both' || (mode === 'images' && !hasImgs && hasText);
      const useImgs = mode === 'images' || mode === 'both' || (mode === 'text' && !hasText && hasImgs);
      if (useText && hasText) styleText = (d.styleText as string).trim();
      if (useImgs && hasImgs) styleImages.push(...imgs!);
    } else if (src.type === 'propRefCallout') {
      const callout = (d.calloutText as string) || 'use this as reference';
      const refEdges = edges.filter((re) => re.target === src.id);
      for (const re of refEdges) {
        const refSrc = getNode(re.source);
        if (!refSrc?.data) continue;
        const rd = refSrc.data as Record<string, unknown>;
        const img = (rd.editedImage as GeneratedImage) ?? (rd.generatedImage as GeneratedImage);
        if (img?.base64) { contentRefs.push({ image: img, callout }); break; }
        if (rd.imageBase64) {
          contentRefs.push({ image: { base64: rd.imageBase64 as string, mimeType: (rd.mimeType as string) || 'image/png' }, callout });
          break;
        }
      }
    } else {
      const img = d.generatedImage as GeneratedImage | undefined;
      if (img?.base64) contentRefs.push({ image: img, callout: (d.calloutText as string) || 'use this as reference' });
      else if (d.imageBase64) contentRefs.push({ image: { base64: d.imageBase64 as string, mimeType: (d.mimeType as string) || 'image/png' }, callout: 'use this as reference' });
    }
  }

  return { identity, description, attributes, styleText, styleImages, contentRefs, isolateSubject };
}

const PROP_VIEWER_TYPES = new Set(['propMainViewer', 'propFrontViewer', 'propBackViewer', 'propSideViewer', 'propTopViewer']);

function findDownstreamPropViewers(
  nodeId: string,
  getNode: ReturnType<typeof useReactFlow>['getNode'],
  getEdges: ReturnType<typeof useReactFlow>['getEdges'],
): string[] {
  const edges = getEdges();
  const visited = new Set<string>();
  const queue = [nodeId];
  const viewerIds: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    const outgoing = edges.filter((e) => e.source === current);
    for (const e of outgoing) {
      const target = getNode(e.target);
      if (!target || visited.has(target.id)) continue;
      if (PROP_VIEWER_TYPES.has(target.type ?? '')) viewerIds.push(target.id);
      queue.push(target.id);
    }
  }
  return viewerIds;
}

const selectStyle: React.CSSProperties = {
  width: '100%', padding: '5px 6px', fontSize: 11,
  background: '#1a1a2e', color: '#eee', border: '1px solid #444', borderRadius: 4,
};

function PropGenerateNodeInner({ id, data, selected }: Props) {
  const { setNodes, setEdges, getNode, getEdges } = useReactFlow();
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [hasImage, setHasImage] = useState(!!data?.generatedImage);
  const [isolateMode, setIsolateMode] = useState((data?.isolateMode as boolean) ?? false);
  const [isolateSubject, setIsolateSubject] = useState((data?.isolateSubject as string) ?? '');
  const mountedRef = useRef(true);

  const preset = loadPreset();
  const [imageGenModel, setImageGenModel] = useState<string>(
    (data?.imageGenModelId as string) ?? preset?.imageGenModelId ?? IMAGE_GEN_MODELS[0].id,
  );
  const [multimodalModel, setMultimodalModel] = useState<string>(
    (data?.multimodalModelId as string) ?? preset?.multimodalModelId ?? MULTIMODAL_MODELS[0].id,
  );
  const [aspectRatio, setAspectRatio] = useState<string>(
    (data?.aspectRatio as string) ?? preset?.aspectRatio ?? '1:1',
  );

  const imgDef = IMAGE_GEN_MODELS.find((m) => m.id === imageGenModel) ?? IMAGE_GEN_MODELS[0];
  const mmDef = MULTIMODAL_MODELS.find((m) => m.id === multimodalModel) ?? MULTIMODAL_MODELS[0];

  const [orthoToggles, setOrthoToggles] = useState<{ front: boolean; back: boolean; side: boolean; top: boolean }>({
    front: (data?.orthoFront as boolean) ?? true,
    back: (data?.orthoBack as boolean) ?? true,
    side: (data?.orthoSide as boolean) ?? true,
    top: (data?.orthoTop as boolean) ?? true,
  });

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  const persist = useCallback((updates: Record<string, unknown>) => {
    setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, ...updates } } : n));
  }, [id, setNodes]);

  useEffect(() => {
    persist({
      imageGenModelId: imageGenModel, imageGenApiId: imgDef.apiId,
      multimodalModelId: multimodalModel, multimodalApiId: mmDef.apiId, aspectRatio,
    });
  }, [imageGenModel, multimodalModel, aspectRatio, imgDef.apiId, mmDef.apiId, persist]);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setError(null);
    setProgress('Gathering inputs...');
    const anim = createProcessingAnimator(setNodes, setEdges, getEdges);

    try {
      anim.markNodes([id], true);
      anim.markEdgesFrom(id, true);

      const inputs = gatherPropInputs(id, getNode, getEdges);
      const { identity, attributes, styleText, styleImages, contentRefs } = inputs;
      let { description } = inputs;

      const hasStyleOverride = styleText.length > 0 || styleImages.length > 0;
      const effectiveStyleText = styleText || (styleImages.length > 0 ? 'EXACTLY match the visual style shown in the style reference image(s).' : undefined);

      if (isolateMode && contentRefs.length > 0 && isolateSubject.trim()) {
        description = `ISOLATION MODE: Isolate "${isolateSubject.trim()}" from the reference image. Remove the background entirely. Place the isolated subject on a neutral grey background. Then render it as specified below.\n\n${description}`;
      }

      const desc = buildPropDescription(identity, attributes, description);
      const fullPrompt = buildPropViewPrompt('main', desc, hasStyleOverride ? effectiveStyleText : undefined);

      const mainStageMMApiId = (IMG_TO_MULTIMODAL_API[imgDef.apiId] ?? 'gemini-flash-image') as GeminiImageModel;

      const refImages = contentRefs.map((r) => r.image);
      const callouts = contentRefs.map((r) => r.callout);

      setProgress('Generating prop image...');
      const viewerIds = findDownstreamPropViewers(id, getNode, getEdges);
      setNodes((nds) => nds.map((n) => {
        if (n.id === id || viewerIds.includes(n.id)) return { ...n, data: { ...n.data, generating: true } };
        return n;
      }));

      let result: GeneratedImage[];

      if (contentRefs.length > 0) {
        const imageLines = contentRefs.map((ref, i) => `\u2022 Image ${i + 1}: "${ref.callout}"`);
        const prompt = `IMAGE LAYOUT:\n${imageLines.join('\n')}\n\nGenerate this prop:\n\n${fullPrompt}`;
        result = await generateWithGeminiRef(prompt, refImages, mainStageMMApiId, aspectRatio);
      } else if (imgDef.apiId.startsWith('imagen-')) {
        result = await generateWithImagen4(fullPrompt, aspectRatio, 1, imgDef.apiId);
      } else {
        result = await generateWithGeminiRef(fullPrompt, styleImages.length > 0 ? styleImages : [], mainStageMMApiId, aspectRatio);
      }

      const mainImage = result[0];
      if (!mainImage) throw new Error('No image returned');
      setHasImage(true);

      setNodes((nds) => nds.map((n) => {
        if (n.id === id) return { ...n, data: { ...n.data, generatedImage: mainImage, propDescription: desc, aspectRatio } };
        return n;
      }));

      const triggerTimestamp = Date.now();
      const mainViewerIds = viewerIds.filter((vid) => {
        const vn = getNode(vid);
        return vn?.type === 'propMainViewer';
      });

      if (mainViewerIds.length > 0) {
        anim.markNodes(mainViewerIds, true);
        setNodes((nds) => nds.map((n) =>
          mainViewerIds.includes(n.id)
            ? { ...n, data: { ...n.data, generatedImage: mainImage, imageGallery: [mainImage], _orthoTrigger: triggerTimestamp, _orthoToggles: orthoToggles } }
            : n,
        ));
      }

      const enabledOrthos = (['front', 'back', 'side', 'top'] as const).filter((k) => orthoToggles[k]);
      setProgress(enabledOrthos.length > 0 ? `Done! Auto-generating ${enabledOrthos.join(', ')} views...` : 'Done!');
      setTimeout(() => setProgress(''), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
      const cleanupIds = findDownstreamPropViewers(id, getNode, getEdges);
      setNodes((nds) => nds.map((n) => {
        if (n.id === id || cleanupIds.includes(n.id)) return { ...n, data: { ...n.data, generating: false } };
        return n;
      }));
      anim.clearAll();
    }
  }, [id, getNode, getEdges, setNodes, setEdges, imgDef, mmDef, aspectRatio, orthoToggles, isolateMode, isolateSubject]);

  return (
    <div className={`char-node ${selected ? 'selected' : ''} ${generating ? 'char-node-processing' : ''}`}>
      <div className="char-node-header" style={{ background: '#e91e63' }}>Generate Prop Image</div>
      <div className="char-node-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

        {/* Isolation Mode */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <label style={{ fontSize: 10, color: '#aaa', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
            <input
              type="checkbox"
              className="nodrag"
              checked={isolateMode}
              onChange={(e) => { setIsolateMode(e.target.checked); persist({ isolateMode: e.target.checked }); }}
            />
            Isolate Subject
          </label>
        </div>
        {isolateMode && (
          <input
            className="char-input nodrag"
            value={isolateSubject}
            onChange={(e) => { setIsolateSubject(e.target.value); persist({ isolateSubject: e.target.value }); }}
            placeholder="What to isolate (e.g., the chair, the lamp)..."
            style={{ fontSize: 11 }}
          />
        )}

        {/* Image Model */}
        <div>
          <label style={{ fontSize: 10, color: '#aaa', display: 'block', marginBottom: 2, fontWeight: 600 }}>New Image Model</label>
          <select className="nodrag nowheel" value={imageGenModel} disabled={generating}
            onChange={(e) => setImageGenModel(e.target.value)} style={selectStyle}>
            {IMAGE_GEN_MODELS.map((m) => (
              <option key={m.id} value={m.id}>{m.label} — {m.maxRes[aspectRatio] ?? 'auto'} — {m.timeEstimate}</option>
            ))}
          </select>
        </div>

        {/* Multimodal Model */}
        <div>
          <label style={{ fontSize: 10, color: '#aaa', display: 'block', marginBottom: 2, fontWeight: 600 }}>Edit & Reference Model</label>
          <select className="nodrag nowheel" value={multimodalModel} disabled={generating}
            onChange={(e) => setMultimodalModel(e.target.value)} style={selectStyle}>
            {MULTIMODAL_MODELS.map((m) => (
              <option key={m.id} value={m.id}>{m.label} — {m.maxRes[aspectRatio] ?? 'auto'} — {m.timeEstimate}</option>
            ))}
          </select>
        </div>

        {/* Aspect Ratio */}
        <div>
          <label style={{ fontSize: 10, color: '#aaa', display: 'block', marginBottom: 2, fontWeight: 600 }}>Aspect Ratio</label>
          <select className="nodrag nowheel" value={aspectRatio} disabled={generating}
            onChange={(e) => setAspectRatio(e.target.value)} style={selectStyle}>
            {ASPECT_RATIOS.map((ar) => (<option key={ar.value} value={ar.value}>{ar.label}</option>))}
          </select>
        </div>

        {/* Generate Button */}
        <button type="button" className="nodrag" onClick={handleGenerate} disabled={generating}
          style={{
            width: '100%', height: 34, padding: 0, fontSize: 12, fontWeight: 700,
            background: '#00bfa5', border: '1px solid #00bfa5', borderRadius: 4, color: '#000',
            cursor: generating ? 'default' : 'pointer', opacity: generating ? 0.5 : 1,
          }}>
          {generating ? 'Generating...' : 'Generate Prop Image'}
        </button>

        {/* Ortho toggles */}
        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
          {([
            { key: 'front' as const, label: 'Front', color: '#42a5f5' },
            { key: 'back' as const, label: 'Back', color: '#ab47bc' },
            { key: 'side' as const, label: 'Side', color: '#ff7043' },
            { key: 'top' as const, label: 'Top', color: '#26a69a' },
          ]).map(({ key, label, color }) => {
            const active = orthoToggles[key];
            return (
              <button key={key} type="button" className="nodrag" disabled={generating}
                onClick={() => {
                  const next = { ...orthoToggles, [key]: !active };
                  setOrthoToggles(next);
                  persist({ orthoFront: next.front, orthoBack: next.back, orthoSide: next.side, orthoTop: next.top });
                }}
                style={{
                  flex: 1, height: 24, padding: 0, fontSize: 9, fontWeight: 600,
                  background: active ? color : 'transparent', border: `1px solid ${active ? color : '#555'}`,
                  borderRadius: 3, color: active ? '#000' : '#777',
                  cursor: generating ? 'default' : 'pointer', opacity: generating ? 0.5 : 1,
                }}>
                {label}
              </button>
            );
          })}
        </div>

        {generating && <div className="char-progress">{progress || 'Creating prop...'}</div>}
        {error && <div className="char-error">{error}</div>}
        {hasImage && !generating && (
          <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center' }}>Image sent to viewer(s)</div>
        )}
      </div>

      <Handle type="target" position={Position.Left} id="input" className="char-handle" style={{ top: '50%' }} />
      <Handle type="source" position={Position.Right} id="image-out" className="char-handle" style={{ top: '50%' }} />
    </div>
  );
}

export default memo(PropGenerateNodeInner);
