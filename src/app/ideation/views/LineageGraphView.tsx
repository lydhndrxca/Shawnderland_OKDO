"use client";

import { useMemo, useState, useRef, useEffect } from 'react';
import dagre from 'dagre';
import { useSession } from '@/lib/ideation/context/SessionContext';
import { materializeGraph } from '@/lib/ideation/engine/lineage/materializeGraph';
import {
  getWinnerChain,
  compareNodes,
  listBranches,
} from '@/lib/ideation/engine/lineage/graphSelectors';
import type { LineageNode, LineageEdge } from '@/lib/ideation/engine/lineage/graphTypes';
import type { FieldDiff } from '@/lib/ideation/engine/lineage/graphSelectors';
import './LineageGraphView.css';

const NODE_WIDTH = 180;
const NODE_HEIGHT = 48;

const NODE_COLORS: Record<string, string> = {
  Seed: '#4e79a7',
  NormalizedSeed: '#59a14f',
  IdeaCandidate: '#edc948',
  Critique: '#e15759',
  Mutation: '#f28e2b',
  Expansion: '#76b7b2',
  Scorecard: '#b07aa1',
  CommitArtifact: '#6c63ff',
};

function layoutGraph(
  nodes: LineageNode[],
  edges: LineageEdge[],
): { positions: Map<string, { x: number; y: number }>; width: number; height: number } {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'TB', nodesep: 30, ranksep: 60, marginx: 20, marginy: 20 });
  g.setDefaultEdgeLabel(() => ({}));

  for (const n of nodes) {
    g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const e of edges) {
    if (nodes.some((n) => n.id === e.fromId) && nodes.some((n) => n.id === e.toId)) {
      g.setEdge(e.toId, e.fromId);
    }
  }

  dagre.layout(g);

  const positions = new Map<string, { x: number; y: number }>();
  for (const n of nodes) {
    const info = g.node(n.id);
    if (info) positions.set(n.id, { x: info.x, y: info.y });
  }

  const graphInfo = g.graph();
  return {
    positions,
    width: (graphInfo.width ?? 800) + 40,
    height: (graphInfo.height ?? 600) + 40,
  };
}

