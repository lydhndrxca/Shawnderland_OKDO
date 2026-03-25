"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

export type EditorTool = 'select' | 'move' | 'rotate' | 'scale' | 'ffd';
export type TransformMode = 'translate' | 'rotate' | 'scale';

export interface FFDState {
  enabled: boolean;
  divisions: { x: number; y: number; z: number };
  latticePoints: THREE.Vector3[];
  selectedPointIndices: number[];
}

export interface RefBlock {
  id: string;
  sizeUU: number;
  position: THREE.Vector3;
  visible: boolean;
}

export interface SnapSettings {
  enabled: boolean;
  value: number;
}

export interface HistoryEntry {
  label: string;
  timestamp: number;
  snapshot: UndoSnapshot;
}

interface UndoSnapshot {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
  pivotOffset: THREE.Vector3;
  ffdLatticePoints: THREE.Vector3[];
  refBlocks: RefBlock[];
}

const MAX_UNDO = 50;

export interface Model3DEditorState {
  activeTool: EditorTool;
  transformMode: TransformMode;
  pivotOffset: THREE.Vector3;
  pivotSnapMode: boolean;
  ffd: FFDState;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
  modelBBox: THREE.Box3 | null;
  modelSize: THREE.Vector3 | null;
  wireframe: boolean;
  showNormals: boolean;
  isDirty: boolean;
  glbUrl: string | null;
  modelRef: React.RefObject<THREE.Group | null>;
  cameraRef: React.RefObject<THREE.Camera | null>;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  refBlocks: RefBlock[];
  selectedBlockId: string | null;
  gridSnap: SnapSettings;
  scaleSnap: SnapSettings;
  rotateSnap: SnapSettings;
  canUndo: boolean;
  canRedo: boolean;
  historyEntries: HistoryEntry[];
  showHistory: boolean;
}

export interface Model3DEditorActions {
  setActiveTool: (tool: EditorTool) => void;
  setTransformMode: (mode: TransformMode) => void;
  setPivotOffset: (v: THREE.Vector3) => void;
  setPivotSnapMode: (on: boolean) => void;
  snapPivotToBottom: () => void;
  snapPivotToCenter: () => void;
  centerToOrigin: () => void;
  resetTransform: () => void;
  setFFDEnabled: (on: boolean) => void;
  setFFDDivisions: (d: { x: number; y: number; z: number }) => void;
  setFFDLatticePoints: (pts: THREE.Vector3[]) => void;
  setFFDSelectedPoints: (indices: number[]) => void;
  toggleFFDPointSelection: (idx: number) => void;
  setPosition: (v: THREE.Vector3) => void;
  setRotation: (e: THREE.Euler) => void;
  setScale: (v: THREE.Vector3) => void;
  setModelBBox: (box: THREE.Box3, size: THREE.Vector3) => void;
  setWireframe: (on: boolean) => void;
  setShowNormals: (on: boolean) => void;
  markDirty: () => void;
  addRefBlock: (sizeUU: number) => void;
  removeRefBlock: (id: string) => void;
  duplicateRefBlock: (id: string) => void;
  updateRefBlock: (id: string, patch: Partial<RefBlock>) => void;
  setSelectedBlock: (id: string | null) => void;
  toggleBlockVisibility: (id: string) => void;
  clearAllBlocks: () => void;
  setGridSnap: (patch: Partial<SnapSettings>) => void;
  setScaleSnap: (patch: Partial<SnapSettings>) => void;
  setRotateSnap: (patch: Partial<SnapSettings>) => void;
  pushUndo: (label?: string) => void;
  undo: () => void;
  redo: () => void;
  copySelectedBlock: () => void;
  pasteBlock: () => void;
  restoreHistoryEntry: (index: number) => void;
  setShowHistory: (on: boolean) => void;
}

interface EditorCtx {
  state: Model3DEditorState;
  actions: Model3DEditorActions;
  onClose: () => void;
}

const Ctx = createContext<EditorCtx | null>(null);

export function useModel3DEditor(): EditorCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error('useModel3DEditor must be used within Model3DEditorProvider');
  return c;
}

