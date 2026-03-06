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
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import SeedNode from './nodes/SeedNode';
import NormalizeNode from './nodes/NormalizeNode';
import DivergeNode from './nodes/DivergeNode';
import CritiqueNode from './nodes/CritiqueNode';
import ExpandNode from './nodes/ExpandNode';
import ConvergeNode from './nodes/ConvergeNode';
import CommitNode from './nodes/CommitNode';
import IterateNode from './nodes/IterateNode';
import TextOutputNode from './nodes/TextOutputNode';
import ImageOutputNode from './nodes/ImageOutputNode';
import VideoOutputNode from './nodes/VideoOutputNode';
import CountNode from './nodes/CountNode';
import ImageReferenceNode from './nodes/ImageReferenceNode';
import ExtractDataNode from './nodes/ExtractDataNode';
import EmotionNode from './nodes/EmotionNode';
import InfluenceNode from './nodes/InfluenceNode';
import TextInfluenceNode from './nodes/TextInfluenceNode';
import DocumentInfluenceNode from './nodes/DocumentInfluenceNode';
import ImageInfluenceNode from './nodes/ImageInfluenceNode';
import LinkInfluenceNode from './nodes/LinkInfluenceNode';
import VideoInfluenceNode from './nodes/VideoInfluenceNode';
import PrepromptNode from './nodes/PrepromptNode';
import PostPromptNode from './nodes/PostPromptNode';
import StartNode from './nodes/StartNode';
import GroupNode from './nodes/GroupNode';
import PackedPipelineNode from './nodes/PackedPipelineNode';
import ResultNode from './nodes/ResultNode';
import CharacterNode from './nodes/CharacterNode';
import WeaponNode from './nodes/WeaponNode';
import TurnaroundNode from './nodes/TurnaroundNode';
import PipelineEdge from './edges/PipelineEdge';
import ToolDock from './ToolDock';
import CanvasContextMenu, { type ContextMenuCategory, type CustomNodeAction } from '@/components/CanvasContextMenu';
import GlobalToolbar from '@/components/GlobalToolbar';
import DemoOverlay from './DemoOverlay';
import GuidedRunOverlay from './GuidedRunOverlay';
import { useFlowSession } from './useFlowSession';
import {
  isValidConnection,
  STAGE_ORDER, NODE_META,
  OUTPUT_NODE_TYPES, INPUT_NODE_TYPES, INFLUENCE_NODE_TYPES, UTILITY_NODE_TYPES, CONTROL_NODE_TYPES,
  OUTPUT_NODE_META, INPUT_NODE_META, INFLUENCE_NODE_META, UTILITY_NODE_META, CONTROL_NODE_META,
  CONCEPTLAB_NODE_TYPES, CONCEPTLAB_NODE_META,
} from './nodes/nodeRegistry';
import { useSession } from '@/lib/ideation/context/SessionContext';
import { getStageOutput } from '@/lib/ideation/state/sessionSelectors';
import type { StageId } from '@/lib/ideation/engine/stages';
import { CompatProvider } from './compat/CompatContext';
import { withCompatCheck } from './compat/withCompatCheck';
import { useNodeCompatibility } from './hooks/useNodeCompatibility';
import { UIButtonNode, UITextBoxNode, UIDropdownNode, UIImageNode, UIWindowNode, UIFrameNode, UIGenericNode } from '@/components/nodes/ui';
import { applyResizeToAll } from '@/components/nodes/withNodeResize';

import './FlowCanvas.css';

