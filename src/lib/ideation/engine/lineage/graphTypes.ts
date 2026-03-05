export type NodeType =
  | 'Seed'
  | 'NormalizedSeed'
  | 'IdeaCandidate'
  | 'Critique'
  | 'Mutation'
  | 'Expansion'
  | 'Scorecard'
  | 'CommitArtifact';

export type EdgeType =
  | 'DERIVED_FROM'
  | 'MUTATED_FROM'
  | 'EXPANDED_FROM'
  | 'SCORED_FROM'
  | 'SELECTED_AS_WINNER'
  | 'BRANCHED_FROM';

export interface LineageNode {
  id: string;
  type: NodeType;
  label: string;
  createdAt: string;
  branchId: string;
  payloadRef: string;
}

export interface LineageEdge {
  id: string;
  type: EdgeType;
  fromId: string;
  toId: string;
  createdAt: string;
  branchId: string;
}

export interface LineageGraph {
  nodes: LineageNode[];
  edges: LineageEdge[];
}
