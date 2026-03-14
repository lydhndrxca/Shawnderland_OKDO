"use client";

import React from "react";
import { useWalterStore } from "../store";
import type { Shot } from "../types";
import { Plus, Film } from "lucide-react";

function ShotCard({ shot, selected }: { shot: Shot; selected: boolean }) {
  const { actions } = useWalterStore();
  return (
    <div
      className={`walter-shot-card ${selected ? "selected" : ""}`}
      onClick={() => actions.selectShot(shot.id)}
    >
      <div className="walter-shot-thumb">
        {shot.thumbnailUrl ? (
          <img src={shot.thumbnailUrl} alt={shot.title} />
        ) : (
          <Film size={28} />
        )}
        <span className="walter-shot-dur">{shot.durationSec}s</span>
      </div>
      <div className="walter-shot-info">
        <div className="walter-shot-title">{shot.title}</div>
        <div className="walter-shot-meta">
          <span>{shot.shotType}</span>
          <span>{shot.cameraMove}</span>
          <span>{shot.transition}</span>
        </div>
      </div>
      <div className="walter-shot-actions">
        <button onClick={(e) => { e.stopPropagation(); actions.duplicateShot(shot.id); }}>
          Dup
        </button>
        <button
          className="del"
          onClick={(e) => { e.stopPropagation(); actions.deleteShot(shot.id); }}
        >
          Del
        </button>
      </div>
    </div>
  );
}

export function ShotGrid() {
  const { project, selectedBeatId, selectedShotId, actions } = useWalterStore();
  if (!project) return null;

  const beats = [...project.beats].sort((a, b) => a.order - b.order);
  const filteredBeats = selectedBeatId
    ? beats.filter((b) => b.id === selectedBeatId)
    : beats;

  return (
    <div className="walter-storyboard">
      <div className="walter-storyboard-header">
        <span className="walter-storyboard-header-label">
          {selectedBeatId
            ? `Shots — ${project.beats.find((b) => b.id === selectedBeatId)?.label ?? ""}`
            : "All Shots"}
        </span>
        <div style={{ display: "flex", gap: 6 }}>
          {selectedBeatId && (
            <button
              className="walter-topbar-btn"
              style={{ fontSize: 10, padding: "3px 8px" }}
              onClick={() => actions.selectBeat(null)}
            >
              Show All
            </button>
          )}
          <button
            className="walter-topbar-btn"
            style={{ fontSize: 10, padding: "3px 8px" }}
            onClick={() => {
              const beatId = selectedBeatId ?? beats[0]?.id;
              if (beatId) actions.addShot(beatId);
            }}
            disabled={beats.length === 0}
          >
            <Plus size={11} style={{ marginRight: 2 }} /> Shot
          </button>
        </div>
      </div>
      <div className="walter-shot-grid">
        {filteredBeats.map((beat) => {
          const shots = project.shots
            .filter((s) => s.beatId === beat.id)
            .sort((a, b) => a.order - b.order);
          if (!selectedBeatId && shots.length === 0) return null;
          return (
            <React.Fragment key={beat.id}>
              {!selectedBeatId && (
                <div
                  style={{
                    gridColumn: "1 / -1",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "4px 0",
                    marginTop: 4,
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: beat.color,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)" }}>
                    {beat.label}
                  </span>
                  <button
                    className="walter-topbar-btn"
                    style={{ fontSize: 9, padding: "1px 6px", marginLeft: "auto" }}
                    onClick={() => actions.addShot(beat.id)}
                  >
                    +
                  </button>
                </div>
              )}
              {shots.map((shot) => (
                <ShotCard
                  key={shot.id}
                  shot={shot}
                  selected={shot.id === selectedShotId}
                />
              ))}
              {shots.length === 0 && selectedBeatId && (
                <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: 40, color: "var(--text-muted)", fontSize: 12 }}>
                  No shots in this beat yet. Click + Shot to add one.
                </div>
              )}
            </React.Fragment>
          );
        })}
        {project.shots.length === 0 && !selectedBeatId && (
          <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: 60, color: "var(--text-muted)", fontSize: 12 }}>
            Select a beat and add shots to start storyboarding.
          </div>
        )}
      </div>
    </div>
  );
}
