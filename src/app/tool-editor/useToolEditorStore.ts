"use client";

/* ────────────────────────────────────────
   Tool-Editor lightweight store (no external dep)
   Manages nodes, edges, selection, grid config,
   undo/redo, alignment, duplication.
   ──────────────────────────────────────── */
import { useCallback, useSyncExternalStore } from 'react';
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
} from '@xyflow/react';
import type {
  TENodeData, TENodeKind, TEGenericData, TEWindowData, TEFrameData,
  TEButtonData, TETextBoxData, TEDropdownData, TEImageData,
  TEExport, TENodeExport, TEEdgeExport,
} from './types';

/* ── helpers ─────────────────────────── */

let _counter = 0;
function uid(prefix: string) {
  _counter += 1;
  return `${prefix}-${Date.now()}-${_counter}`;
}

function snap(v: number, grid: number) {
  return Math.round(v / grid) * grid;
}

/* ── default data factories ──────────── */

function defaultGeneric(): TEGenericData {
  return {
    kind: 'generic',
    label: 'Node',
    description: '',
    inputs: [{ id: uid('in'), label: 'Input', side: 'left' }],
    outputs: [{ id: uid('out'), label: 'Output', side: 'right' }],
    dropdowns: [],
    width: 200,
    height: 120,
    color: '#607d8b',
  };
}

function defaultWindow(): TEWindowData {
  return {
    kind: 'window',
    label: 'Viewer',
    description: '',
    inputs: [{ id: uid('in'), label: 'Source', side: 'left' }],
    outputs: [],
    width: 360,
    height: 260,
    color: '#26a69a',
  };
}

function defaultFrame(): TEFrameData {
  return {
    kind: 'frame',
    label: 'Frame',
    description: '',
    width: 480,
    height: 320,
    color: '#78909c',
  };
}

function defaultButton(): TEButtonData {
  return {
    kind: 'button',
    label: 'Button',
    description: '',
    width: 120,
    height: 40,
    color: '#5c6bc0',
  };
}

function defaultTextBox(): TETextBoxData {
  return {
    kind: 'textbox',
    label: 'Text Field',
    description: '',
    placeholder: 'Enter text...',
    width: 200,
    height: 36,
    color: '#607d8b',
  };
}

function defaultDropdown(): TEDropdownData {
  return {
    kind: 'dropdown',
    label: 'Select',
    description: '',
    options: ['Option 1', 'Option 2', 'Option 3'],
    width: 180,
    height: 36,
    color: '#607d8b',
  };
}

function defaultImage(): TEImageData {
  return {
    kind: 'image',
    label: 'Image',
    description: '',
    alt: '',
    width: 240,
    height: 160,
    color: '#8d6e63',
  };
}

/* ── store ───────────────────────────── */

export interface TEStore {
  nodes: Node<TENodeData>[];
  edges: Edge[];
  gridSize: number;
  selectedIds: string[];
  selectedEdgeIds: string[];
  canUndo: boolean;
  canRedo: boolean;
}

type Listener = () => void;

const MAX_HISTORY = 50;
type Snapshot = { nodes: Node<TENodeData>[]; edges: Edge[]; gridSize: number };

