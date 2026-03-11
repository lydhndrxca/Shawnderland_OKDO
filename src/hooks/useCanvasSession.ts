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
  listSessions as storeListSessions,
  saveSession as storeSaveSession,
  loadSession as storeLoadSession,
  deleteSession as storeDeleteSession,
  getActiveSessionName as storeGetActiveSessionName,
  type SessionSnapshot,
} from '@/lib/layoutStore';

export interface CutLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface NodeDefault {
  style?: { width: number; height: number };
  data?: Record<string, unknown>;
}

export interface CanvasSessionOpts {
  appKey: string;
  initialNodes?: Node[];
  initialEdges?: Edge[];
  idPrefix?: string;
  onConnect?: (params: Connection) => boolean | void;
  persistNodeTypes?: string[];
  nodeDefaults?: Record<string, NodeDefault>;
  /** When set, nodes with unregistered types are silently dropped on layout restore */
  registeredNodeTypes?: Set<string> | string[];
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
  exportSelectedNodesOnly: () => void;
  exportSelectedWithConnections: () => void;
  exportAllNodesOnly: () => void;
  exportAllWithConnections: () => void;
  saveLayout: () => void;
  loadLayout: () => boolean;
  importLayout: (file: File) => void;

  saveNamedLayout: (name: string) => void;
  loadNamedLayout: (name: string) => boolean;
  setDefaultLayout: () => void;
  deleteNamedLayout: (name: string) => void;
  updateActiveLayout: () => void;
  activeLayoutName: string | null;
  savedLayoutsList: Array<{ name: string; savedAt: string }>;
  refreshLayoutsList: () => void;

  getFlowSnapshot: () => {
    nodes: Array<{ id: string; position: { x: number; y: number }; type?: string }>;
    edges: Array<{ id: string; source: string; target: string; sourceHandle?: string | null; targetHandle?: string | null }>;
    nodeData: Record<string, Record<string, unknown>>;
  };

