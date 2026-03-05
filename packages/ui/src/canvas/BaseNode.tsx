"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import "./BaseNode.css";

export type NodeStatus = "empty" | "running" | "complete" | "stale";

export interface NodeMeta {
  label: string;
  color: string;
  tooltip: string;
  runLabel: string;
  loadingMessage: string;
  inputTooltip: string;
  outputTooltip: string;
}

interface BaseNodeProps {
  meta: NodeMeta;
  status: NodeStatus;
  selected?: boolean;
  children?: React.ReactNode;
  onRun?: () => void;
  hideSourceHandle?: boolean;
  hideTargetHandle?: boolean;
  hideResultHandle?: boolean;
  isPathComplete?: boolean;
}

function BaseNodeInner({
  meta,
  status,
  selected,
  children,
  onRun,
  hideSourceHandle,
  hideTargetHandle,
  hideResultHandle,
  isPathComplete,
}: BaseNodeProps) {
  const statusIcon =
    status === "running"
      ? "\u27F3"
      : status === "complete"
        ? "\u2713"
        : status === "stale"
          ? "\u27F3"
          : "\u25CB";

  const classNames = [
    "base-node",
    selected ? "selected" : "",
    `status-${status}`,
    isPathComplete ? "status-path-complete" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classNames} title={meta.tooltip}>
      <div className="base-node-header" style={{ background: meta.color }}>
        <span className="base-node-label">{meta.label}</span>
        <span className={`base-node-status status-icon-${status}`}>
          {statusIcon}
        </span>
      </div>

      <div className="base-node-body">
        {children}

        {onRun && status !== "running" && (
          <button
            className="base-node-run"
            onClick={(e) => {
              e.stopPropagation();
              onRun();
            }}
            style={{ borderColor: meta.color, color: meta.color }}
          >
            {status === "complete" ? "Re-run" : meta.runLabel}
          </button>
        )}

        {status === "running" && (
          <div className="base-node-loading">
            <div
              className="base-node-spinner"
              style={{ borderTopColor: meta.color }}
            />
            <span>{meta.loadingMessage}</span>
          </div>
        )}
      </div>

      {!hideTargetHandle && (
        <Handle
          type="target"
          position={Position.Left}
          className="base-handle target-handle"
          style={{ background: meta.color }}
        />
      )}
      {!hideSourceHandle && (
        <Handle
          type="source"
          position={Position.Right}
          id="main"
          className="base-handle source-handle"
          style={{ background: meta.color }}
        />
      )}
      {!hideResultHandle && (
        <Handle
          type="source"
          position={Position.Bottom}
          id="results"
          className="base-handle result-handle"
          style={{ background: "#80cbc4" }}
        />
      )}
    </div>
  );
}

export default memo(BaseNodeInner);