function createStore() {
  let state: TEStore = {
    nodes: [], edges: [], gridSize: 20,
    selectedIds: [], selectedEdgeIds: [],
    canUndo: false, canRedo: false,
  };
  const listeners = new Set<Listener>();
  let undoStack: Snapshot[] = [];
  let redoStack: Snapshot[] = [];

  function notify() {
    const cu = undoStack.length > 0;
    const cr = redoStack.length > 0;
    if (state.canUndo !== cu || state.canRedo !== cr) {
      state = { ...state, canUndo: cu, canRedo: cr };
    }
    listeners.forEach((l) => l());
  }

  function get() {
    return state;
  }

  function subscribe(l: Listener) {
    listeners.add(l);
    return () => { listeners.delete(l); };
  }

  /* ── history ─── */

  function takeSnapshot(): Snapshot {
    return { nodes: state.nodes, edges: state.edges, gridSize: state.gridSize };
  }

  function pushHistory() {
    undoStack = [...undoStack.slice(-(MAX_HISTORY - 1)), takeSnapshot()];
    redoStack = [];
  }

  function undo() {
    if (undoStack.length === 0) return;
    redoStack = [...redoStack, takeSnapshot()];
    const prev = undoStack[undoStack.length - 1];
    undoStack = undoStack.slice(0, -1);
    state = { ...state, ...prev, selectedIds: [], selectedEdgeIds: [] };
    notify();
  }

  function redo() {
    if (redoStack.length === 0) return;
    undoStack = [...undoStack, takeSnapshot()];
    const next = redoStack[redoStack.length - 1];
    redoStack = redoStack.slice(0, -1);
    state = { ...state, ...next, selectedIds: [], selectedEdgeIds: [] };
    notify();
  }

  /* ── mutations ─── */

  function setGridSize(size: number) {
    state = { ...state, gridSize: Math.max(5, Math.min(100, size)) };
    notify();
  }

  function onNodesChange(changes: NodeChange[]) {
    const next = applyNodeChanges(changes, state.nodes) as Node<TENodeData>[];
    const sel = next.filter((n) => n.selected).map((n) => n.id);
    state = { ...state, nodes: next, selectedIds: sel };
    notify();
  }

  function onEdgesChange(changes: EdgeChange[]) {
    const next = applyEdgeChanges(changes, state.edges);
    const selEdges = next.filter((e) => e.selected).map((e) => e.id);
    state = { ...state, edges: next, selectedEdgeIds: selEdges };
    notify();
  }

  function onConnect(connection: Connection) {
    pushHistory();
    state = { ...state, edges: addEdge({ ...connection, id: uid('e') }, state.edges) };
    notify();
  }

  function addNode(kind: TENodeKind, x: number, y: number) {
    pushHistory();
    const g = state.gridSize;
    const factories: Record<TENodeKind, () => TENodeData> = {
      generic: defaultGeneric,
      window: defaultWindow,
      frame: defaultFrame,
      button: defaultButton,
      textbox: defaultTextBox,
      dropdown: defaultDropdown,
      image: defaultImage,
    };
    const data = (factories[kind] ?? defaultGeneric)();
    const node: Node<TENodeData> = {
      id: uid(kind),
      type: kind,
      position: { x: snap(x, g), y: snap(y, g) },
      data,
      style: { width: data.width, height: data.height },
    };
    state = { ...state, nodes: [...state.nodes, node] };
    notify();
    return node.id;
  }

  function updateNodeData(nodeId: string, patch: Partial<TENodeData>) {
    pushHistory();
    state = {
      ...state,
      nodes: state.nodes.map((n) => {
        if (n.id !== nodeId) return n;
        const merged = { ...n.data, ...patch } as TENodeData;
        const style = { ...n.style, width: merged.width, height: merged.height };
        return { ...n, data: merged, style };
      }),
    };
    notify();
  }

  function deleteSelected() {
    const sel = new Set(state.selectedIds);
    const selE = new Set(state.selectedEdgeIds);
    if (sel.size === 0 && selE.size === 0) return;
    pushHistory();
    state = {
      ...state,
      nodes: state.nodes.filter((n) => !sel.has(n.id)),
      edges: state.edges.filter((e) =>
        !sel.has(e.source) && !sel.has(e.target) && !sel.has(e.id) && !selE.has(e.id)
      ),
      selectedIds: [],
      selectedEdgeIds: [],
    };
    notify();
  }

  function clearAll() {
    pushHistory();
    state = { ...state, nodes: [], edges: [], selectedIds: [], selectedEdgeIds: [] };
    notify();
  }

  /* ── duplicate ─── */

  function duplicateSelected() {
    const sel = new Set(state.selectedIds);
    if (sel.size === 0) return;
    pushHistory();
    const offset = state.gridSize;
    const idMap = new Map<string, string>();
    const newNodes = state.nodes
      .filter((n) => sel.has(n.id))
      .map((n) => {
        const newId = uid(n.type ?? 'node');
        idMap.set(n.id, newId);
        return {
          ...n,
          id: newId,
          position: { x: n.position.x + offset, y: n.position.y + offset },
          selected: true,
          data: { ...n.data },
        };
      });
    const newEdges = state.edges
      .filter((e) => sel.has(e.source) && sel.has(e.target))
      .map((e) => ({
        ...e,
        id: uid('e'),
        source: idMap.get(e.source) ?? e.source,
        target: idMap.get(e.target) ?? e.target,
      }));
    const deselected = state.nodes.map((n) =>
      sel.has(n.id) ? { ...n, selected: false } : n
    );
    state = {
      ...state,
      nodes: [...deselected, ...newNodes],
      edges: [...state.edges, ...newEdges],
      selectedIds: newNodes.map((n) => n.id),
    };
    notify();
  }

  /* ── alignment ─── */

  function alignNodes(direction: 'left' | 'right' | 'top' | 'bottom' | 'centerH' | 'centerV') {
    const sel = new Set(state.selectedIds);
    if (sel.size < 2) return;
    pushHistory();
    const selected = state.nodes.filter((n) => sel.has(n.id));
    state = {
      ...state,
      nodes: state.nodes.map((n) => {
        if (!sel.has(n.id)) return n;
        const w = n.data.width ?? 0;
        const h = n.data.height ?? 0;
        switch (direction) {
          case 'left':
            return { ...n, position: { ...n.position, x: Math.min(...selected.map((s) => s.position.x)) } };
          case 'right': {
            const maxR = Math.max(...selected.map((s) => s.position.x + (s.data.width ?? 0)));
            return { ...n, position: { ...n.position, x: maxR - w } };
          }
          case 'top':
            return { ...n, position: { ...n.position, y: Math.min(...selected.map((s) => s.position.y)) } };
          case 'bottom': {
            const maxB = Math.max(...selected.map((s) => s.position.y + (s.data.height ?? 0)));
            return { ...n, position: { ...n.position, y: maxB - h } };
          }
          case 'centerH': {
            const xs = selected.map((s) => s.position.x + (s.data.width ?? 0) / 2);
            const center = (Math.min(...xs) + Math.max(...xs)) / 2;
            return { ...n, position: { ...n.position, x: center - w / 2 } };
          }
          case 'centerV': {
            const ys = selected.map((s) => s.position.y + (s.data.height ?? 0) / 2);
            const center = (Math.min(...ys) + Math.max(...ys)) / 2;
            return { ...n, position: { ...n.position, y: center - h / 2 } };
          }
        }
      }),
    };
    notify();
  }

  function distributeNodes(axis: 'horizontal' | 'vertical') {
    const sel = new Set(state.selectedIds);
    if (sel.size < 3) return;
    pushHistory();
    const selected = state.nodes.filter((n) => sel.has(n.id));
    const sorted = [...selected].sort((a, b) =>
      axis === 'horizontal' ? a.position.x - b.position.x : a.position.y - b.position.y
    );
    const first = axis === 'horizontal' ? sorted[0].position.x : sorted[0].position.y;
    const last = axis === 'horizontal'
      ? sorted[sorted.length - 1].position.x
      : sorted[sorted.length - 1].position.y;
    const gap = (last - first) / (sorted.length - 1);
    const posMap = new Map(sorted.map((n, i) => [n.id, first + i * gap]));
    state = {
      ...state,
      nodes: state.nodes.map((n) => {
        if (!posMap.has(n.id)) return n;
        const v = posMap.get(n.id)!;
        return axis === 'horizontal'
          ? { ...n, position: { ...n.position, x: v } }
          : { ...n, position: { ...n.position, y: v } };
      }),
    };
    notify();
  }

  /* ── edge labels ─── */

  function updateEdgeLabel(edgeId: string, label: string) {
    pushHistory();
    state = {
      ...state,
      edges: state.edges.map((e) =>
        e.id === edgeId ? { ...e, label: label || undefined } : e
      ),
    };
    notify();
  }

  /* ── load from export ─── */

  function loadFromExport(data: TEExport) {
    pushHistory();
    const nodes: Node<TENodeData>[] = data.nodes.map((n) => {
      let nodeData: TENodeData;
      switch (n.kind) {
        case 'generic':
          nodeData = { kind: 'generic', label: n.label, description: n.description, width: n.dimensions.width, height: n.dimensions.height, color: n.color, inputs: n.inputs ?? [], outputs: n.outputs ?? [], dropdowns: n.dropdowns ?? [] };
          break;
        case 'window':
          nodeData = { kind: 'window', label: n.label, description: n.description, width: n.dimensions.width, height: n.dimensions.height, color: n.color, inputs: n.inputs ?? [], outputs: n.outputs ?? [] };
          break;
        case 'frame':
          nodeData = { kind: 'frame', label: n.label, description: n.description, width: n.dimensions.width, height: n.dimensions.height, color: n.color };
          break;
        case 'button':
          nodeData = { kind: 'button', label: n.label, description: n.description, width: n.dimensions.width, height: n.dimensions.height, color: n.color };
          break;
        case 'textbox':
          nodeData = { kind: 'textbox', label: n.label, description: n.description, placeholder: n.placeholder ?? '', width: n.dimensions.width, height: n.dimensions.height, color: n.color };
          break;
        case 'dropdown':
          nodeData = { kind: 'dropdown', label: n.label, description: n.description, options: n.options ?? [], width: n.dimensions.width, height: n.dimensions.height, color: n.color };
          break;
        case 'image':
          nodeData = { kind: 'image', label: n.label, description: n.description, alt: n.alt ?? '', width: n.dimensions.width, height: n.dimensions.height, color: n.color };
          break;
        default:
          nodeData = { kind: 'generic', label: n.label, description: n.description, width: n.dimensions.width, height: n.dimensions.height, color: n.color, inputs: [], outputs: [], dropdowns: [] };
      }
      return {
        id: n.id,
        type: n.kind,
        position: { x: n.position.x, y: n.position.y },
        data: nodeData,
        style: { width: n.dimensions.width, height: n.dimensions.height },
      };
    });

    const edges: Edge[] = data.edges.map((e) => ({
      id: e.id,
      source: e.source,
      sourceHandle: e.sourceHandle,
      target: e.target,
      targetHandle: e.targetHandle,
      ...(e.label ? { label: e.label } : {}),
    }));

    state = { ...state, nodes, edges, gridSize: data.gridSize ?? state.gridSize, selectedIds: [], selectedEdgeIds: [] };
    notify();
  }

  /* ── export helpers ─── */

  function buildExport(ids?: string[]): TEExport {
    const nodeSet = ids ? new Set(ids) : null;
    const exportNodes: TENodeExport[] = (nodeSet ? state.nodes.filter((n) => nodeSet.has(n.id)) : state.nodes).map((n) => {
      const d = n.data;
      const base: TENodeExport = {
        id: n.id,
        kind: d.kind,
        label: d.label,
        description: d.description,
        position: { x: n.position.x, y: n.position.y },
        dimensions: { width: d.width, height: d.height },
        color: d.color,
      };
      if (d.kind === 'generic' || d.kind === 'window') {
        base.inputs = d.inputs;
        base.outputs = d.outputs;
      }
      if (d.kind === 'generic') {
        base.dropdowns = d.dropdowns;
      }
      if (d.kind === 'textbox') {
        base.placeholder = d.placeholder;
      }
      if (d.kind === 'dropdown') {
        base.options = d.options;
      }
      if (d.kind === 'image') {
        base.alt = d.alt;
      }
      return base;
    });

    const nodeIds = new Set(exportNodes.map((n) => n.id));
    const exportEdges: TEEdgeExport[] = state.edges
      .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
      .map((e) => {
        const entry: TEEdgeExport = {
          id: e.id,
          source: e.source,
          sourceHandle: e.sourceHandle ?? null,
          target: e.target,
          targetHandle: e.targetHandle ?? null,
        };
        if (typeof e.label === 'string' && e.label) entry.label = e.label;
        return entry;
      });

    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      gridSize: state.gridSize,
      nodes: exportNodes,
      edges: exportEdges,
    };
  }

  return {
    get,
    subscribe,
    setGridSize,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    updateNodeData,
    deleteSelected,
    clearAll,
    buildExport,
    loadFromExport,
    pushHistory,
    undo,
    redo,
    duplicateSelected,
    alignNodes,
    distributeNodes,
    updateEdgeLabel,
  };
}

/* singleton */
const store = createStore();

/* ── React hook ──────────────────────── */

export function useToolEditorStore() {
  const snap = useSyncExternalStore(store.subscribe, store.get, store.get);

  const onNodesChange = useCallback((c: NodeChange[]) => store.onNodesChange(c), []);
  const onEdgesChange = useCallback((c: EdgeChange[]) => store.onEdgesChange(c), []);
  const onConnect = useCallback((c: Connection) => store.onConnect(c), []);

  return {
    ...snap,
    onNodesChange,
    onEdgesChange,
    onConnect,
    setGridSize: store.setGridSize,
    addNode: store.addNode,
    updateNodeData: store.updateNodeData,
    deleteSelected: store.deleteSelected,
    clearAll: store.clearAll,
    buildExport: store.buildExport,
    loadFromExport: store.loadFromExport,
    pushHistory: store.pushHistory,
    undo: store.undo,
    redo: store.redo,
    duplicateSelected: store.duplicateSelected,
    alignNodes: store.alignNodes,
    distributeNodes: store.distributeNodes,
    updateEdgeLabel: store.updateEdgeLabel,
  };
}

export { store as toolEditorStore };

export const updateNodeDataDirect = store.updateNodeData;
