"use client";

import { BaseEdge, getBezierPath, type EdgeProps } from '@xyflow/react';
import { NODE_META } from '../nodes/nodeRegistry';
import type { StageId } from '@/lib/ideation/engine/stages';
import './PipelineEdge.css';

export default function PipelineEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const sourceStage = (data?.sourceStage as StageId) ?? 'seed';
  const isRunning = (data?.isRunning as boolean) ?? false;
  const isComplete = (data?.isComplete as boolean) ?? false;
  const pathLit = (data?.pathLit as boolean) ?? false;
  const color = NODE_META[sourceStage]?.color ?? '#6c63ff';

  const lit = pathLit || isRunning;

  return (
    <g className={`pipeline-edge ${isRunning ? 'running' : ''} ${lit ? 'lit' : ''} ${isComplete ? 'complete' : 'pending'}`}>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: color,
          strokeWidth: lit ? 4 : 3,
          strokeDasharray: (isComplete || lit) ? 'none' : '6 4',
          opacity: (isComplete || lit) ? 1 : 0.35,
          filter: lit ? `drop-shadow(0 0 6px ${color})` : 'none',
          transition: 'opacity 0.3s, stroke-width 0.3s, filter 0.3s',
        }}
      />
      {isRunning && (
        <circle r="4" fill={color} className="edge-dot">
          <animateMotion dur="1.2s" repeatCount="indefinite" path={edgePath} />
        </circle>
      )}
    </g>
  );
}