  saveSessionNamed: (name: string) => Promise<{ ok: boolean; error?: string }>;
  saveCurrentSession: () => Promise<{ ok: boolean; error?: string }>;
  loadSessionNamed: (name: string) => Promise<boolean>;
  deleteSessionNamed: (name: string) => Promise<void>;
  resetToDefault: (defaultSnapshot: LayoutSnapshot) => void;
  activeSessionName: string | null;
  savedSessionsList: Array<{ name: string; savedAt: string }>;
  refreshSessionsList: () => void;
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
    nodeDefaults = {},
    registeredNodeTypes,
  } = opts;

  const validTypes: Set<string> | null = registeredNodeTypes
    ? (registeredNodeTypes instanceof Set ? registeredNodeTypes : new Set(registeredNodeTypes))
    : null;

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
  const FRAME_NODE_TYPES = new Set(['uiFrame', 'teFrame', 'group']);

  const addNodeToCanvas = useCallback(
    (nodeType: string, position?: { x: number; y: number }, extraData?: Record<string, unknown>) => {
      const id = `${idPrefix}-${nextId.current++}`;
      const defaults = nodeDefaults[nodeType];
      const defaultData = defaults?.data ?? {};
      const isFrame = FRAME_NODE_TYPES.has(nodeType);
      const newNode: Node = {
        id,
        type: nodeType,
        position: position ?? { x: 200, y: 200 },
        data: { stageId: nodeType, ...defaultData, ...extraData },
        ...(defaults?.style ? { style: { width: defaults.style.width, height: defaults.style.height } } : {}),
        ...(isFrame ? { zIndex: -1 } : {}),
      };
      setNodes((prev) => [...prev, newNode]);
      return id;
    },
    [setNodes, idPrefix, nodeDefaults],
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
  const cutLineRef = useRef<CutLine | null>(null);

  const handleCutMouseDown = useCallback((e: React.MouseEvent, canvasRef: React.RefObject<HTMLDivElement | null>) => {
    if (e.button !== 2) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    cutStartRef.current = { x, y };
    const line = { x1: x, y1: y, x2: x, y2: y };
    cutLineRef.current = line;
    setCutLine(line);
  }, []);

  const handleCutMouseMove = useCallback((e: React.MouseEvent, canvasRef: React.RefObject<HTMLDivElement | null>) => {
    if (!cutStartRef.current) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const line = { x1: cutStartRef.current.x, y1: cutStartRef.current.y, x2: x, y2: y };
    cutLineRef.current = line;
    setCutLine(line);
  }, []);

  const handleCutMouseUp = useCallback((canvasRef: React.RefObject<HTMLDivElement | null>) => {
    const cl = cutLineRef.current;
    if (!cutStartRef.current || !cl) {
      cutStartRef.current = null;
      cutLineRef.current = null;
      setCutLine(null);
      return;
    }

    const rect = canvasRef.current?.getBoundingClientRect();
    const fp1 = reactFlow.screenToFlowPosition({
      x: cl.x1 + (rect?.left ?? 0),
      y: cl.y1 + (rect?.top ?? 0),
    });
    const fp2 = reactFlow.screenToFlowPosition({
      x: cl.x2 + (rect?.left ?? 0),
      y: cl.y2 + (rect?.top ?? 0),
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
    cutLineRef.current = null;
    setCutLine(null);
  }, [edges, nodes, reactFlow, removeEdge]);

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
    if (!clipboardRef.current?.nodes?.length) return;
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
    const SKIP_KEYS = new Set(['stageId', '_restoreTs']);
    const nodeData: Record<string, Record<string, unknown>> = {};
    for (const n of nodes) {
      const d = n.data as Record<string, unknown>;
      const entry: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(d)) {
        if (!SKIP_KEYS.has(key)) entry[key] = val;
      }
      if (Object.keys(entry).length > 0) nodeData[n.id] = entry;
    }
    return {
      nodes: nodes.map((n) => ({ id: n.id, position: n.position, type: n.type })),
      edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle, targetHandle: e.targetHandle })),
      nodeData,
    };
  }, [nodes, edges]);

  const saveAndCopy = useCallback((json: string, filename: string) => {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    navigator.clipboard.writeText(json).catch(() => {});
  }, []);

  const buildNodeExport = useCallback((targetNodes: Node[], includeStyle = true) => {
    const SKIP_KEYS = new Set(['stageId', '_restoreTs']);
    const nodeData: Record<string, Record<string, unknown>> = {};
    for (const n of targetNodes) {
      const d = n.data as Record<string, unknown>;
      const entry: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(d)) {
        if (!SKIP_KEYS.has(key)) entry[key] = val;
      }
      if (Object.keys(entry).length > 0) nodeData[n.id] = entry;
    }
    return {
      nodes: targetNodes.map((n) => {
        const base: Record<string, unknown> = { id: n.id, position: n.position, type: n.type };
        if (includeStyle && n.style && (n.style.width || n.style.height)) {
          base.style = { width: n.style.width, height: n.style.height };
        }
        return base;
      }),
      nodeData,
    };
  }, []);

  const exportLayoutJSON = useCallback(() => {
    const snapshot = getFlowSnapshot();
    const vp = reactFlow.getViewport();
    const payload = { ...snapshot, viewport: vp, appKey };
    saveAndCopy(JSON.stringify(payload, null, 2), `${appKey}-layout.json`);
  }, [getFlowSnapshot, reactFlow, appKey, saveAndCopy]);

  const exportSelectedNodesOnly = useCallback(() => {
    const selected = nodes.filter((n) => n.selected);
    if (!selected.length) return;
    const { nodes: exportNodes, nodeData } = buildNodeExport(selected);
    const payload = { nodes: exportNodes, edges: [], nodeData };
    saveAndCopy(JSON.stringify(payload, null, 2), `${appKey}-selected-nodes.json`);
  }, [nodes, buildNodeExport, saveAndCopy, appKey]);

  const exportSelectedWithConnections = useCallback(() => {
    const selected = nodes.filter((n) => n.selected);
    if (!selected.length) return;
    const selectedIds = new Set(selected.map((n) => n.id));
    const relevantEdges = edges.filter((e) => selectedIds.has(e.source) && selectedIds.has(e.target));
    const { nodes: exportNodes, nodeData } = buildNodeExport(selected);
    const payload = {
      nodes: exportNodes,
      edges: relevantEdges.map((e) => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle, targetHandle: e.targetHandle })),
      nodeData,
    };
    saveAndCopy(JSON.stringify(payload, null, 2), `${appKey}-selected-connected.json`);
  }, [nodes, edges, buildNodeExport, saveAndCopy, appKey]);

  const exportAllNodesOnly = useCallback(() => {
    const { nodes: exportNodes, nodeData } = buildNodeExport(nodes);
    const payload = { nodes: exportNodes, edges: [], nodeData };
    saveAndCopy(JSON.stringify(payload, null, 2), `${appKey}-all-nodes.json`);
  }, [nodes, buildNodeExport, saveAndCopy, appKey]);

  const exportAllWithConnections = useCallback(() => {
    const { nodes: exportNodes, nodeData } = buildNodeExport(nodes);
    const vp = reactFlow.getViewport();
    const payload = {
      nodes: exportNodes,
      edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle, targetHandle: e.targetHandle })),
      nodeData,
      viewport: vp,
    };
    saveAndCopy(JSON.stringify(payload, null, 2), `${appKey}-all-connected.json`);
  }, [nodes, edges, buildNodeExport, reactFlow, saveAndCopy, appKey]);

  const saveLayout = useCallback(() => {
    const snapshot = getFlowSnapshot();
    const vp = reactFlow.getViewport();
    localStorage.setItem(`shawnderland-layout-${appKey}`, JSON.stringify({ ...snapshot, viewport: vp }));
  }, [getFlowSnapshot, reactFlow, appKey]);

  const restoreSnapshot = useCallback((saved: LayoutSnapshot): boolean => {
    try {
      const nd = saved.nodeData ?? {};
      const RUNTIME_KEYS = new Set(['generating', '_orthoTrigger', '_pendingSnapshot', '_restoreTs']);
      const restoreTs = Date.now();
      const restoredNodes: Node[] = saved.nodes
        .filter((n) => !validTypes || !n.type || validTypes.has(n.type))
        .map((n) => {
          const raw = nd[n.id] ?? {};
          const cleaned: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(raw)) {
            if (!RUNTIME_KEYS.has(k)) cleaned[k] = v;
          }
          return {
            id: n.id,
            type: n.type,
            position: n.position,
            data: { stageId: n.type, ...cleaned, _restoreTs: restoreTs },
            draggable: raw.__pinned ? false : undefined,
            style: n.style as Record<string, unknown> | undefined,
            ...(FRAME_NODE_TYPES.has(n.type ?? '') ? { zIndex: -1 } : {}),
          };
        });
      const validNodeIds = new Set(restoredNodes.map((n) => n.id));
      const restoredEdges: Edge[] = saved.edges
        .filter((e) => validNodeIds.has(e.source) && validNodeIds.has(e.target))
        .map((e) => ({
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
  }, [setNodes, setEdges, reactFlow, validTypes]);

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
  const [activeLayoutName, setActiveLayoutName] = useState<string | null>(null);

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
    setActiveLayoutName(name);
    refreshLayoutsList();
  }, [appKey, buildSnapshot, refreshLayoutsList]);

  const loadNamedLayoutFn = useCallback((name: string): boolean => {
    const snap = storeLoadNamedLayout(appKey, name);
    if (!snap) return false;
    const ok = restoreSnapshot(snap);
    if (ok) setActiveLayoutName(name);
    return ok;
  }, [appKey, restoreSnapshot]);

  const updateActiveLayout = useCallback(() => {
    if (!activeLayoutName) return;
    storeNamedLayout(appKey, activeLayoutName, buildSnapshot());
    refreshLayoutsList();
  }, [appKey, activeLayoutName, buildSnapshot, refreshLayoutsList]);

  const setDefaultLayoutFn = useCallback(() => {
    setDefaultFromSnapshot(appKey, buildSnapshot());
    refreshLayoutsList();
  }, [appKey, buildSnapshot, refreshLayoutsList]);

  const deleteNamedLayoutFn = useCallback((name: string) => {
    storeDeleteNamedLayout(appKey, name);
    refreshLayoutsList();
  }, [appKey, refreshLayoutsList]);

  // ── Session Management (saves ALL node data, not just layout) ──
  const [savedSessionsList, setSavedSessionsList] = useState<Array<{ name: string; savedAt: string }>>([]);
  const [activeSessionName, setActiveSessionName] = useState<string | null>(() => storeGetActiveSessionName(appKey));

  const refreshSessionsList = useCallback(() => {
    storeListSessions(appKey).then((all) => {
      setSavedSessionsList(all.map((s) => ({ name: s.name, savedAt: s.savedAt })));
    });
  }, [appKey]);

  useEffect(() => {
    refreshSessionsList();
  }, [refreshSessionsList]);

  const buildSessionSnapshot = useCallback((): SessionSnapshot => {
    const vp = reactFlow.getViewport();
    const SKIP_KEYS = new Set(['stageId', '_restoreTs']);
    const fullNodeData: Record<string, Record<string, unknown>> = {};
    for (const n of nodes) {
      const d = n.data as Record<string, unknown>;
      const entry: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(d)) {
        if (!SKIP_KEYS.has(key)) entry[key] = val;
      }
      if (Object.keys(entry).length > 0) fullNodeData[n.id] = entry;
    }
    const nodesWithStyle = nodes.map((n) => {
      const base: Record<string, unknown> = { id: n.id, position: n.position, type: n.type };
      if (n.style && (n.style.width || n.style.height)) {
        base.style = { width: n.style.width, height: n.style.height };
      }
      return base as { id: string; position: { x: number; y: number }; type?: string; style?: Record<string, unknown> };
    });
    return {
      nodes: nodesWithStyle,
      edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle, targetHandle: e.targetHandle })),
      nodeData: fullNodeData,
      fullNodeData,
      viewport: vp,
    };
  }, [reactFlow, nodes, edges]);

  const restoreSessionSnapshot = useCallback((saved: SessionSnapshot): boolean => {
    try {
      const nd = saved.fullNodeData ?? saved.nodeData ?? {};
      const RUNTIME_KEYS = new Set(['generating', '_orthoTrigger', '_pendingSnapshot', '_restoreTs']);
      const restoreTs = Date.now();
      const restoredNodes: Node[] = saved.nodes
        .filter((n) => !validTypes || !n.type || validTypes.has(n.type))
        .map((n) => {
          const raw = nd[n.id] ?? {};
          const cleaned: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(raw)) {
            if (!RUNTIME_KEYS.has(k)) cleaned[k] = v;
          }
          return {
            id: n.id,
            type: n.type,
            position: n.position,
            data: { stageId: n.type, ...cleaned, _restoreTs: restoreTs },
            draggable: raw.__pinned ? false : undefined,
            style: n.style as Record<string, unknown> | undefined,
            ...(FRAME_NODE_TYPES.has(n.type ?? '') ? { zIndex: -1 } : {}),
          };
        });
      const validNodeIds = new Set(restoredNodes.map((n) => n.id));
      const restoredEdges: Edge[] = saved.edges
        .filter((e) => validNodeIds.has(e.source) && validNodeIds.has(e.target))
        .map((e) => ({
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
  }, [setNodes, setEdges, reactFlow, validTypes]);

  const saveSessionNamed = useCallback(async (name: string): Promise<{ ok: boolean; error?: string }> => {
    const snapshot = buildSessionSnapshot();

    // Log what image-bearing data is being captured
    const nodeIds = Object.keys(snapshot.fullNodeData);
    const imageFields: string[] = [];
    for (const nid of nodeIds) {
      const nd = snapshot.fullNodeData[nid];
      if (nd.generatedImage) imageFields.push(`${nid}:generatedImage`);
      if (nd.styleImages) imageFields.push(`${nid}:styleImages(${(nd.styleImages as unknown[]).length})`);
      if (nd.imageBase64) imageFields.push(`${nid}:imageBase64`);
      if (nd.localImage) imageFields.push(`${nid}:localImage`);
      if (nd.historyEntries) imageFields.push(`${nid}:historyEntries(${(nd.historyEntries as unknown[]).length})`);
    }
    console.log(`[saveSessionNamed] "${name}" — ${nodeIds.length} nodes, image fields:`, imageFields);

    const result = await storeSaveSession(appKey, name, snapshot);
    if (result.ok) {
      setActiveSessionName(name);
      refreshSessionsList();
    }

    // Persist to filesystem so data survives browser resets
    try {
      const jsonBody = JSON.stringify({ name, snapshot });
      const sizeMB = (jsonBody.length / (1024 * 1024)).toFixed(2);
      console.log(`[saveSessionNamed] Sending ${sizeMB} MB to filesystem API...`);
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: jsonBody,
      });
      if (res.ok) {
        const resData = await res.json();
        console.log(`[saveSessionNamed] Filesystem save OK:`, resData);
      } else {
        console.warn(`[saveSessionNamed] Filesystem save failed: ${res.status} ${res.statusText}`);
      }
    } catch (e) {
      console.warn('[saveSessionNamed] filesystem save failed:', e);
    }

    return result;
  }, [appKey, buildSessionSnapshot, refreshSessionsList]);

  const saveCurrentSession = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
    if (!activeSessionName) return { ok: false, error: 'No active session' };
    const snapshot = buildSessionSnapshot();
    const result = await storeSaveSession(appKey, activeSessionName, snapshot);
    if (result.ok) refreshSessionsList();

    try {
      await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: activeSessionName, snapshot }),
      });
    } catch (e) {
      console.warn('[saveCurrentSession] filesystem save failed:', e);
    }

    return result;
  }, [appKey, activeSessionName, buildSessionSnapshot, refreshSessionsList]);

  const loadSessionNamed = useCallback(async (name: string): Promise<boolean> => {
    // Try filesystem first (survives browser resets)
    let snap: SessionSnapshot | null = null;
    let source = 'none';
    try {
      const res = await fetch(`/api/session?name=${encodeURIComponent(name)}`);
      if (res.ok) {
        const data = await res.json();
        if (data?.snapshot) {
          snap = data.snapshot as SessionSnapshot;
          source = 'filesystem';
        }
      }
    } catch (e) {
      console.warn('[loadSessionNamed] filesystem load failed, falling back to IndexedDB:', e);
    }

    // Fallback to IndexedDB
    if (!snap) {
      snap = await storeLoadSession(appKey, name);
      if (snap) source = 'IndexedDB';
    }
    if (!snap) {
      console.warn(`[loadSessionNamed] "${name}" not found in filesystem or IndexedDB`);
      return false;
    }

    // Log what we're restoring
    const nd = snap.fullNodeData ?? snap.nodeData ?? {};
    const nodeIds = Object.keys(nd);
    const imageFields: string[] = [];
    for (const nid of nodeIds) {
      const d = nd[nid];
      if (d.generatedImage) imageFields.push(`${nid}:generatedImage`);
      if (d.styleImages) imageFields.push(`${nid}:styleImages(${(d.styleImages as unknown[]).length})`);
      if (d.imageBase64) imageFields.push(`${nid}:imageBase64`);
      if (d.localImage) imageFields.push(`${nid}:localImage`);
      if (d.historyEntries) imageFields.push(`${nid}:historyEntries(${(d.historyEntries as unknown[]).length})`);
    }
    console.log(`[loadSessionNamed] "${name}" from ${source} — ${snap.nodes.length} nodes, ${snap.edges.length} edges, image fields:`, imageFields);

    const ok = restoreSessionSnapshot(snap);
    if (ok) setActiveSessionName(name);
    return ok;
  }, [appKey, restoreSessionSnapshot]);

  const deleteSessionNamed = useCallback(async (name: string) => {
    await storeDeleteSession(appKey, name);
    if (activeSessionName === name) setActiveSessionName(null);
    refreshSessionsList();

    try {
      await fetch(`/api/session?name=${encodeURIComponent(name)}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('[deleteSessionNamed] filesystem delete failed:', e);
    }
  }, [appKey, activeSessionName, refreshSessionsList]);

  const resetToDefault = useCallback((defaultSnapshot: LayoutSnapshot) => {
    try {
      localStorage.removeItem(`shawnderland-layout-${appKey}`);
    } catch { /* best-effort */ }
    setActiveSessionName(null);
    restoreSnapshot(defaultSnapshot);
    historyRef.current = [];
    historyIndexRef.current = -1;
    setCanUndo(false);
    setCanRedo(false);
  }, [appKey, restoreSnapshot]);

  // ── Auto-load on mount: check auto-save first, then named layouts ──
  const mountedRef = useRef(false);
  const isRestoringRef = useRef(false);
  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    isRestoringRef.current = true;

    let snap: LayoutSnapshot | null = null;

    // 1) Try the auto-save key (has ALL node data including text fields)
    try {
      const raw = localStorage.getItem(`shawnderland-layout-${appKey}`);
      if (raw) snap = JSON.parse(raw) as LayoutSnapshot;
    } catch { /* corrupt data, skip */ }

    // 2) Fallback to named layouts / default
    if (!snap) snap = loadDefaultOrLatest(appKey);

    if (snap) restoreSnapshot(snap);
    setTimeout(() => { isRestoringRef.current = false; }, 500);
  }, [appKey, restoreSnapshot]);

  // ── Auto-save to localStorage on every change (debounced) ─────
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!mountedRef.current || isRestoringRef.current) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      try {
        const snapshot = getFlowSnapshot();
        const vp = reactFlow.getViewport();
        const nodesWithStyle = nodes.map((n) => {
          const base: Record<string, unknown> = { id: n.id, position: n.position, type: n.type };
          if (n.style && (n.style.width || n.style.height)) {
            base.style = { width: n.style.width, height: n.style.height };
          }
          return base;
        });
        localStorage.setItem(
          `shawnderland-layout-${appKey}`,
          JSON.stringify({ ...snapshot, nodes: nodesWithStyle, viewport: vp }),
        );
      } catch { /* quota exceeded or other error — silently skip */ }
    }, 2000);
    return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current); };
  }, [nodes, edges, appKey, getFlowSnapshot, reactFlow]);

  // ── Save on page unload ───────────────────────────────────────
  useEffect(() => {
    const handleUnload = () => {
      try {
        const snapshot = getFlowSnapshot();
        const vp = reactFlow.getViewport();
        const nodesWithStyle = nodes.map((n) => {
          const base: Record<string, unknown> = { id: n.id, position: n.position, type: n.type };
          if (n.style && (n.style.width || n.style.height)) {
            base.style = { width: n.style.width, height: n.style.height };
          }
          return base;
        });
        localStorage.setItem(
          `shawnderland-layout-${appKey}`,
          JSON.stringify({ ...snapshot, nodes: nodesWithStyle, viewport: vp }),
        );
      } catch { /* best-effort */ }
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [nodes, edges, appKey, getFlowSnapshot, reactFlow]);

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
    exportSelectedNodesOnly,
    exportSelectedWithConnections,
    exportAllNodesOnly,
    exportAllWithConnections,
    saveLayout,
    loadLayout,
    importLayout,
    saveNamedLayout: saveNamedLayout,
    loadNamedLayout: loadNamedLayoutFn,
    setDefaultLayout: setDefaultLayoutFn,
    deleteNamedLayout: deleteNamedLayoutFn,
    updateActiveLayout,
    activeLayoutName,
    savedLayoutsList,
    refreshLayoutsList,
    getFlowSnapshot,
    saveSessionNamed,
    saveCurrentSession,
    loadSessionNamed,
    deleteSessionNamed,
    resetToDefault,
    activeSessionName,
    savedSessionsList,
    refreshSessionsList,
  };
}
