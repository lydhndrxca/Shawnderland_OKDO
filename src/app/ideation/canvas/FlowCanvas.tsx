"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  SelectionMode,
  useReactFlow,
  ReactFlowProvider,
  type NodeTypes,
  type EdgeTypes,
  type OnConnectEnd,
  type Node,
  type Edge,
  addEdge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import PipelineEdge from './edges/PipelineEdge';
import ToolDock from './ToolDock';
import CanvasContextMenu, { type ContextMenuCategory, type CustomNodeAction } from '@/components/CanvasContextMenu';
import GlobalToolbar from '@/components/GlobalToolbar';
import { ToastContainer, showToast } from '@/components/Toast';
import DemoOverlay from './DemoOverlay';
import GuidedRunOverlay from './GuidedRunOverlay';
import GeminiEditorOverlay from './GeminiEditorOverlay';
import { registerEditorOpener, unregisterEditorOpener } from './geminiEditorBridge';
import { useCanvasSession, type CutLine } from '@/hooks/useCanvasSession';
import { ALL_RAW_NODE_TYPES, ALL_CTX_CATEGORIES, NODE_DEFAULTS, NO_SLEEP } from '@/lib/sharedNodeTypes';
import {
  isValidConnection,
  STAGE_ORDER,
  OUTPUT_NODE_TYPES, type OutputNodeType,
} from './nodes/nodeRegistry';
import { useSession } from '@/lib/ideation/context/SessionContext';
import { getStageOutput } from '@/lib/ideation/state/sessionSelectors';
import type { StageId } from '@/lib/ideation/engine/stages';
import { CompatProvider } from './compat/CompatContext';
import { withCompatCheck } from './compat/withCompatCheck';
import { useNodeCompatibility } from './hooks/useNodeCompatibility';
import { savePreset, loadPresets } from '@/lib/ideation/state/presetStore';
import GlossaryOverlay from './GlossaryOverlay';
import { materializeGraph } from '@/lib/ideation/engine/lineage/materializeGraph';
import { getAncestors, getDescendants } from '@/lib/ideation/engine/lineage/graphSelectors';
import type { LineageNode } from '@/lib/ideation/engine/lineage/graphTypes';
import { applyResizeToAll } from '@/components/nodes/withNodeResize';
import { applyDagreLayout } from './flowLayout';
import type { FlowState } from '@/lib/ideation/state/sessionTypes';
import { loadDefaultOrLatest } from '@/lib/layoutStore';
import { DEFAULT_SHAWNDERMIND_LAYOUT } from './defaultLayout';
import CostWidget from '@/components/CostWidget';
import './FlowCanvas.css';

const rawNodeTypes: NodeTypes = Object.fromEntries(
  Object.entries(ALL_RAW_NODE_TYPES).map(([key, Comp]) =>
    key === 'group' ? [key, Comp] : [key, withCompatCheck(Comp)],
  ),
);

const nodeTypes: NodeTypes = applyResizeToAll(rawNodeTypes);

const edgeTypes: EdgeTypes = {
  pipeline: PipelineEdge,
};

const SNAP_DISTANCE_X = 40;
const SNAP_DISTANCE_Y = 60;

const CTX_CATEGORIES = ALL_CTX_CATEGORIES;

/** Find a pipeline stage node — prefer ID match, fall back to type match. */
function findStageNode(nodes: Node[], stageId: string): Node | undefined {
  return nodes.find((n) => n.id === stageId) ?? nodes.find((n) => n.type === stageId);
}
function hasStageNode(nodes: Node[], stageId: string): boolean {
  return nodes.some((n) => n.id === stageId || n.type === stageId);
}

function buildInitialNodes(_session: { stageState: Record<string, unknown>; seedText: string }): Node[] {
  return [];
}

function buildInitialEdges(nodes: Node[]): Edge[] {
  const edges: Edge[] = [];
  const nodeIds = new Set(nodes.map((n) => n.id));
  if (nodeIds.has('start') && nodeIds.has('seed')) {
    edges.push({ id: 'e-start-seed', source: 'start', target: 'seed', type: 'pipeline', data: { sourceStage: 'start', isRunning: false, isComplete: false } });
  }
  for (let i = 0; i < STAGE_ORDER.length - 1; i++) {
    const src = STAGE_ORDER[i];
    const tgt = STAGE_ORDER[i + 1];
    if (!nodeIds.has(src) || !nodeIds.has(tgt)) continue;
    if (src === 'normalize') {
      for (const handle of ['assumptions', 'questions']) {
        edges.push({ id: `e-${src}-${handle}-${tgt}`, source: src, target: tgt, sourceHandle: handle, type: 'pipeline', data: { sourceStage: src, isRunning: false, isComplete: false } });
      }
    } else if (src === 'diverge') {
      for (const handle of ['practical', 'inversion', 'constraint']) {
        edges.push({ id: `e-${src}-${handle}-${tgt}`, source: src, target: tgt, sourceHandle: handle, type: 'pipeline', data: { sourceStage: src, isRunning: false, isComplete: false } });
      }
    } else if (src === 'critique-salvage') {
      for (const handle of ['generic', 'mutations']) {
        edges.push({ id: `e-${src}-${handle}-${tgt}`, source: src, target: tgt, sourceHandle: handle, type: 'pipeline', data: { sourceStage: src, isRunning: false, isComplete: false } });
      }
    } else {
      edges.push({ id: `e-${src}-${tgt}`, source: src, target: tgt, type: 'pipeline', data: { sourceStage: src, isRunning: false, isComplete: false } });
    }
  }
  return edges;
}

