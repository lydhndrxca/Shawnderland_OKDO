"use client";

import React, { useState, useCallback, useRef } from "react";
import { useWalterStore, walterActions } from "../store";
import { ARC_TEMPLATES } from "../arcTemplates";
import { InteractiveBeatBar } from "./InteractiveBeatBar";
import { generateText } from "@shawnderland/ai";
import { WALTER_CONTEXT } from "../episodePresets";
import { buildBrainContext } from "../walterBrain";
import {
  Sparkles, Loader2, ArrowRight, Zap, Check, FileText,
  Pen, ChevronDown, ChevronUp, RefreshCw, Film,
} from "lucide-react";

type BuilderStage = 1 | 2 | 3;

function StageIndicator({ current, stage, label, done }: { current: BuilderStage; stage: BuilderStage; label: string; done: boolean }) {
  const active = current === stage;
  const past = current > stage;
  return (
    <div className={`eb-stage-dot ${active ? "active" : ""} ${past || done ? "done" : ""}`}>
      <div className="eb-stage-num">{done || past ? <Check size={12} /> : stage}</div>
      <span className="eb-stage-label">{label}</span>
    </div>
  );
}

export function EpisodeBuilder() {
  const { project, actions } = useWalterStore();
  const [stage, setStage] = useState<BuilderStage>(1);
  const [genOverview, setGenOverview] = useState(false);
  const [genBreakdown, setGenBreakdown] = useState(false);
  const [genShots, setGenShots] = useState(false);
  const [editingOverview, setEditingOverview] = useState(false);
  const [expandedBeat, setExpandedBeat] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const arc = ARC_TEMPLATES.find((t) => t.id === project?.arcTemplateId);
  const brainCtx = buildBrainContext();

  const buildProjectContext = useCallback(() => {
    if (!project) return "";
    const parts = [
      `Project: "${project.name}"`,
      project.tone ? `Tone: ${project.tone}` : "",
      project.description ? `Description: ${project.description}` : "",
      project.steeringPrompt ? `Creator direction: ${project.steeringPrompt}` : "",
      project.selectedPremise ? `Premise: ${project.selectedPremise.premise}` : "",
    ];
    return parts.filter(Boolean).join("\n");
  }, [project]);

  const handleGenerateOverview = useCallback(async () => {
    if (!project || !arc) return;
    setGenOverview(true);
    try {
      const prompt = `${WALTER_CONTEXT}\n\n${brainCtx}\n\n${buildProjectContext()}\nArc Template: ${arc.name} — ${arc.description}\nBeats: ${arc.beats.map((b) => b.label).join(", ")}\n\nWrite a compelling 2-3 paragraph story overview for this episode. Follow the arc structure. Focus on visual storytelling, emotional beats, and the Walter universe tone. Reference canon characters and locations where appropriate.\n\nReturn ONLY the story text, no JSON, no markdown.`;
      const text = await generateText(prompt);
      if (mountedRef.current) {
        actions.updateProjectMeta({ storyOverview: text.trim() });
      }
    } catch (err) {
      walterActions.addToast(
        err instanceof Error ? err.message : "Failed to generate overview",
        "error"
      );
    } finally {
      if (mountedRef.current) setGenOverview(false);
    }
  }, [project, arc, actions, brainCtx, buildProjectContext]);

  const handleGenerateBreakdown = useCallback(async () => {
    if (!project || !arc) return;
    setGenBreakdown(true);
    try {
      const beats = [...project.beats].sort((a, b) => a.order - b.order);
      const beatList = beats.map((b) => `${b.label}`).join(", ");
      const prompt = `${WALTER_CONTEXT}\n\n${brainCtx}\n\n${buildProjectContext()}\nStory Overview: ${project.storyOverview || "(none)"}\nArc: ${arc.name}\nBeats: ${beatList}\n\nFor EACH beat, write 1-2 sentences describing what happens. Be specific about visual action, character behavior, camera work, and emotional tone. Use canon characters and locations.\n\nReturn ONLY a JSON array (no markdown):\n[{"beat": "Hook", "content": "Description...", "storyGoal": "What this beat achieves narratively", "tone": "emotional register"}]`;
      const raw = await generateText(prompt);
      let parsed: Array<{ beat: string; content: string; storyGoal?: string; tone?: string }>;
      try {
        const cleaned = raw.replace(/```json\s*/g, "").replace(/```/g, "").trim();
        parsed = JSON.parse(cleaned);
      } catch {
        throw new Error("Failed to parse beat breakdown");
      }
      if (mountedRef.current) {
        for (const entry of parsed) {
          const match = project.beats.find(
            (b) => b.label.toLowerCase() === entry.beat.toLowerCase()
          );
          if (match) {
            actions.updateBeat(match.id, {
              breakdown: entry.content,
              storyGoal: entry.storyGoal ?? "",
              tone: entry.tone ?? "",
            });
          }
        }
      }
    } catch (err) {
      walterActions.addToast(
        err instanceof Error ? err.message : "Failed to generate breakdown",
        "error"
      );
    } finally {
      if (mountedRef.current) setGenBreakdown(false);
    }
  }, [project, arc, actions, brainCtx, buildProjectContext]);

  const handleExpandShots = useCallback(async () => {
    if (!project || !arc) return;
    setGenShots(true);
    try {
      const beats = [...project.beats].sort((a, b) => a.order - b.order);
      const beatSummary = beats.map((b) => {
        const dur = isFinite(b.endMs) && isFinite(b.startMs) ? Math.round((b.endMs - b.startMs) / 1000) : 7;
        return `"${b.label}" (${dur}s): ${b.breakdown || b.description}`;
      }).join("\n");

      const totalSec = beats.length > 0 && isFinite(beats[beats.length - 1]?.endMs)
        ? Math.round(beats[beats.length - 1].endMs / 1000) : 60;

      const prompt = `${WALTER_CONTEXT}\n\n${brainCtx}\n\n${buildProjectContext()}\nStory Overview: ${project.storyOverview || "(none)"}\n\nBEATS:\n${beatSummary}\n\nExpand each beat into individual shots. For each shot, provide:\n- beat (string): which beat it belongs to\n- title (string): short shot name\n- durationSec (number): shot duration in seconds\n- shotType (string): one of wide, medium, close-up, extreme-close-up, pov, low-angle, tracking, insert\n- cameraMove (string): one of static, pan-left, pan-right, dolly-in, dolly-out, handheld\n- visualDescription (string): what we see\n- narration (string): voiceover or narration text (if any)\n- dialogue (string): character dialogue (if any)\n- audioNote (string): music/sound design cue\n- purpose (string): why this shot exists in the story\n- characters (string[]): characters in this shot\n- location (string): location name\n\nAim for ${project.constraints?.shotDensity === "high" ? "more" : project.constraints?.shotDensity === "low" ? "fewer" : "a moderate number of"} shots. Total runtime should be ~${totalSec}s.\n\nReturn ONLY a JSON array, no markdown.`;

      const raw = await generateText(prompt);
      const cleaned = raw.replace(/```json\s*/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned) as Array<{
        beat: string; title: string; durationSec: number;
        shotType?: string; cameraMove?: string; visualDescription?: string;
        narration?: string; dialogue?: string; audioNote?: string;
        purpose?: string; characters?: string[]; location?: string;
      }>;

      if (mountedRef.current && parsed.length > 0) {
        let order = project.shots.length;
        for (const s of parsed) {
          const matchBeat = project.beats.find(
            (b) => b.label.toLowerCase() === (s.beat ?? "").toLowerCase()
          ) ?? project.beats[0];
          if (!matchBeat) continue;
          const newId = walterActions.addShot(matchBeat.id);
          if (newId) {
            walterActions.updateShot(newId, {
              title: s.title,
              durationSec: s.durationSec ?? 3,
              shotType: (s.shotType as any) ?? "medium",
              cameraMove: (s.cameraMove as any) ?? "static",
              visualDescription: s.visualDescription ?? "",
              narration: s.narration ?? "",
              dialogue: s.dialogue ?? "",
              audioNote: s.audioNote ?? "",
              purpose: s.purpose ?? "",
              characters: s.characters ?? [],
              location: s.location ?? "",
              description: s.visualDescription ?? "",
              order: order++,
            });
          }
        }
        walterActions.addToast(`Generated ${parsed.length} shots`, "success");
      }
    } catch (err) {
      walterActions.addToast(
        err instanceof Error ? err.message : "Failed to expand shots",
        "error"
      );
    } finally {
      if (mountedRef.current) setGenShots(false);
    }
  }, [project, arc, actions, brainCtx, buildProjectContext]);

  const handleRegenerateBeat = useCallback(
    async (beatId: string) => {
      if (!project || !arc) return;
      const beat = project.beats.find((b) => b.id === beatId);
      if (!beat) return;
      actions.updateBeat(beatId, { breakdown: "..." });
      try {
        const prompt = `${WALTER_CONTEXT}\n\n${brainCtx}\n\n${buildProjectContext()}\nStory Overview: ${project.storyOverview || "(none)"}\n\nRegenerate content for the "${beat.label}" beat. Write 1-2 sentences describing what happens. Be specific about visual action and emotional tone.\n\nReturn ONLY the text, no JSON, no markdown.`;
        const text = await generateText(prompt);
        actions.updateBeat(beatId, { breakdown: text.trim() });
      } catch (err) {
        actions.updateBeat(beatId, { breakdown: "" });
        walterActions.addToast(
          err instanceof Error ? err.message : "Failed to regenerate beat",
          "error"
        );
      }
    },
    [project, arc, actions, brainCtx, buildProjectContext]
  );

  if (!project) return null;

  const beats = [...project.beats].sort((a, b) => a.order - b.order);
  const hasOverview = !!project.storyOverview;
  const hasBreakdown = beats.some((b) => b.breakdown && b.breakdown !== "...");
  const hasShots = project.shots.length > 0;
  const totalDuration = project.shots.reduce((s, sh) => s + sh.durationSec, 0);

  return (
    <div className="eb">
      {/* Stage Progress */}
      <div className="eb-stages">
        <button className="eb-stage-btn" onClick={() => setStage(1)}>
          <StageIndicator current={stage} stage={1} label="Story" done={hasOverview} />
        </button>
        <div className="eb-stage-line" />
        <button className="eb-stage-btn" onClick={() => hasOverview && setStage(2)} disabled={!hasOverview}>
          <StageIndicator current={stage} stage={2} label="Beats" done={hasBreakdown} />
        </button>
        <div className="eb-stage-line" />
        <button className="eb-stage-btn" onClick={() => hasBreakdown && setStage(3)} disabled={!hasBreakdown}>
          <StageIndicator current={stage} stage={3} label="Shots" done={hasShots} />
        </button>
      </div>

      {/* ─── Stage 1: Story Overview ─────────────────── */}
      {stage === 1 && (
        <div className="eb-panel">
          <div className="eb-panel-header">
            <div>
              <h2>Story Overview</h2>
              <p className="eb-panel-desc">
                Define the episode premise and narrative direction.
                {arc && <> Using <strong>{arc.name}</strong> structure.</>}
              </p>
            </div>
            {project.tone && (
              <span className="eb-tone-badge">{project.tone}</span>
            )}
          </div>

          {/* Meta strip */}
          {(project.selectedPremise || project.steeringPrompt) && (
            <div className="eb-meta-strip">
              {project.selectedPremise && (
                <div className="eb-meta-item">
                  <span className="eb-meta-label">Concept</span>
                  <span>{project.selectedPremise.title}</span>
                </div>
              )}
              {project.steeringPrompt && (
                <div className="eb-meta-item">
                  <span className="eb-meta-label">Direction</span>
                  <span>{project.steeringPrompt}</span>
                </div>
              )}
            </div>
          )}

          {/* Overview Content */}
          <div className="eb-overview-card">
            {editingOverview ? (
              <textarea
                className="eb-overview-textarea"
                value={project.storyOverview}
                onChange={(e) => actions.updateProjectMeta({ storyOverview: e.target.value })}
                onBlur={() => setEditingOverview(false)}
                rows={6}
                autoFocus
                placeholder="Write your story overview..."
              />
            ) : hasOverview ? (
              <div className="eb-overview-text" onClick={() => setEditingOverview(true)}>
                {project.storyOverview}
                <button className="eb-edit-hint"><Pen size={10} /> edit</button>
              </div>
            ) : (
              <div className="eb-overview-empty">
                <FileText size={28} />
                <p>No story overview yet</p>
                <span>Generate with AI or click to write your own</span>
              </div>
            )}
          </div>

          <div className="eb-action-row">
            <button
              className="eb-action-btn primary"
              onClick={handleGenerateOverview}
              disabled={genOverview}
            >
              {genOverview ? (
                <><Loader2 size={14} className="aw-spinner" /> Generating...</>
              ) : (
                <><Sparkles size={14} /> {hasOverview ? "Regenerate" : "Generate Story"}</>
              )}
            </button>
            {!editingOverview && !hasOverview && (
              <button className="eb-action-btn" onClick={() => setEditingOverview(true)}>
                <Pen size={14} /> Write Manually
              </button>
            )}
            {hasOverview && (
              <button className="eb-action-btn next" onClick={() => setStage(2)}>
                Continue to Beats <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ─── Stage 2: Beat Breakdown ─────────────────── */}
      {stage === 2 && (
        <div className="eb-panel">
          <div className="eb-panel-header">
            <div>
              <h2>Beat Breakdown</h2>
              <p className="eb-panel-desc">
                Define what happens in each story block. {beats.length} beats from{" "}
                <strong>{arc?.name ?? "custom"}</strong> template.
              </p>
            </div>
          </div>

          {/* Visual Beat Bar */}
          {beats.length > 0 && (
            <InteractiveBeatBar onRegenerateBeat={handleRegenerateBeat} />
          )}

          {/* Generate All button */}
          <div className="eb-action-row" style={{ marginBottom: 16 }}>
            <button
              className="eb-action-btn primary"
              onClick={handleGenerateBreakdown}
              disabled={genBreakdown}
            >
              {genBreakdown ? (
                <><Loader2 size={14} className="aw-spinner" /> Generating...</>
              ) : (
                <><Sparkles size={14} /> {hasBreakdown ? "Regenerate All Beats" : "Generate Beat Content"}</>
              )}
            </button>
          </div>

          {/* Beat Cards */}
          <div className="eb-beat-cards">
            {beats.map((beat, i) => {
              const isExpanded = expandedBeat === beat.id;
              const hasContent = beat.breakdown && beat.breakdown !== "...";
              const isLoading = beat.breakdown === "...";
              return (
                <div key={beat.id} className={`eb-beat-card ${isExpanded ? "expanded" : ""} ${isLoading ? "loading" : ""}`}>
                  <button
                    className="eb-beat-card-header"
                    onClick={() => setExpandedBeat(isExpanded ? null : beat.id)}
                  >
                    <span className="eb-beat-color" style={{ background: beat.color || "#64748b" }} />
                    <span className="eb-beat-num">{i + 1}</span>
                    <span className="eb-beat-name">{beat.label}</span>
                    {beat.tone && <span className="eb-beat-tone">{beat.tone}</span>}
                    {hasContent && <Check size={12} className="eb-beat-check" />}
                    {isLoading && <Loader2 size={12} className="aw-spinner" />}
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>

                  {isExpanded && (
                    <div className="eb-beat-card-body">
                      {hasContent ? (
                        <>
                          <p className="eb-beat-text">{beat.breakdown}</p>
                          {beat.storyGoal && (
                            <div className="eb-beat-goal">
                              <span>Goal:</span> {beat.storyGoal}
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="eb-beat-empty">No content yet</p>
                      )}
                      <div className="eb-beat-actions">
                        <button
                          className="btn-sm"
                          onClick={() => handleRegenerateBeat(beat.id)}
                        >
                          <RefreshCw size={10} /> Regenerate
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="eb-action-row" style={{ marginTop: 20 }}>
            <button className="eb-action-btn" onClick={() => setStage(1)}>
              &larr; Back to Story
            </button>
            {hasBreakdown && (
              <button className="eb-action-btn next" onClick={() => setStage(3)}>
                Continue to Shots <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ─── Stage 3: Shot Expansion ─────────────────── */}
      {stage === 3 && (
        <div className="eb-panel">
          <div className="eb-panel-header">
            <div>
              <h2>Shot Expansion</h2>
              <p className="eb-panel-desc">
                Expand beats into individual shots with framing, dialogue, and audio cues.
              </p>
            </div>
            {hasShots && (
              <div className="eb-shot-stat">
                <Film size={14} />
                <strong>{project.shots.length}</strong> shots
                <span>&middot; {Math.round(totalDuration)}s</span>
              </div>
            )}
          </div>

          {!hasShots ? (
            <div className="eb-shots-empty">
              <Zap size={32} />
              <h3>Ready to generate shots</h3>
              <p>AI will create individual shot units from your beat breakdown, including framing suggestions, camera moves, dialogue, narration, and audio cues.</p>
              <button
                className="eb-action-btn primary"
                onClick={handleExpandShots}
                disabled={genShots}
                style={{ maxWidth: 280, margin: "0 auto" }}
              >
                {genShots ? (
                  <><Loader2 size={14} className="aw-spinner" /> Expanding...</>
                ) : (
                  <><Zap size={14} /> Generate Shots</>
                )}
              </button>
            </div>
          ) : (
            <>
              {/* Shot summary by beat */}
              <div className="eb-shot-summary">
                {beats.map((beat) => {
                  const beatShots = project.shots
                    .filter((s) => s.beatId === beat.id)
                    .sort((a, b) => a.order - b.order);
                  if (beatShots.length === 0) return null;
                  return (
                    <div key={beat.id} className="eb-shot-group">
                      <div className="eb-shot-group-header">
                        <span className="eb-beat-color" style={{ background: beat.color || "#64748b" }} />
                        <strong>{beat.label}</strong>
                        <span className="eb-shot-count">{beatShots.length} shots</span>
                      </div>
                      <div className="eb-shot-list">
                        {beatShots.map((shot, si) => (
                          <div key={shot.id} className="eb-shot-row">
                            <span className="eb-shot-num">{si + 1}</span>
                            <span className="eb-shot-title">{shot.title || "Untitled"}</span>
                            <span className="eb-shot-type">{shot.shotType}</span>
                            <span className="eb-shot-dur">{shot.durationSec}s</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="eb-action-row">
                <button
                  className="eb-action-btn"
                  onClick={handleExpandShots}
                  disabled={genShots}
                >
                  {genShots ? (
                    <><Loader2 size={14} className="aw-spinner" /> Regenerating...</>
                  ) : (
                    <><RefreshCw size={14} /> Regenerate All Shots</>
                  )}
                </button>
                <button
                  className="eb-action-btn next"
                  onClick={() => walterActions.setActiveTab("storyboard")}
                >
                  Open Storyboard <ArrowRight size={14} />
                </button>
                <button
                  className="eb-action-btn"
                  onClick={() => walterActions.setActiveTab("timeline")}
                >
                  Open Timeline <ArrowRight size={14} />
                </button>
              </div>
            </>
          )}

          <div className="eb-action-row" style={{ marginTop: 12, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
            <button className="eb-action-btn" onClick={() => setStage(2)}>
              &larr; Back to Beats
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
