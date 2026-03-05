"use client";

import { BaseEdge, getBezierPath, type EdgeProps } from "@xyflow/react";
import "./PipelineEdge.css";

interface PipelineEdgeData {
  sourceColor?: string;
  isRunning?: boolean;
  isComplete?: boolean;
  pathLit?: boolean;
}

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

  const d = (data ?? {}) as PipelineEdgeData;
  const color = d.sourceColor ?? "#6c63ff";
  const isRunning = d.isRunning ?? false;
  const isComplete = d.isComplete ?? false;
  const pathLit = d.pathLit ?? false;
  const lit = pathLit || isRunning;

  return (
    <g
      className={`pipeline-edge ${isRunning ? "running" : ""} ${lit ? "lit" : ""} ${isComplete ? "complete" : "pending"}`}
    >
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: color,
          strokeWidth: lit ? 3 : 2,
          strokeDasharray: isComplete || lit ? "none" : "6 4",
          opacity: isComplete || lit ? 1 : 0.35,
          filter: lit ? `drop-shadow(0 0 6px ${color})` : "none",
          transition: "opacity 0.3s, stroke-width 0.3s, filter 0.3s",
        }}
      />
      {isRunning && (
        <circle r="4" fill={color} className="edge-dot">
          <animateMotion
            dur="1.2s"
            repeatCount="indefinite"
            path={edgePath}
          />
        </circle>
      )}
    </g>
  );
}
