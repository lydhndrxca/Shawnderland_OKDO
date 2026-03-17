"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode, type Dispatch, type SetStateAction,
} from 'react';
import { useReactFlow, useStore } from '@xyflow/react';
import {
  generateWithGeminiRef,
  restoreImageQuality,
  type GeneratedImage,
  type GeminiImageModel,
} from '@/lib/ideation/engine/conceptlab/imageGenApi';
import { registerRequest, unregisterRequest } from '@/lib/activeRequests';
import type { EditorTool, PanelTab, ConnectedSource, HistoryEntry, PointPin } from './types';
import { NODE_TYPE_LABELS } from './types';
import * as Mask from './engines/maskEngine';

const MIN_ZOOM = 0.02;
const MAX_ZOOM = 30;

export interface EditorCtx {
  activeTool: EditorTool;
  setActiveTool: (t: EditorTool) => void;
  prevToolRef: React.RefObject<EditorTool>;

  sources: ConnectedSource[];
  activeSourceIdx: number;
  setActiveSourceIdx: (i: number) => void;
  activeSource: ConnectedSource | null;
  activeImage: GeneratedImage | null;

  zoom: number;
  setZoom: Dispatch<SetStateAction<number>>;
  pan: { x: number; y: number };
  setPan: Dispatch<SetStateAction<{ x: number; y: number }>>;
  imgSize: { w: number; h: number };
  setImgSize: Dispatch<SetStateAction<{ w: number; h: number }>>;
  canvasAreaRef: React.RefObject<HTMLDivElement | null>;
  fitToView: () => void;
  skipFitRef: React.MutableRefObject<boolean>;

  panelsVisible: boolean;
  setPanelsVisible: Dispatch<SetStateAction<boolean>>;
  activePanel: PanelTab;
  setActivePanel: (t: PanelTab) => void;

  historyEntries: HistoryEntry[];
  pushHistory: (img: GeneratedImage, label: string) => void;
  activeHistIdx: number;
  handleHistoryClick: (idx: number) => void;

  editBusy: boolean;
  editStatus: string | null;
  editError: string | null;
  editElapsed: number;
  editModel: GeminiImageModel;
  setEditModel: (m: GeminiImageModel) => void;
  executeEdit: (prompt: string, refs: GeneratedImage | GeneratedImage[]) => Promise<void>;
  handlePromptEdit: (text: string) => Promise<void>;

  maskCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  brushSize: number;
  setBrushSize: Dispatch<SetStateAction<number>>;
  maskHasContent: () => boolean;
  clearMask: () => void;
  exportMaskComposite: (src: GeneratedImage) => Promise<GeneratedImage>;

  restoreBusy: boolean;
  handleRestore: () => Promise<void>;

  pointPin: PointPin | null;
  setPointPin: Dispatch<SetStateAction<PointPin | null>>;
  pointText: string;
  setPointText: Dispatch<SetStateAction<string>>;
  handlePointEdit: () => Promise<void>;

  handlePasteImage: (img: GeneratedImage) => void;

  cursorPos: { imgX: number; imgY: number } | null;
  setCursorPos: (p: { imgX: number; imgY: number } | null) => void;

  comparisonActive: boolean;
  setComparisonActive: Dispatch<SetStateAction<boolean>>;

  editorNodeId: string;
  onClose: () => void;
}

const Ctx = createContext<EditorCtx | null>(null);

export function useEditor(): EditorCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useEditor must be inside EditorProvider');
  return c;
}

