"use client";

import React from "react";
import { useWalterStore, walterActions } from "../store";
import { ShotCard } from "./ShotCard";
import { Plus } from "lucide-react";

export function StoryboardEditor() {
  const { project, selectedShotId, actions } = useWalterStore();
  if (!project) return null;

  const beats = [...project.beats].sort((a, b) => a.order - b.order);

  return (
    <div className="storyboard-editor">
      <div className="storyboard-toolbar">
        <h2>Storyboard</h2>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span className="sb-badge">
            {project.shots.length} shots
          </span>
        </div>
      </div>

      {beats.map((beat) => {
        const shots = project.shots
          .filter((s) => s.beatId === beat.id)
          .sort((a, b) => a.order - b.order);
        return (
          <div key={beat.id} className="scene-group">
            <div className="scene-header">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: beat.color,
                    flexShrink: 0,
                  }}
                />
                <span className="scene-name-input" style={{ background: "transparent", border: "none", fontWeight: 600 }}>
                  {beat.label}
                </span>
                <span style={{ fontSize: 11, color: "var(--fg-dim)" }}>
                  {shots.length} shot{shots.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="scene-actions">
                <button
                  className="btn-sm"
                  onClick={() => actions.addShot(beat.id)}
                >
                  <Plus size={11} style={{ marginRight: 2 }} /> Shot
                </button>
              </div>
            </div>
            <div className="shot-cards">
              {shots.map((shot, idx) => (
                <ShotCard
                  key={shot.id}
                  shot={shot}
                  index={idx}
                  beat={beat}
                  selected={shot.id === selectedShotId}
                />
              ))}
              {shots.length === 0 && (
                <div style={{ padding: 20, textAlign: "center", color: "var(--fg-dim)", fontSize: 12 }}>
                  No shots yet. Click + Shot to add one.
                </div>
              )}
            </div>
          </div>
        );
      })}

      {beats.length === 0 && (
        <div style={{ padding: 40, textAlign: "center", color: "var(--fg-dim)" }}>
          No beats defined. Go to Episode Builder to set up your arc template.
        </div>
      )}
    </div>
  );
}
