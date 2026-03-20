"use client";

import { memo, useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Handle, Position, NodeResizer, useReactFlow, useStore } from '@xyflow/react';
import { ImageContextMenu } from '@/components/ImageContextMenu';
import {
  generateWithGeminiRef,
  GEMINI_IMAGE_MODELS,
  type GeneratedImage,
  type GeminiImageModel,
} from '@/lib/ideation/engine/conceptlab/imageGenApi';
import { PROP_VIEW_REQUESTS, LOCK_DESIGN_BLOCK } from '@/lib/ideation/engine/conceptlab/propPrompts';
import { registerRequest, unregisterRequest } from '@/lib/activeRequests';
import { MULTIMODAL_MODELS } from '../character/modelData';
import '../character/CharacterNodes.css';
import './PropLabNodes.css';

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

type ViewKey = 'main' | 'front' | 'back' | 'side' | 'top';

const VIEW_CONFIG: Record<ViewKey, { label: string; color: string }> = {
  main:  { label: 'Main Stage',  color: '#00bfa5' },
  front: { label: 'Front View',  color: '#42a5f5' },
  back:  { label: 'Back View',   color: '#ab47bc' },
  side:  { label: 'Side View',   color: '#ff7043' },
  top:   { label: 'Top View',    color: '#26a69a' },
};

const NODE_TYPE_TO_VIEW: Record<string, ViewKey> = {
  propMainViewer: 'main',
  propFrontViewer: 'front',
  propBackViewer: 'back',
  propSideViewer: 'side',
  propTopViewer: 'top',
};

const NO_TEXT_RULE = 'ZERO TEXT IN IMAGE: Do NOT render any text, labels, letters, numbers, or watermarks anywhere in the image.';

const PROP_RENDER_BLOCK = `
RENDERING STYLE — GAME ASSET REFERENCE:
• Photorealistic product rendering quality. Real materials with accurate texture and physical wear detail.
• LIGHTING: Completely flat, shadowless, uniform ambient illumination ONLY — like an overcast light-tent. Absolutely NO directional light, NO cast shadows, NO specular highlights, NO rim light, NO ambient occlusion baked in.
• Match the prop's exact materials, colors, wear patterns, and functional details from the reference.`;

function buildPropViewPrompt(viewKey: ViewKey): string | null {
  if (viewKey === 'main') return null;
  const view = PROP_VIEW_REQUESTS[viewKey] ?? PROP_VIEW_REQUESTS.front;

  const cameraEmphasis: Record<string, string> = {
    front: 'CAMERA POSITION: Place camera directly in front of the prop, at center height, facing it dead-on. The camera must be perfectly level — no tilt up or down. This is a FRONT ELEVATION drawing view.',
    back: 'CAMERA POSITION: Place camera directly behind the prop, at center height, facing the rear dead-on. The camera must be perfectly level. This is a REAR ELEVATION drawing view.',
    side: 'CAMERA POSITION: Place camera at exactly 90 degrees to the left side of the prop, at center height, facing the profile dead-on. The camera must be perfectly level — no perspective, no 3/4 angle, PURE flat side silhouette. This is a SIDE ELEVATION drawing view.',
    top: 'CAMERA POSITION: Place camera DIRECTLY ABOVE the prop, pointing STRAIGHT DOWN at 90 degrees. The viewer should see ONLY the top surface/roof/plan-view of the prop — as if looking down from a bird\'s-eye view or a ceiling-mounted camera. NO side walls, NO front face, NO perspective — PURE plan/top-down view only. This is a PLAN VIEW architectural drawing view.',
  };

  return `${NO_TEXT_RULE}\n\n${cameraEmphasis[viewKey] ?? ''}\n\nRecompose the provided prop reference into the EXACT camera angle specified above. Preserve EXACT design — same materials, colors, textures, wear, all details.\n\n${view}\n${PROP_RENDER_BLOCK}\n\n${LOCK_DESIGN_BLOCK}\n\nBackground: solid flat neutral grey. No environment, no floor, no ground plane.`;
}

