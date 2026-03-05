"use client";

import { useMemo } from 'react';
import { validateNodeConnections, type CompatError } from '@/lib/ideation/engine/nodeCompatibility';

/**
 * Returns a map of nodeId → CompatError[] for every node that has
 * at least one compatibility issue with its current connections.
 */
export function useNodeCompatibility(
  nodes: Array<{ id: string; type?: string; data: Record<string, unknown> }>,
  edges: Array<{ source: string; target: string; sourceHandle?: string | null; targetHandle?: string | null }>,
): Map<string, CompatError[]> {
  return useMemo(() => {
    const nodeInfos = nodes.map((n) => ({
      id: n.id,
      type: n.type ?? '',
      data: (n.data ?? {}) as Record<string, unknown>,
    }));

    const edgeInfos = edges.map((e) => ({
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
    }));

    const allErrors = validateNodeConnections(nodeInfos, edgeInfos);

    const byNode = new Map<string, CompatError[]>();
    for (const err of allErrors) {
      const list = byNode.get(err.nodeId) ?? [];
      list.push(err);
      byNode.set(err.nodeId, list);
    }

    return byNode;
  }, [nodes, edges]);
}
