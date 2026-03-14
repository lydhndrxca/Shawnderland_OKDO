"use client";

import React from "react";
import { useWalterStore } from "../store";
import type { Shot, Beat, ShotType, CameraMove } from "../types";
import { Film, ChevronUp, ChevronDown, Trash2, Copy } from "lucide-react";

const SHOT_TYPES: ShotType[] = [
  "wide", "medium", "close-up", "extreme-close-up", "insert",
  "reaction", "pov", "aerial", "low-angle", "tracking",
];

function fmtMs(ms: number): string {
  const sec = Math.round(ms / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}:${s.toString().padStart(2, "0")}` : `0:${s.toString().padStart(2, "0")}`;
}

interface Props {
  shot: Shot;
  index: number;
  beat: Beat;
  selected: boolean;
}

export function ShotCard({ shot, index, beat, selected }: Props) {
  const { actions } = useWalterStore();

  function set(key: string, value: string | number) {
    actions.updateShot(shot.id, { [key]: value } as Partial<Shot>);
  }

  return (
    <div
      className={`shot-card ${selected ? "selected" : ""}`}
      onClick={() => actions.selectShot(shot.id)}
    >
      <div className="shot-card-header">
        <span className="shot-idx">#{index + 1}</span>
        <span className="shot-beat-badge" style={{ background: `${beat.color}22`, color: beat.color }}>
          {beat.label}
        </span>
        <select
          value={shot.shotType}
          onChange={(e) => set("shotType", e.target.value)}
          onClick={(e) => e.stopPropagation()}
        >
          {SHOT_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <input
          className="dur-input"
          type="number"
          min={0.5}
          max={60}
          step={0.5}
          value={shot.durationSec}
          onChange={(e) => set("durationSec", parseFloat(e.target.value) || 1)}
          onClick={(e) => e.stopPropagation()}
        />
        <span className="shot-time">{shot.durationSec}s</span>
      </div>

      <div className="shot-placeholder-img">
        {shot.thumbnailUrl ? (
          <img src={shot.thumbnailUrl} alt={shot.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <Film size={24} style={{ color: "var(--fg-dim)" }} />
        )}
      </div>

      <textarea
        rows={2}
        value={shot.visualDescription || shot.description}
        onChange={(e) => {
          set("visualDescription", e.target.value);
          set("description", e.target.value);
        }}
        placeholder="Visual description..."
        onClick={(e) => e.stopPropagation()}
      />
      <textarea
        rows={1}
        value={shot.narration || shot.voiceOver}
        onChange={(e) => {
          set("narration", e.target.value);
          set("voiceOver", e.target.value);
        }}
        placeholder="Narration / VO..."
        onClick={(e) => e.stopPropagation()}
      />
      <input
        type="text"
        value={shot.onScreenText}
        onChange={(e) => set("onScreenText", e.target.value)}
        placeholder="On-screen text..."
        onClick={(e) => e.stopPropagation()}
      />
      <input
        type="text"
        value={shot.soundNotes || shot.sfxNote}
        onChange={(e) => {
          set("soundNotes", e.target.value);
          set("sfxNote", e.target.value);
        }}
        placeholder="Sound / SFX notes..."
        onClick={(e) => e.stopPropagation()}
      />

      <div className="shot-card-actions">
        <button
          className="btn-sm"
          onClick={(e) => { e.stopPropagation(); actions.duplicateShot(shot.id); }}
          title="Duplicate"
        >
          <Copy size={11} />
        </button>
        <button
          className="btn-sm btn-danger"
          onClick={(e) => { e.stopPropagation(); actions.deleteShot(shot.id); }}
          title="Delete"
        >
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  );
}