const rawNodeTypes: NodeTypes = {
  seed: withCompatCheck(SeedNode),
  normalize: withCompatCheck(NormalizeNode),
  diverge: withCompatCheck(DivergeNode),
  'critique-salvage': withCompatCheck(CritiqueNode),
  expand: withCompatCheck(ExpandNode),
  converge: withCompatCheck(ConvergeNode),
  commit: withCompatCheck(CommitNode),
  iterate: withCompatCheck(IterateNode),
  textOutput: withCompatCheck(TextOutputNode),
  imageOutput: withCompatCheck(ImageOutputNode),
  videoOutput: withCompatCheck(VideoOutputNode),
  count: withCompatCheck(CountNode),
  imageReference: withCompatCheck(ImageReferenceNode),
  extractData: withCompatCheck(ExtractDataNode),
  emotion: withCompatCheck(EmotionNode),
  influence: withCompatCheck(InfluenceNode),
  textInfluence: withCompatCheck(TextInfluenceNode),
  documentInfluence: withCompatCheck(DocumentInfluenceNode),
  imageInfluence: withCompatCheck(ImageInfluenceNode),
  linkInfluence: withCompatCheck(LinkInfluenceNode),
  videoInfluence: withCompatCheck(VideoInfluenceNode),
  preprompt: withCompatCheck(PrepromptNode),
  postprompt: withCompatCheck(PostPromptNode),
  start: withCompatCheck(StartNode),
  group: GroupNode,
  packedPipeline: withCompatCheck(PackedPipelineNode),
  resultNode: withCompatCheck(ResultNode),
  character: withCompatCheck(CharacterNode),
  weapon: withCompatCheck(WeaponNode),
  turnaround: withCompatCheck(TurnaroundNode),
  uiButton: UIButtonNode,
  uiTextBox: UITextBoxNode,
  uiDropdown: UIDropdownNode,
  uiImage: UIImageNode,
  uiWindow: UIWindowNode,
  uiFrame: UIFrameNode,
  uiGeneric: UIGenericNode,
};

const nodeTypes: NodeTypes = applyResizeToAll(rawNodeTypes);

const edgeTypes: EdgeTypes = {
  pipeline: PipelineEdge,
};

const SNAP_DISTANCE_X = 40;
const SNAP_DISTANCE_Y = 60;

const REFERENCE_INFLUENCES = ['textInfluence', 'documentInfluence', 'imageInfluence', 'linkInfluence', 'videoInfluence', 'imageReference'] as const;
const MODIFIER_INFLUENCES = ['emotion', 'influence'] as const;

function buildCtxCategories(): ContextMenuCategory[] {
  return [
    {
      label: 'Pipeline',
      items: STAGE_ORDER.map((s) => ({ id: s, label: NODE_META[s].label, color: NODE_META[s].color })),
    },
    {
      label: 'Inputs & References',
      items: REFERENCE_INFLUENCES.map((t) => {
        const infMeta = (INFLUENCE_NODE_META as Record<string, { label: string; color: string }>)[t];
        const utMeta = (UTILITY_NODE_META as Record<string, { label: string; color: string }>)[t];
        const meta = infMeta ?? utMeta;
        return { id: t, label: meta.label, color: meta.color };
      }),
    },
    {
      label: 'Modifiers',
      items: [
        ...INPUT_NODE_TYPES.map((t) => ({ id: t, label: INPUT_NODE_META[t].label, color: INPUT_NODE_META[t].color })),
        ...MODIFIER_INFLUENCES.map((t) => ({ id: t, label: INFLUENCE_NODE_META[t].label, color: INFLUENCE_NODE_META[t].color })),
      ],
    },
    {
      label: 'Outputs',
      items: [
        ...OUTPUT_NODE_TYPES.map((t) => ({ id: t, label: OUTPUT_NODE_META[t].label, color: OUTPUT_NODE_META[t].color })),
        ...UTILITY_NODE_TYPES.filter((t) => t === 'extractData').map((t) => ({ id: t, label: UTILITY_NODE_META[t].label, color: UTILITY_NODE_META[t].color })),
      ],
    },
    {
      label: 'Control',
      items: CONTROL_NODE_TYPES.map((t) => ({ id: t, label: CONTROL_NODE_META[t].label, color: CONTROL_NODE_META[t].color })),
    },
    {
      label: 'Concept Lab',
      items: CONCEPTLAB_NODE_TYPES.map((t) => ({ id: t, label: CONCEPTLAB_NODE_META[t].label, color: CONCEPTLAB_NODE_META[t].color })),
    },
    {
      label: 'UI Elements',
      items: [
        { id: 'uiButton', label: 'Button', color: '#5c6bc0' },
        { id: 'uiTextBox', label: 'Text Box', color: '#66bb6a' },
        { id: 'uiDropdown', label: 'Dropdown', color: '#ffa726' },
        { id: 'uiImage', label: 'Image', color: '#ab47bc' },
        { id: 'uiGeneric', label: 'Node', color: '#607d8b' },
      ],
    },
    {
      label: 'Containers',
      items: [
        { id: 'uiWindow', label: 'Window', color: '#26a69a' },
        { id: 'uiFrame', label: 'Frame', color: '#78909c' },
      ],
    },
  ];
}

