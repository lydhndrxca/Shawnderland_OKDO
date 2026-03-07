"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FlowState } from '@/lib/ideation/state/sessionTypes';
import {
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type OnConnect,
  type OnNodesChange,
  type OnEdgesChange,
  addEdge,
} from '@xyflow/react';
import { useSession } from '@/lib/ideation/context/SessionContext';
import { STAGE_ORDER, isValidConnection, OUTPUT_NODE_TYPES, NODE_DEFAULT_STYLE, type OutputNodeType } from './nodes/nodeRegistry';
import { getStageOutput } from '@/lib/ideation/state/sessionSelectors';
import { applyDagreLayout } from './flowLayout';
import type { StageId } from '@/lib/ideation/engine/stages';
import {
  saveNamedLayout as storeNamedLayout,
  listLayouts as storeListLayouts,
  loadNamedLayout as storeLoadNamedLayout,
  deleteNamedLayout as storeDeleteNamedLayout,
  setDefaultFromSnapshot,
  loadDefaultOrLatest,
  type LayoutSnapshot,
} from '@/lib/layoutStore';

export interface FlowSessionState {
  nodes: Node[];
  edges: Edge[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  addNodeToCanvas: (nodeType: string, position?: { x: number; y: number }, extraData?: Record<string, unknown>, opts?: { skipAutoConnect?: boolean }) => string;
  removeNode: (nodeId: string) => void;
  removeEdge: (edgeId: string) => void;
  autoLayout: () => void;
  getFlowSnapshot: () => { nodes: Array<{ id: string; position: { x: number; y: number }; type?: string }>; edges: Array<{ id: string; source: string; target: string }>; nodeData: Record<string, Record<string, unknown>> };
  savedViewport: { x: number; y: number; zoom: number } | undefined;
  runError: string | null;
  clearRunError: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  createGroup: (nodeIds: string[], name: string) => void;
  ungroupNodes: (groupId: string) => void;
  expandGroup: (groupId: string) => void;
  collapseGroup: (groupId: string) => void;
  updateNodeData: (nodeId: string, data: Record<string, unknown>) => void;
  spawnFullChain: () => void;
  spawnPackedPipeline: () => void;
  copySelectedNodes: () => void;
  pasteNodes: (position?: { x: number; y: number }) => void;
  togglePinNode: (nodeId: string) => void;
  deleteSelected: () => void;
  duplicateSelected: () => void;
  exportLayoutJSON: () => void;
  exportSelectedJSON: () => void;
  exportSelectedNodesOnly: () => void;
  exportSelectedWithConnections: () => void;
  exportAllNodesOnly: () => void;
  exportAllWithConnections: () => void;
  saveLayout: () => void;
  importLayout: (file: File) => void;
  saveNamedLayout: (name: string) => void;
  loadNamedLayout: (name: string) => boolean;
  updateActiveLayout: () => void;
  activeLayoutName: string | null;
  setDefaultLayout: () => void;
  deleteNamedLayout: (name: string) => void;
  savedLayoutsList: Array<{ name: string; savedAt: string }>;
  refreshLayoutsList: () => void;
}

interface HistorySnapshot {
  nodes: Node[];
  edges: Edge[];
}

const MAX_HISTORY = 50;

function buildInitialNodes(session: { stageState: Record<string, unknown>; seedText: string }): Node[] {
  const nodes: Node[] = [];

  nodes.push({
    id: 'start',
    type: 'start',
    position: { x: -250, y: 0 },
    data: { stageId: 'start' },
  });

  nodes.push({
    id: 'seed',
    type: 'seed',
    position: { x: 0, y: 0 },
    data: { stageId: 'seed' },
  });

  for (const stageId of STAGE_ORDER.slice(1)) {
    const hasOutput = !!(session.stageState as Record<string, { output: unknown }>)[stageId]?.output;
    if (hasOutput) {
      nodes.push({
        id: stageId,
        type: stageId,
        position: { x: 0, y: 0 },
        data: { stageId },
      });
    }
  }

  return nodes;
}

function buildInitialEdges(nodes: Node[]): Edge[] {
  const edges: Edge[] = [];
  const nodeIds = new Set(nodes.map((n) => n.id));

  if (nodeIds.has('start') && nodeIds.has('seed')) {
    edges.push({
      id: 'e-start-seed',
      source: 'start',
      target: 'seed',
      type: 'pipeline',
      data: { sourceStage: 'start', isRunning: false, isComplete: false },
    });
  }

  for (let i = 0; i < STAGE_ORDER.length - 1; i++) {
    const src = STAGE_ORDER[i];
    const tgt = STAGE_ORDER[i + 1];
    if (!nodeIds.has(src) || !nodeIds.has(tgt)) continue;

    if (src === 'normalize') {
      for (const handle of ['assumptions', 'questions']) {
        edges.push({
          id: `e-${src}-${handle}-${tgt}`,
          source: src,
          target: tgt,
          sourceHandle: handle,
          type: 'pipeline',
          data: { sourceStage: src, isRunning: false, isComplete: false },
        });
      }
    } else if (src === 'diverge') {
      for (const handle of ['practical', 'inversion', 'constraint']) {
        edges.push({
          id: `e-${src}-${handle}-${tgt}`,
          source: src,
          target: tgt,
          sourceHandle: handle,
          type: 'pipeline',
          data: { sourceStage: src, isRunning: false, isComplete: false },
        });
      }
    } else if (src === 'critique-salvage') {
      for (const handle of ['generic', 'mutations']) {
        edges.push({
          id: `e-${src}-${handle}-${tgt}`,
          source: src,
          target: tgt,
          sourceHandle: handle,
          type: 'pipeline',
          data: { sourceStage: src, isRunning: false, isComplete: false },
        });
      }
    } else {
      edges.push({
        id: `e-${src}-${tgt}`,
        source: src,
        target: tgt,
        type: 'pipeline',
        data: { sourceStage: src, isRunning: false, isComplete: false },
      });
    }
  }

  return edges;
}

export function useFlowSession(): FlowSessionState {
  const { session, isRunning, runningStageId } = useSession();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const initializedRef = useRef(false);
  const historyRef = useRef<HistorySnapshot[]>([]);
  const historyIndexRef = useRef(-1);
  const isUndoRedoRef = useRef(false);
  const historyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const initialNodes = useMemo(() => buildInitialNodes(session), []);
  const initialEdges = useMemo(() => buildInitialEdges(initialNodes), []);

  const savedFlowState = (session as unknown as Record<string, unknown>).flowState as FlowState | undefined;

  const laid = useMemo(() => {
    let saved = savedFlowState;

    if (!saved?.nodes?.length) {
      const storeSnap = loadDefaultOrLatest('shawndermind');
      if (storeSnap?.nodes?.length) {
        saved = storeSnap as unknown as FlowState;
      }
    }

    if (!saved?.nodes?.length) {
      try {
        const raw = localStorage.getItem('shawnderland-layout-shawndermind');
        if (raw) {
          const parsed = JSON.parse(raw) as FlowState;
          if (parsed?.nodes?.length) saved = parsed;
        }
      } catch { /* ignore */ }
    }

    if (saved?.nodes?.length) {
      const posMap = new Map(saved.nodes.map((n) => [n.id, n.position]));
      const savedNodeData = saved.nodeData ?? {};

      const extraNodes: Node[] = [];
      for (const sn of saved.nodes) {
        if (!initialNodes.find((n) => n.id === sn.id) && sn.type) {
          extraNodes.push({
            id: sn.id,
            type: sn.type,
            position: sn.position,
            data: { stageId: sn.type, ...savedNodeData[sn.id] },
          });
        }
      }

      const restored = initialNodes.map((n) => ({
        ...n,
        position: posMap.get(n.id) ?? n.position,
        data: savedNodeData[n.id] ? { ...n.data, ...savedNodeData[n.id] } : n.data,
      }));
      return { nodes: [...restored, ...extraNodes], edges: initialEdges };
    }

    return applyDagreLayout(initialNodes, initialEdges);
  }, []);

  const [nodes, setNodes, onNodesChange] = useNodesState(laid.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(laid.edges);

  const spawnedResultsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      return;
    }

    const runIdx = runningStageId ? STAGE_ORDER.indexOf(runningStageId) : -1;

    setEdges((prev) =>
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

        return {
          ...e,
          data: {
            ...e.data,
            isRunning: edgeIsRunning,
            isComplete: sourceHasOutput && targetHasOutput,
            pathLit: edgeLeadsToRunning,
          },
        };
      }),
    );

    const currentNodeIds = new Set(nodes.map((n) => n.id));
    const newNodes: Node[] = [];

    for (const stageId of STAGE_ORDER) {
      if (currentNodeIds.has(stageId)) continue;
      const hasOutput = !!(session.stageState as Record<string, { output: unknown }>)[stageId]?.output;
      if (hasOutput) {
        newNodes.push({
          id: stageId,
          type: stageId,
          position: { x: 0, y: 0 },
          data: { stageId },
        });
      }
    }

    if (newNodes.length > 0) {
      setNodes((prev) => {
        const rightmostX = prev.reduce((max, n) => Math.max(max, n.position.x), -Infinity);
        const GAP = 380;
        const positioned = newNodes.map((n, i) => ({
          ...n,
          position: { x: rightmostX + GAP * (i + 1), y: 0 },
        }));
        return [...prev, ...positioned];
      });

      setEdges((prev) => {
        const currentIds = new Set(prev.map((e) => e.id));
        const currentPairs = new Set(prev.map((e) => `${e.source}::${e.sourceHandle ?? ''}::${e.target}`));
        const allNodes = [...nodes, ...newNodes];
        const allEdges = buildInitialEdges(allNodes);
        const toAdd = allEdges.filter((e) =>
          !currentIds.has(e.id) &&
          !currentPairs.has(`${e.source}::${e.sourceHandle ?? ''}::${e.target}`)
        );
        return [...prev, ...toAdd];
      });
    }

    // Auto-spawn Result Nodes below completed pipeline stages
    const resultStageIds: { stageId: StageId; output: unknown }[] = [];
    for (const stageId of STAGE_ORDER) {
      if (spawnedResultsRef.current.has(stageId)) continue;
      const output = getStageOutput(session, stageId);
      if (!output) continue;
      const allNodeIds = new Set([...currentNodeIds, ...newNodes.map((n) => n.id)]);
      const resultNodeId = `result-${stageId}`;
      if (allNodeIds.has(resultNodeId)) {
        spawnedResultsRef.current.add(stageId);
        continue;
      }
      resultStageIds.push({ stageId, output });
      spawnedResultsRef.current.add(stageId);
    }

    if (resultStageIds.length > 0) {
      setNodes((prev) => {
        const GRID = 20;
        const ESTIMATED_NODE_HEIGHT = 320;
        const GAP_GRID_NOTCHES = 3;
        const GAP = GAP_GRID_NOTCHES * GRID;

        const toAdd: Node[] = [];
        const occupiedBottomByX = new Map<number, number>();
        for (const n of prev) {
          const bucketX = Math.round(n.position.x / 100) * 100;
          const estimatedBottom = n.position.y + ESTIMATED_NODE_HEIGHT;
          occupiedBottomByX.set(bucketX, Math.max(occupiedBottomByX.get(bucketX) ?? -Infinity, estimatedBottom));
        }
        for (const { stageId, output } of resultStageIds) {
          const parentNode = prev.find((n) => n.id === stageId);
          const parentPos = parentNode?.position ?? { x: 0, y: 0 };
          const bucketX = Math.round(parentPos.x / 100) * 100;
          const parentBottom = parentPos.y + ESTIMATED_NODE_HEIGHT;
          const lowestBottom = Math.max(occupiedBottomByX.get(bucketX) ?? parentBottom, parentBottom);
          const rawY = lowestBottom + GAP;
          const resultY = Math.ceil(rawY / GRID) * GRID;
          occupiedBottomByX.set(bucketX, resultY + ESTIMATED_NODE_HEIGHT);
          toAdd.push({
            id: `result-${stageId}`,
            type: 'resultNode',
            position: { x: parentPos.x, y: resultY },
            data: { sourceStage: stageId, outputData: output },
          });
        }
        return [...prev, ...toAdd];
      });

      setEdges((prev) => {
        const toAdd: Edge[] = resultStageIds.map(({ stageId }) => ({
          id: `e-${stageId}-result`,
          source: stageId,
          sourceHandle: 'results',
          target: `result-${stageId}`,
          type: 'pipeline',
          data: { sourceStage: stageId, isRunning: false, isComplete: true },
        }));
        return [...prev, ...toAdd];
      });
    }

    // Update existing result nodes with latest output data
    setNodes((prev) => prev.map((n) => {
      if (n.type !== 'resultNode') return n;
      const d = n.data as Record<string, unknown>;
      const srcStage = d.sourceStage as StageId | undefined;
      if (!srcStage) return n;
      const latestOutput = getStageOutput(session, srcStage);
      if (!latestOutput || latestOutput === d.outputData) return n;
      return { ...n, data: { ...d, outputData: latestOutput } };
    }));

  }, [session.stageState, isRunning, runningStageId]);

  const onConnect: OnConnect = useCallback(
    (params) => {
      const sourceNode = nodes.find((n) => n.id === params.source);
      const targetNode = nodes.find((n) => n.id === params.target);
      const sourceType = sourceNode?.type ?? params.source as string;
      const targetType = targetNode?.type ?? params.target as string;

      if (!isValidConnection(sourceType, targetType)) {
        setRunError(`Invalid connection.`);
        return;
      }

      setEdges((prev) =>
        addEdge(
          {
            ...params,
            type: 'pipeline',
            data: { sourceStage: sourceType, isRunning: false, isComplete: false },
          },
          prev,
        ),
      );
    },
    [setEdges, nodes],
  );

  const lastAddedNodeIdRef = useRef<string | null>(null);

  const addNodeToCanvas = useCallback(
    (nodeType: string, position?: { x: number; y: number }, extraData?: Record<string, unknown>, opts?: { skipAutoConnect?: boolean }) => {
      const id = `${nodeType}-${Date.now()}`;
      lastAddedNodeIdRef.current = id;

      const isOutputNode = OUTPUT_NODE_TYPES.includes(nodeType as OutputNodeType);
      const shouldAutoConnect = isOutputNode && !opts?.skipAutoConnect;
      const anchorNodeId = shouldAutoConnect ? selectedNodeId : null;
      const anchorNode = anchorNodeId ? nodes.find((n) => n.id === anchorNodeId) : undefined;

      let finalPosition = position ?? { x: 200, y: 200 };
      if (shouldAutoConnect && anchorNode && !position) {
        finalPosition = {
          x: anchorNode.position.x + 340,
          y: anchorNode.position.y,
        };
      }

      const defaultStyle = NODE_DEFAULT_STYLE[nodeType];
      const viewKeyDefaults: Record<string, Record<string, unknown>> = {
        charMainViewer: { viewKey: 'main' },
        charFrontViewer: { viewKey: 'front' },
        charBackViewer: { viewKey: 'back' },
        charSideViewer: { viewKey: 'side' },
        charGate: { enabled: true },
      };
      const typeDefaults = viewKeyDefaults[nodeType] ?? {};
      const newNode: Node = {
        id,
        type: nodeType,
        position: finalPosition,
        data: { stageId: nodeType, ...typeDefaults, ...extraData },
        ...(defaultStyle ? { style: { width: defaultStyle.width, height: defaultStyle.height } } : {}),
      };
      setNodes((prev) => [...prev, newNode]);

      if (shouldAutoConnect && anchorNode && anchorNodeId) {
        const sourceType = anchorNode.type ?? anchorNodeId;
        if (isValidConnection(sourceType, nodeType)) {
          const sourceHandle = sourceType === 'resultNode' ? 'output' : undefined;
          const edgeId = `e-auto-${anchorNodeId}-${id}`;
          setEdges((prev) => {
            if (prev.some((e) => e.source === anchorNodeId && e.target === id)) return prev;
            return [...prev, {
              id: edgeId,
              source: anchorNodeId,
              sourceHandle,
              target: id,
              targetHandle: 'idea',
              type: 'pipeline',
              data: { isRunning: false, isComplete: false },
            }];
          });
        }
      }

      return id;
    },
    [setNodes, setEdges, selectedNodeId, nodes],
  );

  const removeNode = useCallback(
    (nodeId: string) => {
      setNodes((prev) => prev.filter((n) => n.id !== nodeId));
      setEdges((prev) => prev.filter((e) => e.source !== nodeId && e.target !== nodeId));
      if (selectedNodeId === nodeId) setSelectedNodeId(null);
    },
    [setNodes, setEdges, selectedNodeId],
  );

  const removeEdge = useCallback(
    (edgeId: string) => {
      setEdges((prev) => prev.filter((e) => e.id !== edgeId));
    },
    [setEdges],
  );

  const autoLayout = useCallback(() => {
    setNodes((prev) => {
      setEdges((prevEdges) => {
        const { nodes: laidNodes, edges: laidEdges } = applyDagreLayout(prev, prevEdges);
        setNodes(laidNodes);
        return laidEdges;
      });
      return prev;
    });
  }, [setNodes, setEdges]);

  const getFlowSnapshot = useCallback(() => {
    const nodeData: Record<string, Record<string, unknown>> = {};
    const persistTypes = ['emotion', 'influence', 'group', 'packedPipeline', 'textInfluence', 'documentInfluence', 'imageInfluence', 'linkInfluence', 'videoInfluence', 'preprompt', 'postprompt'];
    for (const n of nodes) {
      const d = n.data as Record<string, unknown>;
      const entry: Record<string, unknown> = {};

      if (n.type && persistTypes.includes(n.type)) {
        for (const [key, val] of Object.entries(d)) {
          if (key !== 'stageId') entry[key] = val;
        }
      }

      if (d.customInstructions) entry.customInstructions = d.customInstructions;
      if (d.subName) entry.subName = d.subName;

      if (Object.keys(entry).length > 0) {
        nodeData[n.id] = entry;
      }
    }
    return {
      nodes: nodes.map((n) => ({ id: n.id, position: n.position, type: n.type })),
      edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
      nodeData,
    };
  }, [nodes, edges]);

  const clearRunError = useCallback(() => setRunError(null), []);

  const pushHistory = useCallback((n: Node[], e: Edge[]) => {
    if (isUndoRedoRef.current) return;
    const stack = historyRef.current;
    const idx = historyIndexRef.current;
    const trimmed = stack.slice(0, idx + 1);
    trimmed.push({ nodes: n.map((nd) => ({ ...nd })), edges: e.map((ed) => ({ ...ed })) });
    if (trimmed.length > MAX_HISTORY) trimmed.shift();
    historyRef.current = trimmed;
    historyIndexRef.current = trimmed.length - 1;
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(false);
  }, []);

  useEffect(() => {
    if (historyTimerRef.current) clearTimeout(historyTimerRef.current);
    historyTimerRef.current = setTimeout(() => {
      pushHistory(nodes, edges);
    }, 300);
    return () => { if (historyTimerRef.current) clearTimeout(historyTimerRef.current); };
  }, [nodes, edges, pushHistory]);

  const undo = useCallback(() => {
    const idx = historyIndexRef.current;
    if (idx <= 0) return;
    isUndoRedoRef.current = true;
    const prev = historyRef.current[idx - 1];
    historyIndexRef.current = idx - 1;
    setNodes(prev.nodes);
    setEdges(prev.edges);
    setCanUndo(idx - 1 > 0);
    setCanRedo(true);
    setTimeout(() => { isUndoRedoRef.current = false; }, 50);
  }, [setNodes, setEdges]);

  const redo = useCallback(() => {
    const idx = historyIndexRef.current;
    const stack = historyRef.current;
    if (idx >= stack.length - 1) return;
    isUndoRedoRef.current = true;
    const next = stack[idx + 1];
    historyIndexRef.current = idx + 1;
    setNodes(next.nodes);
    setEdges(next.edges);
    setCanUndo(true);
    setCanRedo(idx + 1 < stack.length - 1);
    setTimeout(() => { isUndoRedoRef.current = false; }, 50);
  }, [setNodes, setEdges]);

  const spawnFullChain = useCallback(() => {
    setNodes((prev) => {
      const existingIds = new Set(prev.map((n) => n.id));
      const toAdd: Node[] = [];
      for (const stageId of STAGE_ORDER.slice(1)) {
        if (!existingIds.has(stageId)) {
          toAdd.push({
            id: stageId,
            type: stageId,
            position: { x: 0, y: 0 },
            data: { stageId },
          });
        }
      }
      if (toAdd.length === 0) return prev;
      const seedNode = prev.find((n) => n.id === 'seed');
      const seedY = seedNode?.position.y ?? 0;
      const rightmostX = prev.length > 0
        ? prev.reduce((max, n) => Math.max(max, n.position.x), -Infinity)
        : 0;
      const GAP = 380;
      const positioned = toAdd.map((n, i) => ({
        ...n,
        position: { x: rightmostX + GAP * (i + 1), y: seedY },
      }));
      return [...prev, ...positioned];
    });

    setEdges((prev) => {
      const currentIds = new Set(prev.map((e) => e.id));
      setNodes((curNodes) => {
        const allEdges = buildInitialEdges(curNodes);
        const toAdd = allEdges.filter((e) => !currentIds.has(e.id));
        if (toAdd.length > 0) {
          setEdges((curEdges) => [...curEdges, ...toAdd]);
        }
        return curNodes;
      });
      return prev;
    });
  }, [setNodes, setEdges]);

  const spawnPackedPipeline = useCallback(() => {
    setNodes((prev) => {
      const existing = prev.find((n) => n.type === 'packedPipeline');
      if (existing) return prev;

      const startNode = prev.find((n) => n.id === 'start');
      const startPos = startNode?.position ?? { x: -250, y: 0 };

      const packedNode: Node = {
        id: `packedPipeline-${Date.now()}`,
        type: 'packedPipeline',
        position: { x: startPos.x + 280, y: startPos.y },
        data: { stageId: 'packedPipeline' },
      };
      return [...prev, packedNode];
    });

    setTimeout(() => {
      setEdges((prev) => {
        setNodes((curNodes) => {
          const packed = curNodes.find((n) => n.type === 'packedPipeline');
          if (!packed) return curNodes;
          const seedNode = curNodes.find((n) => n.id === 'seed');
          const alreadyConnected = prev.some((e) => e.target === packed.id);
          if (alreadyConnected) return curNodes;
          const sourceId = seedNode?.id ?? 'start';
          setEdges((curEdges) => [
            ...curEdges,
            {
              id: `e-${sourceId}-packed`,
              source: sourceId,
              target: packed.id,
              type: 'pipeline',
              data: { sourceStage: sourceId, isRunning: false, isComplete: false },
            },
          ]);
          return curNodes;
        });
        return prev;
      });
    }, 50);
  }, [setNodes, setEdges]);

  const createGroup = useCallback((nodeIds: string[], name: string) => {
    const filteredIds = nodeIds.filter((id) => {
      const node = nodes.find((n) => n.id === id);
      return node?.type !== 'start';
    });
    if (filteredIds.length < 2) return;
    const groupId = `group-${Date.now()}`;

    setNodes((prev) => {
      const selectedNodes = prev.filter((n) => filteredIds.includes(n.id));
      if (selectedNodes.length < 2) return prev;

      const minX = Math.min(...selectedNodes.map((n) => n.position.x));
      const minY = Math.min(...selectedNodes.map((n) => n.position.y));

      const groupNode: Node = {
        id: groupId,
        type: 'group',
        position: { x: minX - 20, y: minY - 50 },
        data: {
          groupName: name,
          childNodeIds: filteredIds,
          expanded: false,
        },
      };

      const childSet = new Set(filteredIds);
      return [...prev.map((n) => childSet.has(n.id) ? { ...n, hidden: true } : n), groupNode];
    });
  }, [setNodes, nodes]);

  const ungroupNodes = useCallback((groupId: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== groupId));
    setEdges((prev) => prev.filter((e) => e.source !== groupId && e.target !== groupId));
  }, [setNodes, setEdges]);

  const expandGroup = useCallback((groupId: string) => {
    setNodes((prev) => {
      const groupNode = prev.find((n) => n.id === groupId);
      if (!groupNode || groupNode.type !== 'group') return prev;
      const childIds = new Set((groupNode.data as Record<string, unknown>).childNodeIds as string[] ?? []);
      return prev.map((n) => {
        if (n.id === groupId) return { ...n, data: { ...n.data, expanded: true } };
        if (childIds.has(n.id)) return { ...n, hidden: false };
        return n;
      });
    });
    setTimeout(() => {
      setNodes((prev) => {
        const allEdges = edges;
        const { nodes: laidNodes } = applyDagreLayout(prev.filter((n) => !n.hidden), allEdges);
        const posMap = new Map(laidNodes.map((n) => [n.id, n.position]));
        return prev.map((n) => posMap.has(n.id) ? { ...n, position: posMap.get(n.id)! } : n);
      });
    }, 50);
  }, [setNodes, edges]);

  const collapseGroup = useCallback((groupId: string) => {
    setNodes((prev) => {
      const groupNode = prev.find((n) => n.id === groupId);
      if (!groupNode || groupNode.type !== 'group') return prev;
      const childIds = new Set((groupNode.data as Record<string, unknown>).childNodeIds as string[] ?? []);
      return prev.map((n) => {
        if (n.id === groupId) return { ...n, data: { ...n.data, expanded: false } };
        if (childIds.has(n.id)) return { ...n, hidden: true };
        return n;
      });
    });
  }, [setNodes]);

  const updateNodeData = useCallback((nodeId: string, data: Record<string, unknown>) => {
    setNodes((prev) =>
      prev.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n,
      ),
    );
  }, [setNodes]);

  const getNodeData = useCallback((nodeId: string): Record<string, unknown> | undefined => {
    const node = nodes.find((n) => n.id === nodeId);
    return node ? (node.data as Record<string, unknown>) : undefined;
  }, [nodes]);

  // ── Clipboard ──────────────────────────────────────────────────
  const clipboardRef = useRef<{ nodes: Node[]; edges: Edge[] } | null>(null);

  const copySelectedNodes = useCallback(() => {
    const sel = nodes.filter((n) => n.selected);
    if (!sel.length) return;
    const ids = new Set(sel.map((n) => n.id));
    clipboardRef.current = { nodes: sel, edges: edges.filter((e) => ids.has(e.source) && ids.has(e.target)) };
  }, [nodes, edges]);

  const pasteNodes = useCallback((position?: { x: number; y: number }) => {
    if (!clipboardRef.current) return;
    const { nodes: clipNodes, edges: clipEdges } = clipboardRef.current;
    const idMap = new Map<string, string>();
    const offset = position ? { x: position.x - clipNodes[0].position.x, y: position.y - clipNodes[0].position.y } : { x: 40, y: 40 };
    const newNodes = clipNodes.map((n) => {
      const newId = `${n.type ?? 'node'}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      idMap.set(n.id, newId);
      return { ...n, id: newId, position: { x: n.position.x + offset.x, y: n.position.y + offset.y }, selected: false };
    });
    const newEdges = clipEdges.map((e) => ({
      ...e,
      id: `e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      source: idMap.get(e.source) ?? e.source,
      target: idMap.get(e.target) ?? e.target,
    }));
    setNodes((prev) => [...prev, ...newNodes]);
    setEdges((prev) => [...prev, ...newEdges]);
  }, [setNodes, setEdges]);

  // ── Pin / freeze ──────────────────────────────────────────────
  const togglePinNode = useCallback((nodeId: string) => {
    setNodes((prev) =>
      prev.map((n) => {
        if (n.id !== nodeId) return n;
        const pinned = !(n.data as Record<string, unknown>).__pinned;
        return { ...n, draggable: !pinned, data: { ...n.data, __pinned: pinned } };
      }),
    );
  }, [setNodes]);

  // ── Delete / Duplicate selected ───────────────────────────────
  const deleteSelected = useCallback(() => {
    const selected = nodes.filter((n) => n.selected);
    if (!selected.length) return;
    for (const n of selected) removeNode(n.id);
  }, [nodes, removeNode]);

  const duplicateSelected = useCallback(() => {
    const selected = nodes.filter((n) => n.selected);
    if (!selected.length) return;
    for (const n of selected) {
      addNodeToCanvas(n.type ?? 'seed', { x: n.position.x + 40, y: n.position.y + 40 }, { ...(n.data as Record<string, unknown>) });
    }
  }, [nodes, addNodeToCanvas]);

  // ── Export / Save / Import ────────────────────────────────────
  const buildRichNodeData = useCallback((targetNodes: Node[]) => {
    const nodeData: Record<string, Record<string, unknown>> = {};
    for (const n of targetNodes) {
      const d = n.data as Record<string, unknown>;
      const entry: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(d)) {
        if (key === 'stageId') continue;
        entry[key] = val;
      }
      const stageId = (d.stageId ?? n.type) as StageId | undefined;
      if (stageId && session.stageState[stageId]?.output) {
        entry._stageOutput = session.stageState[stageId].output;
      }
      if (Object.keys(entry).length > 0) {
        nodeData[n.id] = entry;
      }
    }
    return nodeData;
  }, [session.stageState]);

  const saveAndCopy = useCallback((json: string, filename: string) => {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    navigator.clipboard.writeText(json).catch(() => {});
  }, []);

  const exportLayoutJSON = useCallback(() => {
    const nodeData = buildRichNodeData(nodes);
    const payload = {
      nodes: nodes.map((n) => ({ id: n.id, position: n.position, type: n.type })),
      edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
      nodeData,
    };
    saveAndCopy(JSON.stringify(payload, null, 2), 'shawndermind-layout.json');
  }, [nodes, edges, buildRichNodeData, saveAndCopy]);

  const exportSelectedJSON = useCallback(() => {
    const selected = nodes.filter((n) => n.selected);
    if (!selected.length) return;
    const selectedIds = new Set(selected.map((n) => n.id));
    const relevantEdges = edges.filter((e) => selectedIds.has(e.source) && selectedIds.has(e.target));
    const nodeData = buildRichNodeData(selected);
    const payload = {
      nodes: selected.map((n) => ({ id: n.id, position: n.position, type: n.type })),
      edges: relevantEdges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
      nodeData,
    };
    saveAndCopy(JSON.stringify(payload, null, 2), 'shawndermind-selected.json');
  }, [nodes, edges, buildRichNodeData, saveAndCopy]);

  const buildNodeWithStyle = useCallback((targetNodes: Node[]) => {
    return targetNodes.map((n) => {
      const base: Record<string, unknown> = { id: n.id, position: n.position, type: n.type };
      if (n.style && (n.style.width || n.style.height)) {
        base.style = { width: n.style.width, height: n.style.height };
      }
      return base;
    });
  }, []);

  const exportSelectedNodesOnly = useCallback(() => {
    const selected = nodes.filter((n) => n.selected);
    if (!selected.length) return;
    const nodeData = buildRichNodeData(selected);
    const payload = { nodes: buildNodeWithStyle(selected), edges: [], nodeData };
    saveAndCopy(JSON.stringify(payload, null, 2), 'shawndermind-selected-nodes.json');
  }, [nodes, buildRichNodeData, buildNodeWithStyle, saveAndCopy]);

  const exportSelectedWithConnections = useCallback(() => {
    const selected = nodes.filter((n) => n.selected);
    if (!selected.length) return;
    const selectedIds = new Set(selected.map((n) => n.id));
    const relevantEdges = edges.filter((e) => selectedIds.has(e.source) && selectedIds.has(e.target));
    const nodeData = buildRichNodeData(selected);
    const payload = {
      nodes: buildNodeWithStyle(selected),
      edges: relevantEdges.map((e) => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle, targetHandle: e.targetHandle })),
      nodeData,
    };
    saveAndCopy(JSON.stringify(payload, null, 2), 'shawndermind-selected-connected.json');
  }, [nodes, edges, buildRichNodeData, buildNodeWithStyle, saveAndCopy]);

  const exportAllNodesOnly = useCallback(() => {
    const nodeData = buildRichNodeData(nodes);
    const payload = { nodes: buildNodeWithStyle(nodes), edges: [], nodeData };
    saveAndCopy(JSON.stringify(payload, null, 2), 'shawndermind-all-nodes.json');
  }, [nodes, buildRichNodeData, buildNodeWithStyle, saveAndCopy]);

  const exportAllWithConnections = useCallback(() => {
    const nodeData = buildRichNodeData(nodes);
    const payload = {
      nodes: buildNodeWithStyle(nodes),
      edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target, sourceHandle: e.sourceHandle, targetHandle: e.targetHandle })),
      nodeData,
    };
    saveAndCopy(JSON.stringify(payload, null, 2), 'shawndermind-all-connected.json');
  }, [nodes, edges, buildRichNodeData, buildNodeWithStyle, saveAndCopy]);

  const saveLayout = useCallback(() => {
    const snapshot = getFlowSnapshot();
    const vp = { x: 0, y: 0, zoom: 1 };
    try {
      const rfEl = document.querySelector('.react-flow');
      if (rfEl) {
        const t = (rfEl as HTMLElement).style.transform;
        const m = t?.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)\s*scale\(([-\d.]+)\)/);
        if (m) { vp.x = parseFloat(m[1]); vp.y = parseFloat(m[2]); vp.zoom = parseFloat(m[3]); }
      }
    } catch { /* ignore */ }
    const payload = { ...snapshot, viewport: vp };
    localStorage.setItem('shawnderland-layout-shawndermind', JSON.stringify(payload));

    const saveFlowState = (window as unknown as Record<string, unknown>).__saveFlowState as ((fs: unknown) => void) | undefined;
    if (saveFlowState) saveFlowState(payload);
  }, [getFlowSnapshot]);

  const importLayout = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        if (data.nodes && data.edges) {
          const nd = data.nodeData ?? {};
          setNodes(data.nodes.map((n: { id: string; position: { x: number; y: number }; type?: string }) => ({
            id: n.id, type: n.type, position: n.position,
            data: { stageId: n.type, ...nd[n.id] },
          })));
          setEdges(data.edges.map((e: { id: string; source: string; target: string }) => ({
            ...e, type: 'pipeline', data: { isComplete: true },
          })));
        }
      } catch { /* invalid JSON */ }
    };
    reader.readAsText(file);
  }, [setNodes, setEdges]);

  // ── Named Layout Management ────────────────────────────────────
  const [savedLayoutsList, setSavedLayoutsList] = useState<Array<{ name: string; savedAt: string }>>([]);
  const [activeLayoutName, setActiveLayoutName] = useState<string | null>(null);
  const APP_KEY = 'shawndermind';

  const refreshLayoutsList = useCallback(() => {
    const all = storeListLayouts(APP_KEY);
    setSavedLayoutsList(all.map((l) => ({ name: l.name, savedAt: l.savedAt })));
  }, []);

  useEffect(() => {
    refreshLayoutsList();
  }, [refreshLayoutsList]);

  const buildLayoutSnapshot = useCallback((): LayoutSnapshot => {
    const snap = getFlowSnapshot();
    const nodesWithStyle = nodes.map((n) => {
      const base = { id: n.id, position: n.position, type: n.type };
      if (n.style && (n.style.width || n.style.height)) {
        return { ...base, style: { width: n.style.width, height: n.style.height } };
      }
      return base;
    });
    let vp = { x: 0, y: 0, zoom: 1 };
    try {
      const rfEl = document.querySelector('.react-flow');
      if (rfEl) {
        const t = (rfEl as HTMLElement).style.transform;
        const m = t?.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)\s*scale\(([-\d.]+)\)/);
        if (m) { vp = { x: parseFloat(m[1]), y: parseFloat(m[2]), zoom: parseFloat(m[3]) }; }
      }
    } catch { /* ignore */ }
    return { ...snap, nodes: nodesWithStyle, viewport: vp };
  }, [getFlowSnapshot, nodes]);

  const saveNamedLayoutFn = useCallback((name: string) => {
    storeNamedLayout(APP_KEY, name, buildLayoutSnapshot());
    setActiveLayoutName(name);
    refreshLayoutsList();
  }, [buildLayoutSnapshot, refreshLayoutsList]);

  const restoreLayoutSnapshot = useCallback((snap: LayoutSnapshot): boolean => {
    try {
      const nd = snap.nodeData ?? {};
      const restoredNodes: Node[] = snap.nodes.map((n) => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: { stageId: n.type, ...nd[n.id] },
        draggable: nd[n.id]?.__pinned ? false : undefined,
        style: n.style as Record<string, unknown> | undefined,
      }));
      const restoredEdges: Edge[] = snap.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
        type: 'pipeline',
        data: { isComplete: true },
      }));
      setNodes(restoredNodes);
      setEdges(restoredEdges);
      return true;
    } catch {
      return false;
    }
  }, [setNodes, setEdges]);

  const loadNamedLayoutFn = useCallback((name: string): boolean => {
    const snap = storeLoadNamedLayout(APP_KEY, name);
    if (!snap) return false;
    const ok = restoreLayoutSnapshot(snap);
    if (ok) setActiveLayoutName(name);
    return ok;
  }, [restoreLayoutSnapshot]);

  const updateActiveLayoutFn = useCallback(() => {
    if (!activeLayoutName) return;
    storeNamedLayout(APP_KEY, activeLayoutName, buildLayoutSnapshot());
    refreshLayoutsList();
  }, [activeLayoutName, buildLayoutSnapshot, refreshLayoutsList]);

  const setDefaultLayoutFn = useCallback(() => {
    setDefaultFromSnapshot(APP_KEY, buildLayoutSnapshot());
    refreshLayoutsList();
  }, [buildLayoutSnapshot, refreshLayoutsList]);

  const deleteNamedLayoutFn = useCallback((name: string) => {
    storeDeleteNamedLayout(APP_KEY, name);
    refreshLayoutsList();
  }, [refreshLayoutsList]);

  (window as unknown as Record<string, unknown>).__updateNodeData = updateNodeData;
  (window as unknown as Record<string, unknown>).__getNodeData = getNodeData;
  (window as unknown as Record<string, unknown>).__spawnFullChain = spawnFullChain;
  (window as unknown as Record<string, unknown>).__spawnPackedPipeline = spawnPackedPipeline;
  (window as unknown as Record<string, unknown>).__getEdges = () => edges;
  (window as unknown as Record<string, unknown>).__triggerGroupExpand = expandGroup;
  (window as unknown as Record<string, unknown>).__getFlowSnapshot = getFlowSnapshot;

  return {
    nodes,
    edges,
    setNodes,
    setEdges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    selectedNodeId,
    setSelectedNodeId,
    addNodeToCanvas,
    removeNode,
    removeEdge,
    autoLayout,
    getFlowSnapshot,
    savedViewport: savedFlowState?.viewport,
    runError,
    clearRunError,
    undo,
    redo,
    canUndo,
    canRedo,
    createGroup,
    ungroupNodes,
    expandGroup,
    collapseGroup,
    updateNodeData,
    spawnFullChain,
    spawnPackedPipeline,
    copySelectedNodes,
    pasteNodes,
    togglePinNode,
    deleteSelected,
    duplicateSelected,
    exportLayoutJSON,
    exportSelectedJSON,
    exportSelectedNodesOnly,
    exportSelectedWithConnections,
    exportAllNodesOnly,
    exportAllWithConnections,
    saveLayout,
    importLayout,
    saveNamedLayout: saveNamedLayoutFn,
    loadNamedLayout: loadNamedLayoutFn,
    setDefaultLayout: setDefaultLayoutFn,
    deleteNamedLayout: deleteNamedLayoutFn,
    updateActiveLayout: updateActiveLayoutFn,
    activeLayoutName,
    savedLayoutsList,
    refreshLayoutsList,
  };
}
