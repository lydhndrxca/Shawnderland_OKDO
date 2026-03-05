import type { LineageGraph, LineageNode, LineageEdge } from './graphTypes';

export function getNodeById(
  graph: LineageGraph,
  id: string,
): LineageNode | undefined {
  return graph.nodes.find((n) => n.id === id);
}

export function getAncestors(
  graph: LineageGraph,
  nodeId: string,
): LineageNode[] {
  const visited = new Set<string>();
  const result: LineageNode[] = [];
  const queue = [nodeId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const incomingEdges = graph.edges.filter((e) => e.fromId === current);
    for (const edge of incomingEdges) {
      if (!visited.has(edge.toId)) {
        visited.add(edge.toId);
        const node = graph.nodes.find((n) => n.id === edge.toId);
        if (node) {
          result.push(node);
          queue.push(edge.toId);
        }
      }
    }
  }
  return result;
}

export function getDescendants(
  graph: LineageGraph,
  nodeId: string,
): LineageNode[] {
  const visited = new Set<string>();
  const result: LineageNode[] = [];
  const queue = [nodeId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const outEdges = graph.edges.filter((e) => e.toId === current);
    for (const edge of outEdges) {
      if (!visited.has(edge.fromId)) {
        visited.add(edge.fromId);
        const node = graph.nodes.find((n) => n.id === edge.fromId);
        if (node) {
          result.push(node);
          queue.push(edge.fromId);
        }
      }
    }
  }
  return result;
}

export function getWinnerChain(
  graph: LineageGraph,
  branchId: string,
): { nodes: LineageNode[]; edges: LineageEdge[] } {
  const commitNodes = graph.nodes.filter(
    (n) => n.type === 'CommitArtifact' && n.branchId === branchId,
  );
  if (commitNodes.length === 0) {
    const scorecards = graph.nodes.filter(
      (n) => n.type === 'Scorecard' && n.branchId === branchId,
    );
    if (scorecards.length === 0) return { nodes: [], edges: [] };
    return buildChainFromRoot(graph, scorecards[scorecards.length - 1].id);
  }
  const latestCommit = commitNodes[commitNodes.length - 1];
  return buildChainFromRoot(graph, latestCommit.id);
}

function buildChainFromRoot(
  graph: LineageGraph,
  targetId: string,
): { nodes: LineageNode[]; edges: LineageEdge[] } {
  const chainNodes = new Set<string>();
  const chainEdges: LineageEdge[] = [];

  const queue = [targetId];
  chainNodes.add(targetId);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const incoming = graph.edges.filter((e) => e.fromId === current);
    for (const edge of incoming) {
      chainEdges.push(edge);
      if (!chainNodes.has(edge.toId)) {
        chainNodes.add(edge.toId);
        queue.push(edge.toId);
      }
    }
  }

  return {
    nodes: graph.nodes.filter((n) => chainNodes.has(n.id)),
    edges: chainEdges,
  };
}

export interface FieldDiff {
  field: string;
  a: string;
  b: string;
}

export function compareNodes(
  payloadA: Record<string, unknown>,
  payloadB: Record<string, unknown>,
): FieldDiff[] {
  const fields = [
    'hook',
    'differentiator',
    'constraints',
    'next3Actions',
    'antiGenericClaim',
    'first60Minutes',
    'concept',
    'planDay1',
    'planWeek1',
    'riskNotes',
  ];

  const diffs: FieldDiff[] = [];
  for (const field of fields) {
    const a = String(payloadA[field] ?? '');
    const b = String(payloadB[field] ?? '');
    if (a !== b) {
      diffs.push({ field, a, b });
    }
  }
  return diffs;
}

export function listBranches(
  graph: LineageGraph,
): Array<{ branchId: string; latestCommitNode: LineageNode | null }> {
  const branchIds = new Set<string>();
  for (const n of graph.nodes) branchIds.add(n.branchId);

  return [...branchIds].map((branchId) => {
    const commits = graph.nodes.filter(
      (n) => n.type === 'CommitArtifact' && n.branchId === branchId,
    );
    return {
      branchId,
      latestCommitNode: commits.length > 0 ? commits[commits.length - 1] : null,
    };
  });
}
