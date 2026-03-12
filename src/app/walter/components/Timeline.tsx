"use client";

import React from "react";
import { useWalterStore } from "../store";

export function Timeline() {
  const { project, selectedShotId, actions } = useWalterStore();
  if (!project) return null;

  const beats = [...project.beats].sort((a, b) => a.order - b.order);
  const totalDuration = project.shots.reduce((sum, s) => sum + s.durationSec, 0);

  const segments: {
    shotId: string;
    title: string;
    beatLabel: string;
    beatColor: string;
    durationSec: number;
    fraction: number;
  }[] = [];

  for (const beat of beats) {
    const shots = project.shots
      .filter((s) => s.beatId === beat.id)
      .sort((a, b) => a.order - b.order);
    for (const shot of shots) {
      segments.push({
        shotId: shot.id,
        title: shot.title,
        beatLabel: beat.label,
        beatColor: beat.color,
        durationSec: shot.durationSec,
        fraction: totalDuration > 0 ? shot.durationSec / totalDuration : 0,
      });
    }
  }

  return (
    <div className="walter-timeline">
      <div className="walter-timeline-header">
        <span>Timeline</span>
        <span>
          {project.shots.length} shots &middot; {totalDuration.toFixed(1)}s total
        </span>
      </div>
      <div className="walter-timeline-track">
        {segments.length === 0 && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "var(--text-muted)" }}>
            Add shots to see the timeline
          </div>
        )}
        {segments.map((seg) => (
          <div
            key={seg.shotId}
            className={`walter-timeline-segment ${seg.shotId === selectedShotId ? "active" : ""}`}
            style={{
              flex: `${seg.fraction} 0 ${Math.max(seg.fraction * 100, 3)}%`,
              background: seg.beatColor,
            }}
            onClick={() => actions.selectShot(seg.shotId)}
            title={`${seg.title} (${seg.beatLabel}) — ${seg.durationSec}s`}
          >
            <span className="walter-timeline-beat-label">{seg.beatLabel}</span>
            {seg.title}
          </div>
        ))}
      </div>
    </div>
  );
}
