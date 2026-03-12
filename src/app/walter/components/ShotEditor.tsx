"use client";

import React from "react";
import { useWalterStore } from "../store";
import type { Shot, ShotType, CameraMove, TransitionType } from "../types";
import { SceneRefiner } from "./SceneRefiner";

const SHOT_TYPES: ShotType[] = [
  "wide", "medium", "close-up", "extreme-close-up", "over-shoulder",
  "pov", "aerial", "low-angle", "dutch-angle", "tracking",
];
const CAMERA_MOVES: CameraMove[] = [
  "static", "pan-left", "pan-right", "tilt-up", "tilt-down",
  "dolly-in", "dolly-out", "crane-up", "crane-down", "orbit",
  "handheld", "steadicam",
];
const TRANSITIONS: TransitionType[] = [
  "cut", "dissolve", "fade-in", "fade-out", "wipe",
  "whip-pan", "match-cut", "j-cut", "l-cut",
];

export function ShotEditor() {
  const { selectedShot, project, actions } = useWalterStore();

  if (!selectedShot) {
    return (
      <aside className="walter-editor">
        <div className="walter-editor-header">Shot Details</div>
        <div className="walter-editor-empty">
          Select a shot to edit its properties.
        </div>
      </aside>
    );
  }

  const beat = project?.beats.find((b) => b.id === selectedShot.beatId);

  function set(key: string, value: string | number) {
    actions.updateShot(selectedShot!.id, { [key]: value } as Partial<Shot>);
  }

  return (
    <aside className="walter-editor">
      <div className="walter-editor-header">
        Shot Details
        {beat && (
          <span style={{ fontWeight: 400, color: "var(--text-muted)", marginLeft: 8 }}>
            ({beat.label})
          </span>
        )}
      </div>
      <div className="walter-editor-body">
        <div className="walter-field">
          <label>Title</label>
          <input
            value={selectedShot.title}
            onChange={(e) => set("title", e.target.value)}
          />
        </div>

        <div className="walter-field">
          <label>Description</label>
          <textarea
            rows={3}
            value={selectedShot.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="What happens in this shot..."
          />
        </div>

        <div className="walter-field-row">
          <div className="walter-field">
            <label>Shot Type</label>
            <select value={selectedShot.shotType} onChange={(e) => set("shotType", e.target.value as ShotType)}>
              {SHOT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="walter-field">
            <label>Camera</label>
            <select value={selectedShot.cameraMove} onChange={(e) => set("cameraMove", e.target.value as CameraMove)}>
              {CAMERA_MOVES.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        <div className="walter-field-row">
          <div className="walter-field">
            <label>Transition</label>
            <select value={selectedShot.transition} onChange={(e) => set("transition", e.target.value as TransitionType)}>
              {TRANSITIONS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="walter-field">
            <label>Duration (sec)</label>
            <input
              type="number"
              min={0.5}
              max={120}
              step={0.5}
              value={selectedShot.durationSec}
              onChange={(e) => set("durationSec", parseFloat(e.target.value) || 1)}
            />
          </div>
        </div>

        <div className="walter-field">
          <label>Dialogue</label>
          <textarea
            rows={2}
            value={selectedShot.dialogue}
            onChange={(e) => set("dialogue", e.target.value)}
            placeholder="Character dialogue for this shot..."
          />
        </div>

        <div className="walter-field">
          <label>Voice Over</label>
          <textarea
            rows={2}
            value={selectedShot.voiceOver}
            onChange={(e) => set("voiceOver", e.target.value)}
            placeholder="Narration / voice-over text..."
          />
        </div>

        <div className="walter-field">
          <label>Audio Note</label>
          <input
            value={selectedShot.audioNote}
            onChange={(e) => set("audioNote", e.target.value)}
            placeholder="Music cue, atmosphere..."
          />
        </div>

        <div className="walter-field">
          <label>SFX Note</label>
          <input
            value={selectedShot.sfxNote}
            onChange={(e) => set("sfxNote", e.target.value)}
            placeholder="Sound effects..."
          />
        </div>

        <div className="walter-field">
          <label>Thumbnail URL</label>
          <input
            value={selectedShot.thumbnailUrl}
            onChange={(e) => set("thumbnailUrl", e.target.value)}
            placeholder="https://..."
          />
        </div>

        <div className="walter-field">
          <label>Move to Beat</label>
          <select
            value={selectedShot.beatId}
            onChange={(e) => set("beatId", e.target.value)}
          >
            {project?.beats
              .sort((a, b) => a.order - b.order)
              .map((b) => (
                <option key={b.id} value={b.id}>{b.label}</option>
              ))}
          </select>
        </div>

        <SceneRefiner />
      </div>
    </aside>
  );
}
