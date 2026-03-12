"use client";

import React, { useState, useRef, useCallback } from "react";
import { EPISODE_PRESETS, type EpisodePreset } from "../episodePresets";
import { ARC_TEMPLATES } from "../arcTemplates";
import type { ArcTemplate } from "../types";
import {
  ideate,
  critique,
  breakdown,
  detailScenes,
  type EpisodeConcept,
  type ScoredConcept,
  type DetailedScene,
} from "../aiWriter";
import { walterActions } from "../store";
import { ConceptCard } from "./ConceptCard";
import { Sparkles, ArrowLeft, ArrowRight, Loader2, Check } from "lucide-react";

type Step = "input" | "ideating" | "concepts" | "generating" | "done";

interface Props {
  onClose: () => void;
  onProjectCreated: () => void;
}

export function AIWriterPanel({ onClose, onProjectCreated }: Props) {
  const [step, setStep] = useState<Step>("input");
  const [idea, setIdea] = useState("");
  const [presetId, setPresetId] = useState(EPISODE_PRESETS[2].id);
  const [arcId, setArcId] = useState(ARC_TEMPLATES[0].id);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState("");

  const [concepts, setConcepts] = useState<ScoredConcept[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const cancelledRef = useRef(false);

  const preset = EPISODE_PRESETS.find((p) => p.id === presetId)!;
  const arc = ARC_TEMPLATES.find((a) => a.id === arcId)!;

  const handleGenerate = useCallback(async () => {
    if (!idea.trim()) return;
    cancelledRef.current = false;
    setError(null);
    setStep("ideating");
    setProgress("Brainstorming episode concepts...");

    try {
      const rawConcepts = await ideate(idea.trim(), preset, arc);
      if (cancelledRef.current) return;

      setProgress("Evaluating concepts...");
      const scored = await critique(rawConcepts, preset);
      if (cancelledRef.current) return;

      setConcepts(scored);
      const recIdx = scored.findIndex((c) => c.recommended);
      setSelectedIdx(recIdx >= 0 ? recIdx : 0);
      setStep("concepts");
    } catch (err: unknown) {
      if (cancelledRef.current) return;
      setError(err instanceof Error ? err.message : "Failed to generate concepts");
      setStep("input");
    }
  }, [idea, preset, arc]);

  const handleBuildStoryboard = useCallback(async () => {
    if (selectedIdx === null || !concepts[selectedIdx]) return;
    cancelledRef.current = false;
    setError(null);
    setStep("generating");

    const chosen = concepts[selectedIdx];
    try {
      setProgress("Breaking down into scenes...");
      const scenes = await breakdown(chosen, preset, arc);
      if (cancelledRef.current) return;

      setProgress("Detailing shots and audio...");
      const detailed = await detailScenes(chosen, scenes, preset);
      if (cancelledRef.current) return;

      setProgress("Building storyboard...");

      const beatMap = new Map<string, number>();
      const beatEntries: Array<{ label: string; description: string; color: string }> = [];
      for (const scene of detailed) {
        if (!beatMap.has(scene.beatLabel)) {
          beatMap.set(scene.beatLabel, beatEntries.length);
          beatEntries.push({
            label: scene.beatLabel,
            description: "",
            color: scene.beatColor || "#64748b",
          });
        }
      }

      const shotEntries = detailed.map((scene) => ({
        beatIndex: beatMap.get(scene.beatLabel) ?? 0,
        title: scene.title,
        description: scene.description,
        durationSec: scene.durationSec,
        shotType: scene.shotType,
        cameraMove: scene.cameraMove,
        transition: scene.transition,
        dialogue: scene.dialogue,
        voiceOver: scene.voiceOver,
        audioNote: scene.audioNote,
        sfxNote: scene.sfxNote,
      }));

      walterActions.createProjectFromStructure({
        name: chosen.title,
        description: `${chosen.logline}\n\nHook: ${chosen.emotionalHook}\nTwist: ${chosen.keyTwist}`,
        arcTemplateId: arc.id,
        aspectRatio: "9:16",
        beats: beatEntries,
        shots: shotEntries,
      });

      setStep("done");
      setTimeout(() => onProjectCreated(), 600);
    } catch (err: unknown) {
      if (cancelledRef.current) return;
      setError(err instanceof Error ? err.message : "Failed to generate storyboard");
      setStep("concepts");
    }
  }, [selectedIdx, concepts, preset, arc, onProjectCreated]);

  const handleCancel = () => {
    cancelledRef.current = true;
    setStep("input");
    setProgress("");
  };

  return (
    <div className="aw-panel">
      <div className="aw-panel-header">
        <Sparkles size={16} style={{ color: "var(--color-tool-walter)" }} />
        <span className="aw-panel-title">AI Episode Generator</span>
        <div style={{ flex: 1 }} />
        {(step === "ideating" || step === "generating") && (
          <button className="walter-topbar-btn" onClick={handleCancel}>Cancel</button>
        )}
        <button className="walter-topbar-btn" onClick={onClose}>Close</button>
      </div>

      {/* Step indicators */}
      <div className="aw-steps">
        {(["input", "concepts", "generating", "done"] as const).map((s, i) => {
          const labels = ["Idea", "Concepts", "Build", "Done"];
          const isCurrent = step === s || (step === "ideating" && s === "input");
          const isDone =
            (s === "input" && step !== "input" && step !== "ideating") ||
            (s === "concepts" && (step === "generating" || step === "done")) ||
            (s === "generating" && step === "done");
          return (
            <div key={s} className={`aw-step ${isCurrent ? "current" : ""} ${isDone ? "done" : ""}`}>
              <div className="aw-step-dot">
                {isDone ? <Check size={10} /> : i + 1}
              </div>
              <span>{labels[i]}</span>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="aw-error">{error}</div>
      )}

      <div className="aw-body">
        {/* ── STEP: INPUT ── */}
        {step === "input" && (
          <div className="aw-input-step">
            <div className="walter-field">
              <label>Episode Idea</label>
              <textarea
                rows={4}
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                placeholder="What's the episode about? e.g. 'Walter tries to bake a cake for his neighbor but everything in the kitchen has other plans...'"
                autoFocus
              />
            </div>
            <div className="aw-input-row">
              <div className="walter-field" style={{ flex: 1 }}>
                <label>Episode Length</label>
                <select value={presetId} onChange={(e) => setPresetId(e.target.value)}>
                  {EPISODE_PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label} — {p.description}
                    </option>
                  ))}
                </select>
              </div>
              <div className="walter-field" style={{ flex: 1 }}>
                <label>Story Arc</label>
                <select value={arcId} onChange={(e) => setArcId(e.target.value)}>
                  {ARC_TEMPLATES.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.beats.length} beats)
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <button
              className="walter-topbar-btn primary aw-generate-btn"
              onClick={handleGenerate}
              disabled={!idea.trim()}
            >
              <Sparkles size={14} />
              Generate Concepts
            </button>
          </div>
        )}

        {/* ── STEP: IDEATING (loading) ── */}
        {step === "ideating" && (
          <div className="aw-loading">
            <Loader2 size={32} className="aw-spinner" />
            <p>{progress}</p>
            <p className="aw-loading-sub">Applying divergent thinking to explore multiple angles...</p>
          </div>
        )}

        {/* ── STEP: CONCEPTS ── */}
        {step === "concepts" && (
          <div className="aw-concepts-step">
            <p className="aw-concepts-hint">
              Select a concept to build into a full storyboard. Scores reflect
              Instagram Reel potential for a {preset.label} ({preset.durationSec}s).
            </p>
            <div className="aw-concepts-grid">
              {concepts.map((c, i) => (
                <ConceptCard
                  key={i}
                  concept={c}
                  index={i}
                  selected={selectedIdx === i}
                  onSelect={() => setSelectedIdx(i)}
                />
              ))}
            </div>
            <div className="aw-concepts-actions">
              <button className="walter-topbar-btn" onClick={() => setStep("input")}>
                <ArrowLeft size={12} /> Back
              </button>
              <button
                className="walter-topbar-btn primary"
                disabled={selectedIdx === null}
                onClick={handleBuildStoryboard}
              >
                Build Storyboard <ArrowRight size={12} />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP: GENERATING ── */}
        {step === "generating" && (
          <div className="aw-loading">
            <Loader2 size={32} className="aw-spinner" />
            <p>{progress}</p>
            <p className="aw-loading-sub">
              Breaking &ldquo;{concepts[selectedIdx!]?.title}&rdquo; into timed scenes with shot details...
            </p>
          </div>
        )}

        {/* ── STEP: DONE ── */}
        {step === "done" && (
          <div className="aw-loading">
            <Check size={32} style={{ color: "#22c55e" }} />
            <p>Storyboard created!</p>
            <p className="aw-loading-sub">Opening the editor...</p>
          </div>
        )}
      </div>
    </div>
  );
}
