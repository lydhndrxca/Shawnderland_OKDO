"use client";

import { useCallback, useRef, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  SelectionMode,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Node,
  type Edge,
  type NodeTypes,
  type EdgeTypes,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import PromptNode from './nodes/PromptNode';
import ImageRefNode from './nodes/ImageRefNode';
import ImageGenNode from './nodes/ImageGenNode';
import VideoGenNode from './nodes/VideoGenNode';
import OutputViewerNode from './nodes/OutputViewerNode';
import PipelineEdge from '@/app/ideation/canvas/edges/PipelineEdge';
import GeminiStudioDock from './GeminiStudioDock';
import CanvasContextMenu, { type ContextMenuCategory } from '@/components/CanvasContextMenu';
import GlobalToolbar from '@/components/GlobalToolbar';

import EmotionNode from '@/app/ideation/canvas/nodes/EmotionNode';
import InfluenceNode from '@/app/ideation/canvas/nodes/InfluenceNode';
import TextInfluenceNode from '@/app/ideation/canvas/nodes/TextInfluenceNode';
import ImageInfluenceNode from '@/app/ideation/canvas/nodes/ImageInfluenceNode';
import ImageReferenceNode from '@/app/ideation/canvas/nodes/ImageReferenceNode';
import CountNode from '@/app/ideation/canvas/nodes/CountNode';
import ExtractDataNode from '@/app/ideation/canvas/nodes/ExtractDataNode';
import CharacterNode from '@/app/ideation/canvas/nodes/CharacterNode';
import WeaponNode from '@/app/ideation/canvas/nodes/WeaponNode';
import TurnaroundNode from '@/app/ideation/canvas/nodes/TurnaroundNode';

import { UIButtonNode, UITextBoxNode, UIDropdownNode, UIImageNode, UIWindowNode, UIFrameNode, UIGenericNode } from '@/components/nodes/ui';
import { applyResizeToAll } from '@/components/nodes/withNodeResize';

import './GeminiStudio.css';

const RAW_NODE_TYPES: NodeTypes = {
  gsPrompt: PromptNode,
  gsImageRef: ImageRefNode,
  gsImageGen: ImageGenNode,
  gsVideoGen: VideoGenNode,
  gsOutputViewer: OutputViewerNode,
  emotion: EmotionNode,
  influence: InfluenceNode,
  textInfluence: TextInfluenceNode,
  imageInfluence: ImageInfluenceNode,
  imageReference: ImageReferenceNode,
  count: CountNode,
  extractData: ExtractDataNode,
  character: CharacterNode,
  weapon: WeaponNode,
  turnaround: TurnaroundNode,
  uiButton: UIButtonNode,
  uiTextBox: UITextBoxNode,
  uiDropdown: UIDropdownNode,
  uiImage: UIImageNode,
  uiWindow: UIWindowNode,
  uiFrame: UIFrameNode,
  uiGeneric: UIGenericNode,
};

const NODE_TYPES: NodeTypes = applyResizeToAll(RAW_NODE_TYPES);

const EDGE_TYPES: EdgeTypes = {
  pipeline: PipelineEdge,
};

const DOCK_CATEGORIES = [
  {
    key: 'generation',
    label: 'Generation',
    icon: '\u{1F3A8}',
    items: [
      { type: 'gsImageGen', label: 'Image Gen', desc: 'Text-to-image with any Google AI model', color: '#f06292' },
      { type: 'gsVideoGen', label: 'Video Gen', desc: 'Text-to-video with Veo models', color: '#ba68c8' },
    ],
  },
  {
    key: 'inputs',
    label: 'Inputs & References',
    icon: '\u{1F4CE}',
    items: [
      { type: 'gsPrompt', label: 'Prompt', desc: 'Text prompt input', color: '#64b5f6' },
      { type: 'gsImageRef', label: 'Image Ref', desc: 'Reference image input', color: '#4dd0e1' },
      { type: 'textInfluence', label: 'Text', desc: 'Paste text as influence', color: '#7986cb' },
      { type: 'imageInfluence', label: 'Image', desc: 'Add image as influence', color: '#4db6ac' },
      { type: 'imageReference', label: 'Image Reference', desc: 'Load or paste reference image', color: '#26a69a' },
    ],
  },
  {
    key: 'modifiers',
    label: 'Modifiers',
    icon: '\u2699',
    items: [
      { type: 'count', label: 'Count', desc: 'Set result quantity', color: '#78909c' },
      { type: 'emotion', label: 'Emotion', desc: 'Set emotional tone', color: '#e57373' },
      { type: 'influence', label: 'Persona', desc: 'Apply creative persona', color: '#ab47bc' },
    ],
  },
  {
    key: 'outputs',
    label: 'Outputs',
    icon: '\u25C8',
    items: [
      { type: 'gsOutputViewer', label: 'Output Viewer', desc: 'View, zoom, and export generated media', color: '#e0e0e0' },
      { type: 'extractData', label: 'Extract Data', desc: 'Read image with AI', color: '#ffab40' },
    ],
  },
  {
    key: 'conceptlab',
    label: 'Concept Lab',
    icon: '\u{1F3A8}',
    items: [
      { type: 'character', label: 'Character', desc: 'Design a character with AI', color: '#7c4dff' },
      { type: 'weapon', label: 'Weapon', desc: 'Design a weapon with AI', color: '#ff6d00' },
      { type: 'turnaround', label: 'Turnaround', desc: 'Multi-view turnaround sheet', color: '#00bfa5' },
    ],
  },
  {
    key: 'uiElements',
    label: 'UI Elements',
    icon: '\u{1F532}',
    items: [
      { type: 'uiButton', label: 'Button', desc: 'Resizable button placeholder', color: '#5c6bc0' },
      { type: 'uiTextBox', label: 'Text Box', desc: 'Resizable text input placeholder', color: '#66bb6a' },
      { type: 'uiDropdown', label: 'Dropdown', desc: 'Dropdown menu placeholder', color: '#ffa726' },
      { type: 'uiImage', label: 'Image', desc: 'Image placeholder', color: '#ab47bc' },
      { type: 'uiGeneric', label: 'Node', desc: 'Generic node with header', color: '#607d8b' },
    ],
  },
  {
    key: 'uiContainers',
    label: 'Containers',
    icon: '\u{1F4E6}',
    items: [
      { type: 'uiWindow', label: 'Window', desc: 'Window panel with title bar', color: '#26a69a' },
      { type: 'uiFrame', label: 'Frame', desc: 'Layout frame / grouping', color: '#78909c' },
    ],
  },
];

const CTX_CATEGORIES: ContextMenuCategory[] = DOCK_CATEGORIES.map((cat) => ({
  label: cat.label,
  items: cat.items.map((item) => ({ id: item.type, label: item.label, color: item.color })),
}));

const IMAGE_PIPELINE_NODES: Node[] = [
  { id: 'gs-p1', type: 'gsPrompt', position: { x: 50, y: 200 }, data: {} },
  { id: 'gs-ig1', type: 'gsImageGen', position: { x: 370, y: 160 }, data: {} },
  { id: 'gs-ov1', type: 'gsOutputViewer', position: { x: 760, y: 200 }, data: {} },
];
const IMAGE_PIPELINE_EDGES: Edge[] = [
  { id: 'ge-p1-ig1', type: 'pipeline', source: 'gs-p1', target: 'gs-ig1', sourceHandle: 'prompt-out', targetHandle: 'prompt-in', data: { sourceStage: 'seed', isComplete: true } },
  { id: 'ge-ig1-ov1', type: 'pipeline', source: 'gs-ig1', target: 'gs-ov1', sourceHandle: 'image-out', targetHandle: 'media-in', data: { sourceStage: 'seed', isComplete: true } },
];

const VIDEO_PIPELINE_NODES: Node[] = [
  { id: 'gs-p2', type: 'gsPrompt', position: { x: 50, y: 200 }, data: {} },
  { id: 'gs-vg1', type: 'gsVideoGen', position: { x: 370, y: 160 }, data: {} },
  { id: 'gs-ov2', type: 'gsOutputViewer', position: { x: 760, y: 200 }, data: {} },
];
const VIDEO_PIPELINE_EDGES: Edge[] = [
  { id: 'ge-p2-vg1', type: 'pipeline', source: 'gs-p2', target: 'gs-vg1', sourceHandle: 'prompt-out', targetHandle: 'prompt-in', data: { sourceStage: 'seed', isComplete: true } },
  { id: 'ge-vg1-ov2', type: 'pipeline', source: 'gs-vg1', target: 'gs-ov2', sourceHandle: 'video-out', targetHandle: 'media-in', data: { sourceStage: 'seed', isComplete: true } },
];

const REF_PIPELINE_NODES: Node[] = [
  { id: 'gs-p3', type: 'gsPrompt', position: { x: 50, y: 140 }, data: {} },
  { id: 'gs-ir1', type: 'gsImageRef', position: { x: 50, y: 340 }, data: {} },
  { id: 'gs-ig2', type: 'gsImageGen', position: { x: 400, y: 180 }, data: {} },
  { id: 'gs-ov3', type: 'gsOutputViewer', position: { x: 780, y: 220 }, data: {} },
];
const REF_PIPELINE_EDGES: Edge[] = [
  { id: 'ge-p3-ig2', type: 'pipeline', source: 'gs-p3', target: 'gs-ig2', sourceHandle: 'prompt-out', targetHandle: 'prompt-in', data: { sourceStage: 'seed', isComplete: true } },
  { id: 'ge-ir1-ig2', type: 'pipeline', source: 'gs-ir1', target: 'gs-ig2', sourceHandle: 'ref-out', targetHandle: 'ref-in', data: { sourceStage: 'seed', isComplete: true } },
  { id: 'ge-ig2-ov3', type: 'pipeline', source: 'gs-ig2', target: 'gs-ov3', sourceHandle: 'image-out', targetHandle: 'media-in', data: { sourceStage: 'seed', isComplete: true } },
];

interface CtxMenuState { x: number; y: number; nodeId?: string }

function GeminiStudioCanvas() {
  const reactFlowInstance = useReactFlow();
  const { screenToFlowPosition } = reactFlowInstance;
  const [nodes, setNodes, onNodesChange] = useNodesState(IMAGE_PIPELINE_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(IMAGE_PIPELINE_EDGES);
  const nextId = useRef(100);

  const [ctxMenu, setCtxMenu] = useState<CtxMenuState | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges],
  );

  const addNodeToCanvas = useCallback(
    (type: string, position: { x: number; y: number }) => {
      const id = `gs-${nextId.current++}`;
      setNodes((nds) => [...nds, { id, type, position, data: {} }]);
      return id;
    },
    [setNodes],
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const type = e.dataTransfer.getData('application/gs-node-type');
      if (!type) return;
      const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      addNodeToCanvas(type, pos);
    },
    [addNodeToCanvas, screenToFlowPosition],
  );

  const loadTemplate = useCallback(
    (templateNodes: Node[], templateEdges: Edge[]) => {
      setNodes(templateNodes);
      setEdges(templateEdges);
    },
    [setNodes, setEdges],
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
        ? screenToFlowPosition({ x: ctxMenu.x, y: ctxMenu.y })
        : { x: 200, y: 200 };
      addNodeToCanvas(nodeType, pos);
    },
    [ctxMenu, addNodeToCanvas, screenToFlowPosition],
  );

  const handleDeleteNode = useCallback(() => {
    if (!ctxMenu?.nodeId) return;
    const nid = ctxMenu.nodeId;
    setNodes((nds) => nds.filter((n) => n.id !== nid));
    setEdges((eds) => eds.filter((e) => e.source !== nid && e.target !== nid));
  }, [ctxMenu, setNodes, setEdges]);

  const handleDeleteSelected = useCallback(() => {
    const selected = nodes.filter((n) => n.selected).map((n) => n.id);
    if (!selected.length) return;
    const set = new Set(selected);
    setNodes((nds) => nds.filter((n) => !set.has(n.id)));
    setEdges((eds) => eds.filter((e) => !set.has(e.source) && !set.has(e.target)));
  }, [nodes, setNodes, setEdges]);

  const handleDuplicateSelected = useCallback(() => {
    const selected = nodes.filter((n) => n.selected);
    if (!selected.length) return;
    const newNodes = selected.map((n) => ({
      ...n,
      id: `gs-${nextId.current++}`,
      position: { x: n.position.x + 40, y: n.position.y + 40 },
      selected: false,
    }));
    setNodes((nds) => [...nds, ...newNodes]);
  }, [nodes, setNodes]);

  const handleFitView = useCallback(() => {
    reactFlowInstance.fitView({ padding: 0.4, duration: 300 });
  }, [reactFlowInstance]);

  const selectedCount = useMemo(() => nodes.filter((n) => n.selected).length, [nodes]);

  const memoNodeTypes = useMemo(() => NODE_TYPES, []);
  const memoEdgeTypes = useMemo(() => EDGE_TYPES, []);

  const gsTemplates = useMemo(() => [
    { label: 'Image Pipeline', icon: '\u{1F3A8}', nodes: IMAGE_PIPELINE_NODES, edges: IMAGE_PIPELINE_EDGES },
    { label: 'Video Pipeline', icon: '\u{1F3AC}', nodes: VIDEO_PIPELINE_NODES, edges: VIDEO_PIPELINE_EDGES },
    { label: 'Ref + Image Pipeline', icon: '\u{1F5BC}', nodes: REF_PIPELINE_NODES, edges: REF_PIPELINE_EDGES },
  ], []);

  return (
    <div className="gs-shell">
      <GlobalToolbar
        title="Gemini Studio"
        hint="Image & video generation"
        hasSelection={selectedCount > 0}
        onDuplicate={handleDuplicateSelected}
        onFitView={handleFitView}
        onClear={() => { setNodes([]); setEdges([]); }}
      />
      <div className="gs-main">
        <GeminiStudioDock
          categories={DOCK_CATEGORIES}
          templates={gsTemplates}
          onLoadTemplate={loadTemplate}
          selectedNodeId={selectedNodeId}
          onCloseInspector={() => setSelectedNodeId(null)}
        />
        <div className="gs-canvas-area">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onNodeClick={(_, node) => setSelectedNodeId(node.id)}
            onPaneClick={() => { setSelectedNodeId(null); setCtxMenu(null); }}
            onPaneContextMenu={(e) => handlePaneContextMenu(e as unknown as React.MouseEvent)}
            onNodeContextMenu={(e, node) => handleNodeContextMenu(e as unknown as React.MouseEvent, node.id)}
            nodeTypes={memoNodeTypes}
            edgeTypes={memoEdgeTypes}
            defaultEdgeOptions={{ type: 'pipeline', data: { isComplete: true } }}
            panOnDrag={[1]}
            selectionOnDrag
            selectionMode={SelectionMode.Partial}
            snapToGrid
            snapGrid={[20, 20]}
            fitView
            fitViewOptions={{ padding: 0.4 }}
            minZoom={0.2}
            colorMode="dark"
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Lines} gap={20} size={1} color="rgba(255,255,255,0.06)" />
            <Controls className="flow-controls" />
            <MiniMap
              className="flow-minimap"
              nodeColor="var(--bg-elevated, #2a2a3c)"
              maskColor="rgba(0,0,0,0.6)"
            />
          </ReactFlow>

          {ctxMenu && (
            <CanvasContextMenu
              x={ctxMenu.x}
              y={ctxMenu.y}
              nodeId={ctxMenu.nodeId}
              selectedNodeCount={selectedCount}
              categories={CTX_CATEGORIES}
              onClose={() => setCtxMenu(null)}
              onAddNode={handleAddNodeFromMenu}
              onDelete={handleDeleteNode}
              onDeleteSelected={handleDeleteSelected}
              onDuplicateSelected={handleDuplicateSelected}
              onFitView={handleFitView}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default function GeminiStudioShell() {
  return (
    <ReactFlowProvider>
      <GeminiStudioCanvas />
    </ReactFlowProvider>
  );
}