export default function LineageGraphView() {
  const { session } = useSession();
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<LineageNode | null>(null);
  const [replayIdx, setReplayIdx] = useState(-1);
  const [compareMode, setCompareMode] = useState(false);
  const [comparePair, setComparePair] = useState<[string | null, string | null]>([null, null]);
  const [diffs, setDiffs] = useState<FieldDiff[]>([]);

  const graph = useMemo(() => materializeGraph(session), [session]);
  const branches = useMemo(() => listBranches(graph), [graph]);
  const winnerChain = useMemo(
    () => getWinnerChain(graph, session.activeBranchId),
    [graph, session.activeBranchId],
  );

  const displayNodes = replayIdx >= 0
    ? winnerChain.nodes.slice(0, replayIdx + 1)
    : graph.nodes;

  const displayEdges = replayIdx >= 0
    ? winnerChain.edges.filter(
        (e) =>
          displayNodes.some((n) => n.id === e.fromId) &&
          displayNodes.some((n) => n.id === e.toId),
      )
    : graph.edges;

  const { positions, width, height } = useMemo(
    () => layoutGraph(displayNodes, displayEdges),
    [displayNodes, displayEdges],
  );

  const winnerNodeIds = useMemo(
    () => new Set(winnerChain.nodes.map((n) => n.id)),
    [winnerChain],
  );

  useEffect(() => {
    if (compareMode && comparePair[0] && comparePair[1]) {
      const nodeA = graph.nodes.find((n) => n.id === comparePair[0]);
      const nodeB = graph.nodes.find((n) => n.id === comparePair[1]);
      if (nodeA && nodeB) {
        const evtA = session.events.find((e) => e.id === nodeA.payloadRef);
        const evtB = session.events.find((e) => e.id === nodeB.payloadRef);
        const payA = extractPayload(evtA, nodeA);
        const payB = extractPayload(evtB, nodeB);
        setDiffs(compareNodes(payA, payB));
      }
    } else {
      setDiffs([]);
    }
  }, [compareMode, comparePair, graph, session.events]);

  const handleNodeClick = (node: LineageNode) => {
    if (compareMode) {
      setComparePair((prev) => {
        if (!prev[0]) return [node.id, null];
        if (!prev[1] && prev[0] !== node.id) return [prev[0], node.id];
        return [node.id, null];
      });
    } else {
      setSelectedNode(node);
    }
  };

  return (
    <div className="lineage-view">
      <div className="lineage-toolbar">
        <div className="lineage-toolbar-left">
          <span className="lineage-label">
            Branch: <strong>{session.activeBranchId}</strong>
          </span>
          {branches.length > 1 && (
            <span className="lineage-branch-count">
              ({branches.length} branches)
            </span>
          )}
        </div>
        <div className="lineage-toolbar-right">
          <button
            className={`action-btn small ${compareMode ? 'active' : ''}`}
            onClick={() => {
              setCompareMode(!compareMode);
              setComparePair([null, null]);
              setDiffs([]);
            }}
          >
            {compareMode ? 'Exit Compare' : 'Compare'}
          </button>
        </div>
      </div>

      {winnerChain.nodes.length > 0 && (
        <div className="lineage-replay">
          <label className="lineage-replay-label">Replay winner chain:</label>
          <input
            type="range"
            className="lineage-replay-slider"
            min={-1}
            max={winnerChain.nodes.length - 1}
            value={replayIdx}
            onChange={(e) => setReplayIdx(parseInt(e.target.value, 10))}
          />
          <span className="lineage-replay-info">
            {replayIdx < 0
              ? 'All nodes'
              : `${replayIdx + 1} / ${winnerChain.nodes.length}`}
          </span>
        </div>
      )}

      <div className="lineage-canvas-wrapper">
        <svg
          ref={svgRef}
          className="lineage-canvas"
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="8"
              markerHeight="6"
              refX="8"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 8 3, 0 6" fill="#888" />
            </marker>
          </defs>

          {displayEdges.map((edge) => {
            const from = positions.get(edge.toId);
            const to = positions.get(edge.fromId);
            if (!from || !to) return null;
            return (
              <line
                key={edge.id}
                x1={from.x}
                y1={from.y + NODE_HEIGHT / 2}
                x2={to.x}
                y2={to.y - NODE_HEIGHT / 2}
                className="lineage-edge"
                markerEnd="url(#arrowhead)"
              />
            );
          })}

          {displayNodes.map((node) => {
            const pos = positions.get(node.id);
            if (!pos) return null;
            const isWinner = winnerNodeIds.has(node.id);
            const isSelected =
              selectedNode?.id === node.id ||
              comparePair[0] === node.id ||
              comparePair[1] === node.id;

            return (
              <g
                key={node.id}
                transform={`translate(${pos.x - NODE_WIDTH / 2}, ${pos.y - NODE_HEIGHT / 2})`}
                className={`lineage-node ${isSelected ? 'selected' : ''} ${isWinner && replayIdx < 0 ? 'winner-chain' : ''}`}
                onClick={() => handleNodeClick(node)}
              >
                <rect
                  width={NODE_WIDTH}
                  height={NODE_HEIGHT}
                  rx={6}
                  ry={6}
                  fill={NODE_COLORS[node.type] ?? '#666'}
                  opacity={0.9}
                />
                <text
                  x={NODE_WIDTH / 2}
                  y={16}
                  textAnchor="middle"
                  className="lineage-node-type"
                >
                  {node.type}
                </text>
                <text
                  x={NODE_WIDTH / 2}
                  y={34}
                  textAnchor="middle"
                  className="lineage-node-label"
                >
                  {node.label.length > 22
                    ? node.label.slice(0, 21) + '\u2026'
                    : node.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {selectedNode && !compareMode && (
        <div className="lineage-details">
          <h4>
            {selectedNode.type}: {selectedNode.label}
          </h4>
          <p>
            <strong>ID:</strong> {selectedNode.id}
          </p>
          <p>
            <strong>Branch:</strong> {selectedNode.branchId}
          </p>
          <p>
            <strong>Created:</strong>{' '}
            {new Date(selectedNode.createdAt).toLocaleString()}
          </p>
          <p>
            <strong>Payload ref:</strong> {selectedNode.payloadRef}
          </p>
          <button
            className="action-btn small"
            onClick={() => setSelectedNode(null)}
          >
            Close
          </button>
        </div>
      )}

      {compareMode && diffs.length > 0 && (
        <div className="lineage-compare">
          <h4>Field Differences</h4>
          <table className="lineage-diff-table">
            <thead>
              <tr>
                <th>Field</th>
                <th>Node A</th>
                <th>Node B</th>
              </tr>
            </thead>
            <tbody>
              {diffs.map((d) => (
                <tr key={d.field}>
                  <td className="diff-field">{d.field}</td>
                  <td className="diff-a">{d.a || '—'}</td>
                  <td className="diff-b">{d.b || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {compareMode && !comparePair[1] && (
        <div className="lineage-compare-hint">
          <p className="text-muted">
            {!comparePair[0]
              ? 'Click a node to select the first item for comparison.'
              : 'Click another node to compare.'}
          </p>
        </div>
      )}
    </div>
  );
}

function extractPayload(
  event: { data: Record<string, unknown> } | undefined,
  node: LineageNode,
): Record<string, unknown> {
  if (!event) return { label: node.label };
  const output = event.data.output as Record<string, unknown> | undefined;
  if (output) return output;
  const mutated = event.data.mutatedCandidate as Record<string, unknown> | undefined;
  if (mutated) return mutated;
  return event.data;
}
