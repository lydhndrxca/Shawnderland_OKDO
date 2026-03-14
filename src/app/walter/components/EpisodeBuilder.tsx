"use client";

import React, { useState, useCallback, useRef } from "react";
import { useWalterStore, walterActions } from "../store";
import { ARC_TEMPLATES } from "../arcTemplates";
import { InteractiveBeatBar } from "./InteractiveBeatBar";
import { generateText } from "@/lib/ideation/engine/conceptlab/imageGenApi";
import { WALTER_CONTEXT } from "../episodePresets";
import { Sparkles, Loader2, ArrowRight } from "lucide-react";

export function EpisodeBuilder() {
  const { project, actions } = useWalterStore();
  const [genOverview, setGenOverview] = useState(false);
  const [genBreakdown, setGenBreakdown] = useState(false);
  const mountedRef = useRef(true);

  const arc = ARC_TEMPLATES.find((t) => t.id === project?.arcTemplateId);

  const handleGenerateOverview = useCallback(async () => {
    if (!project || !arc) return;
    setGenOverview(true);
    try {
      const prompt = `${WALTER_CONTEXT}\n\nYou are writing a story overview for a Walter episode.\n\nProject: "${project.name}"\nDescription: ${project.description || "(none)"}\nArc Template: ${arc.name} — ${arc.description}\nBeats: ${arc.beats.map((b) => b.label).join(", ")}\n\nWrite a compelling 2-3 paragraph story overview that follows this arc structure. Focus on visual storytelling, emotional beats, and the Walter universe tone.\n\nReturn ONLY the story text, no JSON, no markdown.`;
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
  }, [project, arc, actions]);

  const handleGenerateBreakdown = useCallback(async () => {
    if (!project || !arc) return;
    setGenBreakdown(true);
    try {
      const beats = [...project.beats].sort((a, b) => a.order - b.order);
      const beatList = beats.map((b) => `${b.label}`).join(", ");
      const prompt = `${WALTER_CONTEXT}\n\nYou are writing beat-by-beat content for a Walter episode.\n\nProject: "${project.name}"\nStory Overview: ${project.storyOverview || project.description || "(none)"}\nArc: ${arc.name}\nBeats: ${beatList}\n\nFor EACH beat, write 1-2 sentences describing what happens in that beat. Be specific about visual action, character behavior, and emotional tone.\n\nReturn ONLY a JSON array (no markdown):\n[{"beat": "Hook", "content": "Description of what happens..."}]`;
      const raw = await generateText(prompt);
      let parsed: Array<{ beat: string; content: string }>;
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
            actions.updateBeat(match.id, { breakdown: entry.content });
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
  }, [project, arc, actions]);

  const handleRegenerateBeat = useCallback(
    async (beatId: string) => {
      if (!project || !arc) return;
      const beat = project.beats.find((b) => b.id === beatId);
      if (!beat) return;
      actions.updateBeat(beatId, { breakdown: "..." });
      try {
        const prompt = `${WALTER_CONTEXT}\n\nRegenerate the content for the "${beat.label}" beat of a Walter episode.\n\nProject: "${project.name}"\nStory Overview: ${project.storyOverview || "(none)"}\n\nWrite 1-2 sentences describing what happens during the "${beat.label}" beat. Be specific about visual action and emotional tone.\n\nReturn ONLY the text, no JSON, no markdown.`;
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
    [project, arc, actions]
  );

  if (!project) return null;

  const beats = [...project.beats].sort((a, b) => a.order - b.order);

  return (
    <div className="arc-template-selector">
      <div className="arc-header">
        <h2>Episode Builder</h2>
      </div>

      {/* Locked template display */}
      {arc ? (
        <div className="arc-locked-template">
          <div className="arc-locked-name">{arc.name}</div>
          <div className="arc-locked-desc">{arc.description}</div>
        </div>
      ) : (
        <div className="arc-locked-template arc-no-template">
          No arc template selected.
        </div>
      )}

      {/* Story Overview */}
      <div className="story-overview">
        <h3>Story Overview</h3>
        {project.storyOverview ? (
          <p>{project.storyOverview}</p>
        ) : (
          <p style={{ color: "var(--fg-dim)", fontStyle: "italic" }}>
            No story overview yet. Generate one with AI or write your own.
          </p>
        )}
      </div>
      <div className="regen-button-row">
        <button
          className="btn-sm btn-primary"
          onClick={handleGenerateOverview}
          disabled={genOverview}
        >
          {genOverview ? (
            <><Loader2 size={12} className="aw-spinner" /> Generating...</>
          ) : (
            <><Sparkles size={12} /> {project.storyOverview ? "Regenerate Overview" : "Generate Overview"}</>
          )}
        </button>
        <textarea
          className="story-overview-edit"
          rows={3}
          value={project.storyOverview}
          onChange={(e) => actions.updateProjectMeta({ storyOverview: e.target.value })}
          placeholder="Or write your own story overview..."
        />
      </div>

      {/* Interactive Beat Bar */}
      {beats.length > 0 && (
        <InteractiveBeatBar onRegenerateBeat={handleRegenerateBeat} />
      )}

      {/* Beat Breakdown */}
      <div className="beat-breakdown">
        <h3>Beat Breakdown</h3>
        <div className="regen-button-row" style={{ marginBottom: 12 }}>
          <button
            className="btn-sm btn-primary"
            onClick={handleGenerateBreakdown}
            disabled={genBreakdown}
          >
            {genBreakdown ? (
              <><Loader2 size={12} className="aw-spinner" /> Generating...</>
            ) : (
              <><Sparkles size={12} /> {beats.some((b) => b.breakdown) ? "Regenerate All" : "Generate Breakdown"}</>
            )}
          </button>
        </div>
        {beats.map((beat) => (
          <div
            key={beat.id}
            className={`beat-breakdown-row ${beat.breakdown === "..." ? "loading" : ""}`}
          >
            <span className="bb-beat-name" style={{ color: beat.color }}>
              {beat.label}
            </span>
            <div className="bb-beat-content">
              {beat.breakdown && beat.breakdown !== "..." ? (
                <div className="bb-beat-text">{beat.breakdown}</div>
              ) : beat.breakdown === "..." ? (
                <div className="bb-beat-text" style={{ opacity: 0.5 }}>Generating...</div>
              ) : (
                <div className="bb-beat-content bb-placeholder">
                  No content yet — generate or write manually
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Proceed */}
      <div className="arc-proceed-section">
        <button
          className="btn btn-primary"
          onClick={() => walterActions.setActiveTab("storyboard")}
          style={{ maxWidth: 280 }}
        >
          Proceed to Storyboard <ArrowRight size={14} style={{ marginLeft: 4 }} />
        </button>
      </div>
    </div>
  );
}
