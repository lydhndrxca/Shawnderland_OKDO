"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { useWalterStore } from "../store";

function beatColor(label: string, fallback: string): string {
  const key = label.toLowerCase();
  const map: Record<string, string> = {
    hook: "#ef4444", setup: "#f59e0b", build: "#22c55e",
    twist: "#8b5cf6", payoff: "#3b82f6", loop: "#ec4899",
    "inciting": "#eab308", "rising": "#f59e0b",
    midpoint: "#ef4444", crisis: "#ef4444", climax: "#8b5cf6",
    resolution: "#22c55e", tease: "#f97316", peak: "#ef4444",
    reveal: "#8b5cf6", reaction: "#22c55e", escalat: "#f59e0b",
    ending: "#22c55e", tag: "#06b6d4",
  };
  for (const [k, c] of Object.entries(map)) {
    if (key.includes(k)) return c;
  }
  return fallback || "#64748b";
}

function fmtMs(ms: number): string {
  if (!isFinite(ms) || isNaN(ms)) return "0s";
  const sec = Math.round(Math.max(0, ms) / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}:${s.toString().padStart(2, "0")}` : `${s}s`;
}

interface Props {
  onRegenerateBeat?: (beatId: string) => void;
}

export function InteractiveBeatBar({ onRegenerateBeat }: Props) {
  const { project, actions } = useWalterStore();
  const barRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<{ beatIdx: number } | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; beatId: string } | null>(null);
  const [hoveredBeat, setHoveredBeat] = useState<string | null>(null);

  const beats = project ? [...project.beats].sort((a, b) => a.order - b.order) : [];

  const totalMs = beats.length > 0
    ? Math.max(...beats.map((b) => isFinite(b.endMs) ? b.endMs : 0), 1000)
    : 60000;

  const handleBoundaryMouseDown = useCallback(
    (e: React.MouseEvent, beatIdx: number) => {
      e.preventDefault();
      setDragging({ beatIdx });
    },
    []
  );

  useEffect(() => {
    if (!dragging || !project) return;
    const handleMove = (e: MouseEvent) => {
      if (!barRef.current) return;
      const rect = barRef.current.getBoundingClientRect();
      const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const ms = Math.round(fraction * totalMs);
      const sorted = [...project.beats].sort((a, b) => a.order - b.order);
      const beat = sorted[dragging.beatIdx];
      const prevBeat = sorted[dragging.beatIdx - 1];
      if (!beat) return;
      const minMs = prevBeat ? prevBeat.startMs + 500 : 0;
      const clampedMs = Math.max(minMs, Math.min(ms, beat.endMs - 500));
      if (prevBeat) {
        actions.updateBeat(prevBeat.id, { endMs: clampedMs });
      }
      actions.updateBeat(beat.id, { startMs: clampedMs });
    };
    const handleUp = () => setDragging(null);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [dragging, project, totalMs, actions]);

  useEffect(() => {
    if (!ctxMenu) return;
    const close = () => setCtxMenu(null);
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [ctxMenu]);

  if (!project || beats.length === 0) return null;

  return (
    <div className="interactive-beat-bar">
      <div className="ibb-bar" ref={barRef}>
        {beats.map((beat) => {
          const start = isFinite(beat.startMs) ? beat.startMs : 0;
          const end = isFinite(beat.endMs) ? beat.endMs : totalMs;
          const left = totalMs > 0 ? (start / totalMs) * 100 : 0;
          const width = totalMs > 0 ? ((end - start) / totalMs) * 100 : 0;
          const color = beatColor(beat.label, beat.color);
          return (
            <div
              key={beat.id}
              className={`beat-segment ${hoveredBeat === beat.id ? "hovered" : ""}`}
              style={{ left: `${left}%`, width: `${Math.max(width, 1)}%`, background: color }}
              onMouseEnter={() => setHoveredBeat(beat.id)}
              onMouseLeave={() => setHoveredBeat(null)}
              onContextMenu={(e) => {
                e.preventDefault();
                setCtxMenu({ x: e.clientX, y: e.clientY, beatId: beat.id });
              }}
            >
              <span className="beat-label">{beat.label}</span>
            </div>
          );
        })}
        {beats.map((beat, i) => {
          if (i === 0) return null;
          const start = isFinite(beat.startMs) ? beat.startMs : 0;
          const pos = totalMs > 0 ? (start / totalMs) * 100 : 0;
          return (
            <div
              key={`b-${beat.id}`}
              className={`ibb-boundary ${dragging?.beatIdx === i ? "dragging" : ""}`}
              style={{ left: `${pos}%` }}
              onMouseDown={(e) => handleBoundaryMouseDown(e, i)}
            />
          );
        })}
      </div>
      <div className="ibb-timestamps">
        <span className="ibb-ts" style={{ left: "0%" }}>
          {fmtMs(0)}
        </span>
        <span className="ibb-ts" style={{ left: "100%", transform: "translateX(-100%)" }}>
          {fmtMs(totalMs)}
        </span>
      </div>

      {ctxMenu && (
        <div
          className="ibb-context-menu"
          style={{ left: ctxMenu.x, top: ctxMenu.y }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {onRegenerateBeat && (
            <div
              className="ibb-cm-item"
              onClick={() => {
                onRegenerateBeat(ctxMenu.beatId);
                setCtxMenu(null);
              }}
            >
              <span>Regenerate</span>
            </div>
          )}
          <div className="ibb-cm-divider" />
          <div
            className={`ibb-cm-item ${beats.length <= 1 ? "disabled" : ""}`}
            onClick={() => {
              if (beats.length > 1) {
                actions.deleteBeat(ctxMenu.beatId);
              }
              setCtxMenu(null);
            }}
          >
            <span>Remove</span>
          </div>
        </div>
      )}
    </div>
  );
}
