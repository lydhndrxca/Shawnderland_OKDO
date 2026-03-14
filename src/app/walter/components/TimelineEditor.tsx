"use client";

import React, { useState, useRef, useCallback } from "react";
import { useWalterStore, walterActions } from "../store";

function fmtMs(ms: number): string {
  const sec = Math.round(ms / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const BEAT_COLORS: Record<string, string> = {
  hook: "#ef4444", setup: "#f59e0b", build: "#22c55e",
  twist: "#8b5cf6", payoff: "#3b82f6", loop: "#ec4899",
};

function beatColor(label: string, fallback: string): string {
  const key = label.toLowerCase();
  for (const [k, c] of Object.entries(BEAT_COLORS)) {
    if (key.includes(k)) return c;
  }
  return fallback;
}

export function TimelineEditor() {
  const { project, selectedShotId, playheadMs, actions } = useWalterStore();
  const [zoom, setZoom] = useState(80);
  const [resizing, setResizing] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const beats = project ? [...project.beats].sort((a, b) => a.order - b.order) : [];
  const totalMs = project
    ? Math.max(
        ...beats.map((b) => b.endMs),
        project.shots.reduce((sum, s) => sum + s.durationSec * 1000, 0),
        30000
      )
    : 30000;
  const pxPerMs = zoom / 1000;
  const trackWidth = totalMs * pxPerMs;

  const flatShots = project
    ? beats.flatMap((beat) =>
        project.shots
          .filter((s) => s.beatId === beat.id)
          .sort((a, b) => a.order - b.order)
      )
    : [];

  let offsetMs = 0;
  const shotPositions = flatShots.map((shot) => {
    const start = offsetMs;
    const dur = shot.durationSec * 1000;
    offsetMs += dur;
    return { shot, startMs: start, endMs: start + dur };
  });

  const majorInterval = zoom >= 60 ? 5000 : 10000;
  const ticks: Array<{ ms: number; major: boolean }> = [];
  for (let ms = 0; ms <= totalMs; ms += majorInterval / 5) {
    ticks.push({ ms, major: ms % majorInterval === 0 });
  }

  const handleRulerClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const ms = Math.max(0, Math.round(x / pxPerMs));
      actions.setPlayhead(ms);
    },
    [pxPerMs, actions]
  );

  if (!project) return null;

  const selectedShotData = selectedShotId
    ? project.shots.find((s) => s.id === selectedShotId)
    : null;
  const selectedBeat = selectedShotData
    ? project.beats.find((b) => b.id === selectedShotData.beatId)
    : null;

  return (
    <div className="timeline-editor">
      <div className="tl-toolbar">
        <h2>Timeline</h2>
        <div className="tl-zoom-label">
          <span>Zoom</span>
          <input
            type="range"
            min={20}
            max={200}
            step={5}
            value={zoom}
            onChange={(e) => setZoom(parseInt(e.target.value))}
          />
          <span>{fmtMs(totalMs)}</span>
        </div>
      </div>

      <div className="tl-scroll" ref={scrollRef}>
        {/* Ruler */}
        <div className="tl-ruler" style={{ width: trackWidth }} onClick={handleRulerClick}>
          {ticks.map((tick) => (
            <div
              key={tick.ms}
              className={`tl-tick ${tick.major ? "" : "minor"}`}
              style={{ left: tick.ms * pxPerMs }}
            >
              {tick.major && (
                <span className="tl-tick-label">{fmtMs(tick.ms)}</span>
              )}
            </div>
          ))}
        </div>

        {/* Layers container */}
        <div className="tl-layers" style={{ width: trackWidth, position: "relative" }}>
          {/* Beat Bands */}
          <div className="beat-bands" style={{ position: "absolute", top: 0, left: 0, right: 0, height: "100%" }}>
            {beats.map((beat) => {
              const left = beat.startMs * pxPerMs;
              const width = (beat.endMs - beat.startMs) * pxPerMs;
              const color = beatColor(beat.label, beat.color);
              return (
                <div
                  key={beat.id}
                  style={{
                    position: "absolute",
                    left,
                    width,
                    top: 0,
                    height: "100%",
                    background: `${color}15`,
                    borderLeft: `1px solid ${color}40`,
                  }}
                >
                  <span className="beat-band-label" style={{ color: `${color}80` }}>
                    {beat.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Shot Track */}
          <div className="tl-track" style={{ width: trackWidth }}>
            {shotPositions.map(({ shot, startMs, endMs }) => {
              const left = startMs * pxPerMs;
              const width = (endMs - startMs) * pxPerMs;
              const parentBeat = project.beats.find((b) => b.id === shot.beatId);
              return (
                <div
                  key={shot.id}
                  className={`tl-clip ${shot.id === selectedShotId ? "selected" : ""}`}
                  style={{ left, width }}
                  onClick={() => actions.selectShot(shot.id)}
                >
                  <span className="tl-clip-label">{shot.title || `Shot`}</span>
                  <div className="tl-clip-handle" />
                </div>
              );
            })}
          </div>

          {/* Playhead */}
          <div
            className="tl-playhead"
            style={{ left: playheadMs * pxPerMs, height: "100%" }}
          />
        </div>
      </div>

      {/* Shot Inspector */}
      {selectedShotData && (
        <div className="tl-inspector">
          <h3>Shot Inspector</h3>
          <label>
            Type
            <select
              value={selectedShotData.shotType}
              onChange={(e) =>
                actions.updateShot(selectedShotData.id, {
                  shotType: e.target.value as any,
                })
              }
            >
              {["wide", "medium", "close-up", "insert", "reaction", "pov", "tracking"].map(
                (t) => (
                  <option key={t} value={t}>{t}</option>
                )
              )}
            </select>
          </label>
          <label>
            Duration (sec)
            <input
              type="number"
              min={0.5}
              max={60}
              step={0.5}
              value={selectedShotData.durationSec}
              onChange={(e) =>
                actions.updateShot(selectedShotData.id, {
                  durationSec: parseFloat(e.target.value) || 1,
                })
              }
            />
          </label>
          <label>
            Narration
            <textarea
              rows={2}
              value={selectedShotData.narration || selectedShotData.voiceOver}
              onChange={(e) =>
                actions.updateShot(selectedShotData.id, {
                  narration: e.target.value,
                  voiceOver: e.target.value,
                })
              }
              placeholder="Narration / VO..."
            />
          </label>
          <label>
            On-Screen Text
            <input
              type="text"
              value={selectedShotData.onScreenText}
              onChange={(e) =>
                actions.updateShot(selectedShotData.id, {
                  onScreenText: e.target.value,
                })
              }
            />
          </label>
          {selectedBeat && (
            <div className="tl-inspector-scene">
              Beat: <strong>{selectedBeat.label}</strong>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
