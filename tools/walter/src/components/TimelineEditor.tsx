"use client";

import React, { useState, useRef, useCallback } from "react";
import { useWalterStore, walterActions } from "../store";
import { generateText } from "@shawnderland/ai";
import { buildBrainContext } from "../walterBrain";
import { WALTER_CONTEXT } from "../episodePresets";
import {
  Plus, Trash2, Split, Merge, Sparkles, Loader2,
  GripVertical, ChevronRight,
} from "lucide-react";

function fmtMs(ms: number): string {
  const sec = Math.round(ms / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const BLOCK_LIBRARY = [
  { label: "Hook", color: "#ef4444", description: "Grab attention immediately" },
  { label: "Reveal", color: "#8b5cf6", description: "Uncover something unexpected" },
  { label: "Dialogue Beat", color: "#3b82f6", description: "Character conversation" },
  { label: "Surreal Moment", color: "#ec4899", description: "Reality bends" },
  { label: "Reflective Pause", color: "#06b6d4", description: "Quiet contemplation" },
  { label: "Escalation", color: "#f59e0b", description: "Tension ramps up" },
  { label: "Climax", color: "#ef4444", description: "Peak moment" },
  { label: "Ending Tag", color: "#22c55e", description: "Final beat" },
  { label: "Cliffhanger", color: "#a855f7", description: "Unresolved tension" },
];

function beatColor(label: string, fallback: string): string {
  const key = label.toLowerCase();
  const match = BLOCK_LIBRARY.find((b) => key.includes(b.label.toLowerCase()));
  return match?.color ?? fallback;
}

export function TimelineEditor() {
  const { project, selectedShotId, playheadMs, actions } = useWalterStore();
  const [zoom, setZoom] = useState(80);
  const [showLibrary, setShowLibrary] = useState(true);
  const [rewritingBeat, setRewritingBeat] = useState<string | null>(null);
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

  const handleAddBlock = useCallback(
    (label: string, color: string) => {
      if (!project) return;
      const lastBeat = beats[beats.length - 1];
      const startMs = lastBeat ? lastBeat.endMs : 0;
      const endMs = startMs + 5000;
      const beatId = walterActions.addBeat(label);
      if (beatId) {
        walterActions.updateBeat(beatId, { color, startMs, endMs });
        walterActions.addToast(`Added "${label}" block`, "info");
      }
    },
    [project, beats]
  );

  const handleScopedRewrite = useCallback(
    async (beatId: string) => {
      if (!project) return;
      const beat = project.beats.find((b) => b.id === beatId);
      if (!beat) return;
      setRewritingBeat(beatId);
      try {
        const brainCtx = buildBrainContext();
        const beatShots = project.shots
          .filter((s) => s.beatId === beatId)
          .sort((a, b) => a.order - b.order);

        const prompt = `${WALTER_CONTEXT}\n\n${brainCtx}\n\nThe user has edited the "${beat.label}" block (${Math.round((beat.endMs - beat.startMs) / 1000)}s). Rewrite the shots for this block to fit the new duration and maintain narrative continuity.\n\nStory overview: ${project.storyOverview || "(none)"}\n${project.tone ? `Tone: ${project.tone}` : ""}\n\nCurrent shots in this block:\n${beatShots.map((s, i) => `${i + 1}. ${s.title} (${s.durationSec}s): ${s.description || s.visualDescription}`).join("\n")}\n\nRewrite the block breakdown and redistribute shot content. Return JSON:\n{"breakdown": "Updated beat content", "storyGoal": "narrative purpose"}\n\nReturn ONLY the JSON, no markdown.`;

        const raw = await generateText(prompt);
        const cleaned = raw.replace(/```json\s*/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleaned);
        actions.updateBeat(beatId, {
          breakdown: parsed.breakdown ?? beat.breakdown,
          storyGoal: parsed.storyGoal ?? beat.storyGoal,
        });
        walterActions.addToast(`Rewrote "${beat.label}" block`, "success");
      } catch (err) {
        walterActions.addToast("Failed to rewrite block", "error");
      } finally {
        setRewritingBeat(null);
      }
    },
    [project, actions]
  );

  const handleSplitShot = useCallback(
    (shotId: string) => {
      if (!project) return;
      const shot = project.shots.find((s) => s.id === shotId);
      if (!shot || shot.durationSec < 1) return;
      const halfDur = shot.durationSec / 2;
      actions.updateShot(shotId, { durationSec: halfDur, title: shot.title + " (A)" });
      const newId = walterActions.addShot(shot.beatId);
      if (newId) {
        actions.updateShot(newId, {
          title: shot.title.replace(/ \(A\)$/, "") + " (B)",
          durationSec: halfDur,
          description: shot.description,
          visualDescription: shot.visualDescription,
          narration: shot.narration,
        });
      }
      walterActions.addToast("Shot split", "info");
    },
    [project, actions]
  );

  if (!project) return null;

  const selectedShotData = selectedShotId
    ? project.shots.find((s) => s.id === selectedShotId)
    : null;
  const selectedBeat = selectedShotData
    ? project.beats.find((b) => b.id === selectedShotData.beatId)
    : null;

  return (
    <div style={{ display: "flex", gap: 16 }}>
      {/* Block Library Sidebar */}
      {showLibrary && (
        <div className="tl-library">
          <div className="tl-library-header">
            <h3>Block Library</h3>
            <button className="btn-sm" onClick={() => setShowLibrary(false)}>&times;</button>
          </div>
          <div className="tl-library-list">
            {BLOCK_LIBRARY.map((block) => (
              <button
                key={block.label}
                className="tl-library-item"
                onClick={() => handleAddBlock(block.label, block.color)}
              >
                <span className="tl-library-color" style={{ background: block.color }} />
                <div>
                  <strong>{block.label}</strong>
                  <span>{block.description}</span>
                </div>
                <Plus size={12} style={{ marginLeft: "auto", opacity: 0.5 }} />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="timeline-editor" style={{ flex: 1 }}>
        <div className="tl-toolbar">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h2>Timeline</h2>
            {!showLibrary && (
              <button className="btn-sm" onClick={() => setShowLibrary(true)}>
                <Plus size={11} /> Blocks
              </button>
            )}
          </div>
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
                    className="tl-beat-band"
                    style={{
                      left,
                      width,
                      background: `${color}15`,
                      borderLeft: `1px solid ${color}40`,
                    }}
                    onDoubleClick={() => handleScopedRewrite(beat.id)}
                    title="Double-click to AI-rewrite this block"
                  >
                    <span className="beat-band-label" style={{ color: `${color}90` }}>
                      {beat.label}
                      {rewritingBeat === beat.id && (
                        <Loader2 size={8} className="aw-spinner" style={{ marginLeft: 4 }} />
                      )}
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
                return (
                  <div
                    key={shot.id}
                    className={`tl-clip ${shot.id === selectedShotId ? "selected" : ""}`}
                    style={{ left, width }}
                    onClick={() => actions.selectShot(shot.id)}
                  >
                    <span className="tl-clip-label">{shot.title || "Shot"}</span>
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <h3 style={{ margin: 0 }}>Shot Inspector</h3>
              <div style={{ display: "flex", gap: 4 }}>
                <button
                  className="btn-sm"
                  onClick={() => handleSplitShot(selectedShotData.id)}
                  title="Split shot"
                >
                  <Split size={11} /> Split
                </button>
                <button
                  className="btn-sm btn-danger"
                  onClick={() => actions.deleteShot(selectedShotData.id)}
                  title="Delete shot"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            </div>

            <div className="tl-inspector-grid">
              <label>
                Type
                <select
                  value={selectedShotData.shotType}
                  onChange={(e) =>
                    actions.updateShot(selectedShotData.id, { shotType: e.target.value as any })
                  }
                >
                  {["wide", "medium", "close-up", "extreme-close-up", "insert", "reaction", "pov", "tracking", "low-angle", "aerial"].map(
                    (t) => <option key={t} value={t}>{t}</option>
                  )}
                </select>
              </label>
              <label>
                Camera
                <select
                  value={selectedShotData.cameraMove}
                  onChange={(e) =>
                    actions.updateShot(selectedShotData.id, { cameraMove: e.target.value as any })
                  }
                >
                  {["static", "pan-left", "pan-right", "tilt-up", "tilt-down", "dolly-in", "dolly-out", "handheld", "steadicam"].map(
                    (t) => <option key={t} value={t}>{t}</option>
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
                    actions.updateShot(selectedShotData.id, { durationSec: parseFloat(e.target.value) || 1 })
                  }
                />
              </label>
              <label>
                Location
                <input
                  type="text"
                  value={selectedShotData.location}
                  onChange={(e) =>
                    actions.updateShot(selectedShotData.id, { location: e.target.value })
                  }
                  placeholder="Location..."
                />
              </label>
            </div>
            <label>
              Visual Description
              <textarea
                rows={2}
                value={selectedShotData.visualDescription || selectedShotData.description}
                onChange={(e) =>
                  actions.updateShot(selectedShotData.id, {
                    visualDescription: e.target.value,
                    description: e.target.value,
                  })
                }
                placeholder="What we see..."
              />
            </label>
            <label>
              Narration / VO
              <textarea
                rows={2}
                value={selectedShotData.narration || selectedShotData.voiceOver}
                onChange={(e) =>
                  actions.updateShot(selectedShotData.id, { narration: e.target.value, voiceOver: e.target.value })
                }
                placeholder="Narration / VO..."
              />
            </label>
            <label>
              Audio / Sound Design
              <input
                type="text"
                value={selectedShotData.audioNote}
                onChange={(e) =>
                  actions.updateShot(selectedShotData.id, { audioNote: e.target.value })
                }
                placeholder="Music cue, sound effect..."
              />
            </label>
            {selectedBeat && (
              <div className="tl-inspector-scene">
                Block: <strong style={{ color: beatColor(selectedBeat.label, selectedBeat.color) }}>{selectedBeat.label}</strong>
                {selectedShotData.purpose && (
                  <span style={{ marginLeft: 8 }}>&middot; {selectedShotData.purpose}</span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
