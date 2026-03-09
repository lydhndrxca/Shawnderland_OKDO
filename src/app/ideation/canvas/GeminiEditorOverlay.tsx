"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useReactFlow, useStore } from '@xyflow/react';
import { ImageContextMenu } from '@/components/ImageContextMenu';
import {
  generateWithGeminiRef,
  type GeneratedImage,
  type GeminiImageModel,
} from '@/lib/ideation/engine/conceptlab/imageGenApi';
import { registerRequest, unregisterRequest } from '@/lib/activeRequests';
import './GeminiEditorOverlay.css';

interface ConnectedSource {
  nodeId: string;
  label: string;
  image: GeneratedImage | null;
}

interface Props {
  editorNodeId: string;
  onClose: () => void;
}

const NODE_TYPE_LABELS: Record<string, string> = {
  charMainViewer: 'Main Stage',
  charViewer: 'Main Stage',
  charImageViewer: 'Main Stage',
  charFrontViewer: 'Front View',
  charBackViewer: 'Back View',
  charSideViewer: 'Side View',
  charCustomView: 'Custom View',
  imageOutput: 'Image Output',
  charGenerate: 'Generate',
  charQuickGen: 'Quick Generate',
};

type MaskTool = 'brush' | 'eraser' | 'none';

export default function GeminiEditorOverlay({ editorNodeId, onClose }: Props) {
  const { getNode, getEdges, setNodes } = useReactFlow();

  // ── Connected sources — reactively rebuild when any connected node's image changes ──
  const connectedSigSelector = useCallback(
    (state: {
      nodes: Array<{ id: string; type?: string; data: Record<string, unknown> }>;
      edges: Array<{ source: string; target: string }>;
    }) => {
      const parts: string[] = [];
      for (const e of state.edges) {
        const peerId = e.target === editorNodeId ? e.source
          : e.source === editorNodeId ? e.target
          : null;
        if (!peerId) continue;
        const peer = state.nodes.find((n) => n.id === peerId);
        if (!peer?.data) continue;
        const img = peer.data.generatedImage as { base64: string } | undefined;
        parts.push(`${peerId}:${peer.type ?? ''}:${img?.base64?.slice(0, 80) ?? ''}`);
      }
      return parts.sort().join('|');
    },
    [editorNodeId],
  );
  const connectedSig = useStore(connectedSigSelector);

  const sources = useMemo<ConnectedSource[]>(() => {
    const allEdges = getEdges();
    const seen = new Set<string>();
    const result: ConnectedSource[] = [];
    for (const e of allEdges) {
      const peerId = e.target === editorNodeId ? e.source
        : e.source === editorNodeId ? e.target
        : null;
      if (!peerId || seen.has(peerId)) continue;
      seen.add(peerId);

      const peer = getNode(peerId);
      if (!peer?.data) continue;
      const d = peer.data as Record<string, unknown>;
      const img = (d.generatedImage as GeneratedImage) ?? null;
      const customLabel = d.customLabel as string | undefined;
      const label = customLabel || NODE_TYPE_LABELS[peer.type ?? ''] || peer.type || 'Unknown';
      result.push({ nodeId: peer.id, label, image: img });
    }
    return result;
  }, [connectedSig, editorNodeId, getNode, getEdges]);

  const [activeIdx, setActiveIdx] = useState(0);
  const activeSource = sources[activeIdx] ?? null;
  const activeImage = activeSource?.image ?? null;

  useEffect(() => {
    if (activeIdx >= sources.length && sources.length > 0) setActiveIdx(0);
  }, [activeIdx, sources.length]);

  // ── Image natural dimensions ──
  const [imgSize, setImgSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const canvasAreaRef = useRef<HTMLDivElement>(null);

  const handleImgLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
  }, []);

  // ── Zoom / Pan ──
  const MIN_ZOOM = 0.02;
  const MAX_ZOOM = 30;
  const ZOOM_FACTOR = 1.12;

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  const fitToView = useCallback(() => {
    if (!imgSize.w || !imgSize.h || !canvasAreaRef.current) return;
    const rect = canvasAreaRef.current.getBoundingClientRect();
    const fit = Math.min(rect.width / imgSize.w, rect.height / imgSize.h) * 0.92;
    setZoom(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, fit)));
    setPan({ x: 0, y: 0 });
  }, [imgSize]);

  // Fit on image load / change
  useEffect(() => { fitToView(); }, [fitToView]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1 / ZOOM_FACTOR : ZOOM_FACTOR;
    setZoom((z) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z * factor)));
  }, []);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      e.preventDefault();
      setIsPanning(true);
      lastMouse.current = { x: e.clientX, y: e.clientY };
    }
  }, []);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      const dx = e.clientX - lastMouse.current.x;
      const dy = e.clientY - lastMouse.current.y;
      lastMouse.current = { x: e.clientX, y: e.clientY };
      setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
    }
  }, [isPanning]);

  const handleCanvasMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // ── Edit bar ──
  const [editText, setEditText] = useState('');
  const [editModel, setEditModel] = useState<GeminiImageModel>('gemini-flash-image');
  const [editBusy, setEditBusy] = useState(false);
  const [editStatus, setEditStatus] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [editElapsed, setEditElapsed] = useState(0);
  const editTimerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ── Mask / Brush ──
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const [maskTool, setMaskTool] = useState<MaskTool>('none');
  const [brushSize, setBrushSize] = useState(30);
  const isDrawing = useRef(false);
  const [brushPos, setBrushPos] = useState<{ x: number; y: number } | null>(null);
  const lastDrawPos = useRef<{ x: number; y: number } | null>(null);

  // Size mask canvas to match image dimensions
  useEffect(() => {
    const canvas = maskCanvasRef.current;
    if (!canvas || !imgSize.w || !imgSize.h) return;
    if (canvas.width !== imgSize.w || canvas.height !== imgSize.h) {
      canvas.width = imgSize.w;
      canvas.height = imgSize.h;
    }
  }, [imgSize]);

  // Convert screen mouse position to canvas (image) coordinates
  const toCanvasCoords = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  }, []);

  // Convert screen mouse position to canvas-area-relative position (for brush cursor)
  const toAreaCoords = useCallback((e: React.MouseEvent) => {
    const area = canvasAreaRef.current;
    if (!area) return null;
    const rect = area.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const drawStroke = useCallback((x: number, y: number) => {
    const canvas = maskCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.globalCompositeOperation = maskTool === 'eraser' ? 'destination-out' : 'source-over';
    const radius = brushSize / 2;

    if (maskTool === 'eraser') {
      ctx.fillStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.fillStyle = 'rgba(255, 60, 60, 0.45)';
    }

    const prev = lastDrawPos.current;
    if (prev) {
      const dx = x - prev.x;
      const dy = y - prev.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const step = Math.max(2, radius * 0.3);
      const steps = Math.ceil(dist / step);
      for (let i = 0; i <= steps; i++) {
        const t = steps === 0 ? 0 : i / steps;
        const px = prev.x + dx * t;
        const py = prev.y + dy * t;
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    lastDrawPos.current = { x, y };
  }, [maskTool, brushSize]);

  const handleMaskMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (maskTool === 'none') return;
    if (e.button === 1 || (e.button === 0 && e.altKey)) return;
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    isDrawing.current = true;
    lastDrawPos.current = null;
    const { x, y } = toCanvasCoords(e);
    drawStroke(x, y);
  }, [maskTool, drawStroke, toCanvasCoords]);

  const handleMaskMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    setBrushPos(toAreaCoords(e));
    if (!isDrawing.current || maskTool === 'none') return;
    const { x, y } = toCanvasCoords(e);
    drawStroke(x, y);
  }, [maskTool, drawStroke, toCanvasCoords, toAreaCoords]);

  const handleMaskMouseUp = useCallback(() => {
    isDrawing.current = false;
    lastDrawPos.current = null;
  }, []);

  const clearMask = useCallback(() => {
    const canvas = maskCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const maskHasContent = useCallback((): boolean => {
    const canvas = maskCanvasRef.current;
    if (!canvas || canvas.width === 0 || canvas.height === 0) return false;
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;
    const px = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let i = 3; i < px.length; i += 4) {
      if (px[i] > 0) return true;
    }
    return false;
  }, []);

  const exportMaskComposite = useCallback(async (srcImage: GeneratedImage): Promise<GeneratedImage> => {
    const maskCanvas = maskCanvasRef.current!;
    const w = maskCanvas.width;
    const h = maskCanvas.height;

    const compositeCanvas = document.createElement('canvas');
    compositeCanvas.width = w;
    compositeCanvas.height = h;
    const ctx = compositeCanvas.getContext('2d')!;

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = `data:${srcImage.mimeType};base64,${srcImage.base64}`;
    });
    ctx.drawImage(img, 0, 0, w, h);

    const maskCtx = maskCanvas.getContext('2d')!;
    const maskData = maskCtx.getImageData(0, 0, w, h);
    const compData = ctx.getImageData(0, 0, w, h);

    for (let i = 0; i < maskData.data.length; i += 4) {
      if (maskData.data[i + 3] > 20) {
        const a = 0.6;
        compData.data[i]     = Math.round(compData.data[i] * (1 - a) + 0 * a);
        compData.data[i + 1] = Math.round(compData.data[i + 1] * (1 - a) + 255 * a);
        compData.data[i + 2] = Math.round(compData.data[i + 2] * (1 - a) + 0 * a);
      }
    }
    ctx.putImageData(compData, 0, 0);

    const dataUrl = compositeCanvas.toDataURL('image/png');
    const base64 = dataUrl.split(',')[1];
    return { base64, mimeType: 'image/png' };
  }, []);

  // ── Edit handler ──
  const handleEdit = useCallback(async () => {
    if (!activeImage || !editText.trim() || editBusy || !activeSource) return;

    setEditBusy(true);
    setEditError(null);
    setEditStatus('Generating...');
    setEditElapsed(0);

    const t0 = Date.now();
    editTimerRef.current = setInterval(() => {
      if (mountedRef.current) setEditElapsed(Math.floor((Date.now() - t0) / 1000));
    }, 500);

    const controller = registerRequest();

    try {
      const hasMask = maskHasContent();
      let prompt: string;
      let refImages: GeneratedImage | GeneratedImage[];

      if (hasMask) {
        const composite = await exportMaskComposite(activeImage);
        prompt = `I am providing two images of the same character/scene.

IMAGE 1: The original, unmodified image.
IMAGE 2: The same image, but with BRIGHT GREEN highlighting painted over the specific area(s) I want you to change.

YOUR TASK: Recreate Image 1 exactly, but ONLY modify the green-highlighted area(s) from Image 2 according to these instructions:
${editText.trim()}

CRITICAL RULES:
- ONLY change the area that was highlighted in green. Everything outside the green region must remain PIXEL-PERFECT identical to the original.
- The modified area should blend naturally with the surrounding unchanged areas.
- Maintain the same art style, lighting, and quality as the original image.
- Return the full image with ONLY the highlighted area changed.`;
        refImages = [activeImage, composite];
      } else {
        prompt = `Edit this image: ${editText.trim()}. Preserve the overall composition and style.`;
        refImages = activeImage;
      }

      const modelLabel = editModel === 'gemini-flash-image' ? 'Flash' : 'Pro';
      setEditStatus(`Waiting for Gemini ${modelLabel}...`);

      const results = await generateWithGeminiRef(prompt, refImages, editModel);
      if (!mountedRef.current || controller.signal.aborted) return;

      const img = results[0];
      if (!img) throw new Error('No image returned');

      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      setEditStatus(`Done in ${elapsed}s`);

      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== activeSource.nodeId) return n;
          return { ...n, data: { ...n.data, generatedImage: img } };
        }),
      );

      const snapshot = { image: img, label: editText.trim().slice(0, 50) || 'Editor edit' };
      const allEdges = getEdges();
      const historyIds: string[] = [];
      for (const e of allEdges) {
        const peerId = e.source === activeSource.nodeId ? e.target : e.target === activeSource.nodeId ? e.source : null;
        if (!peerId) continue;
        const peer = getNode(peerId);
        if (peer?.type === 'charHistory') historyIds.push(peer.id);
      }
      if (historyIds.length > 0) {
        setTimeout(() => {
          setNodes((nds) =>
            nds.map((n) =>
              historyIds.includes(n.id) ? { ...n, data: { ...n.data, _pendingSnapshot: snapshot } } : n,
            ),
          );
        }, 150);
      }

      if (hasMask) clearMask();
      setEditText('');
      setTimeout(() => { if (mountedRef.current) setEditStatus(null); }, 3000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.toLowerCase().includes('cancel') && !msg.toLowerCase().includes('abort')) {
        setEditError(msg);
      }
      setEditStatus(null);
    } finally {
      clearInterval(editTimerRef.current);
      unregisterRequest(controller);
      setEditBusy(false);
      setEditElapsed(0);
    }
  }, [activeImage, activeSource, editText, editBusy, editModel, getNode, getEdges, setNodes, maskHasContent, exportMaskComposite, clearMask]);

  // ── Paste image support ──
  const handlePasteImage = useCallback((img: GeneratedImage) => {
    if (!activeSource) return;
    setNodes((nds) =>
      nds.map((n) =>
        n.id === activeSource.nodeId ? { ...n, data: { ...n.data, generatedImage: img } } : n,
      ),
    );
  }, [activeSource, setNodes]);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === '[') {
        e.preventDefault();
        setBrushSize((s) => Math.max(3, s - (s > 20 ? 5 : 2)));
      }
      if (e.key === ']') {
        e.preventDefault();
        setBrushSize((s) => Math.min(200, s + (s >= 20 ? 5 : 2)));
      }
      if (e.key === 'b' || e.key === 'B') {
        setMaskTool((t) => t === 'brush' ? 'none' : 'brush');
      }
      if (e.key === 'e' || e.key === 'E') {
        setMaskTool((t) => t === 'eraser' ? 'none' : 'eraser');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Reset view when switching active image
  useEffect(() => {
    clearMask();
    setImgSize({ w: 0, h: 0 });
  }, [activeIdx, clearMask]);

  const isMaskMode = maskTool !== 'none';
  const canvasCursor = isPanning ? 'grabbing' : isMaskMode ? 'none' : 'default';

  // Brush cursor: size in screen pixels = brushSize (image px) * zoom
  const screenBrushSize = brushSize * zoom;

  return (
    <div className="ge-backdrop" onClick={onClose}>
      <div className="ge-panel" onClick={(e) => e.stopPropagation()}>

        {/* ── Top Bar ── */}
        <div className="ge-topbar">
          <span className="ge-topbar-title">Gemini Editor</span>
          {activeSource && (
            <span style={{ fontSize: 11, color: '#888' }}>
              Editing: <strong style={{ color: '#00bcd4' }}>{activeSource.label}</strong>
            </span>
          )}
          <div className="ge-topbar-spacer" />
          <button className="ge-topbar-btn" onClick={fitToView}>Reset View</button>
          <button className="ge-close-btn" onClick={onClose} title="Close editor (Esc)">&times;</button>
        </div>

        {/* ── Body ── */}
        <div className="ge-body">

          {/* ── Main Canvas Area ── */}
          <div
            ref={canvasAreaRef}
            className="ge-canvas-area"
            style={{ cursor: canvasCursor }}
            onWheel={handleWheel}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={(e) => {
              handleCanvasMouseMove(e);
              if (isMaskMode) setBrushPos(toAreaCoords(e));
            }}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={() => { handleCanvasMouseUp(); handleMaskMouseUp(); setBrushPos(null); }}
          >
            {activeImage ? (
              <>
                {/* Transform container — image + mask move/scale together */}
                <div
                  className="ge-transform-wrap"
                  style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    width: imgSize.w || undefined,
                    height: imgSize.h || undefined,
                  }}
                >
                  <ImageContextMenu
                    image={activeImage}
                    alt={activeSource?.label ?? 'Editor image'}
                    onPasteImage={handlePasteImage}
                    onResetView={fitToView}
                  >
                    <img
                      src={`data:${activeImage.mimeType};base64,${activeImage.base64}`}
                      alt={activeSource?.label ?? 'Editor'}
                      className="ge-main-img"
                      onLoad={handleImgLoad}
                      draggable={false}
                    />
                  </ImageContextMenu>

                  {/* Mask canvas — same dimensions as image, stacked on top */}
                  <canvas
                    ref={maskCanvasRef}
                    className="ge-mask-layer"
                    style={{ pointerEvents: isMaskMode ? 'auto' : 'none' }}
                    onWheel={handleWheel}
                    onMouseDown={(e) => {
                      if (e.button === 1 || (e.button === 0 && e.altKey)) {
                        handleCanvasMouseDown(e);
                      } else {
                        handleMaskMouseDown(e);
                      }
                    }}
                    onMouseMove={(e) => {
                      handleCanvasMouseMove(e);
                      handleMaskMouseMove(e);
                    }}
                    onMouseUp={() => { handleCanvasMouseUp(); handleMaskMouseUp(); }}
                    onMouseLeave={() => { handleCanvasMouseUp(); handleMaskMouseUp(); setBrushPos(null); }}
                  />
                </div>

                {/* Brush cursor — screen-space overlay */}
                {isMaskMode && brushPos && !isPanning && (
                  <div
                    className="ge-brush-cursor"
                    style={{
                      width: screenBrushSize,
                      height: screenBrushSize,
                      left: brushPos.x - screenBrushSize / 2,
                      top: brushPos.y - screenBrushSize / 2,
                      borderColor: maskTool === 'eraser' ? 'rgba(255,255,255,0.7)' : 'rgba(255,60,60,0.8)',
                    }}
                  />
                )}
              </>
            ) : (
              <span className="ge-canvas-empty">
                {activeSource
                  ? <>No image generated for <strong>{activeSource.label}</strong> yet.<br />Generate an image in the node first, then it will appear here.</>
                  : <>No image selected.<br />Connect image nodes and click one in the sidebar.</>
                }
              </span>
            )}
          </div>

          {/* ── Right Sidebar ── */}
          <div className="ge-sidebar">
            <div className="ge-sidebar-header">Connected Images</div>
            <div className="ge-sidebar-list">
              {sources.length === 0 && (
                <div style={{ padding: '16px 8px', fontSize: 11, color: '#555', textAlign: 'center' }}>
                  No images connected.<br />Wire image nodes into the Gemini Editor node.
                </div>
              )}
              {sources.map((src, i) => (
                <div
                  key={src.nodeId}
                  className={`ge-sidebar-item ${i === activeIdx ? 'active' : 'dimmed'}`}
                  onClick={() => setActiveIdx(i)}
                >
                  {src.image ? (
                    <img
                      src={`data:${src.image.mimeType};base64,${src.image.base64}`}
                      alt={src.label}
                      className="ge-sidebar-thumb"
                    />
                  ) : (
                    <div className="ge-sidebar-thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#555' }}>
                      No img
                    </div>
                  )}
                  <span className="ge-sidebar-label">{src.label}</span>
                </div>
              ))}
            </div>

            {/* ── Edit Bar ── */}
            <div className="ge-edit-section">
              <div className="ge-edit-row">
                <input
                  type="text"
                  className="ge-edit-input"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !editBusy) handleEdit(); }}
                  placeholder={isMaskMode ? 'Describe replacement for masked area...' : 'Edit image (e.g. add hat)...'}
                  disabled={editBusy || !activeImage}
                />
                <button
                  className="ge-edit-enter"
                  onClick={handleEdit}
                  disabled={editBusy || !editText.trim() || !activeImage}
                >
                  {editBusy ? `${editElapsed}s` : 'Enter'}
                </button>
              </div>
              <select
                className="ge-edit-select"
                value={editModel}
                onChange={(e) => setEditModel(e.target.value as GeminiImageModel)}
                disabled={editBusy}
              >
                <option value="gemini-flash-image">⚡ Gemini Flash — 1024×1024 — ~5-10s</option>
                <option value="gemini-3-pro">✦ Gemini 3 Pro — 2048×2048 — ~20-30s</option>
              </select>
              {editStatus && (
                <div className="ge-edit-status">
                  {editBusy && <span className="ge-spinner" />}
                  {editStatus}
                </div>
              )}
              {editError && <div className="ge-edit-error">{editError}</div>}
            </div>
          </div>
        </div>

        {/* ── Bottom Toolbar ── */}
        <div className="ge-toolbar">
          <span className="ge-tool-label">Tools:</span>
          <button
            className={`ge-tool-btn ${maskTool === 'brush' ? 'active' : ''}`}
            onClick={() => setMaskTool(maskTool === 'brush' ? 'none' : 'brush')}
            title="Brush — paint mask area for inpainting (B)"
          >
            Brush <span className="ge-shortcut">B</span>
          </button>
          <button
            className={`ge-tool-btn ${maskTool === 'eraser' ? 'active' : ''}`}
            onClick={() => setMaskTool(maskTool === 'eraser' ? 'none' : 'eraser')}
            title="Eraser — remove mask paint (E)"
          >
            Eraser <span className="ge-shortcut">E</span>
          </button>
          <div className="ge-tool-separator" />
          <span className="ge-tool-label">Size:</span>
          <button
            className="ge-tool-btn ge-size-btn"
            onClick={() => setBrushSize((s) => Math.max(3, s - (s > 20 ? 5 : 2)))}
            title="Decrease brush size ( [ )"
          >&minus;</button>
          <input
            type="range"
            className="ge-tool-slider"
            min={3}
            max={200}
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            title={`Brush size: ${brushSize}px  [ ] to adjust`}
          />
          <button
            className="ge-tool-btn ge-size-btn"
            onClick={() => setBrushSize((s) => Math.min(200, s + (s >= 20 ? 5 : 2)))}
            title="Increase brush size ( ] )"
          >+</button>
          <span style={{ fontSize: 10, color: '#888', minWidth: 28, textAlign: 'center' }}>{brushSize}px</span>
          <div className="ge-tool-separator" />
          <button className="ge-tool-btn danger" onClick={clearMask} title="Clear all mask paint">
            Clear Mask
          </button>
          <span className="ge-zoom-info">{Math.round(zoom * 100)}%</span>
        </div>
      </div>
    </div>
  );
}