export function Model3DEditorProvider({
  glbUrl,
  onClose,
  children,
}: {
  glbUrl: string | null;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const modelRef = useRef<THREE.Group | null>(null);
  const cameraRef = useRef<THREE.Camera | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [activeTool, setActiveTool] = useState<EditorTool>('select');
  const [transformMode, setTransformMode] = useState<TransformMode>('translate');
  const [pivotOffset, setPivotOffset] = useState(() => new THREE.Vector3());
  const [pivotSnapMode, setPivotSnapMode] = useState(false);
  const [position, setPosition] = useState(() => new THREE.Vector3());
  const [rotation, setRotation] = useState(() => new THREE.Euler());
  const [scale, setScale] = useState(() => new THREE.Vector3(1, 1, 1));
  const [modelBBox, setModelBBoxState] = useState<THREE.Box3 | null>(null);
  const [modelSize, setModelSizeState] = useState<THREE.Vector3 | null>(null);
  const [wireframe, setWireframe] = useState(false);
  const [showNormals, setShowNormals] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);

  const [ffd, setFFD] = useState<FFDState>({
    enabled: false,
    divisions: { x: 2, y: 2, z: 2 },
    latticePoints: [],
    selectedPointIndices: [],
  });

  const [refBlocks, setRefBlocks] = useState<RefBlock[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [gridSnap, setGridSnapState] = useState<SnapSettings>({ enabled: false, value: 100 });
  const [scaleSnap, setScaleSnapState] = useState<SnapSettings>({ enabled: false, value: 100 });
  const [rotateSnap, setRotateSnapState] = useState<SnapSettings>({ enabled: false, value: 15 });

  const _blockCounter = useRef(0);
  const undoStackRef = useRef<UndoSnapshot[]>([]);
  const redoStackRef = useRef<UndoSnapshot[]>([]);
  const clipboardRef = useRef<RefBlock | null>(null);

  const captureSnapshot = useCallback((): UndoSnapshot => ({
    position: position.clone(),
    rotation: rotation.clone(),
    scale: scale.clone(),
    pivotOffset: pivotOffset.clone(),
    ffdLatticePoints: ffd.latticePoints.map((p) => p.clone()),
    refBlocks: refBlocks.map((b) => ({ ...b, position: b.position.clone() })),
  }), [position, rotation, scale, pivotOffset, ffd.latticePoints, refBlocks]);

  const rebuildHistory = useCallback(() => {
    setHistoryEntries(
      undoStackRef.current.map((snap, i) => ({
        label: (snap as UndoSnapshot & { _label?: string })._label || `Edit ${i + 1}`,
        timestamp: (snap as UndoSnapshot & { _timestamp?: number })._timestamp || Date.now(),
        snapshot: snap,
      }))
    );
  }, []);

  const pushUndo = useCallback((label?: string) => {
    const snap = captureSnapshot();
    (snap as UndoSnapshot & { _label?: string })._label = label || 'Edit';
    (snap as UndoSnapshot & { _timestamp?: number })._timestamp = Date.now();
    undoStackRef.current.push(snap);
    if (undoStackRef.current.length > MAX_UNDO) undoStackRef.current.shift();
    redoStackRef.current = [];
    setCanUndo(true);
    setCanRedo(false);
    rebuildHistory();
  }, [captureSnapshot, rebuildHistory]);

  const restoreSnapshot = useCallback((snap: UndoSnapshot) => {
    setPosition(snap.position);
    setRotation(snap.rotation);
    setScale(snap.scale);
    setPivotOffset(snap.pivotOffset);
    setFFD((f) => ({ ...f, latticePoints: snap.ffdLatticePoints }));
    setRefBlocks(snap.refBlocks);
    setIsDirty(true);
  }, []);

  const undo = useCallback(() => {
    const stack = undoStackRef.current;
    if (stack.length === 0) return;
    const current = captureSnapshot();
    (current as UndoSnapshot & { _label?: string })._label = 'Current';
    (current as UndoSnapshot & { _timestamp?: number })._timestamp = Date.now();
    redoStackRef.current.push(current);
    const snap = stack.pop()!;
    restoreSnapshot(snap);
    setCanUndo(stack.length > 0);
    setCanRedo(true);
    rebuildHistory();
  }, [captureSnapshot, restoreSnapshot, rebuildHistory]);

  const redo = useCallback(() => {
    const stack = redoStackRef.current;
    if (stack.length === 0) return;
    const current = captureSnapshot();
    (current as UndoSnapshot & { _label?: string })._label = 'Current';
    (current as UndoSnapshot & { _timestamp?: number })._timestamp = Date.now();
    undoStackRef.current.push(current);
    const snap = stack.pop()!;
    restoreSnapshot(snap);
    setCanUndo(true);
    setCanRedo(stack.length > 0);
    rebuildHistory();
  }, [captureSnapshot, restoreSnapshot, rebuildHistory]);

  const restoreHistoryEntry = useCallback((index: number) => {
    const stack = undoStackRef.current;
    if (index < 0 || index >= stack.length) return;
    const current = captureSnapshot();
    (current as UndoSnapshot & { _label?: string })._label = 'Current';
    (current as UndoSnapshot & { _timestamp?: number })._timestamp = Date.now();
    const removed = stack.splice(index);
    redoStackRef.current = [...removed.slice(1), current, ...redoStackRef.current];
    const snap = removed[0];
    restoreSnapshot(snap);
    setCanUndo(stack.length > 0);
    setCanRedo(true);
    rebuildHistory();
  }, [captureSnapshot, restoreSnapshot, rebuildHistory]);

  const setModelBBox = useCallback((box: THREE.Box3, size: THREE.Vector3) => {
    setModelBBoxState(box);
    setModelSizeState(size);
  }, []);

  const snapPivotToBottom = useCallback(() => {
    if (!modelBBox) return;
    const center = new THREE.Vector3();
    modelBBox.getCenter(center);
    setPivotOffset(new THREE.Vector3(center.x, modelBBox.min.y, center.z));
  }, [modelBBox]);

  const snapPivotToCenter = useCallback(() => {
    if (!modelBBox) return;
    const center = new THREE.Vector3();
    modelBBox.getCenter(center);
    setPivotOffset(center);
  }, [modelBBox]);

  const centerToOrigin = useCallback(() => {
    setPosition(new THREE.Vector3(0, 0, 0));
    setIsDirty(true);
  }, []);

  const resetTransform = useCallback(() => {
    setPosition(new THREE.Vector3(0, 0, 0));
    setRotation(new THREE.Euler(0, 0, 0));
    setScale(new THREE.Vector3(1, 1, 1));
    setIsDirty(true);
  }, []);

  const setToolWithMode = useCallback((tool: EditorTool) => {
    setActiveTool(tool);
    if (tool === 'move') setTransformMode('translate');
    else if (tool === 'rotate') setTransformMode('rotate');
    else if (tool === 'scale') setTransformMode('scale');
  }, []);

  const addRefBlock = useCallback((sizeUU: number) => {
    const id = `block-${Date.now()}-${_blockCounter.current++}`;
    setRefBlocks((prev) => [...prev, { id, sizeUU, position: new THREE.Vector3(0, (sizeUU / 100) / 2, 0), visible: true }]);
    setSelectedBlockId(id);
  }, []);

  const removeRefBlock = useCallback((id: string) => {
    setRefBlocks((prev) => prev.filter((b) => b.id !== id));
    setSelectedBlockId((cur) => (cur === id ? null : cur));
  }, []);

  const duplicateRefBlock = useCallback((id: string) => {
    setRefBlocks((prev) => {
      const src = prev.find((b) => b.id === id);
      if (!src) return prev;
      const newId = `block-${Date.now()}-${_blockCounter.current++}`;
      const offset = new THREE.Vector3(src.sizeUU / 100, 0, 0);
      const newBlock: RefBlock = { id: newId, sizeUU: src.sizeUU, position: src.position.clone().add(offset), visible: true };
      setSelectedBlockId(newId);
      return [...prev, newBlock];
    });
  }, []);

  const updateRefBlock = useCallback((id: string, patch: Partial<RefBlock>) => {
    setRefBlocks((prev) => prev.map((b) => b.id === id ? { ...b, ...patch } : b));
  }, []);

  const toggleBlockVisibility = useCallback((id: string) => {
    setRefBlocks((prev) => prev.map((b) => b.id === id ? { ...b, visible: !b.visible } : b));
  }, []);

  const clearAllBlocks = useCallback(() => {
    setRefBlocks([]);
    setSelectedBlockId(null);
  }, []);

  const setGridSnap = useCallback((patch: Partial<SnapSettings>) => {
    setGridSnapState((prev) => ({ ...prev, ...patch }));
  }, []);

  const setScaleSnap = useCallback((patch: Partial<SnapSettings>) => {
    setScaleSnapState((prev) => ({ ...prev, ...patch }));
  }, []);

  const setRotateSnap = useCallback((patch: Partial<SnapSettings>) => {
    setRotateSnapState((prev) => ({ ...prev, ...patch }));
  }, []);

  const copySelectedBlock = useCallback(() => {
    if (!selectedBlockId) return;
    const block = refBlocks.find((b) => b.id === selectedBlockId);
    if (block) clipboardRef.current = { ...block, position: block.position.clone() };
  }, [selectedBlockId, refBlocks]);

  const pasteBlock = useCallback(() => {
    const src = clipboardRef.current;
    if (!src) return;
    const newId = `block-${Date.now()}-${_blockCounter.current++}`;
    const offset = new THREE.Vector3(src.sizeUU / 100, 0, 0);
    const newBlock: RefBlock = { id: newId, sizeUU: src.sizeUU, position: src.position.clone().add(offset), visible: true };
    setRefBlocks((prev) => [...prev, newBlock]);
    setSelectedBlockId(newId);
  }, []);

  const actions: Model3DEditorActions = useMemo(() => ({
    setActiveTool: setToolWithMode,
    setTransformMode,
    setPivotOffset,
    setPivotSnapMode,
    snapPivotToBottom,
    snapPivotToCenter,
    centerToOrigin,
    resetTransform,
    setFFDEnabled: (on: boolean) => setFFD((f) => ({ ...f, enabled: on, selectedPointIndices: [] })),
    setFFDDivisions: (d: { x: number; y: number; z: number }) => setFFD((f) => ({ ...f, divisions: d })),
    setFFDLatticePoints: (pts: THREE.Vector3[]) => setFFD((f) => ({ ...f, latticePoints: pts })),
    setFFDSelectedPoints: (indices: number[]) => setFFD((f) => ({ ...f, selectedPointIndices: indices })),
    toggleFFDPointSelection: (idx: number) => setFFD((f) => {
      const cur = f.selectedPointIndices;
      const next = cur.includes(idx) ? cur.filter((i) => i !== idx) : [...cur, idx];
      return { ...f, selectedPointIndices: next };
    }),
    setPosition: (v: THREE.Vector3) => { setPosition(v); setIsDirty(true); },
    setRotation: (e: THREE.Euler) => { setRotation(e); setIsDirty(true); },
    setScale: (v: THREE.Vector3) => { setScale(v); setIsDirty(true); },
    setModelBBox,
    setWireframe,
    setShowNormals,
    markDirty: () => setIsDirty(true),
    addRefBlock,
    removeRefBlock,
    duplicateRefBlock,
    updateRefBlock,
    setSelectedBlock: setSelectedBlockId,
    toggleBlockVisibility,
    clearAllBlocks,
    setGridSnap,
    setScaleSnap,
    setRotateSnap,
    pushUndo,
    undo,
    redo,
    copySelectedBlock,
    pasteBlock,
    restoreHistoryEntry,
    setShowHistory,
  }), [setToolWithMode, snapPivotToBottom, snapPivotToCenter, centerToOrigin, resetTransform, setModelBBox,
    addRefBlock, removeRefBlock, duplicateRefBlock, updateRefBlock, toggleBlockVisibility, clearAllBlocks,
    setGridSnap, setScaleSnap, setRotateSnap, pushUndo, undo, redo, copySelectedBlock, pasteBlock, restoreHistoryEntry]);

  const state: Model3DEditorState = useMemo(() => ({
    activeTool, transformMode, pivotOffset, pivotSnapMode, ffd,
    position, rotation, scale, modelBBox, modelSize,
    wireframe, showNormals, isDirty, glbUrl, modelRef, cameraRef, canvasRef,
    refBlocks, selectedBlockId, gridSnap, scaleSnap, rotateSnap,
    canUndo, canRedo, historyEntries, showHistory,
  }), [activeTool, transformMode, pivotOffset, pivotSnapMode, ffd,
    position, rotation, scale, modelBBox, modelSize,
    wireframe, showNormals, isDirty, glbUrl,
    refBlocks, selectedBlockId, gridSnap, scaleSnap, rotateSnap,
    canUndo, canRedo, historyEntries, showHistory]);

  const value = useMemo(() => ({ state, actions, onClose }), [state, actions, onClose]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
