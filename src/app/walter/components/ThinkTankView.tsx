"use client";

import React, { useState, useCallback } from "react";
import { useWalterStore, walterActions } from "../store";
import { generateText } from "@/lib/ideation/engine/conceptlab/imageGenApi";
import { WALTER_CONTEXT } from "../episodePresets";
import type { IdeaCard } from "../types";
import { Sparkles, Loader2, Star, Trash2, Zap, BrainCircuit } from "lucide-react";

function uid() {
  return `idea-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function ThinkTankView() {
  const { project, ideas, seedPrompt, actions } = useWalterStore();
  const [loading, setLoading] = useState(false);
  const [perParent, setPerParent] = useState(3);
  const [mode, setMode] = useState<"default" | "blue_sky">("default");

  const handleDiverge = useCallback(async () => {
    if (!seedPrompt.trim()) {
      walterActions.addToast("Enter a seed prompt first", "warning");
      return;
    }
    setLoading(true);
    try {
      const prompt = `${WALTER_CONTEXT}\n\nYou are a creative ideation engine. Mode: ${mode}.\n\nSeed: "${seedPrompt}"\n${project ? `Project: "${project.name}" — ${project.description || ""}` : ""}\n\nGenerate 6-8 distinct creative ideas for short-form video content based on this seed. Each idea should be a unique angle, concept, or approach.\n\n${mode === "blue_sky" ? "Be wildly creative and experimental. Push boundaries." : "Balance creativity with practicality."}\n\nReturn ONLY a JSON array (no markdown):\n[{"text": "Idea description", "operator": "technique_name"}]`;
      const raw = await generateText(prompt);
      const cleaned = raw.replace(/```json\s*/g, "").replace(/```/g, "").trim();
      const parsed: Array<{ text: string; operator: string }> = JSON.parse(cleaned);
      const newIdeas: IdeaCard[] = parsed.map((item) => ({
        id: uid(),
        text: item.text,
        operator: item.operator,
        starred: false,
        stage: "diverge",
      }));
      actions.setIdeas([...ideas, ...newIdeas]);
      walterActions.addToast(`Generated ${newIdeas.length} ideas`, "success");
    } catch (err) {
      walterActions.addToast(
        err instanceof Error ? err.message : "Failed to generate ideas",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }, [seedPrompt, mode, project, ideas, actions]);

  const handleExpand = useCallback(async () => {
    const starred = ideas.filter((i) => i.starred);
    if (starred.length === 0) {
      walterActions.addToast("Star at least one idea to expand", "warning");
      return;
    }
    setLoading(true);
    try {
      const ideaTexts = starred.map((i) => i.text).join("\n- ");
      const prompt = `${WALTER_CONTEXT}\n\nExpand these starred ideas into more detailed concepts.\n\nIdeas:\n- ${ideaTexts}\n\nFor each idea, generate ${perParent} more detailed / refined variations.\n\nReturn ONLY a JSON array (no markdown):\n[{"parentText": "original idea", "text": "expanded version", "operator": "expand"}]`;
      const raw = await generateText(prompt);
      const cleaned = raw.replace(/```json\s*/g, "").replace(/```/g, "").trim();
      const parsed: Array<{ parentText: string; text: string; operator: string }> =
        JSON.parse(cleaned);
      const newIdeas: IdeaCard[] = parsed.map((item) => {
        const parent = starred.find(
          (s) => s.text.toLowerCase().includes(item.parentText?.toLowerCase().slice(0, 20))
        );
        return {
          id: uid(),
          text: item.text,
          operator: item.operator || "expand",
          starred: false,
          stage: "expand",
          parentId: parent?.id,
        };
      });
      actions.setIdeas([...ideas, ...newIdeas]);
      walterActions.addToast(`Expanded ${starred.length} ideas → ${newIdeas.length} new`, "success");
    } catch (err) {
      walterActions.addToast(
        err instanceof Error ? err.message : "Failed to expand",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }, [ideas, perParent, actions]);

  const handleCommit = useCallback(
    (ideaId: string) => {
      const idea = ideas.find((i) => i.id === ideaId);
      if (!idea || !project) return;
      actions.updateProjectMeta({ storyOverview: idea.text });
      walterActions.addToast("Committed idea to story overview", "success");
      walterActions.setActiveTab("episode");
    },
    [ideas, project, actions]
  );

  const starredCount = ideas.filter((i) => i.starred).length;

  return (
    <div className="think-tank-view">
      <h2>
        Ideation
        <span className={`tt-llm-badge active`}>Gemini</span>
      </h2>
      <p className="tt-subtitle">
        Generate and refine ideas using AI-powered divergent thinking.
      </p>

      <div className="tt-mode-toggle">
        <span className="tt-mode-label">Mode:</span>
        <label className={`toggle-option ${mode === "default" ? "active" : ""}`}>
          <input
            type="radio"
            name="mode"
            checked={mode === "default"}
            onChange={() => setMode("default")}
          />
          Default
        </label>
        <label className={`toggle-option ${mode === "blue_sky" ? "active" : ""}`}>
          <input
            type="radio"
            name="mode"
            checked={mode === "blue_sky"}
            onChange={() => setMode("blue_sky")}
          />
          Blue Sky
        </label>
        {mode === "blue_sky" && (
          <span className="tt-mode-hint">Experimental — push boundaries</span>
        )}
      </div>

      <div className="tt-seed-section">
        <textarea
          className="tt-seed-input"
          rows={3}
          value={seedPrompt}
          onChange={(e) => actions.setSeedPrompt(e.target.value)}
          placeholder="Enter a seed prompt… What topic, theme, or concept do you want to explore?"
        />
        <div className="tt-action-row">
          <button className="btn btn-primary" onClick={handleDiverge} disabled={loading} style={{ maxWidth: 200 }}>
            {loading ? (
              <><Loader2 size={14} className="aw-spinner" /> Generating...</>
            ) : (
              <><BrainCircuit size={14} /> Diverge</>
            )}
          </button>
          <div className="tt-expand-controls">
            <button
              className="btn-sm btn-primary"
              onClick={handleExpand}
              disabled={loading || starredCount === 0}
            >
              <Zap size={11} /> Expand ({starredCount} starred)
            </button>
            <label className="tt-per-parent-label">
              Per idea
              <input
                className="tt-per-parent-input"
                type="number"
                min={1}
                max={8}
                value={perParent}
                onChange={(e) => setPerParent(parseInt(e.target.value) || 1)}
              />
            </label>
          </div>
        </div>
      </div>

      {ideas.length > 0 && (
        <>
          <div className="tt-ideas-header">
            <h3>Ideas ({ideas.length})</h3>
            <div className="tt-session-actions">
              <button className="btn-sm" onClick={() => actions.setIdeas([])}>
                Clear All
              </button>
            </div>
          </div>
          <div className="tt-idea-list">
            {ideas.map((idea) => (
              <div
                key={idea.id}
                className={`tt-idea-card ${idea.starred ? "starred" : ""} ${idea.stage === "expand" ? "expanded" : ""}`}
              >
                <div className="tt-card-header">
                  <div className="tt-badge-group">
                    <span className={`tt-operator-badge ${idea.stage === "expand" ? "expand-badge" : ""}`}>
                      {idea.operator}
                    </span>
                    <span className="tt-stage-badge">{idea.stage}</span>
                  </div>
                  <div className="tt-card-actions">
                    <button
                      className={`btn-sm tt-star-btn ${idea.starred ? "active" : ""}`}
                      onClick={() => actions.toggleStarIdea(idea.id)}
                    >
                      <Star size={12} fill={idea.starred ? "currentColor" : "none"} />
                    </button>
                    <button
                      className="btn-sm btn-danger"
                      onClick={() => actions.removeIdea(idea.id)}
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
                {idea.parentId && (
                  <div className="tt-parent-ref">
                    Expanded from starred idea
                  </div>
                )}
                <div className="tt-card-text">{idea.text}</div>
                <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end" }}>
                  <button
                    className="btn-sm btn-primary"
                    onClick={() => handleCommit(idea.id)}
                  >
                    Commit to Episode
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {ideas.length === 0 && (
        <div className="tt-empty">
          <Sparkles size={32} style={{ marginBottom: 8 }} />
          <p>Enter a seed prompt and click Diverge to generate ideas.</p>
        </div>
      )}
    </div>
  );
}