function getMainStageImage(
  selfId: string,
  getNodes: () => Array<{ id: string; type?: string; data: Record<string, unknown> }>,
): GeneratedImage | null {
  const nodes = getNodes();
  for (const n of nodes) {
    if (n.id === selfId) continue;
    const resolvedView = NODE_TYPE_TO_VIEW[n.type ?? ''] ?? (n.data as Record<string, unknown>)?.viewKey;
    if (resolvedView !== 'main') continue;
    const img = (n.data as Record<string, unknown>).generatedImage as GeneratedImage | undefined;
    if (img?.base64) return img;
  }
  return null;
}

function getUpstreamImage(
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
    if (d._sleeping) {
      const result = getUpstreamImage(src.id, getNode, getEdges);
      if (result) return result;
      continue;
    }
    const img = d.generatedImage as GeneratedImage | undefined;
    if (img?.base64) return img;
    if (d.imageBase64) return { base64: d.imageBase64 as string, mimeType: (d.mimeType as string) || 'image/png' };
  }
  return null;
}

function getMultimodalModelFromGraph(
  getNodes: () => Array<{ id: string; type?: string; data: Record<string, unknown> }>,
): GeminiImageModel | null {
  for (const n of getNodes()) {
    if (n.type !== 'propGenerate') continue;
    const apiId = n.data?.multimodalApiId as string | undefined;
    if (apiId) return apiId as GeminiImageModel;
  }
  return null;
}

function getAspectRatioFromGraph(
  getNodes: () => Array<{ id: string; type?: string; data: Record<string, unknown> }>,
): string {
  for (const n of getNodes()) {
    if (n.type !== 'propGenerate') continue;
    const ar = n.data?.aspectRatio as string | undefined;
    if (ar) return ar;
  }
  return '1:1';
}

interface HistorySnapshot {
  image: GeneratedImage;
  label: string;
  timestamp: string;
  prompt?: string;
}

