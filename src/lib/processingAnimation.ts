/**
 * Shared utility for marking nodes and edges as "processing" in React Flow.
 * Adds/removes CSS classes that trigger animated borders and edge glow.
 *
 * Usage:
 *   const anim = createProcessingAnimator(setNodes, setEdges, getEdges);
 *   anim.markNodes(['node1', 'node2'], true);
 *   anim.markEdgesBetween('sourceId', ['targetId1', 'targetId2'], true);
 *   anim.clearAll();
 */

import type { Node, Edge } from '@xyflow/react';

const NODE_CLASS = 'node-processing';
const EDGE_CLASS = 'edge-processing';

type SetNodes = React.Dispatch<React.SetStateAction<Node[]>>;
type SetEdges = React.Dispatch<React.SetStateAction<Edge[]>>;
type GetEdges = () => Edge[];

function toggleNodeClass(nodes: Node[], ids: string[], active: boolean): Node[] {
  const idSet = new Set(ids);
  return nodes.map((n) => {
    if (!idSet.has(n.id)) return n;
    const cls = (n.className ?? '').replace(NODE_CLASS, '').trim();
    const next = active ? `${cls} ${NODE_CLASS}`.trim() : cls;
    return next !== (n.className ?? '') ? { ...n, className: next || undefined } : n;
  });
}

function toggleEdgeClass(edges: Edge[], edgeIds: Set<string>, active: boolean): Edge[] {
  return edges.map((e) => {
    if (!edgeIds.has(e.id)) return e;
    const cls = (e.className ?? '').replace(EDGE_CLASS, '').trim();
    const next = active ? `${cls} ${EDGE_CLASS}`.trim() : cls;
    return next !== (e.className ?? '') ? { ...e, className: next || undefined } : e;
  });
}

export interface ProcessingAnimator {
  markNodes: (ids: string[], active: boolean) => void;
  markEdgesBetween: (sourceIds: string | string[], targetIds: string | string[], active: boolean) => void;
  markEdgesFrom: (sourceId: string, active: boolean) => void;
  markEdgesTo: (targetId: string, active: boolean) => void;
  clearAll: () => void;
}

export function createProcessingAnimator(
  setNodes: SetNodes,
  setEdges: SetEdges,
  getEdges: GetEdges,
): ProcessingAnimator {
  const trackedNodeIds = new Set<string>();
  const trackedEdgeIds = new Set<string>();

  function markNodes(ids: string[], active: boolean) {
    if (active) ids.forEach((id) => trackedNodeIds.add(id));
    else ids.forEach((id) => trackedNodeIds.delete(id));
    setNodes((nds) => toggleNodeClass(nds, ids, active));
  }

  function markEdgesBetween(
    sourceIds: string | string[],
    targetIds: string | string[],
    active: boolean,
  ) {
    const sources = new Set(Array.isArray(sourceIds) ? sourceIds : [sourceIds]);
    const targets = new Set(Array.isArray(targetIds) ? targetIds : [targetIds]);
    const edges = getEdges();
    const matching = new Set<string>();
    for (const e of edges) {
      if (sources.has(e.source) && targets.has(e.target)) matching.add(e.id);
    }
    if (active) matching.forEach((id) => trackedEdgeIds.add(id));
    else matching.forEach((id) => trackedEdgeIds.delete(id));
    setEdges((eds) => toggleEdgeClass(eds, matching, active));
  }

  function markEdgesFrom(sourceId: string, active: boolean) {
    const edges = getEdges();
    const matching = new Set<string>();
    for (const e of edges) {
      if (e.source === sourceId) matching.add(e.id);
    }
    if (active) matching.forEach((id) => trackedEdgeIds.add(id));
    else matching.forEach((id) => trackedEdgeIds.delete(id));
    setEdges((eds) => toggleEdgeClass(eds, matching, active));
  }

  function markEdgesTo(targetId: string, active: boolean) {
    const edges = getEdges();
    const matching = new Set<string>();
    for (const e of edges) {
      if (e.target === targetId) matching.add(e.id);
    }
    if (active) matching.forEach((id) => trackedEdgeIds.add(id));
    else matching.forEach((id) => trackedEdgeIds.delete(id));
    setEdges((eds) => toggleEdgeClass(eds, matching, active));
  }

  function clearAll() {
    const nodeIds = [...trackedNodeIds];
    const edgeIds = new Set(trackedEdgeIds);
    trackedNodeIds.clear();
    trackedEdgeIds.clear();
    if (nodeIds.length > 0) setNodes((nds) => toggleNodeClass(nds, nodeIds, false));
    if (edgeIds.size > 0) setEdges((eds) => toggleEdgeClass(eds, edgeIds, false));
  }

  return { markNodes, markEdgesBetween, markEdgesFrom, markEdgesTo, clearAll };
}
