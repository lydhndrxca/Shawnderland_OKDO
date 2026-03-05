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

import PipelineEdge from '@/app/ideation/canvas/edges/PipelineEdge';
import ConceptLabDock from './ConceptLabDock';
import CanvasContextMenu, { type ContextMenuCategory } from '@/components/CanvasContextMenu';
import GlobalToolbar from '@/components/GlobalToolbar';

import CharIdentityNode from './nodes/CharIdentityNode';
import CharAttributesNode from './nodes/CharAttributesNode';
import WeapBaseNode from './nodes/WeapBaseNode';
import WeapComponentsNode from './nodes/WeapComponentsNode';
import MultiViewerNode from './nodes/MultiViewerNode';
import EditImageNode from './nodes/EditImageNode';

import TurnaroundNode from '@/app/ideation/canvas/nodes/TurnaroundNode';
import CountNode from '@/app/ideation/canvas/nodes/CountNode';
import EmotionNode from '@/app/ideation/canvas/nodes/EmotionNode';
import InfluenceNode from '@/app/ideation/canvas/nodes/InfluenceNode';
import TextInfluenceNode from '@/app/ideation/canvas/nodes/TextInfluenceNode';
import ImageInfluenceNode from '@/app/ideation/canvas/nodes/ImageInfluenceNode';
import ImageReferenceNode from '@/app/ideation/canvas/nodes/ImageReferenceNode';
import ExtractDataNode from '@/app/ideation/canvas/nodes/ExtractDataNode';

import { UIButtonNode, UITextBoxNode, UIDropdownNode, UIImageNode, UIWindowNode, UIFrameNode, UIGenericNode } from '@/components/nodes/ui';
import { applyResizeToAll } from '@/components/nodes/withNodeResize';

import './ConceptLab.css';

