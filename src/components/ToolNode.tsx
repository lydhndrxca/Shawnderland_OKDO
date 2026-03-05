"use client";

import { memo } from "react";
import { Handle, Position } from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import { StatusBadge } from "./StatusBadge";

export interface ToolNodeData {
  toolId: string;
  name: string;
  tagline: string;
  description: string;
  accentColor: string;
  features: string[];
  mode: string;
  onOpen?: (toolId: string) => void;
  [key: string]: unknown;
}

function ToolNodeInner({ data, selected }: NodeProps) {
  const d = data as ToolNodeData;

  return (
    <div
      className={`
        w-[320px] rounded-xl border transition-all duration-200 cursor-pointer
        ${selected ? "border-[var(--color-accent)] shadow-[0_0_20px_rgba(108,99,255,0.3)]" : "border-[var(--color-border)] hover:border-[var(--color-border-hover)]"}
      `}
      style={{ background: "var(--color-surface)" }}
      onDoubleClick={() => d.onOpen?.(d.toolId)}
    >
      <div
        className="flex items-center justify-between px-4 py-3 rounded-t-xl"
        style={{ background: d.accentColor }}
      >
        <div>
          <h3 className="text-sm font-bold text-[var(--color-background)] uppercase tracking-wide">
            {d.name}
          </h3>
          <p className="text-[11px] font-medium text-[var(--color-background)]/70">
            {d.tagline}
          </p>
        </div>
        {d.mode === "electron-only" && (
          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-black/20 text-[var(--color-background)]">
            Desktop
          </span>
        )}
      </div>

      <div className="px-4 py-3 space-y-3">
        <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
          {d.description}
        </p>

        <div className="flex flex-wrap gap-1.5">
          {d.features.map((f) => (
            <span
              key={f}
              className="text-[10px] px-1.5 py-0.5 rounded font-medium"
              style={{
                background: d.accentColor + "18",
                color: d.accentColor,
              }}
            >
              {f}
            </span>
          ))}
        </div>

        {d.mode !== "electron-only" && (
          <StatusBadge toolId={d.toolId} className="mt-1" />
        )}

        <button
          className="w-full py-2 text-xs font-semibold rounded-md border transition-all hover:bg-white/5 active:scale-[0.97]"
          style={{ borderColor: d.accentColor, color: d.accentColor }}
          onClick={(e) => {
            e.stopPropagation();
            d.onOpen?.(d.toolId);
          }}
        >
          Open {d.name}
        </button>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !border-2"
        style={{
          background: d.accentColor,
          borderColor: "var(--color-surface)",
        }}
      />
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !border-2"
        style={{
          background: d.accentColor,
          borderColor: "var(--color-surface)",
        }}
      />
    </div>
  );
}

export const ToolNode = memo(ToolNodeInner);
