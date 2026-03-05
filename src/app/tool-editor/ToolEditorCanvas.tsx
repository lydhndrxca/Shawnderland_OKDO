'use client';

import { useCallback, useState, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  SelectionMode,
  useReactFlow,
  type EdgeTypes,
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
import CanvasContextMenu, { type ContextMenuCategory } from '@/components/CanvasContextMenu';
import { useToolEditorStore } from './useToolEditorStore';
import type { TENodeKind } from './types';
import './ToolEditorCanvas.css';

const nodeTypes = {
  generic: GenericNode,
  window: WindowNode,
  frame: FrameNode,
  button: ButtonNode,
  textbox: TextBoxNode,
  dropdown: DropdownNode,
  image: ImageNode,
};

const edgeTypes: EdgeTypes = {
  pipeline: PipelineEdge,
};

const TE_CTX_CATEGORIES: ContextMenuCategory[] = [
  {
    label: 'UI Elements',
    items: [
      { id: 'generic', label: 'Node', color: '#607d8b' },
      { id: 'button', label: 'Button', color: '#42a5f5' },
      { id: 'textbox', label: 'Text Box', color: '#66bb6a' },
      { id: 'dropdown', label: 'Dropdown', color: '#ffa726' },
      { id: 'image', label: 'Image', color: '#ab47bc' },
    ],
  },
  {
    label: 'Containers',
    items: [
      { id: 'window', label: 'Window', color: '#78909c' },
      { id: 'frame', label: 'Frame', color: '#8d6e63' },
    ],
  },
];

interface CtxMenuState { x: number; y: number; nodeId?: string }

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
  const [ctxMenu, setCtxMenu] = useState<CtxMenuState | null>(null);

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

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        deleteSelected();
      } else if (mod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (mod && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      } else if (mod && e.key === 'd') {
        e.preventDefault();
        duplicateSelected();
      }
    },
    [deleteSelected, undo, redo, duplicateSelected],
  );

  const handlePaneContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    setCtxMenu({ x: event.clientX, y: event.clientY });
  }, []);

  const handleNodeContextMenu = useCallback((event: React.MouseEvent, nodeId: string) => {
    event.preventDefault();
    setCtxMenu({ x: event.clientX, y: event.clientY, nodeId });
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

  const selectedCount = useMemo(() => nodes.filter((n) => n.selected).length, [nodes]);

  return (
    <div className="te-canvas-wrap" onKeyDown={onKeyDown} tabIndex={0}>
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
        <Background variant={BackgroundVariant.Lines} gap={gridSize} size={1} color="rgba(255,255,255,0.06)" />
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
          selectedNodeCount={selectedCount}
          categories={TE_CTX_CATEGORIES}
          onClose={() => setCtxMenu(null)}
          onAddNode={handleAddNodeFromMenu}
          onDelete={deleteSelected}
          onDeleteSelected={deleteSelected}
          onDuplicateSelected={duplicateSelected}
          onFitView={handleFitView}
        />
      )}
    </div>
  );
}
