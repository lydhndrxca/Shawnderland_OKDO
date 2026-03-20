"use client";

import { memo, useCallback, useState, useRef, useEffect } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import {
  composeUIConstraints,
  buildUIImagePrompt,
  parsePromptRefs,
  UI_SYSTEM_INSTRUCTION,
  type UIConfig,
  type GenerationIntent,
  type ResolutionMode,
  type WearLevel,
} from '@/lib/ideation/engine/conceptlab/uiPrompts';
import {
  generateWithGeminiRef,
  type GeneratedImage,
  type GeminiImageModel,
} from '@/lib/ideation/engine/conceptlab/imageGenApi';
import { createProcessingAnimator } from '@/lib/processingAnimation';
import { MULTIMODAL_MODELS } from '../character/modelData';
import '../character/CharacterNodes.css';
import './UILabNodes.css';

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

const selectStyle: React.CSSProperties = {
  width: '100%', padding: '5px 6px', fontSize: 11,
  background: '#1a1a2e', color: '#eee', border: '1px solid #444', borderRadius: 4,
};

function gatherUIInputs(
  nodeId: string,
  getNode: ReturnType<typeof useReactFlow>['getNode'],
  getEdges: ReturnType<typeof useReactFlow>['getEdges'],
) {
  const edges = getEdges();
  const incoming = edges.filter((e) => e.target === nodeId);

  let config: UIConfig = {
    generationIntent: 'Freeform',
    resolutionMode: 'Freeform',
    wearLevel: 'Clean',
    hudElements: new Set<string>(),
  };
  let promptText = '';
  let styleText = '';
  const styleImages: GeneratedImage[] = [];
  const labeledRefs: { label: string; image: GeneratedImage }[] = [];

  for (const e of incoming) {
    const src = getNode(e.source);
    if (!src?.data) continue;
    const d = src.data as Record<string, unknown>;
    if (d._sleeping) continue;

    if (src.type === 'uiConfig') {
      config = {
        generationIntent: (d.generationIntent as GenerationIntent) ?? 'Freeform',
        resolutionMode: (d.resolutionMode as ResolutionMode) ?? 'Freeform',
        wearLevel: (d.wearLevel as WearLevel) ?? 'Clean',
        hudElements: new Set((d.hudElements as string[]) ?? []),
        iconSpec: (d.iconSpec as Record<string, unknown>) ?? undefined,
      };
    } else if (src.type === 'uiPrompt') {
      if (d.promptText) promptText = d.promptText as string;
    } else if (src.type === 'uiStyle') {
      const mode = (d.styleMode as string) || 'images';
      const hasText = !!(d.styleText as string)?.trim();
      const imgs = d.styleImages as GeneratedImage[] | undefined;
      const hasImgs = !!(imgs && imgs.length > 0);
      const useText = mode === 'text' || mode === 'both' || (mode === 'images' && !hasImgs && hasText);
      const useImgs = mode === 'images' || mode === 'both' || (mode === 'text' && !hasText && hasImgs);
      if (useText && hasText) styleText = (d.styleText as string).trim();
      if (useImgs && hasImgs) styleImages.push(...imgs!);
    } else {
      const img = (d.generatedImage as GeneratedImage) ??
        (d.editedImage as GeneratedImage);
      if (img?.base64) {
        const label = (d.refLabel as string) || `Ref${String.fromCharCode(65 + labeledRefs.length)}`;
        labeledRefs.push({ label, image: img });
      } else if (d.imageBase64) {
        const label = (d.refLabel as string) || `Ref${String.fromCharCode(65 + labeledRefs.length)}`;
        labeledRefs.push({ label, image: { base64: d.imageBase64 as string, mimeType: (d.mimeType as string) || 'image/png' } });
      }
    }
  }

  return { config, promptText, styleText, styleImages, labeledRefs };
}

function findDownstreamViewers(
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
      if (target.type === 'uiMainViewer') viewerIds.push(target.id);
      queue.push(target.id);
    }
  }
  return viewerIds;
}