function computeInitialLayout(session: { stageState: Record<string, unknown>; seedText: string }) {
  const initialNodes = buildInitialNodes(session);
  const initialEdges = buildInitialEdges(initialNodes);
  const savedFlowState = (session as unknown as Record<string, unknown>).flowState as FlowState | undefined;
  let saved = savedFlowState;
  if (!saved?.nodes?.length) {
    const storeSnap = loadDefaultOrLatest('shawndermind');
    if (storeSnap?.nodes?.length) saved = storeSnap as unknown as FlowState;
  }
  if (!saved?.nodes?.length) {
    try {
      const raw = localStorage.getItem('shawnderland-layout-shawndermind');
      if (raw) { const parsed = JSON.parse(raw) as FlowState; if (parsed?.nodes?.length) saved = parsed; }
    } catch { /* ignore */ }
  }
  if (!saved?.nodes?.length) {
    saved = DEFAULT_SHAWNDERMIND_LAYOUT;
  }
  if (saved?.nodes?.length) {
    const posMap = new Map(saved.nodes.map((n) => [n.id, n.position]));
    const savedNodeData = saved.nodeData ?? {};
    const extraNodes: Node[] = [];
    for (const sn of saved.nodes) {
      if (!initialNodes.find((n) => n.id === sn.id) && sn.type) {
        extraNodes.push({ id: sn.id, type: sn.type, position: sn.position, data: { stageId: sn.type, ...savedNodeData[sn.id] } });
      }
    }
    const restored = initialNodes.map((n) => ({
      ...n, position: posMap.get(n.id) ?? n.position,
      data: savedNodeData[n.id] ? { ...n.data, ...savedNodeData[n.id] } : n.data,
    }));
    const allNodes = [...restored, ...extraNodes];
    const pipelineEdges = buildInitialEdges(allNodes);
    return { nodes: allNodes, edges: pipelineEdges.length > 0 ? pipelineEdges : initialEdges, viewport: saved.viewport };
  }
  return { ...applyDagreLayout(initialNodes, initialEdges), viewport: undefined };
}

function CutLineOverlay({ cutLine }: { cutLine: CutLine | null }) {
  if (!cutLine) return null;
  return (
    <svg className="cut-line-overlay">
      <line x1={cutLine.x1} y1={cutLine.y1} x2={cutLine.x2} y2={cutLine.y2} className="cut-line" />
    </svg>
  );
}

