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
  type EdgeTypes,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import PipelineEdge from '@/app/ideation/canvas/edges/PipelineEdge';
import ConceptLabDock from './ConceptLabDock';
import CanvasContextMenu from '@/components/CanvasContextMenu';
import GlobalToolbar from '@/components/GlobalToolbar';
import { ToastContainer, showToast } from '@/components/Toast';
import CostWidget from '@/components/CostWidget';
import GeminiEditorOverlay from '@/app/ideation/canvas/GeminiEditorOverlay';
import { registerEditorOpener, unregisterEditorOpener } from '@/app/ideation/canvas/geminiEditorBridge';
import { useCanvasSession, type CutLine } from '@/hooks/useCanvasSession';
import { ALL_RAW_NODE_TYPES, ALL_DOCK_CATEGORIES, ALL_CTX_CATEGORIES, NODE_DEFAULTS } from '@/lib/sharedNodeTypes';
import { applyResizeToAll } from '@/components/nodes/withNodeResize';
import './ConceptLab.css';

const NODE_TYPES = applyResizeToAll(ALL_RAW_NODE_TYPES);

const EDGE_TYPES: EdgeTypes = {
  pipeline: PipelineEdge,
};

const DOCK_CATEGORIES = ALL_DOCK_CATEGORIES;
const CTX_CATEGORIES = ALL_CTX_CATEGORIES;

const DEFAULT_NODES: Node[] = [];
const DEFAULT_EDGES: Edge[] = [];

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

  const registeredTypes = useMemo(() => new Set(Object.keys(ALL_RAW_NODE_TYPES)), []);

  const cs = useCanvasSession({
    appKey: 'concept-lab',
    initialNodes: DEFAULT_NODES,
    initialEdges: DEFAULT_EDGES,
    idPrefix: 'cl',
    nodeDefaults: NODE_DEFAULTS,
    registeredNodeTypes: registeredTypes,
  });

  const [ctxMenu, setCtxMenu] = useState<CtxMenuState | null>(null);
  const [editorNodeId, setEditorNodeId] = useState<string | null>(null);

  // Register opener for GeminiEditor button clicks
  useEffect(() => {
    registerEditorOpener((nodeId: string) => setEditorNodeId(nodeId));
    return () => unregisterEditorOpener();
  }, []);

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

      // File group drop from Files tab
      const fileGroupId = e.dataTransfer.getData('application/shawnderland-file-group');
      if (fileGroupId) {
        const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
        import('@/lib/filesStore').then(({ getGroup }) =>
          getGroup(fileGroupId).then((group) => {
            if (!group) return;
            group.images.forEach((img, i) => {
              const offset = { x: pos.x + i * 420, y: pos.y };
              cs.addNodeToCanvas('charMainViewer', offset, {
                generatedImage: { base64: img.base64, mimeType: img.mimeType },
                viewKey: 'main',
                customLabel: `${group.name} — ${img.viewName}`,
              });
            });
          }),
        );
        return;
      }

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

  const presetTemplates = useMemo(() => [] as { label: string; icon: string; nodes: Node[]; edges: Edge[] }[], []);

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
        onResetNodes={() => {
          const PRESERVE_KEYS: Record<string, string[]> = {
            uiFrame: ['label', 'color'],
            charFrontViewer: ['viewKey'],
            charBackViewer: ['viewKey'],
            charSideViewer: ['viewKey'],
            charMainViewer: ['viewKey'],
            charViewer: ['viewKey'],
          };
          const snapshot = cs.nodes.map((n: any) => {
            const keep = PRESERVE_KEYS[n.type ?? ''];
            const preserved: Record<string, unknown> = {};
            if (keep) {
              for (const k of keep) { if (n.data?.[k] !== undefined) preserved[k] = n.data[k]; }
            }
            if (n.data?._sleeping) preserved._sleeping = true;
            return { id: n.id, position: n.position, type: n.type, style: n.style, data: preserved };
          });
          const edgeSnapshot = [...cs.edges];
          cs.setNodes([]);
          cs.setEdges([]);
          requestAnimationFrame(() => {
            cs.setNodes(snapshot);
            cs.setEdges(edgeSnapshot);
          });
        }}
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
        onUpdateLayout={() => { cs.updateActiveLayout(); showToast(`Layout "${cs.activeLayoutName}" updated`); }}
        activeLayoutName={cs.activeLayoutName}
        savedLayouts={cs.savedLayoutsList}
        onSaveSessionNamed={async (name) => { const r = await cs.saveSessionNamed(name); showToast(r.ok ? `Session "${name}" saved` : `Save failed: ${r.error}`, r.ok ? 'info' : 'error'); }}
        onSaveCurrentSession={async () => { const r = await cs.saveCurrentSession(); showToast(r.ok ? 'Session saved' : `Save failed: ${r.error}`, r.ok ? 'info' : 'error'); }}
        onLoadSession={async (name) => { await cs.loadSessionNamed(name); showToast(`Session "${name}" loaded`); }}
        onDeleteSession={async (name) => { await cs.deleteSessionNamed(name); showToast(`Session "${name}" deleted`); }}
        onResetSession={() => { cs.resetToDefault({ nodes: [], edges: [] }); showToast('Session reset to defaults'); }}
        activeSessionName={cs.activeSessionName}
        savedSessions={cs.savedSessionsList}
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
            onNodeDoubleClick={(_, node) => {
              if (node.type === 'imageStudio') setEditorNodeId(node.id);
            }}
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
            <Background variant={BackgroundVariant.Lines} gap={40} size={1} color="rgba(255,255,255,0.06)" />
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

          {editorNodeId && (
            <GeminiEditorOverlay
              editorNodeId={editorNodeId}
              onClose={() => setEditorNodeId(null)}
            />
          )}
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
