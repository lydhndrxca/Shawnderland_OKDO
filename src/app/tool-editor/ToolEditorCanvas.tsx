'use client';

import { useCallback } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import GenericNode from './nodes/GenericNode';
import WindowNode from './nodes/WindowNode';
import FrameNode from './nodes/FrameNode';
import { useToolEditorStore } from './useToolEditorStore';
import type { TENodeKind } from './types';
import './ToolEditorCanvas.css';

const nodeTypes = {
  generic: GenericNode,
  window: WindowNode,
  frame: FrameNode,
};

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
  } = useToolEditorStore();

  const rf = useReactFlow();

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

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        deleteSelected();
      }
    },
    [deleteSelected],
  );

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
        nodeTypes={nodeTypes}
        snapToGrid
        snapGrid={[gridSize, gridSize]}
        fitView
        deleteKeyCode={null}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={gridSize} size={1} color="#333" />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor={(n) => {
            const d = n.data as { color?: string };
            return d?.color ?? '#607d8b';
          }}
          maskColor="rgba(0,0,0,.7)"
          style={{ background: '#111' }}
        />
      </ReactFlow>
    </div>
  );
}
