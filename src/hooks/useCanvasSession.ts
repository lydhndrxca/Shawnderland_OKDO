"use client";

/**
 * Shared canvas session hook — provides undo/redo, edge-cutting, node grouping,
 * clipboard, pin/freeze, keyboard shortcuts, export/save/import, and auto-layout
 * for any React Flow canvas. Used by ShawnderMind, Gemini Studio, Concept Lab,
 * and Tool Editor to keep behaviour consistent.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  useNodesState,
  useEdgesState,
  useReactFlow,
  addEdge,
  type Node,
  type Edge,
  type OnConnect,
  type OnNodesChange,
  type OnEdgesChange,
  type Connection,
} from '@xyflow/react';
import {
  saveNamedLayout as storeNamedLayout,
  listLayouts as storeListLayouts,
  loadNamedLayout as storeLoadNamedLayout,
  deleteNamedLayout as storeDeleteNamedLayout,
  setDefaultFromSnapshot,
  loadDefaultOrLatest,
  type LayoutSnapshot,
} from '@/lib/layoutStore';

export interface CutLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface CanvasSessionOpts {
  appKey: string;
  initialNodes?: Node[];
  initialEdges?: Edge[];
  idPrefix?: string;
  onConnect?: (params: Connection) => boolean | void;
  persistNodeTypes?: string[];
}

export interface CanvasSessionState {
  nodes: Node[];
  edges: Edge[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;

  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;

  addNodeToCanvas: (nodeType: string, position?: { x: number; y: number }, extraData?: Record<string, unknown>) => string;
  removeNode: (nodeId: string) => void;
  removeEdge: (edgeId: string) => void;

  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;

  cutLine: CutLine | null;
  handleCutMouseDown: (e: React.MouseEvent, canvasRef: React.RefObject<HTMLDivElement | null>) => void;
  handleCutMouseMove: (e: React.MouseEvent, canvasRef: React.RefObject<HTMLDivElement | null>) => void;
  handleCutMouseUp: (canvasRef: React.RefObject<HTMLDivElement | null>) => void;

  createGroup: (nodeIds: string[], name: string) => void;
  ungroupNodes: (groupId: string) => void;
  expandGroup: (groupId: string) => void;
  collapseGroup: (groupId: string) => void;

  copySelectedNodes: () => void;
  pasteNodes: (position?: { x: number; y: number }) => void;

  togglePinNode: (nodeId: string) => void;

  deleteSelected: () => void;
  duplicateSelected: () => void;

  updateNodeData: (nodeId: string, data: Record<string, unknown>) => void;
  getNodeData: (nodeId: string) => Record<string, unknown> | undefined;

  exportLayoutJSON: () => void;
  saveLayout: () => void;
  loadLayout: () => boolean;
  importLayout: (file: File) => void;

  saveNamedLayout: (name: string) => void;
  loadNamedLayout: (name: string) => boolean;
  setDefaultLayout: () => void;
  deleteNamedLayout: (name: string) => void;
  savedLayoutsList: Array<{ name: string; savedAt: string }>;
  refreshLayoutsList: () => void;

  getFlowSnapshot: () => {
    nodes: Array<{ id: string; position: { x: number; y: number }; type?: string }>;
    edges: Array<{ id: string; source: string; target: string; sourceHandle?: string | null; targetHandle?: string | null }>;
    nodeData: Record<string, Record<string, unknown>>;
  };
}

interface HistorySnapshot {
  nodes: Node[];
  edges: Edge[];
}

const MAX_HISTORY = 50;

function segIntersect(
  ax: number, ay: number, bx: number, by: number,
  cx: number, cy: number, dx: number, dy: number,
): boolean {
  const denom = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx);
  if (Math.abs(denom) < 1e-10) return false;
  const t = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / denom;
  const u = ((cx - ax) * (by - ay) - (cy - ay) * (bx - ax)) / denom;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

export function useCanvasSession(opts: CanvasSessionOpts): CanvasSessionState {
  const {
    appKey,
    initialNodes = [],
    initialEdges = [],
    idPrefix = 'n',
    onConnect: validateConnect,
    persistNodeTypes = [],
  } = opts;

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [cutLine, setCutLine] = useState<CutLine | null>(null);

  const nextId = useRef(Date.now());
  const reactFlow = useReactFlow();

  // ── History (undo / redo) ───────────────────────────────────────
  const historyRef = useRef<HistorySnapshot[]>([]);
  const historyIndexRef = useRef(-1);
  const isUndoRedoRef = useRef(false);
  const historyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pushHistory = useCallback((n: Node[], e: Edge[]) => {
    if (isUndoRedoRef.current) return;
    const stack = historyRef.current;
    const idx = historyIndexRef.current;
    const trimmed = stack.slice(0, idx + 1);
    trimmed.push({ nodes: n.map((nd) => ({ ...nd })), edges: e.map((ed) => ({ ...ed })) });
    if (trimmed.length > MAX_HISTORY) trimmed.shift();
    historyRef.current = trimmed;
    historyIndexRef.current = trimmed.length - 1;
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(false);
  }, []);

  useEffect(() => {
    if (historyTimerRef.current) clearTimeout(historyTimerRef.current);
    historyTimerRef.current = setTimeout(() => pushHistory(nodes, edges), 300);
    return () => { if (historyTimerRef.current) clearTimeout(historyTimerRef.current); };
  }, [nodes, edges, pushHistory]);

  const undo = useCallback(() => {
    const idx = historyIndexRef.current;
    if (idx <= 0) return;
    isUndoRedoRef.current = true;
    const prev = historyRef.current[idx - 1];
    historyIndexRef.current = idx - 1;
    setNodes(prev.nodes);
    setEdges(prev.edges);
    setCanUndo(idx - 1 > 0);
    setCanRedo(true);
    setTimeout(() => { isUndoRedoRef.current = false; }, 50);
  }, [setNodes, setEdges]);

  const redo = useCallback(() => {
    const idx = historyIndexRef.current;
    const stack = historyRef.current;
    if (idx >= stack.length - 1) return;
    isUndoRedoRef.current = true;
    const next = stack[idx + 1];
    historyIndexRef.current = idx + 1;
    setNodes(next.nodes);
    setEdges(next.edges);
    setCanUndo(true);
    setCanRedo(idx + 1 < stack.length - 1);
    setTimeout(() => { isUndoRedoRef.current = false; }, 50);
  }, [setNodes, setEdges]);

  // ── Connect ─────────────────────────────────────────────────────
  const handleConnect: OnConnect = useCallback(
    (params) => {
      if (validateConnect) {
        const result = validateConnect(params as Connection);
        if (result === false) return;
      }
      setEdges((prev) =>
        addEdge(
          { ...params, type: 'pipeline', data: { isComplete: true } },
          prev,
        ),
      );
    },
    [setEdges, validateConnect],
  );

  // ── Node CRUD ───────────────────────────────────────────────────
  const addNodeToCanvas = useCallback(
    (nodeType: string, position?: { x: number; y: number }, extraData?: Record<string, unknown>) => {
      const id = `${idPrefix}-${nextId.current++}`;
      const newNode: Node = {
        id,
        type: nodeType,
        position: position ?? { x: 200, y: 200 },
        data: { stageId: nodeType, ...extraData },
      };
      setNodes((prev) => [...prev, newNode]);
      return id;
    },
    [setNodes, idPrefix],
  );

  const removeNode = useCallback(
    (nodeId: string) => {
      setNodes((prev) => prev.filter((n) => n.id !== nodeId));
      setEdges((prev) => prev.filter((e) => e.source !== nodeId && e.target !== nodeId));
      if (selectedNodeId === nodeId) setSelectedNodeId(null);
    },
    [setNodes, setEdges, selectedNodeId],
  );

  const removeEdge = useCallback(
    (edgeId: string) => {
      setEdges((prev) => prev.filter((e) => e.id !== edgeId));
    },
    [setEdges],
  );

  // ── Delete / Duplicate selected ─────────────────────────────────
  const deleteSelected = useCallback(() => {
    const selected = nodes.filter((n) => n.selected);
    if (!selected.length) return;
    const ids = new Set(selected.map((n) => n.id));
    setNodes((prev) => prev.filter((n) => !ids.has(n.id)));
    setEdges((prev) => prev.filter((e) => !ids.has(e.source) && !ids.has(e.target)));
  }, [nodes, setNodes, setEdges]);

  const duplicateSelected = useCallback(() => {
    const selected = nodes.filter((n) => n.selected);
    if (!selected.length) return;
    const newNodes = selected.map((n) => ({
      ...n,
      id: `${idPrefix}-${nextId.current++}`,
      position: { x: n.position.x + 40, y: n.position.y + 40 },
      selected: false,
    }));
    setNodes((prev) => [...prev, ...newNodes]);
  }, [nodes, setNodes, idPrefix]);

  // ── Edge-cutting (right-click drag) ─────────────────────────────
  const cutStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleCutMouseDown = useCallback((e: React.MouseEvent, canvasRef: React.RefObject<HTMLDivElement | null>) => {
    if (e.button !== 2) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    cutStartRef.current = { x, y };
    setCutLine({ x1: x, y1: y, x2: x, y2: y });
  }, []);

  const handleCutMouseMove = useCallback((e: React.MouseEvent, canvasRef: React.RefObject<HTMLDivElement | null>) => {
    if (!cutStartRef.current) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCutLine({ x1: cutStartRef.current.x, y1: cutStartRef.current.y, x2: x, y2: y });
  }, []);

  const handleCutMouseUp = useCallback((canvasRef: React.RefObject<HTMLDivElement | null>) => {
    if (!cutStartRef.current || !cutLine) {
      cutStartRef.current = null;
      setCutLine(null);
      return;
    }

    const rect = canvasRef.current?.getBoundingClientRect();
    const fp1 = reactFlow.screenToFlowPosition({
      x: cutLine.x1 + (rect?.left ?? 0),
      y: cutLine.y1 + (rect?.top ?? 0),
    });
    const fp2 = reactFlow.screenToFlowPosition({
      x: cutLine.x2 + (rect?.left ?? 0),
      y: cutLine.y2 + (rect?.top ?? 0),
    });

    const toRemove: string[] = [];
    for (const edge of edges) {
      const src = nodes.find((n) => n.id === edge.source);
      const tgt = nodes.find((n) => n.id === edge.target);
      if (!src || !tgt) continue;
      const sx = src.position.x + (src.measured?.width ?? 200);
      const sy = src.position.y + (src.measured?.height ?? 60) / 2;
      const tx = tgt.position.x;
      const ty = tgt.position.y + (tgt.measured?.height ?? 60) / 2;
      if (segIntersect(fp1.x, fp1.y, fp2.x, fp2.y, sx, sy, tx, ty)) {
        toRemove.push(edge.id);
      }
    }
    for (const id of toRemove) removeEdge(id);

    cutStartRef.current = null;
    setCutLine(null);
  }, [cutLine, edges, nodes, reactFlow, removeEdge]);

  // ── Grouping ────────────────────────────────────────────────────
  const createGroup = useCallback((nodeIds: string[], name: string) => {
    if (nodeIds.length < 2) return;
    const groupId = `group-${Date.now()}`;
    setNodes((prev) => {
      const selectedNodes = prev.filter((n) => nodeIds.includes(n.id));
      if (selectedNodes.length < 2) return prev;
      const minX = Math.min(...selectedNodes.map((n) => n.position.x));
      const minY = Math.min(...selectedNodes.map((n) => n.position.y));
      const groupNode: Node = {
        id: groupId,
        type: 'group',
        position: { x: minX - 20, y: minY - 50 },
        data: { groupName: name, childNodeIds: nodeIds, expanded: false },
      };
      const childSet = new Set(nodeIds);
      return [...prev.map((n) => childSet.has(n.id) ? { ...n, hidden: true } : n), groupNode];
    });
  }, [setNodes]);

  const ungroupNodes = useCallback((groupId: string) => {
    setNodes((prev) => {
      const group = prev.find((n) => n.id === groupId);
      if (!group) return prev;
      const childIds = new Set((group.data as Record<string, unknown>).childNodeIds as string[] ?? []);
      return prev
        .filter((n) => n.id !== groupId)
        .map((n) => childIds.has(n.id) ? { ...n, hidden: false } : n);
    });
    setEdges((prev) => prev.filter((e) => e.source !== groupId && e.target !== groupId));
  }, [setNodes, setEdges]);

  const expandGroup = useCallback((groupId: string) => {
    setNodes((prev) => {
      const group = prev.find((n) => n.id === groupId);
      if (!group || group.type !== 'group') return prev;
      const childIds = new Set((group.data as Record<string, unknown>).childNodeIds as string[] ?? []);
      return prev.map((n) => {
        if (n.id === groupId) return { ...n, data: { ...n.data, expanded: true } };
        if (childIds.has(n.id)) return { ...n, hidden: false };
        return n;
      });
    });
  }, [setNodes]);

  const collapseGroup = useCallback((groupId: string) => {
    setNodes((prev) => {
      const group = prev.find((n) => n.id === groupId);
      if (!group || group.type !== 'group') return prev;
      const childIds = new Set((group.data as Record<string, unknown>).childNodeIds as string[] ?? []);
      return prev.map((n) => {
        if (n.id === groupId) return { ...n, data: { ...n.data, expanded: false } };
        if (childIds.has(n.id)) return { ...n, hidden: true };
        return n;
      });
    });
  }, [setNodes]);

  // ── Clipboard ───────────────────────────────────────────────────
  const clipboardRef = useRef<{ nodes: Node[]; edges: Edge[] } | null>(null);

  const copySelectedNodes = useCallback(() => {
    const sel = nodes.filter((n) => n.selected);
    if (!sel.length) return;
    const ids = new Set(sel.map((n) => n.id));
    const relevantEdges = edges.filter((e) => ids.has(e.source) && ids.has(e.target));
    clipboardRef.current = { nodes: sel, edges: relevantEdges };
  }, [nodes, edges]);

  const pasteNodes = useCallback((position?: { x: number; y: number }) => {
    if (!clipboardRef.current) return;
    const { nodes: clipNodes, edges: clipEdges } = clipboardRef.current;
    const idMap = new Map<string, string>();
    const offset = position ? { x: position.x - clipNodes[0].position.x, y: position.y - clipNodes[0].position.y } : { x: 40, y: 40 };

    const newNodes = clipNodes.map((n) => {
      const newId = `${idPrefix}-${nextId.current++}`;
      idMap.set(n.id, newId);
      return {
        ...n,
        id: newId,
        position: { x: n.position.x + offset.x, y: n.position.y + offset.y },
        selected: false,
      };
    });

    const newEdges = clipEdges.map((e) => ({
      ...e,
      id: `e-${idPrefix}-${nextId.current++}`,
      source: idMap.get(e.source) ?? e.source,
      target: idMap.get(e.target) ?? e.target,
    }));

    setNodes((prev) => [...prev, ...newNodes]);
    setEdges((prev) => [...prev, ...newEdges]);
  }, [setNodes, setEdges, idPrefix]);

  // ── Pin / freeze ────────────────────────────────────────────────
  const togglePinNode = useCallback((nodeId: string) => {
    setNodes((prev) =>
      prev.map((n) => {
        if (n.id !== nodeId) return n;
        const pinned = !(n.data as Record<string, unknown>).__pinned;
        return { ...n, draggable: !pinned, data: { ...n.data, __pinned: pinned } };
      }),
    );
  }, [setNodes]);

  // ── Node data helpers ───────────────────────────────────────────
  const updateNodeData = useCallback((nodeId: string, data: Record<string, unknown>) => {
    setNodes((prev) => prev.map((n) => n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n));
  }, [setNodes]);

  const getNodeData = useCallback((nodeId: string): Record<string, unknown> | undefined => {
    const node = nodes.find((n) => n.id === nodeId);
    return node ? (node.data as Record<string, unknown>) : undefined;
  }, [nodes]);

  // ── Expose helpers on window for node components ────────────────
  useEffect(() => {
    const w = window as unknown as Record<string, unknown>;
    w.__updateNodeData = updateNodeData;
    w.__getNodeData = getNodeData;
    w.__getEdges = () => edges;
  }, [updateNodeData, getNodeData, edges]);

  // ── Keyboard shortcuts ──────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el) {
        const tag = el.tagName.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
        if (el.getAttribute('contenteditable') === 'true') return;
      }

      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if (mod && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteSelected(); }
      if (mod && e.key === 'd') { e.preventDefault(); duplicateSelected(); }
      if (mod && e.key === 'c') { copySelectedNodes(); }
      if (mod && e.key === 'v') { pasteNodes(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo, deleteSelected, duplicateSelected, copySelectedNodes, pasteNodes]);

  // ── Export / Save / Import ──────────────────────────────────────
  const getFlowSnapshot = useCallback(() => {
    const nodeData: Record<string, Record<string, unknown>> = {};
    for (const n of nodes) {
      const d = n.data as Record<string, unknown>;
      const entry: Record<string, unknown> = {};
      if (n.type && persistNodeTypes.includes(n.type)) {
        for (const [key, val] of Object.entries(d)) {
          if (key !== 'stageId') entry[key] = val;
        }
      }
      if (d.customInstructions) entry.customInstructions = d.customInstructions;
      if (d.subName) entry.subName = d.subName;
      if (d.__pinned) entry.__pinned = d.__pinned;
      if (Object.keys(entry).length > 0) nodeData[n.id] = entry;
    }
    return {
      nodes: nodes.map((n) => ({ id: n.id, position: n.position, type: n.type })),
      edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle, targetHandle: e.targetHandle })),
      nodeData,
    };
  }, [nodes, edges, persistNodeTypes]);

  const exportLayoutJSON = useCallback(() => {
    const snapshot = getFlowSnapshot();
    const vp = reactFlow.getViewport();
    const payload = { ...snapshot, viewport: vp, appKey };
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${appKey}-layout.json`;
    a.click();
    URL.revokeObjectURL(url);
    navigator.clipboard.writeText(json).catch(() => {});
  }, [getFlowSnapshot, reactFlow, appKey]);

  const saveLayout = useCallback(() => {
    const snapshot = getFlowSnapshot();
    const vp = reactFlow.getViewport();
    localStorage.setItem(`shawnderland-layout-${appKey}`, JSON.stringify({ ...snapshot, viewport: vp }));
  }, [getFlowSnapshot, reactFlow, appKey]);

  const restoreSnapshot = useCallback((saved: LayoutSnapshot): boolean => {
    try {
      const nd = saved.nodeData ?? {};
      const restoredNodes: Node[] = saved.nodes.map((n) => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: { stageId: n.type, ...nd[n.id] },
        draggable: nd[n.id]?.__pinned ? false : undefined,
        style: n.style as Record<string, unknown> | undefined,
      }));
      const restoredEdges: Edge[] = saved.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
        type: 'pipeline',
        data: { isComplete: true },
      }));
      setNodes(restoredNodes);
      setEdges(restoredEdges);
      if (saved.viewport) {
        setTimeout(() => reactFlow.setViewport(saved.viewport!), 100);
      }
      return true;
    } catch {
      return false;
    }
  }, [setNodes, setEdges, reactFlow]);

  const loadLayout = useCallback((): boolean => {
    const raw = localStorage.getItem(`shawnderland-layout-${appKey}`);
    if (!raw) return false;
    try {
      const saved = JSON.parse(raw) as LayoutSnapshot;
      return restoreSnapshot(saved);
    } catch {
      return false;
    }
  }, [appKey, restoreSnapshot]);

  const importLayout = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        if (data.nodes && data.edges) {
          restoreSnapshot(data as LayoutSnapshot);
        }
      } catch { /* invalid JSON */ }
    };
    reader.readAsText(file);
  }, [restoreSnapshot]);

  // ── Named Layout Management ────────────────────────────────────
  const [savedLayoutsList, setSavedLayoutsList] = useState<Array<{ name: string; savedAt: string }>>([]);

  const refreshLayoutsList = useCallback(() => {
    const all = storeListLayouts(appKey);
    setSavedLayoutsList(all.map((l) => ({ name: l.name, savedAt: l.savedAt })));
  }, [appKey]);

  useEffect(() => {
    refreshLayoutsList();
  }, [refreshLayoutsList]);

  const buildSnapshot = useCallback((): LayoutSnapshot => {
    const snap = getFlowSnapshot();
    const vp = reactFlow.getViewport();
    const nodesWithStyle = nodes.map((n) => {
      const base = { id: n.id, position: n.position, type: n.type };
      if (n.style && (n.style.width || n.style.height)) {
        return { ...base, style: { width: n.style.width, height: n.style.height } };
      }
      return base;
    });
    return { ...snap, nodes: nodesWithStyle, viewport: vp };
  }, [getFlowSnapshot, reactFlow, nodes]);

  const saveNamedLayout = useCallback((name: string) => {
    storeNamedLayout(appKey, name, buildSnapshot());
    refreshLayoutsList();
  }, [appKey, buildSnapshot, refreshLayoutsList]);

  const loadNamedLayoutFn = useCallback((name: string): boolean => {
    const snap = storeLoadNamedLayout(appKey, name);
    if (!snap) return false;
    return restoreSnapshot(snap);
  }, [appKey, restoreSnapshot]);

  const setDefaultLayoutFn = useCallback(() => {
    setDefaultFromSnapshot(appKey, buildSnapshot());
    refreshLayoutsList();
  }, [appKey, buildSnapshot, refreshLayoutsList]);

  const deleteNamedLayoutFn = useCallback((name: string) => {
    storeDeleteNamedLayout(appKey, name);
    refreshLayoutsList();
  }, [appKey, refreshLayoutsList]);

  // ── Auto-load default layout on mount ──────────────────────────
  const mountedRef = useRef(false);
  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    const snap = loadDefaultOrLatest(appKey);
    if (snap) {
      restoreSnapshot(snap);
    }
  }, [appKey, restoreSnapshot]);

  return {
    nodes,
    edges,
    setNodes,
    setEdges,
    onNodesChange,
    onEdgesChange,
    onConnect: handleConnect,
    selectedNodeId,
    setSelectedNodeId,
    addNodeToCanvas,
    removeNode,
    removeEdge,
    undo,
    redo,
    canUndo,
    canRedo,
    cutLine,
    handleCutMouseDown,
    handleCutMouseMove,
    handleCutMouseUp,
    createGroup,
    ungroupNodes,
    expandGroup,
    collapseGroup,
    copySelectedNodes,
    pasteNodes,
    togglePinNode,
    deleteSelected,
    duplicateSelected,
    updateNodeData,
    getNodeData,
    exportLayoutJSON,
    saveLayout,
    loadLayout,
    importLayout,
    saveNamedLayout: saveNamedLayout,
    loadNamedLayout: loadNamedLayoutFn,
    setDefaultLayout: setDefaultLayoutFn,
    deleteNamedLayout: deleteNamedLayoutFn,
    savedLayoutsList,
    refreshLayoutsList,
    getFlowSnapshot,
  };
}
