"use client";

import { useCallback, useEffect, useRef, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  SelectionMode,
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
import { ToastContainer, showToast } from '@/components/Toast';
import CostWidget from '@/components/CostWidget';
import { useCanvasSession, type CutLine } from '@/hooks/useCanvasSession';

import WeapBaseNode from './nodes/WeapBaseNode';
import WeapComponentsNode from './nodes/WeapComponentsNode';

import CharIdentityNode from '@/app/ideation/canvas/nodes/character/CharIdentityNode';
import CharDescriptionNode from '@/app/ideation/canvas/nodes/character/CharDescriptionNode';
import CharAttributesNode from '@/app/ideation/canvas/nodes/character/CharAttributesNode';
import ExtractAttributesNode from '@/app/ideation/canvas/nodes/character/ExtractAttributesNode';
import EnhanceDescriptionNode from '@/app/ideation/canvas/nodes/character/EnhanceDescriptionNode';
import GenerateCharImageNode from '@/app/ideation/canvas/nodes/character/GenerateCharImageNode';
import GenerateViewsNode from '@/app/ideation/canvas/nodes/character/GenerateViewsNode';
import ReferenceCalloutNode from '@/app/ideation/canvas/nodes/character/ReferenceCalloutNode';
import MainStageViewerNode from '@/app/ideation/canvas/nodes/character/MainStageViewerNode';
import EditCharacterNode from '@/app/ideation/canvas/nodes/character/EditCharacterNode';
import CharHistoryNode from '@/app/ideation/canvas/nodes/character/CharHistoryNode';
import ResetCharacterNode from '@/app/ideation/canvas/nodes/character/ResetCharacterNode';
import SendToPhotoshopNode from '@/app/ideation/canvas/nodes/character/SendToPhotoshopNode';
import ShowXMLNode from '@/app/ideation/canvas/nodes/character/ShowXMLNode';
import QuickGenerateNode from '@/app/ideation/canvas/nodes/character/QuickGenerateNode';
import ProjectSettingsNode from '@/app/ideation/canvas/nodes/character/ProjectSettingsNode';

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
  charDescription: CharDescriptionNode,
  charAttributes: CharAttributesNode,
  charExtractAttrs: ExtractAttributesNode,
  charEnhanceDesc: EnhanceDescriptionNode,
  charGenerate: GenerateCharImageNode,
  charGenViews: GenerateViewsNode,
  charRefCallout: ReferenceCalloutNode,
  charViewer: MainStageViewerNode,
  charEdit: EditCharacterNode,
  charHistory: CharHistoryNode,
  charReset: ResetCharacterNode,
  charSendPS: SendToPhotoshopNode,
  charShowXML: ShowXMLNode,
  charQuickGen: QuickGenerateNode,
  charProject: ProjectSettingsNode,
  weapBase: WeapBaseNode,
  weapComponents: WeapComponentsNode,
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
      { type: 'charIdentity', label: 'Character Identity', desc: 'Age, race, gender, build presets', color: '#7c4dff' },
      { type: 'charDescription', label: 'Character Description', desc: 'Freeform character description', color: '#5c6bc0' },
      { type: 'charAttributes', label: 'Character Attributes', desc: '14 attribute groups with dropdowns', color: '#9c27b0' },
      { type: 'charExtractAttrs', label: 'Extract Attributes', desc: 'AI analysis of reference image', color: '#ffab40' },
      { type: 'charEnhanceDesc', label: 'Enhance Description', desc: 'AI-enhanced description text', color: '#66bb6a' },
      { type: 'charGenerate', label: 'Generate Character', desc: 'Main character image generation', color: '#e91e63' },
      { type: 'charGenViews', label: 'Generate Views', desc: 'Front, back, side view generation', color: '#00bfa5' },
      { type: 'charRefCallout', label: 'Reference Callout', desc: 'Annotate reference image for generation', color: '#26a69a' },
      { type: 'charViewer', label: 'Main Stage Viewer', desc: 'Multi-tab image viewer with zoom', color: '#00bfa5' },
      { type: 'charEdit', label: 'Edit Character', desc: 'Text-based image edits', color: '#29b6f6' },
      { type: 'charHistory', label: 'History', desc: 'Generation history with thumbnails', color: '#78909c' },
      { type: 'charQuickGen', label: 'Quick Generate', desc: 'Randomly generate a character', color: '#ffa726' },
      { type: 'charProject', label: 'Project Settings', desc: 'Name and output directory', color: '#546e7a' },
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
    key: 'charUtils',
    label: 'Character Utilities',
    icon: '\u{1F6E0}',
    items: [
      { type: 'charReset', label: 'Reset Character', desc: 'Clear all character data', color: '#ef5350' },
      { type: 'charSendPS', label: 'Send to Photoshop', desc: 'Send images to Adobe Photoshop', color: '#1565c0' },
      { type: 'charShowXML', label: 'Show XML', desc: 'View character config as XML', color: '#8d6e63' },
    ],
  },
  {
    key: 'viewers',
    label: 'Viewers & Editors',
    icon: '\u{1F5BC}',
    items: [
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
  { id: 'cl-charViewer', type: 'charViewer', position: { x: 500, y: 60 }, data: {} },
  { id: 'cl-charEdit', type: 'charEdit', position: { x: 500, y: 500 }, data: {} },
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
  { id: 'cl-weapViewer', type: 'charViewer', position: { x: 500, y: 60 }, data: {} },
  { id: 'cl-weapEdit', type: 'charEdit', position: { x: 500, y: 500 }, data: {} },
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

interface CtxMenuState { x: number; y: number; nodeId?: string; edgeId?: string }

function CutLineOverlay({ cutLine }: { cutLine: CutLine | null }) {
  if (!cutLine) return null;
  return (
    <svg className="cut-line-overlay">
      <line x1={cutLine.x1} y1={cutLine.y1} x2={cutLine.x2} y2={cutLine.y2} className="cut-line" />
    </svg>
  );
}

function ConceptLabCanvas() {
  const reactFlowInstance = useReactFlow();
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cs = useCanvasSession({
    appKey: 'concept-lab',
    initialNodes: CHAR_PRESET_NODES,
    initialEdges: CHAR_PRESET_EDGES,
    idPrefix: 'cl',
  });

  const [ctxMenu, setCtxMenu] = useState<CtxMenuState | null>(null);

  const handleFitView = useCallback(() => {
    reactFlowInstance.fitView({ padding: 0.4, duration: 300 });
  }, [reactFlowInstance]);

  const initialFitDone = useRef(false);
  useEffect(() => {
    if (!initialFitDone.current && cs.nodes.length > 0) {
      initialFitDone.current = true;
      setTimeout(() => handleFitView(), 200);
    }
  }, [cs.nodes.length, handleFitView]);

  const loadTemplate = useCallback(
    (templateNodes: Node[], templateEdges: Edge[]) => {
      cs.setNodes(templateNodes);
      cs.setEdges(templateEdges);
      setTimeout(() => handleFitView(), 100);
    },
    [cs, handleFitView],
  );

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

  const { screenToFlowPosition } = reactFlowInstance;

  const handleAddNodeFromMenu = useCallback(
    (nodeType: string) => {
      const pos = ctxMenu
        ? screenToFlowPosition({ x: ctxMenu.x, y: ctxMenu.y })
        : { x: 200, y: 200 };
      cs.addNodeToCanvas(nodeType, pos);
    },
    [ctxMenu, cs, screenToFlowPosition],
  );

  const handleDeleteNode = useCallback(() => {
    if (ctxMenu?.nodeId) cs.removeNode(ctxMenu.nodeId);
  }, [ctxMenu, cs]);

  const handleClear = useCallback(() => {
    cs.setNodes([]);
    cs.setEdges([]);
  }, [cs]);

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
      cs.addNodeToCanvas(type, pos);
    },
    [cs, screenToFlowPosition],
  );

  const handleOpenImage = useCallback(async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const parts = dataUrl.split(',');
        const mime = parts[0].match(/:(.*?);/)?.[1] ?? 'image/png';
        const pos = ctxMenu
          ? reactFlowInstance.screenToFlowPosition({ x: ctxMenu.x, y: ctxMenu.y })
          : { x: 200, y: 200 };
        cs.addNodeToCanvas('imageReference', pos, {
          imageBase64: parts[1],
          mimeType: mime,
          fileName: file.name,
        });
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }, [ctxMenu, cs, reactFlowInstance]);

  const handlePasteImage = useCallback(async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find((t) => t.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = reader.result as string;
            const parts = dataUrl.split(',');
            const mime = parts[0].match(/:(.*?);/)?.[1] ?? 'image/png';
            const pos = ctxMenu
              ? reactFlowInstance.screenToFlowPosition({ x: ctxMenu.x, y: ctxMenu.y })
              : { x: 200, y: 200 };
            cs.addNodeToCanvas('imageReference', pos, {
              imageBase64: parts[1],
              mimeType: mime,
              fileName: 'pasted-image',
            });
          };
          reader.readAsDataURL(blob);
          return;
        }
      }
    } catch { /* clipboard access may fail */ }
  }, [ctxMenu, cs, reactFlowInstance]);

  const handleImportLayout = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) cs.importLayout(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [cs]);

  const selectedCount = useMemo(() => cs.nodes.filter((n) => n.selected).length, [cs.nodes]);
  const memoNodeTypes = useMemo(() => NODE_TYPES, []);
  const memoEdgeTypes = useMemo(() => EDGE_TYPES, []);

  const presetTemplates = useMemo(() => [
    { label: 'Character Generator', icon: '\u{1F464}', nodes: CHAR_PRESET_NODES, edges: CHAR_PRESET_EDGES },
    { label: 'Weapon Generator', icon: '\u{1F52B}', nodes: WEAPON_PRESET_NODES, edges: WEAPON_PRESET_EDGES },
    { label: 'Props (Blank)', icon: '\u{1F4E6}', nodes: PROPS_PRESET_NODES, edges: PROPS_PRESET_EDGES },
  ], []);

  const isPinned = ctxMenu?.nodeId
    ? !!(cs.nodes.find((n) => n.id === ctxMenu.nodeId)?.data as Record<string, unknown>)?.__pinned
    : false;

  const isGroupNode = ctxMenu?.nodeId
    ? cs.nodes.find((n) => n.id === ctxMenu.nodeId)?.type === 'group'
    : false;

  const isGroupExpanded = ctxMenu?.nodeId
    ? !!(cs.nodes.find((n) => n.id === ctxMenu.nodeId)?.data as Record<string, unknown>)?.expanded
    : false;

  return (
    <div className="cl-shell">
      <GlobalToolbar
        title="AI ConceptLab"
        hint="Character & weapon concept generation"
        canUndo={cs.canUndo}
        canRedo={cs.canRedo}
        hasSelection={selectedCount > 0}
        onUndo={cs.undo}
        onRedo={cs.redo}
        onDuplicate={cs.duplicateSelected}
        onFitView={handleFitView}
        onClear={handleClear}
        onExportSelectedNodesOnly={cs.exportSelectedNodesOnly}
        onExportSelectedWithConnections={cs.exportSelectedWithConnections}
        onExportAllNodesOnly={cs.exportAllNodesOnly}
        onExportAllWithConnections={cs.exportAllWithConnections}
        onImportLayout={handleImportLayout}
        onSaveLayoutNamed={(name) => { cs.saveNamedLayout(name); showToast(`Layout "${name}" saved`); }}
        onLoadLayout={(name) => { cs.loadNamedLayout(name); showToast(`Layout "${name}" loaded`); }}
        onSetDefault={() => { cs.setDefaultLayout(); showToast('Current layout set as default'); }}
        onDeleteLayout={(name) => { cs.deleteNamedLayout(name); showToast(`Layout "${name}" deleted`); }}
        savedLayouts={cs.savedLayoutsList}
      />
      <ToastContainer />

      <div className="cl-main">
        <ConceptLabDock
          categories={DOCK_CATEGORIES}
          templates={presetTemplates}
          onLoadTemplate={loadTemplate}
          selectedNodeId={cs.selectedNodeId}
          onCloseInspector={() => cs.setSelectedNodeId(null)}
        />
        <div
          className="cl-canvas-area"
          ref={canvasRef}
          onMouseDown={(e) => cs.handleCutMouseDown(e, canvasRef)}
          onMouseMove={(e) => cs.handleCutMouseMove(e, canvasRef)}
          onMouseUp={() => cs.handleCutMouseUp(canvasRef)}
          onContextMenu={(e) => { if (cs.cutLine) e.preventDefault(); }}
        >
          <ReactFlow
            nodes={cs.nodes}
            edges={cs.edges}
            onNodesChange={cs.onNodesChange}
            onEdgesChange={cs.onEdgesChange}
            onConnect={cs.onConnect}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onNodeClick={(_, node) => cs.setSelectedNodeId(node.id)}
            onPaneClick={() => { cs.setSelectedNodeId(null); setCtxMenu(null); }}
            onPaneContextMenu={(e) => handlePaneContextMenu(e as unknown as React.MouseEvent)}
            onNodeContextMenu={(e, node) => handleNodeContextMenu(e as unknown as React.MouseEvent, node.id)}
            onEdgeContextMenu={(e, edge) => handleEdgeContextMenu(e as unknown as React.MouseEvent, edge)}
            nodeTypes={memoNodeTypes}
            edgeTypes={memoEdgeTypes}
            defaultEdgeOptions={{ type: 'pipeline', data: { isComplete: true } }}
            panOnDrag={[1]}
            selectionOnDrag
            selectionMode={SelectionMode.Partial}
            snapToGrid
            snapGrid={[20, 20]}
            fitView={false}
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
              edgeId={ctxMenu.edgeId}
              selectedNodeCount={selectedCount}
              categories={CTX_CATEGORIES}
              onClose={() => setCtxMenu(null)}
              onAddNode={handleAddNodeFromMenu}
              onDelete={handleDeleteNode}
              onDeleteSelected={cs.deleteSelected}
              onDuplicateSelected={cs.duplicateSelected}
              onFitView={handleFitView}
              onCopy={cs.copySelectedNodes}
              onPaste={() => cs.pasteNodes()}
              onPin={ctxMenu.nodeId ? () => cs.togglePinNode(ctxMenu.nodeId!) : undefined}
              isPinned={isPinned}
              onCreateGroup={() => {
                const sel = cs.nodes.filter((n) => n.selected);
                if (sel.length >= 2) cs.createGroup(sel.map((n) => n.id), 'Group');
              }}
              onUngroupNode={ctxMenu.nodeId ? () => cs.ungroupNodes(ctxMenu.nodeId!) : undefined}
              onExpandGroup={ctxMenu.nodeId ? () => cs.expandGroup(ctxMenu.nodeId!) : undefined}
              onCollapseGroup={ctxMenu.nodeId ? () => cs.collapseGroup(ctxMenu.nodeId!) : undefined}
              isGroupNode={isGroupNode}
              isGroupExpanded={isGroupExpanded}
              onOpenImage={handleOpenImage}
              onPasteImage={handlePasteImage}
              onDeleteEdge={ctxMenu.edgeId ? () => { cs.removeEdge(ctxMenu.edgeId!); setCtxMenu(null); } : undefined}
            />
          )}

          <CutLineOverlay cutLine={cs.cutLine} />
        </div>
      </div>
      <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleFileChange} />
      <CostWidget appKey="concept-lab" />
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