const RAW_NODE_TYPES: NodeTypes = {
  charIdentity: CharIdentityNode,
  charAttributes: CharAttributesNode,
  weapBase: WeapBaseNode,
  weapComponents: WeapComponentsNode,
  multiViewer: MultiViewerNode,
  editImage: EditImageNode,
  turnaround: TurnaroundNode,
  count: CountNode,
  emotion: EmotionNode,
  influence: InfluenceNode,
  textInfluence: TextInfluenceNode,
  imageInfluence: ImageInfluenceNode,
  imageReference: ImageReferenceNode,
  extractData: ExtractDataNode,
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
    key: 'character',
    label: 'Character',
    icon: '\u{1F464}',
    items: [
      { type: 'charIdentity', label: 'Character Identity', desc: 'Age, race, gender, build, description + generate', color: '#7c4dff' },
      { type: 'charAttributes', label: 'Character Attributes', desc: 'All 14 clothing/gear/pose attribute dropdowns', color: '#9c27b0' },
    ],
  },
  {
    key: 'weapon',
    label: 'Weapon',
    icon: '\u{1F52B}',
    items: [
      { type: 'weapBase', label: 'Weapon Generator', desc: 'Weapon description, instructions + generate', color: '#ff6d00' },
      { type: 'weapComponents', label: 'Weapon Components', desc: 'Receiver, barrel, stock, grip, finish, condition', color: '#e65100' },
    ],
  },
  {
    key: 'viewers',
    label: 'Viewers & Editors',
    icon: '\u{1F5BC}',
    items: [
      { type: 'multiViewer', label: 'Image Viewer', desc: 'Multi-tab viewer: Main, Front, Back, Side, Refs', color: '#00bfa5' },
      { type: 'editImage', label: 'Edit / Refine', desc: 'Apply text-based edits to generated image', color: '#29b6f6' },
      { type: 'turnaround', label: 'Turnaround', desc: 'Multi-view turnaround sheet generator', color: '#00bfa5' },
    ],
  },
  {
    key: 'inputs',
    label: 'Inputs & References',
    icon: '\u{1F4CE}',
    items: [
      { type: 'textInfluence', label: 'Text Input', desc: 'Add text as influence or context', color: '#7986cb' },
      { type: 'imageInfluence', label: 'Image Input', desc: 'Add image as influence', color: '#4db6ac' },
      { type: 'imageReference', label: 'Image Reference', desc: 'Load or paste reference image', color: '#26a69a' },
    ],
  },
  {
    key: 'modifiers',
    label: 'Modifiers',
    icon: '\u2699',
    items: [
      { type: 'count', label: 'Generation Count', desc: 'Set number of images to generate', color: '#78909c' },
      { type: 'emotion', label: 'Emotion', desc: 'Set emotional tone / mood', color: '#e57373' },
      { type: 'influence', label: 'Persona', desc: 'Apply creative persona style', color: '#ab47bc' },
    ],
  },
  {
    key: 'analysis',
    label: 'Analysis',
    icon: '\u{1F50D}',
    items: [
      { type: 'extractData', label: 'Extract Data', desc: 'Read and analyze image with AI', color: '#ffab40' },
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

/* ---------- Character Preset ---------- */
const CHAR_PRESET_NODES: Node[] = [
  { id: 'cl-charId', type: 'charIdentity', position: { x: 60, y: 60 }, data: {} },
  { id: 'cl-charAttr', type: 'charAttributes', position: { x: 60, y: 520 }, data: {} },
  { id: 'cl-charViewer', type: 'multiViewer', position: { x: 500, y: 60 }, data: {} },
  { id: 'cl-charEdit', type: 'editImage', position: { x: 500, y: 500 }, data: {} },
  { id: 'cl-charTurn', type: 'turnaround', position: { x: 1060, y: 60 }, data: {} },
  { id: 'cl-charEmo', type: 'emotion', position: { x: 60, y: -80 }, data: {} },
];
const CHAR_PRESET_EDGES: Edge[] = [
  { id: 'ce-attr-id', type: 'pipeline', source: 'cl-charAttr', target: 'cl-charId', sourceHandle: 'attrs-out', targetHandle: 'attr-in', data: { isComplete: true } },
  { id: 'ce-id-viewer', type: 'pipeline', source: 'cl-charId', target: 'cl-charViewer', sourceHandle: 'image-out', targetHandle: 'image-in', data: { isComplete: true } },
  { id: 'ce-id-edit', type: 'pipeline', source: 'cl-charId', target: 'cl-charEdit', sourceHandle: 'image-out', targetHandle: 'image-in', data: { isComplete: true } },
  { id: 'ce-id-turn', type: 'pipeline', source: 'cl-charId', target: 'cl-charTurn', sourceHandle: 'image-out', targetHandle: 'ref-image', data: { isComplete: true } },
];

/* ---------- Weapon Preset ---------- */
const WEAPON_PRESET_NODES: Node[] = [
  { id: 'cl-weapGen', type: 'weapBase', position: { x: 60, y: 60 }, data: {} },
  { id: 'cl-weapComp', type: 'weapComponents', position: { x: 60, y: 500 }, data: {} },
  { id: 'cl-weapViewer', type: 'multiViewer', position: { x: 500, y: 60 }, data: {} },
  { id: 'cl-weapEdit', type: 'editImage', position: { x: 500, y: 500 }, data: {} },
  { id: 'cl-weapTurn', type: 'turnaround', position: { x: 1060, y: 60 }, data: {} },
  { id: 'cl-weapRef', type: 'imageReference', position: { x: 60, y: -80 }, data: {} },
];
const WEAPON_PRESET_EDGES: Edge[] = [
  { id: 'we-comp-gen', type: 'pipeline', source: 'cl-weapComp', target: 'cl-weapGen', sourceHandle: 'comps-out', targetHandle: 'comp-in', data: { isComplete: true } },
  { id: 'we-ref-gen', type: 'pipeline', source: 'cl-weapRef', target: 'cl-weapGen', sourceHandle: 'ref-out', targetHandle: 'ref-image', data: { isComplete: true } },
  { id: 'we-gen-viewer', type: 'pipeline', source: 'cl-weapGen', target: 'cl-weapViewer', sourceHandle: 'image-out', targetHandle: 'image-in', data: { isComplete: true } },
  { id: 'we-gen-edit', type: 'pipeline', source: 'cl-weapGen', target: 'cl-weapEdit', sourceHandle: 'image-out', targetHandle: 'image-in', data: { isComplete: true } },
  { id: 'we-gen-turn', type: 'pipeline', source: 'cl-weapGen', target: 'cl-weapTurn', sourceHandle: 'image-out', targetHandle: 'ref-image', data: { isComplete: true } },
];

/* ---------- Props Preset (blank) ---------- */
const PROPS_PRESET_NODES: Node[] = [
  { id: 'cl-txt1', type: 'textInfluence', position: { x: 60, y: 200 }, data: {} },
  { id: 'cl-img1', type: 'imageReference', position: { x: 60, y: 400 }, data: {} },
];
const PROPS_PRESET_EDGES: Edge[] = [];

interface CtxMenuState { x: number; y: number; nodeId?: string }

type ActivePreset = 'character' | 'weapon' | 'props';

function ConceptLabCanvas() {
  const reactFlowInstance = useReactFlow();
  const { screenToFlowPosition } = reactFlowInstance;
  const [nodes, setNodes, onNodesChange] = useNodesState(CHAR_PRESET_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(CHAR_PRESET_EDGES);
  const nextId = useRef(100);
  const [activePreset, setActivePreset] = useState<ActivePreset>('character');

  const [ctxMenu, setCtxMenu] = useState<CtxMenuState | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges],
  );

  const addNodeToCanvas = useCallback(
    (type: string, position: { x: number; y: number }) => {
      const id = `cl-${nextId.current++}`;
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
      const type = e.dataTransfer.getData('application/cl-node-type');
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

  const handlePresetSelect = useCallback(
    (preset: ActivePreset) => {
      setActivePreset(preset);
      switch (preset) {
        case 'character':
          loadTemplate(CHAR_PRESET_NODES, CHAR_PRESET_EDGES);
          break;
        case 'weapon':
          loadTemplate(WEAPON_PRESET_NODES, WEAPON_PRESET_EDGES);
          break;
        case 'props':
          loadTemplate(PROPS_PRESET_NODES, PROPS_PRESET_EDGES);
          break;
      }
      setTimeout(() => reactFlowInstance.fitView({ padding: 0.4, duration: 300 }), 100);
    },
    [loadTemplate, reactFlowInstance],
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
      id: `cl-${nextId.current++}`,
      position: { x: n.position.x + 40, y: n.position.y + 40 },
      selected: false,
    }));
    setNodes((nds) => [...nds, ...newNodes]);
  }, [nodes, setNodes]);

  const handleFitView = useCallback(() => {
    reactFlowInstance.fitView({ padding: 0.4, duration: 300 });
  }, [reactFlowInstance]);

  const handleClear = useCallback(() => {
    setNodes([]);
    setEdges([]);
  }, [setNodes, setEdges]);

  const selectedCount = useMemo(() => nodes.filter((n) => n.selected).length, [nodes]);
  const memoNodeTypes = useMemo(() => NODE_TYPES, []);
  const memoEdgeTypes = useMemo(() => EDGE_TYPES, []);

  const presetTemplates = useMemo(() => [
    { label: 'Character Generator', icon: '\u{1F464}', nodes: CHAR_PRESET_NODES, edges: CHAR_PRESET_EDGES },
    { label: 'Weapon Generator', icon: '\u{1F52B}', nodes: WEAPON_PRESET_NODES, edges: WEAPON_PRESET_EDGES },
    { label: 'Props (Blank)', icon: '\u{1F4E6}', nodes: PROPS_PRESET_NODES, edges: PROPS_PRESET_EDGES },
  ], []);

  return (
    <div className="cl-shell">
      <GlobalToolbar
        title="AI ConceptLab"
        hint="Character & weapon concept generation"
        hasSelection={selectedCount > 0}
        onDuplicate={handleDuplicateSelected}
        onFitView={handleFitView}
        onClear={handleClear}
      />

      <div className="cl-presets-bar">
        <span className="cl-presets-label">Preset:</span>
        <button
          className={`cl-preset-btn ${activePreset === 'character' ? 'active' : ''}`}
          onClick={() => handlePresetSelect('character')}
        >
          <span className="cl-preset-icon">{'\u{1F464}'}</span>
          Character
        </button>
        <button
          className={`cl-preset-btn ${activePreset === 'weapon' ? 'active' : ''}`}
          onClick={() => handlePresetSelect('weapon')}
        >
          <span className="cl-preset-icon">{'\u{1F52B}'}</span>
          Weapon
        </button>
        <button
          className={`cl-preset-btn ${activePreset === 'props' ? 'active' : ''}`}
          onClick={() => handlePresetSelect('props')}
        >
          <span className="cl-preset-icon">{'\u{1F4E6}'}</span>
          Props
        </button>
      </div>

      <div className="cl-main">
        <ConceptLabDock
          categories={DOCK_CATEGORIES}
          templates={presetTemplates}
          onLoadTemplate={loadTemplate}
          selectedNodeId={selectedNodeId}
          onCloseInspector={() => setSelectedNodeId(null)}
        />
        <div className="cl-canvas-area">
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

export default function ConceptLabShell() {
  return (
    <ReactFlowProvider>
      <ConceptLabCanvas />
    </ReactFlowProvider>
  );
}
