'use client';

import { useCallback, useState, useMemo, useRef, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  SelectionMode,
  useReactFlow,
  type EdgeTypes,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import GenericNode from './nodes/GenericNode';
import WindowNode from './nodes/WindowNode';
import FrameNode from './nodes/FrameNode';
import ButtonNode from './nodes/ButtonNode';
import TextBoxNode from './nodes/TextBoxNode';
import DropdownNode from './nodes/DropdownNode';
import ImageNode from './nodes/ImageNode';
import PipelineEdge from '@/app/ideation/canvas/edges/PipelineEdge';
import CanvasContextMenu from '@/components/CanvasContextMenu';
import { useToolEditorStore } from './useToolEditorStore';
import type { TENodeKind } from './types';
import { ALL_RAW_NODE_TYPES, ALL_CTX_CATEGORIES } from '@/lib/sharedNodeTypes';
import { applyResizeToAll } from '@/components/nodes/withNodeResize';
import './ToolEditorCanvas.css';

const nodeTypes = applyResizeToAll({
  ...ALL_RAW_NODE_TYPES,
  generic: GenericNode,
  window: WindowNode,
  frame: FrameNode,
  button: ButtonNode,
  textbox: TextBoxNode,
  dropdown: DropdownNode,
  image: ImageNode,
});

const edgeTypes: EdgeTypes = {
  pipeline: PipelineEdge,
};

const TE_CTX_CATEGORIES = [
  {
    label: 'TE UI Elements',
    items: [
      { id: 'generic', label: 'Node', color: '#607d8b' },
      { id: 'button', label: 'Button', color: '#42a5f5' },
      { id: 'textbox', label: 'Text Box', color: '#66bb6a' },
      { id: 'dropdown', label: 'Dropdown', color: '#ffa726' },
      { id: 'image', label: 'Image', color: '#ab47bc' },
    ],
  },
  {
    label: 'TE Containers',
    items: [
      { id: 'window', label: 'Window', color: '#78909c' },
      { id: 'frame', label: 'Frame', color: '#8d6e63' },
    ],
  },
  ...ALL_CTX_CATEGORIES,
];

interface CtxMenuState { x: number; y: number; nodeId?: string; edgeId?: string }
interface CutLine { x1: number; y1: number; x2: number; y2: number }

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

export default function ToolEditorCanvas() {
  const {
    nodes,
    edges,
    gridSize,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    deleteSelected,
    pushHistory,
    undo,
    redo,
    duplicateSelected,
  } = useToolEditorStore();

  const rf = useReactFlow();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [ctxMenu, setCtxMenu] = useState<CtxMenuState | null>(null);
  const [cutLine, setCutLine] = useState<CutLine | null>(null);
  const cutStartRef = useRef<{ x: number; y: number } | null>(null);
  const clipboardRef = useRef<{ nodes: Node[]; edges: typeof edges } | null>(null);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const kind = e.dataTransfer.getData('application/te-node-kind') as TENodeKind;
      if (!kind) return;
      const pos = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY });
      addNode(kind, pos.x, pos.y);
    },
    [addNode, rf],
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const onNodeDragStart = useCallback(() => {
    pushHistory();
  }, [pushHistory]);

  const copySelected = useCallback(() => {
    const sel = nodes.filter((n) => n.selected);
    if (!sel.length) return;
    const ids = new Set(sel.map((n) => n.id));
    clipboardRef.current = { nodes: sel, edges: edges.filter((e) => ids.has(e.source) && ids.has(e.target)) };
  }, [nodes, edges]);

  const pasteNodes = useCallback(() => {
    if (!clipboardRef.current) return;
    const { nodes: clipNodes, edges: clipEdges } = clipboardRef.current;
    const idMap = new Map<string, string>();
    const newNodes = clipNodes.map((n) => {
      const newId = `te-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      idMap.set(n.id, newId);
      return { ...n, id: newId, position: { x: n.position.x + 40, y: n.position.y + 40 }, selected: false };
    });
    const newEdges = clipEdges.map((e) => ({
      ...e,
      id: `e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      source: idMap.get(e.source) ?? e.source,
      target: idMap.get(e.target) ?? e.target,
    }));
    onNodesChange(newNodes.map((n) => ({ type: 'add' as const, item: n })));
    onEdgesChange(newEdges.map((e) => ({ type: 'add' as const, item: e })));
  }, [onNodesChange, onEdgesChange]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el) {
        const tag = el.tagName.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
        if (el.getAttribute('contenteditable') === 'true') return;
      }
      const mod = e.ctrlKey || e.metaKey;
      if (e.key === 'Delete' || e.key === 'Backspace') { deleteSelected(); }
      else if (mod && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      else if (mod && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
      else if (mod && e.key === 'd') { e.preventDefault(); duplicateSelected(); }
      else if (mod && e.key === 'c') { copySelected(); }
      else if (mod && e.key === 'v') { pasteNodes(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [deleteSelected, undo, redo, duplicateSelected, copySelected, pasteNodes]);

  // Edge-cutting
  const handleCutMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 2) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    cutStartRef.current = { x, y };
    setCutLine({ x1: x, y1: y, x2: x, y2: y });
  }, []);

  const handleCutMouseMove = useCallback((e: React.MouseEvent) => {
    if (!cutStartRef.current) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCutLine({ x1: cutStartRef.current.x, y1: cutStartRef.current.y, x2: x, y2: y });
  }, []);

  const handleCutMouseUp = useCallback(() => {
    if (!cutStartRef.current || !cutLine) {
      cutStartRef.current = null;
      setCutLine(null);
      return;
    }
    const rect = canvasRef.current?.getBoundingClientRect();
    const fp1 = rf.screenToFlowPosition({ x: cutLine.x1 + (rect?.left ?? 0), y: cutLine.y1 + (rect?.top ?? 0) });
    const fp2 = rf.screenToFlowPosition({ x: cutLine.x2 + (rect?.left ?? 0), y: cutLine.y2 + (rect?.top ?? 0) });

    const toRemove: string[] = [];
    for (const edge of edges) {
      const src = nodes.find((n) => n.id === edge.source);
      const tgt = nodes.find((n) => n.id === edge.target);
      if (!src || !tgt) continue;
      const sx = src.position.x + (src.measured?.width ?? 200);
      const sy = src.position.y + (src.measured?.height ?? 60) / 2;
      const tx = tgt.position.x;
      const ty = tgt.position.y + (tgt.measured?.height ?? 60) / 2;
      if (segIntersect(fp1.x, fp1.y, fp2.x, fp2.y, sx, sy, tx, ty)) toRemove.push(edge.id);
    }
    if (toRemove.length > 0) {
      pushHistory();
      onEdgesChange(toRemove.map((id) => ({ type: 'remove' as const, id })));
    }
    cutStartRef.current = null;
    setCutLine(null);
  }, [cutLine, edges, nodes, rf, pushHistory, onEdgesChange]);

  const handlePaneContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    setCtxMenu({ x: event.clientX, y: event.clientY });
  }, []);

  const handleNodeContextMenu = useCallback((event: React.MouseEvent, nodeId: string) => {
    event.preventDefault();
    setCtxMenu({ x: event.clientX, y: event.clientY, nodeId });
  }, []);

  const handleEdgeContextMenu = useCallback((event: React.MouseEvent, edge: { id: string }) => {
    event.preventDefault();
    setCtxMenu({ x: event.clientX, y: event.clientY, edgeId: edge.id });
  }, []);

  const handleAddNodeFromMenu = useCallback(
    (nodeType: string) => {
      const pos = ctxMenu
        ? rf.screenToFlowPosition({ x: ctxMenu.x, y: ctxMenu.y })
        : { x: 200, y: 200 };
      addNode(nodeType as TENodeKind, pos.x, pos.y);
    },
    [ctxMenu, addNode, rf],
  );

  const handleFitView = useCallback(() => {
    rf.fitView({ padding: 0.15, duration: 300 });
  }, [rf]);

  const handleDeleteEdge = useCallback(() => {
    if (!ctxMenu?.edgeId) return;
    pushHistory();
    onEdgesChange([{ type: 'remove' as const, id: ctxMenu.edgeId }]);
    setCtxMenu(null);
  }, [ctxMenu, pushHistory, onEdgesChange]);

  const selectedCount = useMemo(() => nodes.filter((n) => n.selected).length, [nodes]);

  return (
    <div
      className="te-canvas-wrap"
      ref={canvasRef}
      tabIndex={0}
      onMouseDown={handleCutMouseDown}
      onMouseMove={handleCutMouseMove}
      onMouseUp={handleCutMouseUp}
      onContextMenu={(e) => { if (cutStartRef.current) e.preventDefault(); }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodeDragStart={onNodeDragStart}
        onPaneClick={() => setCtxMenu(null)}
        onPaneContextMenu={(e) => handlePaneContextMenu(e as unknown as React.MouseEvent)}
        onNodeContextMenu={(e, node) => handleNodeContextMenu(e as unknown as React.MouseEvent, node.id)}
        onEdgeContextMenu={(e, edge) => handleEdgeContextMenu(e as unknown as React.MouseEvent, edge)}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={{ type: 'pipeline', data: { isComplete: true } }}
        panOnDrag={[1]}
        selectionOnDrag
        selectionMode={SelectionMode.Partial}
        snapToGrid
        snapGrid={[gridSize, gridSize]}
        fitView
        fitViewOptions={{ padding: 0.4 }}
        minZoom={0.2}
        colorMode="dark"
        deleteKeyCode={null}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Lines} gap={gridSize * 2} size={1} color="rgba(255,255,255,0.06)" />
        <Controls className="flow-controls" showInteractive={false} />
        <MiniMap
          className="flow-minimap"
          nodeColor={(n) => {
            const d = n.data as { color?: string };
            return d?.color ?? '#607d8b';
          }}
          maskColor="rgba(0,0,0,0.6)"
        />
      </ReactFlow>

      {ctxMenu && (
        <CanvasContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          nodeId={ctxMenu.nodeId}
          edgeId={ctxMenu.edgeId}
          selectedNodeCount={selectedCount}
          categories={TE_CTX_CATEGORIES}
          onClose={() => setCtxMenu(null)}
          onAddNode={handleAddNodeFromMenu}
          onDelete={deleteSelected}
          onDeleteSelected={deleteSelected}
          onDuplicateSelected={duplicateSelected}
          onFitView={handleFitView}
          onCopy={copySelected}
          onPaste={pasteNodes}
          onDeleteEdge={ctxMenu.edgeId ? handleDeleteEdge : undefined}
        />
      )}

      {cutLine && (
        <svg className="cut-line-overlay">
          <line x1={cutLine.x1} y1={cutLine.y1} x2={cutLine.x2} y2={cutLine.y2} className="cut-line" />
        </svg>
      )}
    </div>
  );
}
