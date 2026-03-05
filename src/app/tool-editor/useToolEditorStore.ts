/* ────────────────────────────────────────
   Tool-Editor lightweight store (no external dep)
   Manages nodes, edges, selection, grid config.
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
import type { TENodeData, TENodeKind, TEGenericData, TEWindowData, TEFrameData, TEExport, TENodeExport, TEEdgeExport } from './types';

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

/* ── store ───────────────────────────── */

export interface TEStore {
  nodes: Node<TENodeData>[];
  edges: Edge[];
  gridSize: number;
  selectedIds: string[];
}

type Listener = () => void;

function createStore() {
  let state: TEStore = { nodes: [], edges: [], gridSize: 20, selectedIds: [] };
  const listeners = new Set<Listener>();

  function notify() {
    listeners.forEach((l) => l());
  }

  function get() {
    return state;
  }

  function subscribe(l: Listener) {
    listeners.add(l);
    return () => { listeners.delete(l); };
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
    state = { ...state, edges: applyEdgeChanges(changes, state.edges) };
    notify();
  }

  function onConnect(connection: Connection) {
    state = { ...state, edges: addEdge({ ...connection, id: uid('e') }, state.edges) };
    notify();
  }

  function addNode(kind: TENodeKind, x: number, y: number) {
    const g = state.gridSize;
    const data = kind === 'generic' ? defaultGeneric() : kind === 'window' ? defaultWindow() : defaultFrame();
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
    if (sel.size === 0) return;
    state = {
      ...state,
      nodes: state.nodes.filter((n) => !sel.has(n.id)),
      edges: state.edges.filter((e) => !sel.has(e.source) && !sel.has(e.target) && !sel.has(e.id)),
      selectedIds: [],
    };
    notify();
  }

  function clearAll() {
    state = { ...state, nodes: [], edges: [], selectedIds: [] };
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
      return base;
    });

    const nodeIds = new Set(exportNodes.map((n) => n.id));
    const exportEdges: TEEdgeExport[] = state.edges
      .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
      .map((e) => ({
        id: e.id,
        source: e.source,
        sourceHandle: e.sourceHandle ?? null,
        target: e.target,
        targetHandle: e.targetHandle ?? null,
      }));

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
  };
}

export { store as toolEditorStore };