const CTX_CATEGORIES = buildCtxCategories();

function FlowCanvasInner() {
  const { session, createBranch, runStage, recordExport, setProjectName, saveFlowState, guidedRunState, awaitingInputNodeId } = useSession();
  const flow = useFlowSession();
  const reactFlowInstance = useReactFlow();
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [inspectorNodeId, setInspectorNodeId] = useState<string | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(session.projectName || '');
  const [showDemo, setShowDemo] = useState(false);
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

  const [cutLine, setCutLine] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const cutStartRef = useRef<{ x: number; y: number } | null>(null);
  const prevAwaitingRef = useRef<string | null>(null);

  useEffect(() => {
    if (awaitingInputNodeId && awaitingInputNodeId !== prevAwaitingRef.current) {
      const targetId = awaitingInputNodeId.startsWith('result-') ? awaitingInputNodeId : awaitingInputNodeId;
      const node = flow.nodes.find((n) => n.id === targetId);
      if (node) {
        reactFlowInstance.setCenter(node.position.x + 120, node.position.y + 100, { zoom: 1, duration: 400 });
      } else {
        const resultNode = flow.nodes.find((n) => n.id === `result-${awaitingInputNodeId}`);
        if (resultNode) {
          reactFlowInstance.setCenter(resultNode.position.x + 120, resultNode.position.y + 100, { zoom: 1, duration: 400 });
        }
      }
    }
    prevAwaitingRef.current = awaitingInputNodeId;
  }, [awaitingInputNodeId, flow.nodes, reactFlowInstance]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el) {
        const tag = el.tagName.toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
        if (el.getAttribute('contenteditable') === 'true') return;
      }
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key === 'z' && !e.shiftKey) { e.preventDefault(); flow.undo(); }
      if (mod && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); flow.redo(); }
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); flow.deleteSelected(); }
      if (mod && e.key === 'd') { e.preventDefault(); flow.duplicateSelected(); }
      if (mod && e.key === 'c') { flow.copySelectedNodes(); }
      if (mod && e.key === 'v') { flow.pasteNodes(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [flow]);

  const restoredViewportRef = useRef(false);
  useEffect(() => {
    if (!restoredViewportRef.current && flow.savedViewport) {
      restoredViewportRef.current = true;
      setTimeout(() => {
        reactFlowInstance.setViewport(flow.savedViewport!);
      }, 100);
    }
  }, [flow.savedViewport]);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const snapshot = flow.getFlowSnapshot();
      const vp = reactFlowInstance.getViewport();
      saveFlowState({
        nodes: snapshot.nodes,
        edges: snapshot.edges,
        viewport: vp,
        nodeData: snapshot.nodeData,
      });
    }, 1000);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [flow.nodes, flow.edges]);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const bounds = canvasRef.current?.getBoundingClientRect();
      if (!bounds) return;
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });
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
      const stageId = nodeId.split('-')[0] as StageId;
      setCtxMenu({ x: event.clientX, y: event.clientY, nodeId, stageId });
    },
    [],
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
    try { await runStage(ctxMenu.stageId); } catch { /* shown elsewhere */ }
  }, [ctxMenu, runStage]);

  const handleDelete = useCallback(() => {
    if (ctxMenu?.nodeId) flow.removeNode(ctxMenu.nodeId);
  }, [ctxMenu, flow]);

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
      const pos = ctxMenu
        ? reactFlowInstance.screenToFlowPosition({ x: ctxMenu.x, y: ctxMenu.y })
        : { x: 200, y: 200 };
      const newId = flow.addNodeToCanvas(nodeType, pos);
      if (pendingConnectionRef.current && newId) {
        const { source, sourceHandle } = pendingConnectionRef.current;
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

  const segIntersect = useCallback((ax: number, ay: number, bx: number, by: number, cx: number, cy: number, dx: number, dy: number) => {
    const denom = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx);
    if (Math.abs(denom) < 1e-10) return false;
    const t = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / denom;
    const u = ((cx - ax) * (by - ay) - (cy - ay) * (bx - ax)) / denom;
    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
  }, []);

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
    const fp1 = reactFlowInstance.screenToFlowPosition({
      x: cutLine.x1 + (canvasRef.current?.getBoundingClientRect().left ?? 0),
      y: cutLine.y1 + (canvasRef.current?.getBoundingClientRect().top ?? 0),
    });
    const fp2 = reactFlowInstance.screenToFlowPosition({
      x: cutLine.x2 + (canvasRef.current?.getBoundingClientRect().left ?? 0),
      y: cutLine.y2 + (canvasRef.current?.getBoundingClientRect().top ?? 0),
    });
    const edgesToRemove: string[] = [];
    for (const edge of flow.edges) {
      const sourceNode = flow.nodes.find((n) => n.id === edge.source);
      const targetNode = flow.nodes.find((n) => n.id === edge.target);
      if (!sourceNode || !targetNode) continue;
      const sx = sourceNode.position.x + (sourceNode.measured?.width ?? 200);
      const sy = sourceNode.position.y + (sourceNode.measured?.height ?? 60) / 2;
      const tx = targetNode.position.x;
      const ty = targetNode.position.y + (targetNode.measured?.height ?? 60) / 2;
      if (segIntersect(fp1.x, fp1.y, fp2.x, fp2.y, sx, sy, tx, ty)) edgesToRemove.push(edge.id);
    }
    for (const id of edgesToRemove) flow.removeEdge(id);
    cutStartRef.current = null;
    setCutLine(null);
  }, [cutLine, flow, reactFlowInstance, segIntersect]);

  const handleFitView = useCallback(() => {
    reactFlowInstance.fitView({ padding: 0.4 });
  }, [reactFlowInstance]);

  const handleImportLayout = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) flow.importLayout(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [flow]);

  const nodesWithSnapClass = flow.nodes.map((n) =>
    snapPreviewIds.has(n.id)
      ? { ...n, className: `${n.className ?? ''} snap-preview`.trim() }
      : n.className ? { ...n, className: n.className.replace(/\bsnap-preview\b/g, '').trim() } : n,
  );

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
    );
    return actions;
  }, [ctxMenu, handleCopy, handleSaveJson, handleBranch, handleRunFromHere]);

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
        onAutoLayout={flow.autoLayout}
        onClear={() => { flow.setNodes([]); flow.setEdges([]); }}
        onExportSelected={flow.exportLayoutJSON}
        onSaveLayout={flow.saveLayout}
        onImportLayout={handleImportLayout}
      />

      <div
        className="flow-canvas"
        ref={canvasRef}
        onMouseDown={handleCutMouseDown}
        onMouseMove={handleCutMouseMove}
        onMouseUp={handleCutMouseUp}
        onContextMenu={(e) => { if (cutStartRef.current) e.preventDefault(); }}
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
          onPaneClick={() => {
            flow.setSelectedNodeId(null);
            setCtxMenu(null);
            pendingConnectionRef.current = null;
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
          fitView
          fitViewOptions={{ padding: 0.4 }}
          minZoom={0.2}
          maxZoom={2}
          elevateNodesOnSelect
          defaultEdgeOptions={{ type: 'pipeline' }}
          proOptions={{ hideAttribution: true }}
          colorMode="dark"
        >
          <Background variant={BackgroundVariant.Lines} gap={20} size={1} color="rgba(255,255,255,0.06)" />
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
            onAutoLayout={flow.autoLayout}
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
            customNodeActions={customNodeActions}
            onDeleteEdge={ctxMenu.edgeId ? () => { flow.removeEdge(ctxMenu.edgeId!); setCtxMenu(null); } : undefined}
          />
        )}

        {cutLine && (
          <svg className="cut-line-overlay">
            <line
              x1={cutLine.x1} y1={cutLine.y1}
              x2={cutLine.x2} y2={cutLine.y2}
              className="cut-line"
            />
          </svg>
        )}

        {showDemo && <DemoOverlay onDismiss={() => setShowDemo(false)} />}
        <GuidedRunOverlay guidedState={guidedRunState} />

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
