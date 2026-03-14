"use client";

import React, { useState, useRef } from "react";
import { refineScene, type EpisodeConcept, type DetailedScene } from "../aiWriter";
import { useWalterStore } from "../store";
import { Sparkles, Loader2 } from "lucide-react";

export function SceneRefiner() {
  const { project, selectedShot, actions } = useWalterStore();
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  if (!project || !selectedShot) return null;

  const descParts = (project.description ?? "").split("\n");
  const logline = descParts[0] ?? project.name;
  const concept: EpisodeConcept = {
    title: project.name,
    logline,
    emotionalHook: "",
    keyTwist: "",
    visualStyle: "",
  };

  const beats = [...project.beats].sort((a, b) => a.order - b.order);
  const allShots = beats.flatMap((beat) =>
    project.shots
      .filter((s) => s.beatId === beat.id)
      .sort((a, b) => a.order - b.order)
      .map((s) => {
        const b = project.beats.find((bb) => bb.id === s.beatId);
        return {
          beatLabel: b?.label ?? "",
          beatColor: b?.color ?? "#64748b",
          title: s.title,
          description: s.description,
          durationSec: s.durationSec,
          shotType: s.shotType,
          cameraMove: s.cameraMove,
          transition: s.transition,
          dialogue: s.dialogue,
          voiceOver: s.voiceOver,
          audioNote: s.audioNote,
          sfxNote: s.sfxNote,
        } satisfies DetailedScene;
      })
  );

  const sceneIndex = allShots.findIndex(
    (s) => s.title === selectedShot.title && s.description === selectedShot.description
  );

  async function handleRefine() {
    if (!note.trim() || sceneIndex < 0) return;
    setLoading(true);
    setError(null);
    mountedRef.current = true;

    try {
      const updated = await refineScene(concept, allShots, sceneIndex, note.trim());
      if (!mountedRef.current) return;

      actions.updateShot(selectedShot!.id, {
        title: updated.title,
        description: updated.description,
        durationSec: updated.durationSec,
        shotType: updated.shotType as import("../types").ShotType,
        cameraMove: updated.cameraMove as import("../types").CameraMove,
        transition: updated.transition as import("../types").TransitionType,
        dialogue: updated.dialogue,
        voiceOver: updated.voiceOver,
        audioNote: updated.audioNote,
        sfxNote: updated.sfxNote,
      });
      setNote("");
    } catch (err: unknown) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : "Rework failed");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }

  return (
    <div className="aw-refiner">
      <div className="aw-refiner-header">
        <Sparkles size={11} style={{ color: "var(--color-tool-walter)" }} />
        <span>AI Rework</span>
      </div>
      <textarea
        className="aw-refiner-input"
        rows={2}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="e.g. 'Make this more dramatic' or 'What if Walter slips here?'"
        disabled={loading}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleRefine();
          }
        }}
      />
      {error && <div className="aw-refiner-error">{error}</div>}
      <button
        className="walter-topbar-btn primary"
        style={{ width: "100%", fontSize: 11, padding: "5px 0" }}
        onClick={handleRefine}
        disabled={loading || !note.trim()}
      >
        {loading ? (
          <><Loader2 size={12} className="aw-spinner" /> Reworking...</>
        ) : (
          <><Sparkles size={12} /> Rework Scene</>
        )}
      </button>
    </div>
  );
}
