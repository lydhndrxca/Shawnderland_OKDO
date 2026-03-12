"use client";

import React from "react";
import { useWalterStore } from "../store";
import { Plus } from "lucide-react";

export function BeatSidebar() {
  const { project, selectedBeatId, actions } = useWalterStore();
  if (!project) return null;

  const beats = [...project.beats].sort((a, b) => a.order - b.order);

  return (
    <aside className="walter-beats">
      <div className="walter-beats-header">
        <span>Beats ({beats.length})</span>
        <button
          className="walter-topbar-btn"
          style={{ padding: "2px 8px", fontSize: 10 }}
          onClick={() => actions.addBeat(`Beat ${beats.length + 1}`)}
          title="Add beat"
        >
          <Plus size={12} />
        </button>
      </div>
      <div className="walter-beats-list">
        {beats.map((beat) => {
          const shotCount = project.shots.filter((s) => s.beatId === beat.id).length;
          return (
            <div key={beat.id}>
              <div
                className={`walter-beat-card ${selectedBeatId === beat.id ? "active" : ""}`}
                onClick={() => actions.selectBeat(beat.id)}
              >
                <div className="walter-beat-dot" style={{ background: beat.color }} />
                <span className="walter-beat-label">{beat.label}</span>
                <span className="walter-beat-count">{shotCount}</span>
              </div>
              {beat.description && (
                <div className="walter-beat-desc">{beat.description}</div>
              )}
            </div>
          );
        })}
        {beats.length === 0 && (
          <div style={{ padding: 12, fontSize: 11, color: "var(--text-muted)", textAlign: "center" }}>
            No beats yet. Add one or apply an arc template.
          </div>
        )}
      </div>
    </aside>
  );
}
