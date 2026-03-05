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
import { STAGE_ORDER, isValidConnection } from './nodes/nodeRegistry';
import { getStageOutput } from '@/lib/ideation/state/sessionSelectors';
import { applyDagreLayout } from './flowLayout';
import type { StageId } from '@/lib/ideation/engine/stages';

export interface FlowSessionState {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  addNodeToCanvas: (nodeType: string, position?: { x: number; y: number }, extraData?: Record<string, unknown>) => void;
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
  updateNodeData: (nodeId: string, data: Record<string, unknown>) => void;
  spawnFullChain: () => void;
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
    const saved = savedFlowState;

    if (saved?.nodes?.length) {
      const posMap = new Map(saved.nodes.map((n) => [n.id, n.position]));
      const savedNodeData = saved.nodeData ?? {};

      const savedNodeTypes = new Map(saved.nodes.map((n) => [n.id, n.type]));
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
        const all = [...prev, ...newNodes];
        const allEdges = buildInitialEdges(all);
        const { nodes: laidNodes } = applyDagreLayout(all, allEdges);

        const existingPositions = new Map(prev.map((n) => [n.id, n.position]));
        return laidNodes.map((n) =>
          existingPositions.has(n.id)
            ? { ...n, position: existingPositions.get(n.id)! }
            : n,
        );
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
        const toAdd: Node[] = [];
        for (const { stageId, output } of resultStageIds) {
          const parentNode = prev.find((n) => n.id === stageId);
          const parentPos = parentNode?.position ?? { x: 0, y: 0 };
          toAdd.push({
            id: `result-${stageId}`,
            type: 'resultNode',
            position: { x: parentPos.x, y: parentPos.y + 260 },
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
    (nodeType: string, position?: { x: number; y: number }, extraData?: Record<string, unknown>) => {
      const id = `${nodeType}-${Date.now()}`;
      lastAddedNodeIdRef.current = id;
      const newNode: Node = {
        id,
        type: nodeType,
        position: position ?? { x: 200, y: 200 },
        data: { stageId: nodeType, ...extraData },
      };
      setNodes((prev) => [...prev, newNode]);
      return id;
    },
    [setNodes],
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
    const persistTypes = ['emotion', 'influence', 'group', 'textInfluence', 'documentInfluence', 'imageInfluence', 'linkInfluence', 'videoInfluence'];
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
      const all = [...prev, ...toAdd];
      const allEdges = buildInitialEdges(all);
      const { nodes: laidNodes } = applyDagreLayout(all, allEdges);
      const existingPositions = new Map(prev.map((n) => [n.id, n.position]));
      return laidNodes.map((n) =>
        existingPositions.has(n.id) ? { ...n, position: existingPositions.get(n.id)! } : n,
      );
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
          expanded: true,
        },
      };

      return [...prev, groupNode];
    });
  }, [setNodes, nodes]);

  const ungroupNodes = useCallback((groupId: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== groupId));
    setEdges((prev) => prev.filter((e) => e.source !== groupId && e.target !== groupId));
  }, [setNodes, setEdges]);

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

  (window as unknown as Record<string, unknown>).__updateNodeData = updateNodeData;
  (window as unknown as Record<string, unknown>).__getNodeData = getNodeData;
  (window as unknown as Record<string, unknown>).__spawnFullChain = spawnFullChain;
  (window as unknown as Record<string, unknown>).__getEdges = () => edges;

  return {
    nodes,
    edges,
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
    updateNodeData,
    spawnFullChain,
  };
}