function PropViewNodeInner({ id, data, selected }: Props) {
  const { getNode, getNodes, getEdges, setNodes } = useReactFlow();

  const nodeType = getNode(id)?.type ?? '';
  const viewKey: ViewKey = NODE_TYPE_TO_VIEW[nodeType] ?? (data?.viewKey as ViewKey) ?? 'main';
  const cfg = VIEW_CONFIG[viewKey] ?? VIEW_CONFIG.main;
  const isMain = viewKey === 'main';

  const [compact, setCompact] = useState(false);
  const preCollapseSize = useRef<{ w: number; h: number } | null>(null);
  const [localImage, setLocalImage] = useState<GeneratedImage | null>((data?.localImage as GeneratedImage) ?? null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [imgRes, setImgRes] = useState<{ w: number; h: number } | null>(null);

  const upstreamSigSelector = useCallback(
    (state: { nodes: Array<{ id: string; type?: string; data: Record<string, unknown> }>; edges: Array<{ source: string; target: string }> }) => {
      const incoming = state.edges.filter((e) => e.target === id);
      for (const e of incoming) {
        const src = state.nodes.find((n) => n.id === e.source);
        if (!src?.data) continue;
        const img = (src.data as Record<string, unknown>).generatedImage as GeneratedImage | undefined;
        if (img?.base64) return img.base64.slice(0, 120);
      }
      return null;
    },
    [id],
  );
  const upstreamSig = useStore(upstreamSigSelector);

  const upstreamImage = useMemo<GeneratedImage | null>(() => {
    if (!upstreamSig) return null;
    return getUpstreamImage(id, getNode, getEdges);
  }, [upstreamSig, id, getNode, getEdges]);

  const mainStageSigSelector = useCallback(
    (state: { nodes: Array<{ id: string; type?: string; data: Record<string, unknown> }> }) => {
      if (isMain) return null;
      for (const n of state.nodes) {
        if (n.id === id) continue;
        const resolved = NODE_TYPE_TO_VIEW[n.type ?? ''];
        if (resolved !== 'main') continue;
        const img = (n.data as Record<string, unknown>).generatedImage as GeneratedImage | undefined;
        if (img?.base64) return img.base64.slice(0, 120);
      }
      return null;
    },
    [isMain, id],
  );
  const mainStageSig = useStore(mainStageSigSelector);
  const mainStageImage = useMemo<GeneratedImage | null>(() => {
    if (isMain || !mainStageSig) return null;
    return getMainStageImage(id, getNodes as () => Array<{ id: string; type?: string; data: Record<string, unknown> }>);
  }, [isMain, mainStageSig, id, getNodes]);

  const pushedImage = (data?.generatedImage as GeneratedImage | undefined) ?? null;
  const [editedImage, setEditedImage] = useState<GeneratedImage | null>(null);
  const currentImage = isMain
    ? (editedImage ?? pushedImage ?? upstreamImage ?? localImage)
    : (editedImage ?? pushedImage ?? localImage);

  const lastUpstreamSig = useRef<string | null>(null);
  useEffect(() => {
    if (!isMain || !upstreamImage) return;
    const sig = upstreamImage.base64.slice(0, 120);
    if (sig === lastUpstreamSig.current) return;
    lastUpstreamSig.current = sig;
    setEditedImage(null);
    setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, generatedImage: upstreamImage } } : n));
  }, [isMain, upstreamImage, id, setNodes]);

  const lastSyncedSig = useRef<string | null>(null);
  useEffect(() => {
    if (!currentImage) return;
    const sig = currentImage.base64.slice(0, 120);
    if (sig === lastSyncedSig.current) return;
    const stored = (data?.generatedImage as GeneratedImage | undefined)?.base64?.slice(0, 120);
    if (sig === stored) { lastSyncedSig.current = sig; return; }
    lastSyncedSig.current = sig;
    setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, generatedImage: currentImage } } : n));
  }, [currentImage, data?.generatedImage, id, setNodes]);

  // Gallery
  const [imageGallery, setImageGallery] = useState<GeneratedImage[]>((data?.imageGallery as GeneratedImage[]) ?? []);
  const [galleryIdx, setGalleryIdx] = useState(0);
  const [genCount, setGenCount] = useState<number>((data?.genCount as number) ?? 1);

  const externalGallery = data?.imageGallery as GeneratedImage[] | undefined;
  const externalGallerySig = externalGallery?.length ? externalGallery.map((g) => g.base64.slice(0, 40)).join('|') : '';
  const localGallerySig = imageGallery.length ? imageGallery.map((g) => g.base64.slice(0, 40)).join('|') : '';
  useEffect(() => {
    if (externalGallery && externalGallery.length > 0 && externalGallerySig !== localGallerySig) {
      setImageGallery([...externalGallery]);
      setGalleryIdx(0);
      const first = externalGallery[0];
      if (first) setEditedImage(first);
    }
  }, [externalGallerySig]); // eslint-disable-line react-hooks/exhaustive-deps

  // History
  const [historyEntries, setHistoryEntries] = useState<HistorySnapshot[]>((data?.historyEntries as HistorySnapshot[]) ?? []);
  const [historyMinimized, setHistoryMinimized] = useState(true);
  const [activeHistIdx, setActiveHistIdx] = useState(-1);
  const lastHistSig = useRef<string>('');

  const pushHistory = useCallback((img: GeneratedImage, label: string, prompt?: string) => {
    const sig = img.base64.slice(0, 100);
    if (sig === lastHistSig.current) return;
    lastHistSig.current = sig;
    setHistoryEntries((prev) => [...prev, { image: img, label, timestamp: new Date().toLocaleTimeString(), prompt }]);
    setActiveHistIdx(-1);
  }, []);

  const historyLenRef = useRef(historyEntries.length);
  useEffect(() => {
    if (historyEntries.length === historyLenRef.current) return;
    historyLenRef.current = historyEntries.length;
    setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, historyEntries } } : n));
  }, [historyEntries, id, setNodes]);

  useEffect(() => {
    if (!isMain || !upstreamImage) return;
    pushHistory(upstreamImage, 'Generated prop');
  }, [isMain, upstreamImage, pushHistory]);

  const galleryImage = imageGallery.length > 1 ? (imageGallery[galleryIdx] ?? null) : null;
  const historyViewImage = activeHistIdx >= 0 ? historyEntries[activeHistIdx]?.image ?? null : null;
  const viewImage = historyViewImage ?? galleryImage ?? currentImage;

  // Auto-generate ortho views
  const referenceImage = isMain ? null : (upstreamImage ?? mainStageImage);
  const orthoTriggerSelector = useCallback(
    (state: { nodes: Array<{ id: string; type?: string; data: Record<string, unknown> }> }) => {
      if (isMain) return null;
      for (const n of state.nodes) {
        if (n.id === id) continue;
        const resolved = NODE_TYPE_TO_VIEW[n.type ?? ''];
        if (resolved !== 'main') continue;
        const trigger = ((n.data as Record<string, unknown>)?._orthoTrigger as number) ?? null;
        if (!trigger) continue;
        const toggles = ((n.data as Record<string, unknown>)?._orthoToggles as Record<string, boolean>) ?? null;
        return JSON.stringify({ t: trigger, h: toggles });
      }
      return null;
    },
    [isMain, id],
  );
  const orthoTriggerRaw = useStore(orthoTriggerSelector);
  const orthoTriggerParsed = orthoTriggerRaw ? JSON.parse(orthoTriggerRaw) as { t: number; h: Record<string, boolean> | null } : null;
  const orthoTrigger = orthoTriggerParsed?.t ?? null;
  const orthoToggles = orthoTriggerParsed?.h ?? null;

  const lastTrigger = useRef<number | null>(null);
  const autoGenSessionRef = useRef<AbortController | null>(null);
  const autoGenMountedRef = useRef(true);
  const [autoGenBusy, setAutoGenBusy] = useState(false);
  useEffect(() => { autoGenMountedRef.current = true; return () => { autoGenMountedRef.current = false; }; }, []);

  useEffect(() => {
    if (isMain || !referenceImage) return;
    if (!orthoTrigger || orthoTrigger === lastTrigger.current) return;
    lastTrigger.current = orthoTrigger;

    if (orthoToggles && orthoToggles[viewKey] === false) return;

    const prompt = buildPropViewPrompt(viewKey);
    if (!prompt) return;

    if (autoGenSessionRef.current) {
      autoGenSessionRef.current.abort();
      unregisterRequest(autoGenSessionRef.current);
      autoGenSessionRef.current = null;
    }

    setAutoGenBusy(true);
    const session = registerRequest();
    autoGenSessionRef.current = session;

    (async () => {
      try {
        const mmModel = getMultimodalModelFromGraph(getNodes as () => Array<{ id: string; type?: string; data: Record<string, unknown> }>) ?? 'gemini-flash-image';
        const arFromGraph = getAspectRatioFromGraph(getNodes as () => Array<{ id: string; type?: string; data: Record<string, unknown> }>);
        const results = await generateWithGeminiRef(prompt, [referenceImage], mmModel, arFromGraph);
        if (!autoGenMountedRef.current || session.signal.aborted) return;
        const img = results[0];
        if (!img) return;
        setEditedImage(img);
        setImageGallery([img]);
        setGalleryIdx(0);
        setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, generatedImage: img, imageGallery: [img] } } : n));
        pushHistory(img, `Auto: ${cfg.label}`);
      } catch { /* ignore errors for auto-gen */ } finally {
        if (autoGenSessionRef.current === session) autoGenSessionRef.current = null;
        unregisterRequest(session);
        setAutoGenBusy(false);
      }
    })();
  }, [isMain, referenceImage, orthoTrigger, orthoToggles, viewKey, cfg, id, setNodes, pushHistory, getNodes]);

  // Inline edit
  const [editText, setEditText] = useState('');
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editElapsed, setEditElapsed] = useState(0);
  const graphModel: GeminiImageModel = getMultimodalModelFromGraph(getNodes as () => Array<{ id: string; type?: string; data: Record<string, unknown> }>) ?? 'gemini-flash-image';
  const [editModel, setEditModel] = useState<GeminiImageModel>((data?.editModel as GeminiImageModel) ?? graphModel);
  useEffect(() => { if (!data?.editModel) setEditModel(graphModel); }, [graphModel]); // eslint-disable-line react-hooks/exhaustive-deps
  const displayAspect = getAspectRatioFromGraph(getNodes as () => Array<{ id: string; type?: string; data: Record<string, unknown> }>);
  const editTimerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const mountedRef = useRef(true);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; clearInterval(editTimerRef.current); }; }, []);

  const handleEdit = useCallback(async () => {
    const srcImage = viewImage;
    if (!srcImage || !editText.trim() || editBusy) return;
    setEditBusy(true);
    setEditError(null);
    setEditElapsed(0);
    const t0 = Date.now();
    editTimerRef.current = setInterval(() => { if (mountedRef.current) setEditElapsed(Math.floor((Date.now() - t0) / 1000)); }, 500);
    const session = registerRequest();
    try {
      const prompt = `VISUAL EDIT TASK:\nPreserve 100% of the existing design, only apply:\n${editText.trim()}\nApply ONLY the above modification. Do NOT change anything else.\nBackground: Solid flat neutral grey.\n${NO_TEXT_RULE}`;
      const results = await generateWithGeminiRef(prompt, [srcImage], editModel, displayAspect);
      if (!mountedRef.current || session.signal.aborted) return;
      const img = results[0];
      if (!img) throw new Error('No image returned');
      setEditedImage(img);
      setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, generatedImage: img } } : n));
      pushHistory(img, editText.trim().slice(0, 50) || 'Edit', editText.trim());
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.toLowerCase().includes('cancel') && !msg.toLowerCase().includes('abort')) {
        if (mountedRef.current) setEditError(msg);
      }
    } finally {
      clearInterval(editTimerRef.current);
      unregisterRequest(session);
      if (mountedRef.current) { setEditBusy(false); setEditElapsed(0); }
    }
  }, [viewImage, editText, editBusy, id, setNodes, pushHistory, editModel, displayAspect]);

  // Generate view button
  const [genBusy, setGenBusy] = useState(false);
  const handleGenerateView = useCallback(async () => {
    if (genBusy) return;
    const mainImg = isMain ? null : getMainStageImage(id, getNodes as () => Array<{ id: string; type?: string; data: Record<string, unknown> }>);
    if (!isMain && !mainImg) { setEditError('No Main Stage image — generate a prop first'); return; }
    const basePrompt = buildPropViewPrompt(viewKey);
    if (!isMain && !basePrompt) return;
    setGenBusy(true);
    setEditError(null);
    setEditElapsed(0);
    const t0 = Date.now();
    editTimerRef.current = setInterval(() => { if (mountedRef.current) setEditElapsed(Math.floor((Date.now() - t0) / 1000)); }, 500);
    const session = registerRequest();
    try {
      const count = Math.max(1, genCount);
      const genAspect = getAspectRatioFromGraph(getNodes as () => Array<{ id: string; type?: string; data: Record<string, unknown> }>);
      let prompt: string;
      let refImages: GeneratedImage[];
      if (isMain) {
        const srcImage = viewImage;
        if (srcImage) {
          const editInstr = editText.trim() || 'Regenerate this prop with the same design.';
          prompt = `VISUAL EDIT TASK:\n${editInstr}\n${NO_TEXT_RULE}\nBackground: solid grey.`;
          refImages = [srcImage];
        } else {
          setEditError('No image to regenerate');
          return;
        }
      } else {
        prompt = basePrompt!;
        if (editText.trim()) prompt += `\nAdditional: ${editText.trim()}`;
        refImages = [mainImg!];
      }
      const promises = Array.from({ length: count }, () => generateWithGeminiRef(prompt, refImages, editModel, genAspect));
      const settled = await Promise.allSettled(promises);
      if (!mountedRef.current || session.signal.aborted) throw new Error('Cancelled');
      const gallery: GeneratedImage[] = settled
        .filter((r): r is PromiseFulfilledResult<GeneratedImage[]> => r.status === 'fulfilled')
        .map((r) => r.value[0])
        .filter(Boolean);
      if (gallery.length === 0) throw new Error('No images returned');
      setEditedImage(gallery[0]);
      setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, generatedImage: gallery[0], imageGallery: gallery } } : n));
      setImageGallery(gallery);
      setGalleryIdx(0);
      for (const img of gallery) pushHistory(img, `${viewImage ? 'Regen' : 'Gen'}: ${cfg.label}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.toLowerCase().includes('cancel') && !msg.toLowerCase().includes('abort')) {
        if (mountedRef.current) setEditError(msg);
      }
    } finally {
      clearInterval(editTimerRef.current);
      unregisterRequest(session);
      if (mountedRef.current) { setGenBusy(false); setEditElapsed(0); }
    }
  }, [isMain, genBusy, genCount, id, cfg, viewKey, viewImage, editText, getNodes, setNodes, pushHistory, editModel]);

  const externalGenerating = (data?.generating as boolean) ?? false;
  const anyBusy = editBusy || genBusy || autoGenBusy || externalGenerating;

  const handlePasteImage = useCallback((img: GeneratedImage) => {
    setLocalImage(img);
    setEditedImage(null);
    setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, localImage: img, generatedImage: img } } : n));
    pushHistory(img, 'Opened / pasted image');
  }, [id, setNodes, pushHistory]);

  const handleResize = useCallback((_: unknown, params: { width: number; height: number }) => {
    setNodes((nds) => nds.map((n) => n.id === id ? { ...n, style: { ...n.style, width: params.width, height: params.height } } : n));
  }, [id, setNodes]);

  const toggleCompact = useCallback(() => {
    const goingCompact = !compact;
    setCompact(goingCompact);
    setNodes((nds) => nds.map((n) => {
      if (n.id !== id) return n;
      if (goingCompact) {
        const curW = (n.style?.width as number) || 500;
        const curH = (n.style?.height as number) || 700;
        preCollapseSize.current = { w: curW, h: curH };
        return { ...n, style: { ...n.style, width: curW, height: 42 } };
      }
      const prev = preCollapseSize.current;
      return { ...n, style: { ...n.style, width: prev?.w ?? 500, height: prev?.h ?? 700 } };
    }));
  }, [compact, id, setNodes]);

  return (
    <div
      className={`char-node char-viewer-node ${selected ? 'selected' : ''} ${compact ? 'char-view-compact' : 'char-view-expanded'} ${anyBusy ? 'char-node-processing' : ''}`}
      style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}
    >
      <NodeResizer isVisible={!!selected && !compact} minWidth={200} minHeight={200} onResize={handleResize} />

      <div className="char-node-header" style={{ background: cfg.color }}>
        <span>{cfg.label}</span>
        <button className="char-view-toggle nodrag" onClick={toggleCompact} title={compact ? 'Expand' : 'Collapse'}>
          {compact ? '\u25BC' : '\u25B2'}
        </button>
      </div>

      {compact && (
        <div className="char-node-body" style={{ padding: '3px 10px' }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted, #888)' }}>
            {viewImage ? (imgRes ? `${imgRes.w}\u00D7${imgRes.h}` : 'Image loaded') : 'No image'}
          </span>
        </div>
      )}

      {showFullPreview && viewImage && (
        <div className="style-popup-overlay nodrag" onClick={(e) => e.stopPropagation()}>
          <div className="style-popup-window" style={{ maxWidth: 520, maxHeight: 620 }}>
            <button type="button" className="style-popup-close nodrag" onClick={() => setShowFullPreview(false)}>&times;</button>
            <img src={`data:${viewImage.mimeType};base64,${viewImage.base64}`} alt={cfg.label} draggable={false} style={{ maxWidth: 500, maxHeight: 580, objectFit: 'contain', display: 'block', borderRadius: 4 }} />
          </div>
        </div>
      )}

      {!compact && (
        <div className="char-viewer-canvas nodrag nowheel" style={{ flex: 1, overflow: 'hidden' }}>
          {viewImage ? (
            <>
              <ImageContextMenu image={viewImage} alt={cfg.label} onPasteImage={handlePasteImage}>
                <img
                  src={`data:${viewImage.mimeType};base64,${viewImage.base64}`}
                  alt={cfg.label}
                  onClick={() => setShowFullPreview(true)}
                  onLoad={(e) => { const el = e.currentTarget; setImgRes({ w: el.naturalWidth, h: el.naturalHeight }); }}
                  style={{ cursor: 'pointer', maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                />
              </ImageContextMenu>
              {imgRes && <span className="char-viewer-res">{imgRes.w}&times;{imgRes.h}</span>}
            </>
          ) : (
            <span className="char-viewer-empty">
              {isMain ? <>No image loaded<br />Generate or open a file</> : mainStageImage ? <>Click Generate View below</> : <>Waiting for Main Stage</>}
            </span>
          )}
        </div>
      )}

      {!compact && (
        <>
          <div className="char-viewer-toolbar">
            <button className="char-btn nodrag" onClick={() => fileRef.current?.click()}>Open IMG</button>
            <button className="char-btn nodrag" onClick={async () => {
              try {
                const items = await navigator.clipboard.read();
                for (const item of items) {
                  const imgType = item.types.find((t) => t.startsWith('image/'));
                  if (imgType) {
                    const blob = await item.getType(imgType);
                    const reader = new FileReader();
                    reader.onload = () => { const url = reader.result as string; const parts = url.split(','); handlePasteImage({ base64: parts[1], mimeType: parts[0].match(/:(.*?);/)?.[1] ?? 'image/png' }); };
                    reader.readAsDataURL(blob);
                  }
                }
              } catch { /* clipboard unavailable */ }
            }}>Paste IMG</button>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => { const base64 = (reader.result as string).split(',')[1]; handlePasteImage({ base64, mimeType: file.type || 'image/png' }); };
              reader.readAsDataURL(file);
            }} />
          </div>

          <div className="char-viewer-toolbar" style={{ justifyContent: 'center' }}>
            <button
              className="char-btn nodrag"
              onClick={handleGenerateView}
              disabled={anyBusy || (!isMain && !mainStageImage)}
              style={{ background: anyBusy ? undefined : cfg.color, color: '#000', fontWeight: 600, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}
            >
              {genBusy ? `${editElapsed}s\u2026` : (
                <>
                  {viewImage ? 'Regenerate' : 'Generate'}{' '}
                  <input
                    type="number" min={1} value={genCount}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => { e.stopPropagation(); const v = Math.max(1, parseInt(e.target.value) || 1); setGenCount(v); setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, genCount: v } } : n)); }}
                    className="nodrag" disabled={anyBusy}
                    style={{ width: 28, textAlign: 'center', padding: '0 2px', fontSize: 11, fontWeight: 700, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(0,0,0,0.3)', borderRadius: 3, color: '#000', outline: 'none' }}
                  />
                  {' '}Image{genCount !== 1 ? 's' : ''}
                </>
              )}
            </button>
          </div>

          {imageGallery.length > 1 && (
            <div className="char-viewer-toolbar nodrag" style={{ justifyContent: 'space-between', gap: 4 }}>
              <button className="char-btn" disabled={galleryIdx <= 0} onClick={() => { const i = galleryIdx - 1; setGalleryIdx(i); const img = imageGallery[i]; if (img) { setEditedImage(img); setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, generatedImage: img } } : n)); } }} style={{ padding: '3px 8px', fontSize: 12 }}>&#9664;</button>
              <span style={{ fontSize: 10, color: '#aaa' }}>{galleryIdx + 1} / {imageGallery.length}</span>
              <button className="char-btn" disabled={galleryIdx >= imageGallery.length - 1} onClick={() => { const i = galleryIdx + 1; setGalleryIdx(i); const img = imageGallery[i]; if (img) { setEditedImage(img); setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, generatedImage: img } } : n)); } }} style={{ padding: '3px 8px', fontSize: 12 }}>&#9654;</button>
            </div>
          )}
        </>
      )}

      {/* Inline Edit */}
      {!compact && viewImage && (
        <div style={{ padding: '4px 6px 6px', borderTop: '1px solid #333' }} className="nodrag">
          <textarea
            className="nowheel"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !anyBusy) { e.preventDefault(); handleEdit(); } }}
            placeholder={isMain ? 'Edit prop (e.g., add rust)...' : `Edit ${cfg.label.toLowerCase()}...`}
            disabled={anyBusy}
            rows={3}
            style={{ width: '100%', padding: '5px 8px', fontSize: 11, background: '#1a1a2e', border: '1px solid #444', borderRadius: 4, color: '#eee', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
          />
          <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginTop: 4 }}>
            <select className="nowheel" value={editModel} disabled={anyBusy}
              onChange={(e) => { const val = e.target.value as GeminiImageModel; setEditModel(val); setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, editModel: val } } : n)); }}
              style={{ padding: '4px 2px', fontSize: 9, background: '#1a1a2e', border: '1px solid #444', borderRadius: 4, color: '#aaa', maxWidth: 130 }}>
              {MULTIMODAL_MODELS.map((m) => (
                <option key={m.apiId} value={m.apiId}>{m.label.replace(/[()]/g, '').split(' ').slice(0, 2).join(' ')} — {m.maxRes[displayAspect] ?? 'auto'}</option>
              ))}
            </select>
            <button type="button" onClick={handleEdit} disabled={anyBusy || !editText.trim()}
              style={{ padding: '5px 12px', fontSize: 11, fontWeight: 600, background: anyBusy ? '#555' : '#00e5ff', color: anyBusy ? '#aaa' : '#000', border: 'none', borderRadius: 4, cursor: anyBusy ? 'default' : 'pointer', whiteSpace: 'nowrap', minWidth: 52 }}>
              {editBusy ? `${editElapsed}s` : 'Enter'}
            </button>
          </div>
          {editError && <div style={{ fontSize: 10, color: '#f44336', marginTop: 3 }}>{editError}</div>}
        </div>
      )}

      {/* History */}
      {!compact && (
        <div style={{ borderTop: '1px solid #444', flexShrink: 0, background: '#1a1a2e' }}>
          <div className="nodrag" onClick={() => setHistoryMinimized((m) => !m)}
            style={{ padding: '6px 10px', background: '#252540', cursor: 'pointer', display: 'flex', alignItems: 'center', userSelect: 'none' }}>
            <span style={{ fontWeight: 700, fontSize: 11, color: '#ccc', textTransform: 'uppercase', letterSpacing: 0.5 }}>History</span>
            <span style={{ marginLeft: 'auto', fontSize: 10, opacity: 0.7, color: '#999' }}>
              {historyMinimized ? '\u25BC' : '\u25B2'} {historyEntries.length}
            </span>
          </div>
          {!historyMinimized && (
            <div className="nodrag nowheel" style={{ maxHeight: 200, overflowY: 'auto', padding: '2px 0', background: '#1a1a2e' }}>
              <div className={`char-history-entry ${activeHistIdx === -1 ? 'active' : ''}`} onClick={() => setActiveHistIdx(-1)} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="char-history-info" style={{ padding: '4px 0' }}>
                  <span className="char-history-label" style={{ fontWeight: 700 }}>Current</span>
                </div>
              </div>
              {[...historyEntries].reverse().map((entry, ri) => {
                const realIdx = historyEntries.length - 1 - ri;
                return (
                  <div key={realIdx} className={`char-history-entry ${activeHistIdx === realIdx ? 'active' : ''}`} onClick={() => setActiveHistIdx(realIdx)}>
                    {entry.image && <img src={`data:${entry.image.mimeType};base64,${entry.image.base64}`} alt={entry.label} className="char-history-thumb" />}
                    <div className="char-history-info">
                      <span className="char-history-label">{entry.label}</span>
                      <span className="char-history-time">{entry.timestamp}</span>
                    </div>
                    {entry.prompt && (
                      <button className="char-history-copy nodrag" title="Copy prompt to edit box" onClick={(e) => { e.stopPropagation(); setEditText(entry.prompt!); }}>&#x2398;</button>
                    )}
                  </div>
                );
              })}
              {historyEntries.length === 0 && <div style={{ padding: '16px 12px', textAlign: 'center', fontSize: 11, color: '#666' }}>No history yet</div>}
            </div>
          )}
        </div>
      )}

      <Handle type="target" position={Position.Left} id="input" className="char-handle" style={{ top: '50%' }} />
      <Handle type="source" position={Position.Right} id="output" className="char-handle" style={{ top: '50%' }} />
    </div>
  );
}

export default memo(PropViewNodeInner);
