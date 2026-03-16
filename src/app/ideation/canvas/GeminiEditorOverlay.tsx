"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useReactFlow, useStore } from '@xyflow/react';
import { ImageContextMenu } from '@/components/ImageContextMenu';
import {
  generateWithGeminiRef,
  restoreImageQuality,
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

interface HistoryEntry {
  image: GeneratedImage;
  label: string;
  timestamp: number;
}

interface PointPin {
  imgX: number;
  imgY: number;
  screenX: number;
  screenY: number;
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

type MaskTool = 'brush' | 'eraser' | 'point' | 'none';

export default function GeminiEditorOverlay({ editorNodeId, onClose }: Props) {
  const { getNode, getEdges, setNodes } = useReactFlow();

  // ── Connected sources ──
  const connectedSigSelector = useCallback(
    (state: {
      nodes: Array<{ id: string; type?: string; data: Record<string, unknown> }>;
      edges: Array<{ source: string; target: string }>;
    }) => {
      const parts: string[] = [];
      for (const e of state.edges) {
        const peerId = e.target === editorNodeId ? e.source : e.source === editorNodeId ? e.target : null;
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
      const peerId = e.target === editorNodeId ? e.source : e.source === editorNodeId ? e.target : null;
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

  // ── Edit History (per source) ──
  const historyMapRef = useRef<Map<string, HistoryEntry[]>>(new Map());
  const activeHistoryKey = activeSource?.nodeId ?? '';
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  const [activeHistIdx, setActiveHistIdx] = useState(-1);

  useEffect(() => {
    setHistoryEntries(historyMapRef.current.get(activeHistoryKey) ?? []);
    setActiveHistIdx(-1);
  }, [activeHistoryKey]);

  const pushHistory = useCallback((image: GeneratedImage, label: string) => {
    const entry: HistoryEntry = { image, label, timestamp: Date.now() };
    const key = activeHistoryKey;
    const prev = historyMapRef.current.get(key) ?? [];
    const next = [entry, ...prev].slice(0, 50);
    historyMapRef.current.set(key, next);
    setHistoryEntries(next);
  }, [activeHistoryKey]);

  // ── Image natural dimensions ──
  const [imgSize, setImgSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const canvasAreaRef = useRef<HTMLDivElement>(null);

  const handleImgLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImgSize((prev) =>
      prev.w === img.naturalWidth && prev.h === img.naturalHeight
        ? prev
        : { w: img.naturalWidth, h: img.naturalHeight },
    );
  }, []);

  // ── Zoom / Pan ──
  const MIN_ZOOM = 0.02;
  const MAX_ZOOM = 30;
  const ZOOM_FACTOR = 1.12;

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const skipFitRef = useRef(false);

  const fitToView = useCallback(() => {
    if (!imgSize.w || !imgSize.h || !canvasAreaRef.current) return;
    const rect = canvasAreaRef.current.getBoundingClientRect();
    const fit = Math.min(rect.width / imgSize.w, rect.height / imgSize.h) * 0.92;
    setZoom(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, fit)));
    setPan({ x: 0, y: 0 });
  }, [imgSize]);

  useEffect(() => {
    if (skipFitRef.current) { skipFitRef.current = false; return; }
    fitToView();
  }, [fitToView]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const area = canvasAreaRef.current;
    if (!area) return;
    const rect = area.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - rect.width / 2;
    const mouseY = e.clientY - rect.top - rect.height / 2;
    const factor = e.deltaY > 0 ? 1 / ZOOM_FACTOR : ZOOM_FACTOR;
    setZoom((prevZoom) => {
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prevZoom * factor));
      const ratio = newZoom / prevZoom;
      setPan((p) => ({
        x: mouseX - ratio * (mouseX - p.x),
        y: mouseY - ratio * (mouseY - p.y),
      }));
      return newZoom;
    });
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

  const handleCanvasMouseUp = useCallback(() => { setIsPanning(false); }, []);

  // ── Edit bar ──
  const [editText, setEditText] = useState('');
  const [editModel, setEditModel] = useState<GeminiImageModel>('gemini-flash-image');
  const [editBusy, setEditBusy] = useState(false);
  const [editStatus, setEditStatus] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [editElapsed, setEditElapsed] = useState(0);
  const editTimerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const mountedRef = useRef(true);

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  // ── Restore ──
  const [restoreBusy, setRestoreBusy] = useState(false);
  const [restoreStatus, setRestoreStatus] = useState<string | null>(null);

  const handleRestore = useCallback(async () => {
    if (!activeImage || restoreBusy || editBusy || !activeSource) return;
    setRestoreBusy(true);
    setRestoreStatus('Restoring...');
    setEditError(null);
    setEditElapsed(0);
    const t0 = Date.now();
    editTimerRef.current = setInterval(() => {
      if (mountedRef.current) setEditElapsed(Math.floor((Date.now() - t0) / 1000));
    }, 500);
    const controller = registerRequest();
    try {
      const result = await restoreImageQuality(activeImage, {
        onStatus: (msg: string) => { if (mountedRef.current) setRestoreStatus(msg); },
      });
      if (!mountedRef.current || controller.signal.aborted) return;
      const secs = ((Date.now() - t0) / 1000).toFixed(1);
      setRestoreStatus(`Restored in ${secs}s`);
      pushHistory(result.image, 'Restore');
      setNodes((nds) => nds.map((n) =>
        n.id === activeSource.nodeId ? { ...n, data: { ...n.data, generatedImage: result.image } } : n,
      ));
      setTimeout(() => { if (mountedRef.current) setRestoreStatus(null); }, 3000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.toLowerCase().includes('cancel') && !msg.toLowerCase().includes('abort')) setEditError(msg);
      setRestoreStatus(null);
    } finally {
      clearInterval(editTimerRef.current);
      unregisterRequest(controller);
      setRestoreBusy(false);
      setEditElapsed(0);
    }
  }, [activeImage, activeSource, restoreBusy, editBusy, setNodes, pushHistory]);

  // ── Mask / Brush ──
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const [maskTool, setMaskTool] = useState<MaskTool>('none');
  const [brushSize, setBrushSize] = useState(30);
  const isDrawing = useRef(false);
  const [brushPos, setBrushPos] = useState<{ x: number; y: number } | null>(null);
  const lastDrawPos = useRef<{ x: number; y: number } | null>(null);

  // ── Precision Point ──
  const [pointPin, setPointPin] = useState<PointPin | null>(null);
  const [pointText, setPointText] = useState('');
  const pointInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const canvas = maskCanvasRef.current;
    if (!canvas || !imgSize.w || !imgSize.h) return;
    if (canvas.width !== imgSize.w || canvas.height !== imgSize.h) {
      canvas.width = imgSize.w;
      canvas.height = imgSize.h;
    }
  }, [imgSize]);

  const toCanvasCoords = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  }, []);

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
    ctx.fillStyle = maskTool === 'eraser' ? 'rgba(0,0,0,1)' : 'rgba(255, 60, 60, 0.45)';
    const prev = lastDrawPos.current;
    if (prev) {
      const dx = x - prev.x;
      const dy = y - prev.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const step = Math.max(2, radius * 0.3);
      const steps = Math.ceil(dist / step);
      for (let i = 0; i <= steps; i++) {
        const t = steps === 0 ? 0 : i / steps;
        ctx.beginPath();
        ctx.arc(prev.x + dx * t, prev.y + dy * t, radius, 0, Math.PI * 2);
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
    if (maskTool === 'none' || maskTool === 'point') return;
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
    if (!isDrawing.current || maskTool === 'none' || maskTool === 'point') return;
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
    for (let i = 3; i < px.length; i += 4) { if (px[i] > 0) return true; }
    return false;
  }, []);

  const exportMaskComposite = useCallback(async (srcImage: GeneratedImage): Promise<GeneratedImage> => {
    const maskCanvas = maskCanvasRef.current!;
    const w = maskCanvas.width, h = maskCanvas.height;
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
        compData.data[i] = Math.round(compData.data[i] * (1 - a));
        compData.data[i + 1] = Math.round(compData.data[i + 1] * (1 - a) + 255 * a);
        compData.data[i + 2] = Math.round(compData.data[i + 2] * (1 - a));
      }
    }
    ctx.putImageData(compData, 0, 0);
    const dataUrl = compositeCanvas.toDataURL('image/png');
    return { base64: dataUrl.split(',')[1], mimeType: 'image/png' };
  }, []);

  // ── Point-click on canvas in point mode ──
  const handleCanvasPointClick = useCallback((e: React.MouseEvent) => {
    if (maskTool !== 'point' || !imgSize.w || !imgSize.h) return;
    const area = canvasAreaRef.current;
    if (!area) return;
    const areaRect = area.getBoundingClientRect();
    const screenX = e.clientX - areaRect.left;
    const screenY = e.clientY - areaRect.top;
    const centerX = areaRect.width / 2;
    const centerY = areaRect.height / 2;
    const imgX = ((screenX - centerX - pan.x) / zoom + imgSize.w / 2);
    const imgY = ((screenY - centerY - pan.y) / zoom + imgSize.h / 2);
    if (imgX < 0 || imgX > imgSize.w || imgY < 0 || imgY > imgSize.h) return;
    setPointPin({ imgX, imgY, screenX, screenY });
    setPointText('');
    setTimeout(() => pointInputRef.current?.focus(), 50);
  }, [maskTool, imgSize, zoom, pan]);

  // ── Build point prompt with coordinate context ──
  const buildPointPrompt = useCallback((text: string, pin: PointPin): string => {
    const pctX = Math.round((pin.imgX / imgSize.w) * 100);
    const pctY = Math.round((pin.imgY / imgSize.h) * 100);
    const quadrantH = pctX < 33 ? 'left' : pctX > 66 ? 'right' : 'center';
    const quadrantV = pctY < 33 ? 'top' : pctY > 66 ? 'bottom' : 'middle';
    return `The user has placed a precision marker on the image at approximately ${pctX}% from the left and ${pctY}% from the top (in the ${quadrantV}-${quadrantH} area of the image).

At that EXACT location in the image, please make the following change:
${text.trim()}

Only modify what is at or immediately around that specific point. Do NOT change anything else in the image. Preserve the overall composition, art style, quality, and — critically — the EXACT same camera distance, zoom level, and framing. Do NOT zoom in or crop tighter. NEVER cut off feet or head.`;
  }, [imgSize]);

  // ── Edit handler (shared for main edit + point edit) ──
  const executeEdit = useCallback(async (prompt: string, refImages: GeneratedImage | GeneratedImage[]) => {
    if (!activeImage || editBusy || !activeSource) return;
    setEditBusy(true);
    setEditError(null);
    setEditStatus('Generating...');
    setEditElapsed(0);
    const t0 = Date.now();
    editTimerRef.current = setInterval(() => {
      if (mountedRef.current) setEditElapsed(Math.floor((Date.now() - t0) / 1000));
    }, 500);
    pushHistory(activeImage, 'Before edit');
    const controller = registerRequest();
    try {
      const modelLabel = editModel === 'gemini-flash-image' ? 'NB2' : 'NB Pro';
      setEditStatus(`Waiting for ${modelLabel}...`);
      const results = await generateWithGeminiRef(prompt, refImages, editModel);
      if (!mountedRef.current || controller.signal.aborted) return;
      const img = results[0];
      if (!img) throw new Error('No image returned');
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      setEditStatus(`Done in ${elapsed}s`);
      pushHistory(img, prompt.slice(0, 50));
      setNodes((nds) => nds.map((n) =>
        n.id === activeSource.nodeId ? { ...n, data: { ...n.data, generatedImage: img } } : n,
      ));
      const snapshot = { image: img, label: prompt.slice(0, 50) };
      const allEdges = getEdges();
      const historyIds: string[] = [];
      for (const e of allEdges) {
        const peerId = e.source === activeSource.nodeId ? e.target : e.target === activeSource.nodeId ? e.source : null;
        if (!peerId) continue;
        if (getNode(peerId)?.type === 'charHistory') historyIds.push(peerId);
      }
      if (historyIds.length > 0) {
        setTimeout(() => {
          setNodes((nds) => nds.map((n) =>
            historyIds.includes(n.id) ? { ...n, data: { ...n.data, _pendingSnapshot: snapshot } } : n,
          ));
        }, 150);
      }
      setTimeout(() => { if (mountedRef.current) setEditStatus(null); }, 3000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.toLowerCase().includes('cancel') && !msg.toLowerCase().includes('abort')) setEditError(msg);
      setEditStatus(null);
    } finally {
      clearInterval(editTimerRef.current);
      unregisterRequest(controller);
      setEditBusy(false);
      setEditElapsed(0);
    }
  }, [activeImage, activeSource, editBusy, editModel, getNode, getEdges, setNodes, pushHistory]);

  const handleEdit = useCallback(async () => {
    if (!activeImage || !editText.trim() || editBusy || !activeSource) return;
    const hasMask = maskHasContent();
    let prompt: string;
    let refImages: GeneratedImage | GeneratedImage[];
    if (hasMask) {
      const composite = await exportMaskComposite(activeImage);
      prompt = `You are an expert image inpainting tool. I am giving you two images.

IMAGE 1 (REFERENCE): The original image — this is the GROUND TRUTH.
IMAGE 2 (EDIT MAP): The same image with BRIGHT GREEN highlighting over area(s) to modify.

INSTRUCTIONS FOR THE GREEN REGION ONLY:
${editText.trim()}

ABSOLUTE CONSTRAINTS:
1. DO NOT alter ANY pixel outside the green highlight — perfect copy of Image 1.
2. Changes STRICTLY within the green boundary only.
3. Blend seamlessly at edges — match lighting, color, texture, style.
4. Same art style, perspective, proportions, quality.
5. Full image at same resolution.
6. Maintain the EXACT same camera distance, zoom level, and framing — do NOT zoom in or crop tighter.`;
      refImages = [activeImage, composite];
    } else {
      prompt = `Edit this image: ${editText.trim()}.\nPreserve the overall composition, style, and — critically — the EXACT same camera distance, zoom level, and framing. The character must occupy the same area of the frame. Do NOT zoom in, do NOT crop tighter, do NOT push the camera closer. If the image shows full body head-to-toe, keep full body head-to-toe with the same padding above the head and below the feet. NEVER cut off feet or head.`;
      refImages = activeImage;
    }
    await executeEdit(prompt, refImages);
    if (hasMask) clearMask();
    setEditText('');
  }, [activeImage, activeSource, editText, editBusy, maskHasContent, exportMaskComposite, clearMask, executeEdit]);

  const handlePointEdit = useCallback(async () => {
    if (!activeImage || !pointText.trim() || editBusy || !activeSource || !pointPin) return;
    const prompt = buildPointPrompt(pointText, pointPin);
    await executeEdit(prompt, activeImage);
    setPointPin(null);
    setPointText('');
  }, [activeImage, activeSource, pointText, editBusy, pointPin, buildPointPrompt, executeEdit]);

  // ── Paste image support ──
  const handlePasteImage = useCallback((img: GeneratedImage) => {
    if (!activeSource) return;
    setNodes((nds) => nds.map((n) =>
      n.id === activeSource.nodeId ? { ...n, data: { ...n.data, generatedImage: img } } : n,
    ));
  }, [activeSource, setNodes]);

  // ── Export helpers ──
  const copyImage = useCallback(async () => {
    if (!activeImage) return;
    try {
      const blob = await fetch(`data:${activeImage.mimeType};base64,${activeImage.base64}`).then(r => r.blob());
      const pngBlob = activeImage.mimeType === 'image/png' ? blob : blob;
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);
    } catch { /* best-effort */ }
  }, [activeImage]);

  const downloadImage = useCallback(async () => {
    if (!activeImage) return;
    try {
      const blob = await fetch(`data:${activeImage.mimeType};base64,${activeImage.base64}`).then(r => r.blob());
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeSource?.label ?? 'image'}-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* best-effort */ }
  }, [activeImage, activeSource]);

  const downloadAll = useCallback(async () => {
    const allImgs = sources.filter(s => s.image).map(s => ({ image: s.image!, label: s.label }));
    for (const { image, label } of allImgs) {
      try {
        const blob = await fetch(`data:${image.mimeType};base64,${image.base64}`).then(r => r.blob());
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${label}-${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(url);
      } catch { /* best-effort */ }
    }
  }, [sources]);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'Escape') { if (pointPin) { setPointPin(null); } else { onClose(); } return; }
      if (e.key === '[') { e.preventDefault(); setBrushSize((s) => Math.max(3, s - (s > 20 ? 5 : 2))); }
      if (e.key === ']') { e.preventDefault(); setBrushSize((s) => Math.min(200, s + (s >= 20 ? 5 : 2))); }
      if (e.key === 'b' || e.key === 'B') setMaskTool((t) => t === 'brush' ? 'none' : 'brush');
      if (e.key === 'e' || e.key === 'E') setMaskTool((t) => t === 'eraser' ? 'none' : 'eraser');
      if (e.key === 'p' || e.key === 'P') setMaskTool((t) => t === 'point' ? 'none' : 'point');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, pointPin]);

  useEffect(() => { clearMask(); setImgSize({ w: 0, h: 0 }); setPointPin(null); }, [activeIdx, clearMask]);

  const handleHistoryClick = useCallback((idx: number) => {
    setActiveHistIdx(idx);
    const entry = historyEntries[idx];
    if (!entry || !activeSource) return;
    skipFitRef.current = true;
    setNodes((nds) => nds.map((n) =>
      n.id === activeSource.nodeId ? { ...n, data: { ...n.data, generatedImage: entry.image } } : n,
    ));
  }, [historyEntries, activeSource, setNodes]);

  const isBrushMode = maskTool === 'brush' || maskTool === 'eraser';
  const canvasCursor = isPanning ? 'grabbing' : maskTool === 'point' ? 'crosshair' : isBrushMode ? 'none' : 'default';
  const screenBrushSize = brushSize * zoom;

  // Compute point pin screen position
  const pinScreenPos = pointPin && imgSize.w && canvasAreaRef.current ? (() => {
    const areaRect = canvasAreaRef.current!.getBoundingClientRect();
    const cx = areaRect.width / 2;
    const cy = areaRect.height / 2;
    const sx = cx + pan.x + (pointPin.imgX - imgSize.w / 2) * zoom;
    const sy = cy + pan.y + (pointPin.imgY - imgSize.h / 2) * zoom;
    return { x: sx, y: sy };
  })() : null;

  return (
    <div className="ge-backdrop" onClick={onClose}>
      <div className="ge-panel" onClick={(e) => e.stopPropagation()}>

        {/* ── Top Bar ── */}
        <div className="ge-topbar">
          <span className="ge-topbar-title">Image Studio</span>
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

          {/* ── Left Toolbar (wide, labeled) ── */}
          <div className="ge-left-toolbar">
            <span className="ge-ltool-group-label">Paint Tools</span>
            <button
              className={`ge-ltool-btn ${maskTool === 'brush' ? 'active' : ''}`}
              onClick={() => setMaskTool(maskTool === 'brush' ? 'none' : 'brush')}
              title="Brush — paint mask for inpainting"
            >
              <span className="ge-ltool-icon">🖌️</span>
              <span className="ge-ltool-label">Brush</span>
              <span className="ge-ltool-shortcut">B</span>
            </button>
            <button
              className={`ge-ltool-btn ${maskTool === 'eraser' ? 'active' : ''}`}
              onClick={() => setMaskTool(maskTool === 'eraser' ? 'none' : 'eraser')}
              title="Eraser — remove mask paint"
            >
              <span className="ge-ltool-icon">🧹</span>
              <span className="ge-ltool-label">Eraser</span>
              <span className="ge-ltool-shortcut">E</span>
            </button>
            <button
              className={`ge-ltool-btn ${maskTool === 'point' ? 'active' : ''}`}
              onClick={() => { setMaskTool(maskTool === 'point' ? 'none' : 'point'); setPointPin(null); }}
              title="Precision Point — click a spot and describe what to change"
            >
              <span className="ge-ltool-icon">📌</span>
              <span className="ge-ltool-label">Point</span>
              <span className="ge-ltool-shortcut">P</span>
            </button>

            <div className="ge-ltool-sep" />
            <span className="ge-ltool-group-label">Brush Size</span>
            <div className="ge-ltool-slider-row">
              <input
                type="range"
                min={3}
                max={200}
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
                title={`Brush size: ${brushSize}px  [ ] to adjust`}
              />
              <span>{brushSize}px</span>
            </div>

            <div className="ge-ltool-sep" />
            <button className="ge-ltool-btn danger" onClick={clearMask} title="Clear all mask paint">
              <span className="ge-ltool-icon">🗑️</span>
              <span className="ge-ltool-label">Clear Mask</span>
            </button>

            <div className="ge-ltool-sep" />
            <span className="ge-ltool-group-label">Export</span>
            <button
              className="ge-ltool-btn"
              onClick={copyImage}
              disabled={!activeImage}
              title="Copy active image to clipboard"
            >
              <span className="ge-ltool-icon">📋</span>
              <span className="ge-ltool-label">Copy Image</span>
            </button>
            <button
              className="ge-ltool-btn"
              onClick={downloadImage}
              disabled={!activeImage}
              title="Download active image as PNG"
            >
              <span className="ge-ltool-icon">📥</span>
              <span className="ge-ltool-label">Download Image</span>
            </button>
            <button
              className="ge-ltool-btn"
              onClick={downloadAll}
              disabled={sources.every(s => !s.image)}
              title="Download all connected images"
            >
              <span className="ge-ltool-icon">📦</span>
              <span className="ge-ltool-label">Download All</span>
            </button>

            <div className="ge-ltool-sep" />
            <span className="ge-ltool-group-label">Enhance</span>
            <button
              className="ge-ltool-btn"
              onClick={handleRestore}
              disabled={!activeImage || restoreBusy || editBusy}
              title="Restore — regenerate with fresh background, resolution, and materials"
            >
              <span className="ge-ltool-icon">✨</span>
              <span className="ge-ltool-label">
                {restoreBusy ? `${editElapsed}s...` : 'Restore'}
              </span>
            </button>
            {restoreStatus && (
              <div style={{ fontSize: 9, color: '#69f0ae', textAlign: 'center', padding: '2px 4px' }}>
                {restoreStatus}
              </div>
            )}
          </div>

          {/* ── Main Canvas Area ── */}
          <div
            ref={canvasAreaRef}
            className="ge-canvas-area"
            style={{ cursor: canvasCursor }}
            onWheel={handleWheel}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={(e) => {
              handleCanvasMouseMove(e);
              if (isBrushMode) setBrushPos(toAreaCoords(e));
            }}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={() => { handleCanvasMouseUp(); handleMaskMouseUp(); setBrushPos(null); }}
            onClick={handleCanvasPointClick}
          >
            {activeImage ? (
              <>
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

                  <canvas
                    ref={maskCanvasRef}
                    className="ge-mask-layer"
                    style={{ pointerEvents: isBrushMode ? 'auto' : 'none' }}
                    onWheel={handleWheel}
                    onMouseDown={(e) => {
                      if (e.button === 1 || (e.button === 0 && e.altKey)) handleCanvasMouseDown(e);
                      else handleMaskMouseDown(e);
                    }}
                    onMouseMove={(e) => { handleCanvasMouseMove(e); handleMaskMouseMove(e); }}
                    onMouseUp={() => { handleCanvasMouseUp(); handleMaskMouseUp(); }}
                    onMouseLeave={() => { handleCanvasMouseUp(); handleMaskMouseUp(); setBrushPos(null); }}
                  />
                </div>

                {isBrushMode && brushPos && !isPanning && (
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

                {/* Precision point pin + popup */}
                {pinScreenPos && (
                  <>
                    <div className="ge-point-pin" style={{ left: pinScreenPos.x, top: pinScreenPos.y }} />
                    <div
                      className="ge-point-popup"
                      style={{
                        left: Math.min(pinScreenPos.x + 12, (canvasAreaRef.current?.clientWidth ?? 500) - 280),
                        top: pinScreenPos.y - 16,
                      }}
                    >
                      <input
                        ref={pointInputRef}
                        type="text"
                        value={pointText}
                        onChange={(e) => setPointText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !editBusy) handlePointEdit(); if (e.key === 'Escape') setPointPin(null); }}
                        placeholder="Describe change at this point..."
                        disabled={editBusy}
                      />
                      <button onClick={handlePointEdit} disabled={editBusy || !pointText.trim()}>
                        {editBusy ? `${editElapsed}s` : 'Apply'}
                      </button>
                      <button className="ge-point-dismiss" onClick={() => setPointPin(null)}>&times;</button>
                    </div>
                  </>
                )}
              </>
            ) : (
              <span className="ge-canvas-empty">
                {activeSource
                  ? <>No image generated for <strong>{activeSource.label}</strong> yet.<br />Generate an image in the node first.</>
                  : <>No image selected.<br />Connect image nodes and click one in the sidebar.</>
                }
              </span>
            )}
          </div>

          {/* ── Right Sidebar ── */}
          <div className="ge-sidebar">
            {/* Connected images — top half */}
            <div className="ge-sidebar-half">
              <div className="ge-sidebar-header">
                Connected Images
                {sources.length > 0 && <span style={{ fontSize: 9, color: '#555' }}>{sources.length}</span>}
              </div>
              <div className="ge-sidebar-list">
                {sources.length === 0 && (
                  <div style={{ padding: '12px 8px', fontSize: 11, color: '#555', textAlign: 'center' }}>
                    No images connected.<br />Wire image nodes into the Image Studio node.
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
            </div>

            {/* Edit history — bottom half */}
            <div className="ge-sidebar-half">
              <div className="ge-sidebar-header">
                Edit History
                {historyEntries.length > 0 && <span style={{ fontSize: 9, color: '#555' }}>{historyEntries.length}</span>}
              </div>
              <div className="ge-history-list">
                {historyEntries.length === 0 && (
                  <div style={{ padding: '12px 8px', fontSize: 10, color: '#444', textAlign: 'center' }}>
                    No edits yet — history appears here as you make changes.
                  </div>
                )}
                {historyEntries.map((entry, i) => (
                  <div
                    key={`${entry.timestamp}-${i}`}
                    className={`ge-history-item ${i === activeHistIdx ? 'active' : ''}`}
                    onClick={() => handleHistoryClick(i)}
                  >
                    <img
                      src={`data:${entry.image.mimeType};base64,${entry.image.base64}`}
                      alt={entry.label}
                      className="ge-history-thumb"
                    />
                    <span className="ge-history-label">{entry.label}</span>
                    <span className="ge-history-time">
                      {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Edit bar */}
            <div className="ge-edit-section">
              <div className="ge-edit-row">
                <input
                  type="text"
                  className="ge-edit-input"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !editBusy) handleEdit(); }}
                  placeholder={isBrushMode ? 'Describe replacement for masked area...' : 'Edit image (e.g. add hat)...'}
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
                <option value="gemini-flash-image">⚡ NB2 (Gemini 3.1 Flash) — 4K — ~5-15s</option>
                <option value="gemini-3-pro">✦ NB Pro (Gemini 3 Pro) — 4K — ~20-40s</option>
                <option value="gemini-2.5-flash">⚡ Gemini 2.5 Flash — 1K — ~5-10s</option>
                <option value="gemini-2.0-flash">⚡ Gemini 2.0 Flash — 1K — ~3-8s</option>
                <option value="gemini-2.0-flash-lite">⚡ Gemini 2.0 Flash Lite — 1K — ~2-5s</option>
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

        {/* ── Bottom Status Bar ── */}
        <div className="ge-statusbar">
          <span>{Math.round(zoom * 100)}%</span>
          {imgSize.w > 0 && (
            <>
              <span className="ge-statusbar-sep" />
              <span>{imgSize.w} &times; {imgSize.h}</span>
            </>
          )}
          <span style={{ flex: 1 }} />
          <span>{isBrushMode ? `${maskTool} · ${brushSize}px` : maskTool === 'point' ? 'Point mode — click on image' : 'No tool'}</span>
        </div>
      </div>
    </div>
  );
}