export function EditorProvider({
  editorNodeId, onClose, children,
}: {
  editorNodeId: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const { getNode, getEdges, setNodes } = useReactFlow();

  /* ── Tool ── */
  const [activeTool, setActiveToolRaw] = useState<EditorTool>('move');
  const prevToolRef = useRef<EditorTool>('move');
  const setActiveTool = useCallback((t: EditorTool) => {
    setActiveToolRaw((prev) => { prevToolRef.current = prev; return t; });
  }, []);

  /* ── Sources ── */
  const connectedSig = useStore(
    useCallback(
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
    ),
  );

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectedSig, editorNodeId, getNode, getEdges]);

  const [activeSourceIdx, setActiveSourceIdx] = useState(0);
  useEffect(() => {
    if (activeSourceIdx >= sources.length && sources.length > 0) setActiveSourceIdx(0);
  }, [activeSourceIdx, sources.length]);
  const activeSource = sources[activeSourceIdx] ?? null;
  const activeImage = activeSource?.image ?? null;

  /* ── Viewport ── */
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const canvasAreaRef = useRef<HTMLDivElement | null>(null);
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

  /* ── Panels ── */
  const [panelsVisible, setPanelsVisible] = useState(true);
  const [activePanel, setActivePanel] = useState<PanelTab>('history');

  /* ── History ── */
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

  const handleHistoryClick = useCallback((idx: number) => {
    setActiveHistIdx(idx);
    const entry = historyEntries[idx];
    if (!entry || !activeSource) return;
    skipFitRef.current = true;
    setNodes((nds) => nds.map((n) =>
      n.id === activeSource.nodeId ? { ...n, data: { ...n.data, generatedImage: entry.image } } : n,
    ));
  }, [historyEntries, activeSource, setNodes]);

  /* ── Edit ── */
  const [editBusy, setEditBusy] = useState(false);
  const [editStatus, setEditStatus] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [editElapsed, setEditElapsed] = useState(0);
  const [editModel, setEditModel] = useState<GeminiImageModel>('gemini-flash-image');
  const editTimerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const mountedRef = useRef(true);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  const updateNodeImage = useCallback((img: GeneratedImage) => {
    if (!activeSource) return;
    setNodes((nds) => nds.map((n) =>
      n.id === activeSource.nodeId ? { ...n, data: { ...n.data, generatedImage: img } } : n,
    ));
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
          historyIds.includes(n.id)
            ? { ...n, data: { ...n.data, _pendingSnapshot: { image: img, label: 'Editor edit' } } }
            : n,
        ));
      }, 150);
    }
  }, [activeSource, setNodes, getEdges, getNode]);

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
      const modelLabel = editModel === 'gemini-flash-image' ? 'NB2' : editModel === 'gemini-3-pro' ? 'NB Pro' : 'Gemini';
      setEditStatus(`Waiting for ${modelLabel}...`);
      const results = await generateWithGeminiRef(prompt, refImages, editModel);
      if (!mountedRef.current || controller.signal.aborted) return;
      const img = results[0];
      if (!img) throw new Error('No image returned');
      setEditStatus(`Done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
      pushHistory(img, prompt.slice(0, 50));
      updateNodeImage(img);
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
  }, [activeImage, activeSource, editBusy, editModel, pushHistory, updateNodeImage]);

  /* ── Mask ── */
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [brushSize, setBrushSize] = useState(30);

  const maskHasContentFn = useCallback(() => {
    return maskCanvasRef.current ? Mask.maskHasContent(maskCanvasRef.current) : false;
  }, []);

  const clearMaskFn = useCallback(() => {
    if (maskCanvasRef.current) Mask.clearMask(maskCanvasRef.current);
  }, []);

  const exportMaskCompositeFn = useCallback(async (src: GeneratedImage) => {
    return Mask.exportMaskComposite(maskCanvasRef.current!, src);
  }, []);

  /* ── Prompt Edit (mask-aware) ── */
  const handlePromptEdit = useCallback(async (text: string) => {
    if (!activeImage || editBusy || !activeSource || !text.trim()) return;
    const hasMask = maskHasContentFn();
    let prompt: string;
    let refImages: GeneratedImage | GeneratedImage[];
    if (hasMask) {
      const composite = await exportMaskCompositeFn(activeImage);
      prompt = `You are an expert image inpainting tool. I am giving you two images.\n\nIMAGE 1 (REFERENCE): The original image — this is the GROUND TRUTH.\nIMAGE 2 (EDIT MAP): The same image with BRIGHT GREEN highlighting over area(s) to modify.\n\nINSTRUCTIONS FOR THE GREEN REGION ONLY:\n${text.trim()}\n\nABSOLUTE CONSTRAINTS:\n1. DO NOT alter ANY pixel outside the green highlight — perfect copy of Image 1.\n2. Changes STRICTLY within the green boundary only.\n3. Blend seamlessly at edges — match lighting, color, texture, style.\n4. Same art style, perspective, proportions, quality.\n5. Full image at same resolution.\n6. Maintain the EXACT same camera distance, zoom level, and framing — do NOT zoom in or crop tighter.`;
      refImages = [activeImage, composite];
    } else {
      prompt = `Edit this image: ${text.trim()}.\nPreserve the overall composition, style, and — critically — the EXACT same camera distance, zoom level, and framing. The character must occupy the same area of the frame. Do NOT zoom in, do NOT crop tighter. NEVER cut off feet or head.`;
      refImages = activeImage;
    }
    await executeEdit(prompt, refImages);
    if (hasMask) clearMaskFn();
  }, [activeImage, activeSource, editBusy, maskHasContentFn, exportMaskCompositeFn, clearMaskFn, executeEdit]);

  /* ── Restore ── */
  const [restoreBusy, setRestoreBusy] = useState(false);
  const handleRestore = useCallback(async () => {
    if (!activeImage || restoreBusy || editBusy || !activeSource) return;
    setRestoreBusy(true);
    setEditError(null);
    setEditElapsed(0);
    setEditStatus('Restoring...');
    const t0 = Date.now();
    editTimerRef.current = setInterval(() => {
      if (mountedRef.current) setEditElapsed(Math.floor((Date.now() - t0) / 1000));
    }, 500);
    const controller = registerRequest();
    try {
      const result = await restoreImageQuality(activeImage, {
        onStatus: (msg: string) => { if (mountedRef.current) setEditStatus(msg); },
      });
      if (!mountedRef.current || controller.signal.aborted) return;
      setEditStatus(`Restored in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
      pushHistory(result.image, 'Restore');
      updateNodeImage(result.image);
      setTimeout(() => { if (mountedRef.current) setEditStatus(null); }, 3000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.toLowerCase().includes('cancel') && !msg.toLowerCase().includes('abort')) setEditError(msg);
      setEditStatus(null);
    } finally {
      clearInterval(editTimerRef.current);
      unregisterRequest(controller);
      setRestoreBusy(false);
      setEditElapsed(0);
    }
  }, [activeImage, activeSource, restoreBusy, editBusy, pushHistory, updateNodeImage]);

  /* ── Point ── */
  const [pointPin, setPointPin] = useState<PointPin | null>(null);
  const [pointText, setPointText] = useState('');

  const handlePointEdit = useCallback(async () => {
    if (!activeImage || !pointText.trim() || editBusy || !activeSource || !pointPin) return;
    const pctX = Math.round((pointPin.imgX / imgSize.w) * 100);
    const pctY = Math.round((pointPin.imgY / imgSize.h) * 100);
    const qH = pctX < 33 ? 'left' : pctX > 66 ? 'right' : 'center';
    const qV = pctY < 33 ? 'top' : pctY > 66 ? 'bottom' : 'middle';
    const prompt = `The user placed a precision marker at ~${pctX}% from left and ${pctY}% from top (${qV}-${qH} area).\n\nAt that EXACT location, make this change:\n${pointText.trim()}\n\nOnly modify what is at or immediately around that point. Preserve composition, style, camera distance, zoom, framing. Do NOT zoom in or crop. NEVER cut off feet or head.`;
    await executeEdit(prompt, activeImage);
    setPointPin(null);
    setPointText('');
  }, [activeImage, activeSource, pointText, editBusy, pointPin, imgSize, executeEdit]);

  /* ── Paste ── */
  const handlePasteImage = useCallback((img: GeneratedImage) => {
    if (!activeSource) return;
    pushHistory(img, 'Paste');
    setNodes((nds) => nds.map((n) =>
      n.id === activeSource.nodeId ? { ...n, data: { ...n.data, generatedImage: img } } : n,
    ));
  }, [activeSource, setNodes, pushHistory]);

  /* ── Cursor ── */
  const [cursorPos, setCursorPos] = useState<{ imgX: number; imgY: number } | null>(null);

  /* ── Comparison ── */
  const [comparisonActive, setComparisonActive] = useState(false);

  /* ── Reset on source change ── */
  useEffect(() => {
    clearMaskFn();
    setImgSize({ w: 0, h: 0 });
    setPointPin(null);
  }, [activeSourceIdx, clearMaskFn]);

  /* ── Memoized context value ── */
  const value = useMemo<EditorCtx>(() => ({
    activeTool, setActiveTool, prevToolRef,
    sources, activeSourceIdx, setActiveSourceIdx, activeSource, activeImage,
    zoom, setZoom, pan, setPan, imgSize, setImgSize, canvasAreaRef, fitToView, skipFitRef,
    panelsVisible, setPanelsVisible, activePanel, setActivePanel,
    historyEntries, pushHistory, activeHistIdx, handleHistoryClick,
    editBusy, editStatus, editError, editElapsed, editModel, setEditModel, executeEdit, handlePromptEdit,
    maskCanvasRef, brushSize, setBrushSize,
    maskHasContent: maskHasContentFn, clearMask: clearMaskFn, exportMaskComposite: exportMaskCompositeFn,
    restoreBusy, handleRestore,
    pointPin, setPointPin, pointText, setPointText, handlePointEdit,
    handlePasteImage,
    cursorPos, setCursorPos,
    comparisonActive, setComparisonActive,
    editorNodeId, onClose,
  }), [
    activeTool, setActiveTool,
    sources, activeSourceIdx, activeSource, activeImage,
    zoom, pan, imgSize, fitToView,
    panelsVisible, activePanel,
    historyEntries, pushHistory, activeHistIdx, handleHistoryClick,
    editBusy, editStatus, editError, editElapsed, editModel, executeEdit, handlePromptEdit,
    brushSize, maskHasContentFn, clearMaskFn, exportMaskCompositeFn,
    restoreBusy, handleRestore,
    pointPin, pointText, handlePointEdit,
    handlePasteImage,
    cursorPos, comparisonActive,
    editorNodeId, onClose,
  ]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
