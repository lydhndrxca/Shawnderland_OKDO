import type { LineageNode, LineageEdge, LineageGraph } from './graphTypes';
import type { Session, SessionEvent } from '../../state/sessionTypes';
import type { DivergeOutput, DivergeCandidate, ConvergeOutput, CommitOutput } from '../schemas';

export function materializeGraph(session: Session): LineageGraph {
  const nodes: LineageNode[] = [];
  const edges: LineageEdge[] = [];
  let edgeCounter = 0;

  const addNode = (n: LineageNode) => {
    if (!nodes.some((x) => x.id === n.id)) nodes.push(n);
  };
  const addEdge = (e: Omit<LineageEdge, 'id'>) => {
    edges.push({ ...e, id: `edge-${edgeCounter++}` });
  };

  let seedNodeId: string | null = null;
  let normalizeNodeId: string | null = null;
  let critiqueNodeId: string | null = null;
  let scorecardNodeId: string | null = null;
  const candidateNodeIds = new Set<string>();
  const expansionNodeIds = new Map<string, string>();

  for (const event of session.events) {
    const branch = event.branchId ?? 'main';

    switch (event.type) {
      case 'SESSION_CREATE':
      case 'SEED_EDIT': {
        if (!seedNodeId) {
          seedNodeId = `seed-${event.id}`;
          addNode({
            id: seedNodeId,
            type: 'Seed',
            label: 'Seed',
            createdAt: event.timestamp,
            branchId: branch,
            payloadRef: event.id,
          });
        }
        break;
      }

      case 'STAGE_RUN': {
        if (event.stageId === 'normalize') {
          normalizeNodeId = `norm-${event.id}`;
          addNode({
            id: normalizeNodeId,
            type: 'NormalizedSeed',
            label: 'Normalize',
            createdAt: event.timestamp,
            branchId: branch,
            payloadRef: event.id,
          });
          if (seedNodeId) {
            addEdge({
              type: 'DERIVED_FROM',
              fromId: normalizeNodeId,
              toId: seedNodeId,
              createdAt: event.timestamp,
              branchId: branch,
            });
          }
        }

        if (event.stageId === 'diverge') {
          const output = event.data.output as DivergeOutput | undefined;
          if (output?.candidates) {
            for (const c of output.candidates) {
              const nid = `cand-${c.id}`;
              addNode({
                id: nid,
                type: 'IdeaCandidate',
                label: truncate(c.hook, 50),
                createdAt: event.timestamp,
                branchId: branch,
                payloadRef: event.id,
              });
              candidateNodeIds.add(nid);
              if (normalizeNodeId) {
                addEdge({
                  type: 'DERIVED_FROM',
                  fromId: nid,
                  toId: normalizeNodeId,
                  createdAt: event.timestamp,
                  branchId: branch,
                });
              }
            }
          }
        }

        if (event.stageId === 'expand') {
          const output = event.data.output as { expansions?: Array<{ candidateId: string; concept: string }> } | undefined;
          if (output?.expansions) {
            for (const exp of output.expansions) {
              const nid = `exp-${exp.candidateId}-${event.id}`;
              addNode({
                id: nid,
                type: 'Expansion',
                label: `Expand: ${truncate(exp.concept, 40)}`,
                createdAt: event.timestamp,
                branchId: branch,
                payloadRef: event.id,
              });
              expansionNodeIds.set(exp.candidateId, nid);
              const candNodeId = `cand-${exp.candidateId}`;
              if (candidateNodeIds.has(candNodeId)) {
                addEdge({
                  type: 'EXPANDED_FROM',
                  fromId: nid,
                  toId: candNodeId,
                  createdAt: event.timestamp,
                  branchId: branch,
                });
              }
            }
          }
        }

        if (event.stageId === 'converge') {
          scorecardNodeId = `score-${event.id}`;
          addNode({
            id: scorecardNodeId,
            type: 'Scorecard',
            label: 'Scorecard',
            createdAt: event.timestamp,
            branchId: branch,
            payloadRef: event.id,
          });
          for (const [, expNodeId] of expansionNodeIds) {
            addEdge({
              type: 'SCORED_FROM',
              fromId: scorecardNodeId,
              toId: expNodeId,
              createdAt: event.timestamp,
              branchId: branch,
            });
          }
        }

        if (event.stageId === 'commit') {
          const commitOutput = event.data.output as CommitOutput | undefined;
          const commitNodeId = `commit-${event.id}`;
          addNode({
            id: commitNodeId,
            type: 'CommitArtifact',
            label: `Commit: ${truncate(commitOutput?.title ?? 'Artifact', 40)}`,
            createdAt: event.timestamp,
            branchId: branch,
            payloadRef: event.id,
          });
          if (scorecardNodeId) {
            addEdge({
              type: 'DERIVED_FROM',
              fromId: commitNodeId,
              toId: scorecardNodeId,
              createdAt: event.timestamp,
              branchId: branch,
            });
          }
          const winnerId = event.data.winnerId as string | undefined;
          if (winnerId) {
            const candNodeId = `cand-${winnerId}`;
            if (candidateNodeIds.has(candNodeId)) {
              addEdge({
                type: 'SELECTED_AS_WINNER',
                fromId: commitNodeId,
                toId: candNodeId,
                createdAt: event.timestamp,
                branchId: branch,
              });
            }
          }
        }
        break;
      }

      case 'CRITIQUE_RUN': {
        critiqueNodeId = `critique-${event.id}`;
        addNode({
          id: critiqueNodeId,
          type: 'Critique',
          label: 'Critique',
          createdAt: event.timestamp,
          branchId: branch,
          payloadRef: event.id,
        });
        for (const candNid of candidateNodeIds) {
          addEdge({
            type: 'SCORED_FROM',
            fromId: critiqueNodeId,
            toId: candNid,
            createdAt: event.timestamp,
            branchId: branch,
          });
        }
        break;
      }

      case 'MUTATION_APPLIED': {
        const mutatedCandidate = event.data.mutatedCandidate as DivergeCandidate | undefined;
        const fromCandidateId = event.data.fromCandidateId as string;
        if (mutatedCandidate) {
          const nid = `cand-${mutatedCandidate.id}`;
          addNode({
            id: nid,
            type: 'IdeaCandidate',
            label: truncate(mutatedCandidate.hook, 50),
            createdAt: event.timestamp,
            branchId: branch,
            payloadRef: event.id,
          });
          candidateNodeIds.add(nid);
          const fromNid = `cand-${fromCandidateId}`;
          if (candidateNodeIds.has(fromNid)) {
            addEdge({
              type: 'MUTATED_FROM',
              fromId: nid,
              toId: fromNid,
              createdAt: event.timestamp,
              branchId: branch,
            });
          }
          if (critiqueNodeId) {
            addEdge({
              type: 'DERIVED_FROM',
              fromId: nid,
              toId: critiqueNodeId,
              createdAt: event.timestamp,
              branchId: branch,
            });
          }
        }
        break;
      }

      case 'SELECT_WINNER':
      case 'OVERRIDE_WINNER': {
        const candId = event.data.candidateId as string;
        const candNid = `cand-${candId}`;
        if (scorecardNodeId && candidateNodeIds.has(candNid)) {
          addEdge({
            type: 'SELECTED_AS_WINNER',
            fromId: scorecardNodeId,
            toId: candNid,
            createdAt: event.timestamp,
            branchId: branch,
          });
        }
        break;
      }

      case 'BRANCH_CREATE': {
        const fromNodeId = event.data.fromNodeId as string;
        const newBranchId = event.data.newBranchId as string;
        const branchRootId = `branch-root-${newBranchId}`;
        addNode({
          id: branchRootId,
          type: 'Seed',
          label: `Branch: ${truncate(event.data.label as string ?? newBranchId, 40)}`,
          createdAt: event.timestamp,
          branchId: newBranchId,
          payloadRef: event.id,
        });
        const candidateFromId = `cand-${fromNodeId}`;
        if (candidateNodeIds.has(candidateFromId)) {
          addEdge({
            type: 'BRANCHED_FROM',
            fromId: branchRootId,
            toId: candidateFromId,
            createdAt: event.timestamp,
            branchId: newBranchId,
          });
        } else {
          addEdge({
            type: 'BRANCHED_FROM',
            fromId: branchRootId,
            toId: fromNodeId,
            createdAt: event.timestamp,
            branchId: newBranchId,
          });
        }
        break;
      }

      default:
        break;
    }
  }

  return { nodes, edges };
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '\u2026' : s;
}