function UIGenerateNodeInner({ id, data, selected }: Props) {
  const { setNodes, setEdges, getNode, getEdges } = useReactFlow();
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [batchCount, setBatchCount] = useState<number>((data?.batchCount as number) ?? 1);
  const [elapsed, setElapsed] = useState(0);
  const mountedRef = useRef(true);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const [model, setModel] = useState<GeminiImageModel>(
    (data?.modelId as GeminiImageModel) ?? 'gemini-flash-image',
  );

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; clearInterval(timerRef.current); }; }, []);

  const persist = useCallback((updates: Record<string, unknown>) => {
    setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, ...updates } } : n));
  }, [id, setNodes]);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setError(null);
    setProgress('Gathering inputs...');
    setElapsed(0);
    const t0 = Date.now();
    timerRef.current = setInterval(() => { if (mountedRef.current) setElapsed(Math.floor((Date.now() - t0) / 1000)); }, 500);
    const anim = createProcessingAnimator(setNodes, setEdges, getEdges);

    try {
      anim.markNodes([id], true);
      anim.markEdgesFrom(id, true);

      const inputs = gatherUIInputs(id, getNode, getEdges);
      const { config, promptText, styleText, styleImages, labeledRefs } = inputs;

      const usedRefs = parsePromptRefs(promptText);
      const hasStyleImages = styleImages.length > 0 || labeledRefs.length > 0;
      const { prompt: constraintPrompt } = composeUIConstraints(config, promptText, usedRefs, hasStyleImages);

      const intent = config.generationIntent.toUpperCase().replace(/ /g, '_').replace('LAYOUTS', '').replace(/^HUD_UI_?$/, 'HUD_UI').replace('MAP_ICONS', 'MAP');
      const isRomz = intent === 'ROMZ';
      const isMap = intent === 'MAP';

      const targetW = isRomz ? 883 : 512;
      const targetH = isRomz ? 569 : 512;
      const aspectRatio = isRomz ? '16:9' : '1:1';

      const finalPrompt = buildUIImagePrompt(constraintPrompt, hasStyleImages, targetW, targetH, isRomz, isMap);

      const allImages: GeneratedImage[] = [...styleImages];
      for (const ref of labeledRefs) allImages.push(ref.image);

      const viewerIds = findDownstreamViewers(id, getNode, getEdges);
      setNodes((nds) => nds.map((n) => {
        if (n.id === id || viewerIds.includes(n.id)) return { ...n, data: { ...n.data, generating: true } };
        return n;
      }));

      const count = Math.max(1, Math.min(10, batchCount));
      setProgress(`Generating ${count} image${count !== 1 ? 's' : ''}...`);

      const promises = Array.from({ length: count }, () =>
        generateWithGeminiRef(finalPrompt, allImages.length > 0 ? allImages : [], model, aspectRatio),
      );
      const settled = await Promise.allSettled(promises);
      if (!mountedRef.current) return;

      const gallery: GeneratedImage[] = settled
        .filter((r): r is PromiseFulfilledResult<GeneratedImage[]> => r.status === 'fulfilled')
        .map((r) => r.value[0])
        .filter(Boolean);

      if (gallery.length === 0) throw new Error('No images returned');

      if (viewerIds.length > 0) {
        anim.markNodes(viewerIds, true);
        setNodes((nds) => nds.map((n) =>
          viewerIds.includes(n.id)
            ? { ...n, data: { ...n.data, generatedImage: gallery[0], imageGallery: gallery } }
            : n,
        ));
      }

      persist({ generatedImage: gallery[0] });
      setProgress(`Done! ${gallery.length} image${gallery.length !== 1 ? 's' : ''} generated.`);
      setTimeout(() => setProgress(''), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      clearInterval(timerRef.current);
      setGenerating(false);
      const cleanupIds = findDownstreamViewers(id, getNode, getEdges);
      setNodes((nds) => nds.map((n) => {
        if (n.id === id || cleanupIds.includes(n.id)) return { ...n, data: { ...n.data, generating: false } };
        return n;
      }));
      anim.clearAll();
    }
  }, [id, getNode, getEdges, setNodes, setEdges, batchCount, model, persist]);

  return (
    <div className={`char-node ${selected ? 'selected' : ''} ${generating ? 'char-node-processing' : ''}`}>
      <div className="char-node-header" style={{ background: '#e91e63' }}>Generate UI Asset</div>
      <div className="char-node-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Model selector */}
        <div>
          <label style={{ fontSize: 10, color: '#aaa', display: 'block', marginBottom: 2, fontWeight: 600 }}>Model</label>
          <select
            className="nodrag nowheel"
            value={model}
            disabled={generating}
            onChange={(e) => { const v = e.target.value as GeminiImageModel; setModel(v); persist({ modelId: v }); }}
            style={selectStyle}
          >
            {MULTIMODAL_MODELS.map((m) => (
              <option key={m.apiId} value={m.apiId}>{m.label}</option>
            ))}
          </select>
        </div>

        {/* Batch count */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: 10, color: '#aaa', fontWeight: 600 }}>Batch</label>
          <input
            type="number"
            className="char-input nodrag"
            min={1}
            max={10}
            value={batchCount}
            onChange={(e) => {
              const v = Math.max(1, Math.min(10, parseInt(e.target.value) || 1));
              setBatchCount(v);
              persist({ batchCount: v });
            }}
            style={{ width: 50, textAlign: 'center', fontSize: 12 }}
          />
          <span style={{ fontSize: 10, color: '#888' }}>image{batchCount !== 1 ? 's' : ''}</span>
        </div>

        {/* Generate button */}
        <button
          type="button"
          className="nodrag"
          onClick={handleGenerate}
          disabled={generating}
          style={{
            width: '100%', height: 36, padding: 0, fontSize: 12, fontWeight: 700,
            background: '#00bfa5', border: '1px solid #00bfa5', borderRadius: 4, color: '#000',
            cursor: generating ? 'default' : 'pointer', opacity: generating ? 0.5 : 1,
          }}
        >
          {generating ? `Generating... ${elapsed}s` : `Generate ${batchCount > 1 ? batchCount + ' Images' : 'Image'}`}
        </button>

        {generating && progress && <div className="char-progress">{progress}</div>}
        {error && <div className="char-error">{error}</div>}
      </div>

      <Handle type="target" position={Position.Left} id="input" className="char-handle" style={{ top: '50%' }} />
      <Handle type="source" position={Position.Right} id="image-out" className="char-handle" style={{ top: '50%' }} />
    </div>
  );
}

export default memo(UIGenerateNodeInner);