function FlowCanvasInner() {
  const { session, createBranch, runStage, recordExport, setProjectName, saveFlowState, guidedRunState, awaitingInputNodeId, isRunning, runningStageId } = useSession();
  const reactFlowInstance = useReactFlow();
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialSessionRef = useRef(session);
  const initial = useMemo(() => computeInitialLayout(initialSessionRef.current), []);

  const registeredTypes = useMemo(() => new Set(Object.keys(ALL_RAW_NODE_TYPES)), []);

  const flow = useCanvasSession({
    appKey: 'shawndermind',
    initialNodes: initial.nodes,
    initialEdges: initial.edges,
    idPrefix: 'sm',
    nodeDefaults: NODE_DEFAULTS,
    registeredNodeTypes: registeredTypes,
    onConnect: (params) => {
      const sourceType = flow.nodes.find((n) => n.id === params.source)?.type ?? params.source as string;
      const targetType = flow.nodes.find((n) => n.id === params.target)?.type ?? params.target as string;
      if (!isValidConnection(sourceType, targetType)) return false;
    },
    persistNodeTypes: ['emotion', 'influence', 'group', 'packedPipeline', 'textInfluence', 'documentInfluence', 'imageInfluence', 'linkInfluence', 'videoInfluence', 'preprompt', 'postprompt'],
  });

  const spawnedResultsRef = useRef<Set<string>>(new Set());

  // ── Pipeline state sync: auto-spawn nodes, update edges ─────────
  useEffect(() => {
    const runIdx = runningStageId ? STAGE_ORDER.indexOf(runningStageId) : -1;
    flow.setEdges((prev) =>
      prev.map((e) => {
        const sourceStage = e.data?.sourceStage as StageId | undefined;
        const targetStage = e.target as StageId;
        if (!sourceStage) return e;
        const sourceHasOutput = !!(session.stageState as Record<string, { output: unknown }>)[sourceStage]?.output;
        const targetHasOutput = !!(session.stageState as Record<string, { output: unknown }>)[targetStage]?.output;
        const srcIdx = STAGE_ORDER.indexOf(sourceStage);
        const tgtIdx = STAGE_ORDER.indexOf(targetStage);
        const edgeLeadsToRunning = runIdx >= 0 && tgtIdx <= runIdx && srcIdx < runIdx;
        const edgeIsRunning = runIdx >= 0 && tgtIdx === runIdx;
        return { ...e, data: { ...e.data, isRunning: edgeIsRunning, isComplete: sourceHasOutput && targetHasOutput, pathLit: edgeLeadsToRunning } };
      }),
    );

    const currentNodes = flow.nodes;
    const currentNodeIds = new Set(currentNodes.map((n) => n.id));
    const newNodes: Node[] = [];
    for (const stageId of STAGE_ORDER) {
      if (hasStageNode(currentNodes, stageId)) continue;
      const hasOutput = !!(session.stageState as Record<string, { output: unknown }>)[stageId]?.output;
      if (hasOutput) newNodes.push({ id: stageId, type: stageId, position: { x: 0, y: 0 }, data: { stageId } });
    }
    if (newNodes.length > 0) {
      flow.setNodes((prev) => {
        const rightmostX = prev.reduce((max, n) => Math.max(max, n.position.x), -Infinity);
        const GAP = 380;
        return [...prev, ...newNodes.map((n, i) => ({ ...n, position: { x: rightmostX + GAP * (i + 1), y: 0 } }))];
      });
      flow.setEdges((prev) => {
        const currentIds = new Set(prev.map((e) => e.id));
        const allNodes = [...currentNodes, ...newNodes];
        const allEdges = buildInitialEdges(allNodes);
        return [...prev, ...allEdges.filter((e) => !currentIds.has(e.id))];
      });
    }

    // Auto-spawn Result Nodes below completed pipeline stages (skip seed — it has no meaningful result)
    const resultStageIds: { stageId: StageId; output: unknown; parentId: string }[] = [];
    for (const stageId of STAGE_ORDER) {
      if (stageId === 'seed') continue;
      if (spawnedResultsRef.current.has(stageId)) continue;
      const output = getStageOutput(session, stageId);
      if (!output) continue;
      const allNodes = [...currentNodes, ...newNodes];
      const allNodeIds = new Set(allNodes.map((n) => n.id));
      if (allNodeIds.has(`result-${stageId}`)) { spawnedResultsRef.current.add(stageId); continue; }
      const parent = findStageNode(allNodes, stageId);
      resultStageIds.push({ stageId, output, parentId: parent?.id ?? stageId });
      spawnedResultsRef.current.add(stageId);
    }
    if (resultStageIds.length > 0) {
      flow.setNodes((prev) => {
        const GRID = 20; const EST_H = 320; const GAP = 3 * GRID;
        const toAdd: Node[] = [];
        const occupiedBottom = new Map<number, number>();
        for (const n of prev) { const bx = Math.round(n.position.x / 100) * 100; occupiedBottom.set(bx, Math.max(occupiedBottom.get(bx) ?? -Infinity, n.position.y + EST_H)); }
        for (const { stageId, output, parentId } of resultStageIds) {
          const parent = prev.find((n) => n.id === parentId) ?? findStageNode(prev, stageId);
          const pp = parent?.position ?? { x: 0, y: 0 };
          const bx = Math.round(pp.x / 100) * 100;
          const low = Math.max(occupiedBottom.get(bx) ?? pp.y + EST_H, pp.y + EST_H);
          const ry = Math.ceil((low + GAP) / GRID) * GRID;
          occupiedBottom.set(bx, ry + EST_H);
          toAdd.push({ id: `result-${stageId}`, type: 'resultNode', position: { x: pp.x, y: ry }, data: { sourceStage: stageId, outputData: output } });
        }
        return [...prev, ...toAdd];
      });
      flow.setEdges((prev) => [...prev, ...resultStageIds.map(({ stageId, parentId }) => ({
        id: `e-${stageId}-result`, source: parentId, sourceHandle: 'results', target: `result-${stageId}`,
        type: 'pipeline', data: { sourceStage: stageId, isRunning: false, isComplete: true },
      }))]);
    }

    // Update existing result nodes with latest output data
    flow.setNodes((prev) => prev.map((n) => {
      if (n.type !== 'resultNode') return n;
      const d = n.data as Record<string, unknown>;
      const srcStage = d.sourceStage as StageId | undefined;
      if (!srcStage) return n;
      const latestOutput = getStageOutput(session, srcStage);
      if (!latestOutput || latestOutput === d.outputData) return n;
      return { ...n, data: { ...d, outputData: latestOutput } };
    }));
  }, [session.stageState, isRunning, runningStageId]);

  const [inspectorNodeId, setInspectorNodeId] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(session.projectName || '');
  const [showDemo, setShowDemo] = useState(false);
  const [editorNodeId, setEditorNodeId] = useState<string | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{
    x: number;
    y: number;
    nodeId?: string;
    stageId?: StageId;
    edgeId?: string;
  } | null>(null);
  const pendingConnectionRef = useRef<{ source: string; sourceHandle: string | null } | null>(null);
  const [snapPreviewIds, setSnapPreviewIds] = useState<Set<string>>(new Set());
  const snapCandidateRef = useRef<{ draggedId: string; targetId: string } | null>(null);
  const prevAwaitingRef = useRef<string | null>(null);
  const [presetDialog, setPresetDialog] = useState<{ mode: 'save' | 'load'; nodeId: string; nodeType: string } | null>(null);
  const [presetName, setPresetName] = useState('');
  const [showGlossary, setShowGlossary] = useState(false);
  const [lineageHighlightStages, setLineageHighlightStages] = useState<Set<string>>(new Set());

  // Window globals for node components
  useEffect(() => {
    const w = window as unknown as Record<string, unknown>;
    w.__updateNodeData = flow.updateNodeData;
    w.__getNodeData = flow.getNodeData;
    w.__getNodeType = (id: string) => flow.nodes.find((n) => n.id === id)?.type;
    w.__getEdges = () => flow.edges;
    w.__getFlowSnapshot = flow.getFlowSnapshot;
  }, [flow.updateNodeData, flow.getNodeData, flow.nodes, flow.edges, flow.getFlowSnapshot]);

  // Register opener for GeminiEditor button clicks
  useEffect(() => {
    registerEditorOpener((nodeId: string) => setEditorNodeId(nodeId));
    return () => unregisterEditorOpener();
  }, []);

  // Pipeline-specific window globals
  const spawnFullChain = useCallback(() => {
    flow.setNodes((prev) => {
      const toAdd: Node[] = [];
      for (const stageId of STAGE_ORDER.slice(1)) {
        if (!hasStageNode(prev, stageId)) toAdd.push({ id: stageId, type: stageId, position: { x: 0, y: 0 }, data: { stageId } });
      }
      if (toAdd.length === 0) return prev;
      const seedNode = findStageNode(prev, 'seed');
      const seedY = seedNode?.position.y ?? 0;
      const rightmostX = prev.length > 0 ? prev.reduce((max, n) => Math.max(max, n.position.x), -Infinity) : 0;
      return [...prev, ...toAdd.map((n, i) => ({ ...n, position: { x: rightmostX + 380 * (i + 1), y: seedY } }))];
    });
    setTimeout(() => {
      flow.setEdges((prev) => {
        const currentIds = new Set(prev.map((e) => e.id));
        flow.setNodes((curNodes) => {
          const allEdges = buildInitialEdges(curNodes);
          const toAdd = allEdges.filter((e) => !currentIds.has(e.id));
          if (toAdd.length > 0) flow.setEdges((curEdges) => [...curEdges, ...toAdd]);
          return curNodes;
        });
        return prev;
      });
    }, 50);
  }, [flow.setNodes, flow.setEdges]);

  const spawnPackedPipeline = useCallback(() => {
    flow.setNodes((prev) => {
      if (prev.find((n) => n.type === 'packedPipeline')) return prev;
      const startNode = prev.find((n) => n.id === 'start');
      const startPos = startNode?.position ?? { x: -250, y: 0 };
      return [...prev, { id: `packedPipeline-${Date.now()}`, type: 'packedPipeline', position: { x: startPos.x + 280, y: startPos.y }, data: { stageId: 'packedPipeline' } }];
    });
    setTimeout(() => {
      flow.setEdges((prev) => {
        flow.setNodes((curNodes) => {
          const packed = curNodes.find((n) => n.type === 'packedPipeline');
          if (!packed) return curNodes;
          if (prev.some((e) => e.target === packed.id)) return curNodes;
          const sourceId = curNodes.find((n) => n.id === 'seed')?.id ?? 'start';
          flow.setEdges((curEdges) => [...curEdges, { id: `e-${sourceId}-packed`, source: sourceId, target: packed.id, type: 'pipeline', data: { sourceStage: sourceId, isRunning: false, isComplete: false } }]);
          return curNodes;
        });
        return prev;
      });
    }, 50);
  }, [flow.setNodes, flow.setEdges]);

  const autoLayout = useCallback(() => {
    flow.setNodes((prev) => {
      flow.setEdges((prevEdges) => {
        const { nodes: laidNodes, edges: laidEdges } = applyDagreLayout(prev, prevEdges);
        flow.setNodes(laidNodes);
        return laidEdges;
      });
      return prev;
    });
  }, [flow.setNodes, flow.setEdges]);

  useEffect(() => {
    const w = window as unknown as Record<string, unknown>;
    w.__spawnFullChain = spawnFullChain;
    w.__spawnPackedPipeline = spawnPackedPipeline;
    w.__triggerGroupExpand = flow.expandGroup;
    return () => { delete w.__spawnFullChain; delete w.__spawnPackedPipeline; delete w.__triggerGroupExpand; };
  }, [spawnFullChain, spawnPackedPipeline, flow.expandGroup]);

  useEffect(() => {
    if (awaitingInputNodeId && awaitingInputNodeId !== prevAwaitingRef.current) {
      const node = flow.nodes.find((n) => n.id === awaitingInputNodeId) ?? flow.nodes.find((n) => n.id === `result-${awaitingInputNodeId}`);
      if (node) reactFlowInstance.setCenter(node.position.x + 120, node.position.y + 100, { zoom: 1, duration: 400 });
    }
    prevAwaitingRef.current = awaitingInputNodeId;
  }, [awaitingInputNodeId, flow.nodes, reactFlowInstance]);

  const handleFitView = useCallback(() => {
    reactFlowInstance.fitView({ padding: 0.4 });
  }, [reactFlowInstance]);

  const restoredViewportRef = useRef(false);
  useEffect(() => {
    if (restoredViewportRef.current) return;
    if (initial.viewport) {
      restoredViewportRef.current = true;
      setTimeout(() => reactFlowInstance.setViewport(initial.viewport!), 100);
    } else if (flow.nodes.length > 0) {
      restoredViewportRef.current = true;
      setTimeout(() => handleFitView(), 200);
    }
  }, [initial.viewport, flow.nodes.length, handleFitView, reactFlowInstance]);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const w = window as unknown as Record<string, unknown>;
    w.__saveFlowState = (fs: unknown) => saveFlowState(fs as Parameters<typeof saveFlowState>[0]);
    w.__saveCanvasSessionNamed = flow.saveSessionNamed;
    w.__loadCanvasSessionNamed = flow.loadSessionNamed;
    w.__deleteCanvasSessionNamed = flow.deleteSessionNamed;
    w.__listCanvasSessions = flow.savedSessionsList;
    return () => {
      delete w.__saveFlowState;
      delete w.__saveCanvasSessionNamed;
      delete w.__loadCanvasSessionNamed;
      delete w.__deleteCanvasSessionNamed;
      delete w.__listCanvasSessions;
    };
  }, [saveFlowState, flow.saveSessionNamed, flow.loadSessionNamed, flow.deleteSessionNamed, flow.savedSessionsList]);

  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const snapshot = flow.getFlowSnapshot();
      const vp = reactFlowInstance.getViewport();
      saveFlowState({ nodes: snapshot.nodes, edges: snapshot.edges, viewport: vp, nodeData: snapshot.nodeData });
    }, 1000);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [flow.nodes, flow.edges, saveFlowState, reactFlowInstance]);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const bounds = canvasRef.current?.getBoundingClientRect();
      if (!bounds) return;
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });

      // File group drop from Files tab
      const fileGroupId = event.dataTransfer.getData('application/shawnderland-file-group');
      if (fileGroupId) {
        import('@/lib/filesStore').then(({ getGroup }) =>
          getGroup(fileGroupId).then((group) => {
            if (!group) return;
            group.images.forEach((img, i) => {
              const offset = { x: position.x + i * 420, y: position.y };
              flow.addNodeToCanvas('charMainViewer', offset, {
                generatedImage: { base64: img.base64, mimeType: img.mimeType },
                viewKey: 'main',
                customLabel: `${group.name} — ${img.viewName}`,
              });
            });
          }),
        );
        return;
      }

      const resultText = event.dataTransfer.getData('application/reactflow-result');
      if (resultText) {
        flow.addNodeToCanvas('seed', position, { prefillSeed: resultText });
        return;
      }
      const nodeType = event.dataTransfer.getData('application/reactflow-stage') ||
        event.dataTransfer.getData('application/reactflow-nodetype');
      if (!nodeType) return;
      flow.addNodeToCanvas(nodeType as StageId, position);
    },
    [reactFlowInstance, flow],
  );

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const handleNodeDrag = useCallback(
    (_event: React.MouseEvent, draggedNode: Node) => {
      const others = flow.nodes.filter((n) => n.id !== draggedNode.id && n.type !== 'resultNode');
      let foundSnap = false;
      const snapIds = new Set<string>();
      for (const other of others) {
        const dragRight = draggedNode.position.x + (draggedNode.measured?.width ?? 200);
        const otherLeft = other.position.x;
        const dragLeft = draggedNode.position.x;
        const otherRight = other.position.x + (other.measured?.width ?? 200);
        const dragCenterY = draggedNode.position.y + (draggedNode.measured?.height ?? 100) / 2;
        const otherCenterY = other.position.y + (other.measured?.height ?? 100) / 2;
        const verticallyAligned = Math.abs(dragCenterY - otherCenterY) < SNAP_DISTANCE_Y;
        if (verticallyAligned) {
          if (Math.abs(dragRight - otherLeft) < SNAP_DISTANCE_X) {
            snapIds.add(draggedNode.id); snapIds.add(other.id);
            snapCandidateRef.current = { draggedId: draggedNode.id, targetId: other.id };
            foundSnap = true; break;
          }
          if (Math.abs(dragLeft - otherRight) < SNAP_DISTANCE_X) {
            snapIds.add(draggedNode.id); snapIds.add(other.id);
            snapCandidateRef.current = { draggedId: draggedNode.id, targetId: other.id };
            foundSnap = true; break;
          }
        }
      }
      if (!foundSnap) snapCandidateRef.current = null;
      setSnapPreviewIds(snapIds);
    },
    [flow.nodes],
  );

  const handleNodeDragStop = useCallback(
    (_event: React.MouseEvent, _draggedNode: Node) => {
      if (snapCandidateRef.current) {
        const { draggedId, targetId } = snapCandidateRef.current;
        const draggedNode = flow.nodes.find((n) => n.id === draggedId);
        const targetNode = flow.nodes.find((n) => n.id === targetId);
        if (draggedNode && targetNode) {
          const draggedType = draggedNode.type ?? draggedId;
          const targetType = targetNode.type ?? targetId;
          const hasExistingEdge = flow.edges.some(
            (e) => (e.source === draggedId && e.target === targetId) || (e.source === targetId && e.target === draggedId)
          );
          if (!hasExistingEdge) {
            if (isValidConnection(draggedType, targetType)) {
              flow.onConnect({ source: draggedId, target: targetId, sourceHandle: null, targetHandle: null } as Parameters<typeof flow.onConnect>[0]);
            } else if (isValidConnection(targetType, draggedType)) {
              flow.onConnect({ source: targetId, target: draggedId, sourceHandle: null, targetHandle: null } as Parameters<typeof flow.onConnect>[0]);
            }
          }
        }
        snapCandidateRef.current = null;
      }
      setSnapPreviewIds(new Set());
    },
    [flow],
  );

  const handleNodeContextMenu = useCallback(
    (event: React.MouseEvent, nodeId: string) => {
      event.preventDefault();
      const node = flow.nodes.find((n) => n.id === nodeId);
      const stageId = (node?.type ?? nodeId.split('-')[0]) as StageId;
      setCtxMenu({ x: event.clientX, y: event.clientY, nodeId, stageId });
    },
    [flow.nodes],
  );

  const handlePaneContextMenu = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      setCtxMenu({ x: event.clientX, y: event.clientY });
    },
    [],
  );

  const handleEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: { id: string }) => {
      event.preventDefault();
      setCtxMenu({ x: event.clientX, y: event.clientY, edgeId: edge.id });
    },
    [],
  );

  const handleCopy = useCallback(() => {
    if (!ctxMenu?.stageId) return;
    const output = getStageOutput(session, ctxMenu.stageId);
    if (output) {
      navigator.clipboard.writeText(JSON.stringify(output, null, 2));
      recordExport('clipboard');
    }
  }, [ctxMenu, session, recordExport]);

  const handleSaveJson = useCallback(async () => {
    if (!ctxMenu?.stageId) return;
    const output = getStageOutput(session, ctxMenu.stageId);
    if (output) {
      const content = JSON.stringify(output, null, 2);
      const blob = new Blob([content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${ctxMenu.stageId}_output.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [ctxMenu, session]);

  const handleBranch = useCallback(() => {
    if (!ctxMenu?.nodeId) return;
    createBranch(ctxMenu.nodeId, `Branch from ${ctxMenu.stageId ?? 'node'}`);
  }, [ctxMenu, createBranch]);

  const handleRunFromHere = useCallback(async () => {
    if (!ctxMenu?.stageId) return;
    try { await runStage(ctxMenu.stageId); } catch (e) { console.error('[FlowCanvas] runStage error:', e); }
  }, [ctxMenu, runStage]);

  const handleDelete = useCallback(() => {
    if (ctxMenu?.nodeId) flow.removeNode(ctxMenu.nodeId);
  }, [ctxMenu, flow]);

  const handleResetNodeData = useCallback(() => {
    if (!ctxMenu?.nodeId) return;
    const node = flow.nodes.find((n) => n.id === ctxMenu.nodeId);
    if (!node) return;
    const preserveKeys = new Set(['stageId', 'viewKey']);
    const newData: Record<string, unknown> = {};
    for (const key of preserveKeys) {
      const val = (node.data as Record<string, unknown>)[key];
      if (val !== undefined) newData[key] = val;
    }
    reactFlowInstance.setNodes((nds) =>
      nds.map((n) => n.id === ctxMenu.nodeId ? { ...n, data: newData } : n),
    );
  }, [ctxMenu, flow.nodes, reactFlowInstance]);

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
        flow.addNodeToCanvas('imageReference', pos, {
          imageBase64: parts[1],
          mimeType: mime,
          fileName: file.name,
        });
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }, [ctxMenu, flow, reactFlowInstance]);

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
            flow.addNodeToCanvas('imageReference', pos, {
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
  }, [ctxMenu, flow, reactFlowInstance]);

  const handleConnectStart = useCallback((_: unknown, params: { nodeId: string | null; handleId: string | null }) => {
    if (params.nodeId) {
      pendingConnectionRef.current = { source: params.nodeId, sourceHandle: params.handleId };
    }
  }, []);

  const handleConnectEnd: OnConnectEnd = useCallback(
    (event) => {
      const target = (event as MouseEvent).target as HTMLElement;
      const isOnNode = target?.closest('.react-flow__node');
      if (!isOnNode && pendingConnectionRef.current) {
        const me = event as MouseEvent;
        setCtxMenu({ x: me.clientX, y: me.clientY });
      } else {
        pendingConnectionRef.current = null;
      }
    },
    [],
  );

  const handleAddNodeMaybeConnect = useCallback(
    (nodeType: string) => {
      const hasPendingDrag = !!pendingConnectionRef.current;
      const pos = ctxMenu
        ? reactFlowInstance.screenToFlowPosition({ x: ctxMenu.x, y: ctxMenu.y })
        : undefined;
      const newId = flow.addNodeToCanvas(nodeType, pos);
      if (hasPendingDrag && newId) {
        const { source, sourceHandle } = pendingConnectionRef.current!;
        setTimeout(() => {
          flow.onConnect({
            source,
            target: newId,
            sourceHandle: sourceHandle ?? undefined,
            targetHandle: null,
          } as Parameters<typeof flow.onConnect>[0]);
        }, 100);
        pendingConnectionRef.current = null;
      }
    },
    [ctxMenu, flow, reactFlowInstance],
  );

  // Cut-line handling is now provided by useCanvasSession

  const lineageTypeToStage: Record<string, string> = {
    Seed: 'seed',
    NormalizedSeed: 'normalize',
    IdeaCandidate: 'diverge',
    Critique: 'critique-salvage',
    Mutation: 'critique-salvage',
    Expansion: 'expand',
    Scorecard: 'converge',
    CommitArtifact: 'commit',
  };

  const handleLineageTrace = useCallback((candidateId: string | null) => {
    if (!candidateId) {
      setLineageHighlightStages(new Set());
      return;
    }
    try {
      const graph = materializeGraph(session);
      const lineageNodeId = `cand-${candidateId}`;
      const lineageNode = graph.nodes.find((n) => n.id === lineageNodeId);
      if (!lineageNode) {
        setLineageHighlightStages(new Set());
        return;
      }
      const ancestors = getAncestors(graph, lineageNodeId);
      const descendants = getDescendants(graph, lineageNodeId);
      const chain: LineageNode[] = [lineageNode, ...ancestors, ...descendants];
      const stageIds = new Set<string>();
      for (const ln of chain) {
        const stageId = lineageTypeToStage[ln.type];
        if (stageId) stageIds.add(stageId);
      }
      stageIds.add('result-diverge');
      stageIds.add('result-critique-salvage');
      stageIds.add('result-expand');
      stageIds.add('result-converge');
      setLineageHighlightStages(stageIds);
    } catch {
      setLineageHighlightStages(new Set());
    }
  }, [session]);

  useEffect(() => {
    const w = window as unknown as Record<string, unknown>;
    w.__lineageTrace = handleLineageTrace;
    return () => { delete w.__lineageTrace; };
  }, [handleLineageTrace]);

  const handleImportLayout = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) flow.importLayout(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [flow]);

  // Gate dimming: collect node IDs downstream of OFF gates
  const gateDisabledIds = useMemo(() => {
    const disabled = new Set<string>();
    const offGates = flow.nodes.filter(
      (n) => n.type === 'charGate' && !(n.data as Record<string, unknown>).enabled,
    );
    const visit = (nodeId: string) => {
      if (disabled.has(nodeId)) return;
      disabled.add(nodeId);
      for (const e of flow.edges) {
        if (e.source === nodeId) visit(e.target);
      }
    };
    for (const gate of offGates) {
      for (const e of flow.edges) {
        if (e.source === gate.id) visit(e.target);
      }
    }
    return disabled;
  }, [flow.nodes, flow.edges]);

  // Character node processing animation: sync generating state to edges
  useEffect(() => {
    const generatingNodeIds = new Set(
      flow.nodes
        .filter((n) => (n.data as Record<string, unknown>)?.generating === true)
        .map((n) => n.id),
    );

    if (generatingNodeIds.size === 0) {
      flow.setEdges((prev) =>
        prev.map((e) => {
          if (e.data?.charRunning) return { ...e, data: { ...e.data, isRunning: false, charRunning: false } };
          return e;
        }),
      );
      return;
    }

    flow.setEdges((prev) =>
      prev.map((e) => {
        const sourceGenerating = generatingNodeIds.has(e.source);
        const shouldRun = sourceGenerating;
        if (shouldRun !== (e.data?.charRunning as boolean ?? false)) {
          return { ...e, data: { ...e.data, isRunning: shouldRun, charRunning: shouldRun, pathLit: shouldRun } };
        }
        return e;
      }),
    );
  }, [flow.nodes]);

  const nodesWithSnapClass = useMemo(() => flow.nodes.map((n) => {
    let cls = n.className ?? '';
    if (snapPreviewIds.has(n.id)) {
      cls = `${cls} snap-preview`.trim();
    } else {
      cls = cls.replace(/\bsnap-preview\b/g, '').trim();
    }
    const nodeStageId = n.type === 'resultNode' ? (n.data as Record<string, unknown>).sourceStage as string : n.id;
    const resultNodeId = n.type === 'resultNode' ? `result-${(n.data as Record<string, unknown>).sourceStage}` : '';
    if (lineageHighlightStages.size > 0 && (lineageHighlightStages.has(nodeStageId) || lineageHighlightStages.has(resultNodeId))) {
      cls = `${cls} lineage-highlight`.trim();
    } else {
      cls = cls.replace(/\blineage-highlight\b/g, '').trim();
    }

    // Gate dimming
    if (gateDisabledIds.has(n.id)) {
      if (!cls.includes('gate-disabled')) cls = `${cls} gate-disabled`.trim();
    } else {
      cls = cls.replace(/\bgate-disabled\b/g, '').trim();
    }

    // Processing highlight
    const isProcessing = (n.data as Record<string, unknown>)?.generating === true;
    if (isProcessing) {
      if (!cls.includes('char-node-processing')) cls = `${cls} char-node-processing`.trim();
    } else {
      cls = cls.replace(/\bchar-node-processing\b/g, '').trim();
    }

    return cls !== (n.className ?? '') ? { ...n, className: cls || undefined } : n;
  }), [flow.nodes, snapPreviewIds, lineageHighlightStages, gateDisabledIds]);

  const dedupedEdges = useMemo(() => {
    const seen = new Set<string>();
    return flow.edges.filter((e) => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    });
  }, [flow.edges]);

  const compatErrors = useNodeCompatibility(flow.nodes, dedupedEdges);
  const selectedCount = useMemo(() => flow.nodes.filter((n) => n.selected).length, [flow.nodes]);

  const isPinned = ctxMenu?.nodeId
    ? !!(flow.nodes.find((n) => n.id === ctxMenu.nodeId)?.data as Record<string, unknown>)?.__pinned
    : false;

  const isGroupNode = ctxMenu?.nodeId
    ? flow.nodes.find((n) => n.id === ctxMenu.nodeId)?.type === 'group'
    : false;

  const isGroupExpanded = ctxMenu?.nodeId
    ? !!(flow.nodes.find((n) => n.id === ctxMenu.nodeId)?.data as Record<string, unknown>)?.expanded
    : false;

  const isSleeping = ctxMenu?.nodeId
    ? !!(flow.nodes.find((n) => n.id === ctxMenu.nodeId)?.data as Record<string, unknown>)?._sleeping
    : false;

  const handleToggleSleep = useCallback(() => {
    if (!ctxMenu?.nodeId) return;
    reactFlowInstance.setNodes((nds) =>
      nds.map((n) =>
        n.id === ctxMenu.nodeId
          ? { ...n, data: { ...n.data, _sleeping: !(n.data as Record<string, unknown>)._sleeping } }
          : n,
      ),
    );
  }, [ctxMenu, reactFlowInstance]);

  const handleSavePreset = useCallback(() => {
    if (!ctxMenu?.nodeId) return;
    const node = flow.nodes.find((n) => n.id === ctxMenu.nodeId);
    if (!node) return;
    setPresetDialog({ mode: 'save', nodeId: node.id, nodeType: node.type ?? 'unknown' });
    setPresetName('');
  }, [ctxMenu, flow.nodes]);

  const handleLoadPreset = useCallback(() => {
    if (!ctxMenu?.nodeId) return;
    const node = flow.nodes.find((n) => n.id === ctxMenu.nodeId);
    if (!node) return;
    setPresetDialog({ mode: 'load', nodeId: node.id, nodeType: node.type ?? 'unknown' });
  }, [ctxMenu, flow.nodes]);

  const confirmSavePreset = useCallback(() => {
    if (!presetDialog || !presetName.trim()) return;
    const node = flow.nodes.find((n) => n.id === presetDialog.nodeId);
    if (!node) return;
    savePreset(presetDialog.nodeType, presetName.trim(), node.data as Record<string, unknown>);
    setPresetDialog(null);
  }, [presetDialog, presetName, flow.nodes]);

  const applyPreset = useCallback((presetData: Record<string, unknown>) => {
    if (!presetDialog) return;
    const { setNodes } = reactFlowInstance;
    setNodes((nds) => nds.map((n) =>
      n.id === presetDialog.nodeId
        ? { ...n, data: { ...n.data, ...presetData } }
        : n,
    ));
    setPresetDialog(null);
  }, [presetDialog, reactFlowInstance]);

  const customNodeActions: CustomNodeAction[] = useMemo(() => {
    if (!ctxMenu?.nodeId) return [];
    const actions: CustomNodeAction[] = [];
    if (ctxMenu.stageId) {
      actions.push(
        { label: 'Copy idea state', icon: '\uD83D\uDCCB', onClick: handleCopy },
        { label: 'Save as JSON', icon: '\uD83D\uDCBE', onClick: handleSaveJson },
      );
    }
    actions.push(
      { label: 'Branch from here', icon: '\uD83C\uDF3F', onClick: handleBranch },
      { label: 'Run from here', icon: '\u25B6', onClick: handleRunFromHere },
      { label: 'Save Node Preset', icon: '\uD83D\uDCE5', onClick: handleSavePreset },
      { label: 'Load Preset', icon: '\uD83D\uDCE4', onClick: handleLoadPreset },
    );
    actions.push({ label: 'Reset Node Data', icon: '\uD83D\uDD04', onClick: handleResetNodeData, danger: true });
    return actions;
  }, [ctxMenu, handleCopy, handleSaveJson, handleBranch, handleRunFromHere, handleSavePreset, handleLoadPreset, handleResetNodeData]);

  return (
    <CompatProvider errors={compatErrors}>
    <div className="flow-canvas-shell">
      <GlobalToolbar
        title="ShawnderMind"
        hint="Ideation pipeline"
        canUndo={flow.canUndo}
        canRedo={flow.canRedo}
        hasSelection={selectedCount > 0}
        onUndo={flow.undo}
        onRedo={flow.redo}
        onDuplicate={flow.duplicateSelected}
        onFitView={handleFitView}
        onAutoLayout={autoLayout}
        onResetNodes={() => {
          const PRESERVE_KEYS: Record<string, string[]> = {
            uiFrame: ['label', 'color'],
            charFrontViewer: ['viewKey'],
            charBackViewer: ['viewKey'],
            charSideViewer: ['viewKey'],
            charMainViewer: ['viewKey'],
            charViewer: ['viewKey'],
          };
          const snapshot = flow.nodes.map((n) => {
            const keep = PRESERVE_KEYS[n.type ?? ''];
            const preserved: Record<string, unknown> = {};
            const d = n.data as Record<string, unknown>;
            if (keep) {
              for (const k of keep) { if (d[k] !== undefined) preserved[k] = d[k]; }
            }
            if (d._sleeping) preserved._sleeping = true;
            return { id: n.id, position: n.position, type: n.type, style: n.style, data: preserved };
          });
          const edgeSnapshot = [...flow.edges];
          flow.setNodes([]);
          flow.setEdges([]);
          requestAnimationFrame(() => {
            flow.setNodes(snapshot as typeof flow.nodes);
            flow.setEdges(edgeSnapshot);
          });
        }}
        onClear={() => { flow.setNodes([]); flow.setEdges([]); }}
        onExportSelectedNodesOnly={flow.exportSelectedNodesOnly}
        onExportSelectedWithConnections={flow.exportSelectedWithConnections}
        onExportAllNodesOnly={flow.exportAllNodesOnly}
        onExportAllWithConnections={flow.exportAllWithConnections}
        onImportLayout={handleImportLayout}
        onSaveLayoutNamed={(name) => { flow.saveNamedLayout(name); showToast(`Layout "${name}" saved`); }}
        onLoadLayout={(name) => { flow.loadNamedLayout(name); showToast(`Layout "${name}" loaded`); }}
        onSetDefault={() => { flow.setDefaultLayout(); showToast('Current layout set as default'); }}
        onDeleteLayout={(name) => { flow.deleteNamedLayout(name); showToast(`Layout "${name}" deleted`); }}
        onUpdateLayout={() => { flow.updateActiveLayout(); showToast(`Layout "${flow.activeLayoutName}" updated`); }}
        activeLayoutName={flow.activeLayoutName}
        savedLayouts={flow.savedLayoutsList}
        onSaveSessionNamed={async (name) => { const r = await flow.saveSessionNamed(name); showToast(r.ok ? `Session "${name}" saved` : `Save failed: ${r.error}`, r.ok ? 'info' : 'error'); }}
        onSaveCurrentSession={async () => { const r = await flow.saveCurrentSession(); showToast(r.ok ? 'Session saved' : `Save failed: ${r.error}`, r.ok ? 'info' : 'error'); }}
        onLoadSession={async (name) => { await flow.loadSessionNamed(name); showToast(`Session "${name}" loaded`); }}
        onDeleteSession={async (name) => { await flow.deleteSessionNamed(name); showToast(`Session "${name}" deleted`); }}
        onResetSession={() => { flow.resetToDefault(DEFAULT_SHAWNDERMIND_LAYOUT); showToast('Session reset to defaults'); }}
        activeSessionName={flow.activeSessionName}
        savedSessions={flow.savedSessionsList}
      />
      <ToastContainer />

      <div
        className="flow-canvas"
        ref={canvasRef}
        onMouseDown={(e) => flow.handleCutMouseDown(e, canvasRef)}
        onMouseMove={(e) => flow.handleCutMouseMove(e, canvasRef)}
        onMouseUp={() => flow.handleCutMouseUp(canvasRef)}
        onContextMenu={(e) => { if (flow.cutLine) e.preventDefault(); }}
      >
        <ToolDock
          inspectorNodeId={inspectorNodeId}
          onCloseInspector={() => setInspectorNodeId(null)}
        />

        <button className="demo-trigger-btn" onClick={() => setShowDemo(true)} title="Learn how ShawnderMind works">
          ?
        </button>

        <ReactFlow
          nodes={nodesWithSnapClass}
          edges={dedupedEdges}
          onNodesChange={flow.onNodesChange}
          onEdgesChange={flow.onEdgesChange}
          onConnect={flow.onConnect}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodeClick={(_, node) => {
            flow.setSelectedNodeId(node.id);
            setInspectorNodeId(node.id);
          }}
          onNodeDoubleClick={(_, node) => {
            if (node.type === 'imageStudio') setEditorNodeId(node.id);
          }}
          onPaneClick={() => {
            flow.setSelectedNodeId(null);
            setCtxMenu(null);
            pendingConnectionRef.current = null;
            setLineageHighlightStages(new Set());
          }}
          onConnectStart={handleConnectStart as never}
          onConnectEnd={handleConnectEnd}
          onPaneContextMenu={(e) => handlePaneContextMenu(e as unknown as React.MouseEvent)}
          onNodeContextMenu={(e, node) => handleNodeContextMenu(e as unknown as React.MouseEvent, node.id)}
          onEdgeContextMenu={(e, edge) => handleEdgeContextMenu(e as unknown as React.MouseEvent, edge)}
          onNodeDrag={(e, node) => handleNodeDrag(e as unknown as React.MouseEvent, node)}
          onNodeDragStop={(e, node) => handleNodeDragStop(e as unknown as React.MouseEvent, node)}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          panOnDrag={[1]}
          selectionOnDrag
          selectionMode={SelectionMode.Partial}
          snapToGrid
          snapGrid={[20, 20]}
          fitView={false}
          minZoom={0.2}
          maxZoom={2}
          elevateNodesOnSelect
          defaultEdgeOptions={{ type: 'pipeline' }}
          proOptions={{ hideAttribution: true }}
          colorMode="dark"
        >
          <Background variant={BackgroundVariant.Lines} gap={40} size={1} color="rgba(255,255,255,0.06)" />
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
            onAddNode={handleAddNodeMaybeConnect}
            onDelete={handleDelete}
            onDeleteSelected={flow.deleteSelected}
            onDuplicateSelected={flow.duplicateSelected}
            onAutoLayout={autoLayout}
            onFitView={handleFitView}
            onCopy={flow.copySelectedNodes}
            onPaste={() => flow.pasteNodes()}
            onPin={ctxMenu.nodeId ? () => flow.togglePinNode(ctxMenu.nodeId!) : undefined}
            isPinned={isPinned}
            onCreateGroup={() => {
              const sel = flow.nodes.filter((n) => n.selected);
              if (sel.length >= 2) flow.createGroup(sel.map((n) => n.id), 'Group');
            }}
            onUngroupNode={ctxMenu.nodeId ? () => flow.ungroupNodes(ctxMenu.nodeId!) : undefined}
            onExpandGroup={ctxMenu.nodeId ? () => flow.expandGroup(ctxMenu.nodeId!) : undefined}
            onCollapseGroup={ctxMenu.nodeId ? () => flow.collapseGroup(ctxMenu.nodeId!) : undefined}
            isGroupNode={isGroupNode}
            isGroupExpanded={isGroupExpanded}
            onOpenImage={handleOpenImage}
            onPasteImage={handlePasteImage}
            onToggleSleep={ctxMenu.nodeId && !NO_SLEEP.has(flow.nodes.find((n) => n.id === ctxMenu.nodeId)?.type ?? '') ? handleToggleSleep : undefined}
            isSleeping={isSleeping}
            customNodeActions={customNodeActions}
            onDeleteEdge={ctxMenu.edgeId ? () => { flow.removeEdge(ctxMenu.edgeId!); setCtxMenu(null); } : undefined}
          />
        )}

        <CutLineOverlay cutLine={flow.cutLine} />

        {showDemo && <DemoOverlay onDismiss={() => setShowDemo(false)} />}
        <GuidedRunOverlay guidedState={guidedRunState} />
        {editorNodeId && (
          <GeminiEditorOverlay
            editorNodeId={editorNodeId}
            onClose={() => setEditorNodeId(null)}
          />
        )}

        {isEditingName && (
          <div className="rename-overlay" onClick={() => setIsEditingName(false)}>
            <div className="rename-dialog" onClick={(e) => e.stopPropagation()}>
              <label className="rename-label">Project Name</label>
              <input
                className="rename-input"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { setProjectName(nameInput); setIsEditingName(false); }
                  if (e.key === 'Escape') setIsEditingName(false);
                }}
                autoFocus
                placeholder="My Brilliant Idea"
              />
              <div className="rename-actions">
                <button className="rename-cancel" onClick={() => setIsEditingName(false)}>Cancel</button>
                <button className="rename-save" onClick={() => { setProjectName(nameInput); setIsEditingName(false); }}>Save</button>
              </div>
            </div>
          </div>
        )}
        {showGlossary && <GlossaryOverlay onClose={() => setShowGlossary(false)} />}

        <button
          className="glossary-toggle-btn"
          onClick={() => setShowGlossary(!showGlossary)}
          title="Toggle terminology guide"
        >
          ?
        </button>

        {presetDialog && (
          <div className="preset-dialog-overlay" onClick={() => setPresetDialog(null)}>
            <div className="preset-dialog" onClick={(e) => e.stopPropagation()}>
              {presetDialog.mode === 'save' ? (
                <>
                  <div className="preset-dialog-title">Save Node Preset</div>
                  <input
                    className="preset-dialog-input"
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                    placeholder="Preset name..."
                    autoFocus
                    onKeyDown={(e) => { if (e.key === 'Enter') confirmSavePreset(); }}
                  />
                  <div className="preset-dialog-actions">
                    <button className="preset-dialog-btn primary" onClick={confirmSavePreset} disabled={!presetName.trim()}>Save</button>
                    <button className="preset-dialog-btn" onClick={() => setPresetDialog(null)}>Cancel</button>
                  </div>
                </>
              ) : (
                <>
                  <div className="preset-dialog-title">Load Preset</div>
                  <div className="preset-dialog-list">
                    {loadPresets(presetDialog.nodeType).length === 0 ? (
                      <div className="preset-dialog-empty">No presets saved for this node type.</div>
                    ) : (
                      loadPresets(presetDialog.nodeType).map((p) => (
                        <button
                          key={p.name}
                          className="preset-dialog-item"
                          onClick={() => applyPreset(p.data)}
                          title={`Saved ${new Date(p.savedAt).toLocaleString()}`}
                        >
                          <span className="preset-item-name">{p.name}</span>
                          <span className="preset-item-desc">{p.description}</span>
                        </button>
                      ))
                    )}
                  </div>
                  <div className="preset-dialog-actions">
                    <button className="preset-dialog-btn" onClick={() => setPresetDialog(null)}>Close</button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
    <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleFileChange} />
    </CompatProvider>
  );
}

export default function FlowCanvas() {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner />
    </ReactFlowProvider>
  );
}
