"use client";

import React, { useState, useCallback } from "react";
import { walterActions } from "../store";
import { ARC_TEMPLATES } from "../arcTemplates";
import { EPISODE_PRESETS, NARRATIVE_ARC_TEMPLATES, WALTER_CONTEXT } from "../episodePresets";
import { buildBrainContext, getBrain } from "../walterBrain";
import { generateText } from "@shawnderland/ai";
import type {
  WizardStep, ToneMood, EpisodeConstraints, PremiseConcept,
} from "../types";
import {
  Clapperboard, ChevronRight, ChevronLeft, Sparkles,
  Loader2, Check, Clock, Palette, Compass, Sliders, Brain, Wand2,
} from "lucide-react";

const TONE_CHIPS: { id: ToneMood; label: string }[] = [
  { id: "mysterious", label: "Mysterious" },
  { id: "eerie", label: "Eerie" },
  { id: "melancholy", label: "Melancholy" },
  { id: "funny", label: "Funny" },
  { id: "surreal", label: "Surreal" },
  { id: "warm", label: "Warm" },
  { id: "uncanny", label: "Uncanny" },
  { id: "ominous", label: "Ominous" },
  { id: "curious", label: "Curious" },
  { id: "playful", label: "Playful" },
  { id: "bittersweet", label: "Bittersweet" },
  { id: "wistful", label: "Wistful" },
];

const STEPS: { id: WizardStep; label: string; icon: React.ReactNode }[] = [
  { id: "title", label: "Setup", icon: <Clapperboard size={14} /> },
  { id: "tone", label: "Tone", icon: <Palette size={14} /> },
  { id: "arc", label: "Structure", icon: <Compass size={14} /> },
  { id: "steering", label: "Direction", icon: <Sliders size={14} /> },
  { id: "premises", label: "Concepts", icon: <Brain size={14} /> },
  { id: "confirm", label: "Create", icon: <Check size={14} /> },
];

export function EpisodeWizard({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState<WizardStep>("title");
  const [title, setTitle] = useState("");
  const [presetId, setPresetId] = useState("standard-reel");
  const [tone, setTone] = useState<ToneMood | "">("");
  const [arcTemplateId, setArcTemplateId] = useState("three-act");
  const [narrativeArcId, setNarrativeArcId] = useState("");
  const [steeringPrompt, setSteeringPrompt] = useState("");
  const [constraints, setConstraints] = useState<EpisodeConstraints>({
    allowedCharacters: [],
    allowedLocations: [],
    easyToFilm: false,
    shotDensity: "normal",
    narrationHeavy: false,
    dialogueHeavy: false,
  });
  const [premises, setPremises] = useState<PremiseConcept[]>([]);
  const [selectedPremiseId, setSelectedPremiseId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [editingPremise, setEditingPremise] = useState<string | null>(null);

  const stepIdx = STEPS.findIndex((s) => s.id === step);
  const preset = EPISODE_PRESETS.find((p) => p.id === presetId);
  const selectedArc = ARC_TEMPLATES.find((t) => t.id === arcTemplateId);
  const selectedNarrative = NARRATIVE_ARC_TEMPLATES.find((n) => n.id === narrativeArcId);
  const selectedPremise = premises.find((p) => p.id === selectedPremiseId) ?? null;
  const brain = getBrain();

  const canNext = useCallback((): boolean => {
    switch (step) {
      case "title": return presetId !== "";
      case "tone": return tone !== "";
      case "arc": return arcTemplateId !== "";
      case "steering": return true;
      case "premises": return selectedPremiseId !== null || premises.length === 0;
      case "confirm": return true;
      default: return true;
    }
  }, [step, presetId, tone, arcTemplateId, selectedPremiseId, premises.length]);

  function goNext() {
    const idx = stepIdx;
    if (idx < STEPS.length - 1) setStep(STEPS[idx + 1].id);
  }

  function goBack() {
    const idx = stepIdx;
    if (idx > 0) setStep(STEPS[idx - 1].id);
  }

  async function generatePremises() {
    setGenerating(true);
    try {
      const brainCtx = buildBrainContext();
      const narrativeHint = selectedNarrative
        ? `Narrative arc preference: "${selectedNarrative.label}" — ${selectedNarrative.description}`
        : "";
      const constraintHints: string[] = [];
      if (constraints.allowedCharacters.length > 0) constraintHints.push(`Characters: ${constraints.allowedCharacters.join(", ")}`);
      if (constraints.allowedLocations.length > 0) constraintHints.push(`Locations: ${constraints.allowedLocations.join(", ")}`);
      if (constraints.easyToFilm) constraintHints.push("Easy-to-film setup preferred");
      if (constraints.narrationHeavy) constraintHints.push("Narration-heavy style");
      if (constraints.dialogueHeavy) constraintHints.push("Dialogue-heavy style");

      const prompt = `${WALTER_CONTEXT}

${brainCtx}

Generate exactly 4 episode concepts for a new Walter episode.

Runtime: ${preset?.label ?? "Standard Reel"} (${preset?.durationSec ?? 52}s)
Tone/Mood: ${tone || "any"}
${narrativeHint}
${steeringPrompt ? `Creator direction: ${steeringPrompt}` : ""}
${constraintHints.length > 0 ? `Constraints:\n${constraintHints.map(c => `- ${c}`).join("\n")}` : ""}

For each concept, return a JSON array of objects with these fields:
- title (string): episode title
- premise (string): 2-3 sentence premise
- tone (string): specific tone description
- characters (string[]): characters involved
- whyItFitsWalter (string): 1 sentence on why this fits the Walter universe

Return ONLY the JSON array, no markdown fences, no explanation.`;

      const raw = await generateText(prompt);
      const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      const parsed = JSON.parse(cleaned) as Array<{
        title: string;
        premise: string;
        tone: string;
        characters: string[];
        whyItFitsWalter: string;
      }>;

      const concepts: PremiseConcept[] = parsed.map((p, i) => ({
        id: `premise-${Date.now()}-${i}`,
        title: p.title,
        premise: p.premise,
        tone: p.tone,
        characters: p.characters ?? [],
        whyItFitsWalter: p.whyItFitsWalter,
      }));

      setPremises(concepts);
      if (concepts.length > 0) setSelectedPremiseId(concepts[0].id);
    } catch (err) {
      walterActions.addToast("Failed to generate concepts. Check your API key in Settings.", "error");
      console.error("Premise generation error:", err);
    } finally {
      setGenerating(false);
    }
  }

  function handleCreate() {
    const durationMs = (preset?.durationSec ?? 52) * 1000;
    walterActions.createProject(
      title.trim() || selectedPremise?.title || "Untitled Episode",
      arcTemplateId,
      {
        tone: tone as ToneMood,
        runtimePresetId: presetId,
        steeringPrompt,
        constraints,
        selectedPremise: selectedPremise ?? undefined,
        durationMs,
      }
    );
    walterActions.addToast("Episode created", "success");
    onComplete();
  }

  return (
    <div className="wizard">
      {/* Progress bar */}
      <div className="wizard-progress">
        {STEPS.map((s, i) => (
          <button
            key={s.id}
            className={`wizard-step-dot ${i === stepIdx ? "active" : ""} ${i < stepIdx ? "done" : ""}`}
            onClick={() => i <= stepIdx && setStep(s.id)}
            disabled={i > stepIdx}
          >
            <span className="wizard-step-icon">{i < stepIdx ? <Check size={12} /> : s.icon}</span>
            <span className="wizard-step-label">{s.label}</span>
          </button>
        ))}
        <div className="wizard-progress-track">
          <div
            className="wizard-progress-fill"
            style={{ width: `${(stepIdx / (STEPS.length - 1)) * 100}%` }}
          />
        </div>
      </div>

      {/* Step content */}
      <div className="wizard-content">
        {/* ─── Step 1: Title & Preset ──────────────────── */}
        {step === "title" && (
          <div className="wizard-panel">
            <h2>New Episode</h2>
            <p className="wizard-desc">Give your episode a working title and choose a runtime format.</p>

            <label>
              Episode Title (optional)
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Leave blank — AI will suggest titles"
              />
            </label>

            <div className="wizard-presets">
              <label style={{ textTransform: "uppercase", letterSpacing: "0.5px", fontSize: 11, fontWeight: 700, marginBottom: 8 }}>
                Runtime Format
              </label>
              {EPISODE_PRESETS.map((p) => (
                <button
                  key={p.id}
                  className={`wizard-preset-card ${presetId === p.id ? "selected" : ""}`}
                  onClick={() => setPresetId(p.id)}
                >
                  <div className="wizard-preset-header">
                    <Clock size={13} />
                    <strong>{p.label}</strong>
                    <span className="wizard-preset-dur">{p.durationSec}s</span>
                  </div>
                  <span className="wizard-preset-desc">{p.description}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ─── Step 2: Tone ────────────────────────────── */}
        {step === "tone" && (
          <div className="wizard-panel">
            <h2>Tone & Mood</h2>
            <p className="wizard-desc">Choose the emotional register for this episode. This guides AI generation throughout.</p>

            <div className="wizard-tone-grid">
              {TONE_CHIPS.map((t) => (
                <button
                  key={t.id}
                  className={`wizard-tone-chip ${tone === t.id ? "selected" : ""}`}
                  onClick={() => setTone(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {tone && (
              <div className="wizard-tone-selected">
                Selected: <strong>{TONE_CHIPS.find((t) => t.id === tone)?.label}</strong>
              </div>
            )}
          </div>
        )}

        {/* ─── Step 3: Arc Template ────────────────────── */}
        {step === "arc" && (
          <div className="wizard-panel">
            <h2>Story Structure</h2>
            <p className="wizard-desc">Choose a structural arc template and optionally a Walter-specific narrative pattern.</p>

            <div className="wizard-section-label">Arc Template</div>
            <div className="wizard-arc-grid">
              {ARC_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  className={`wizard-arc-card ${arcTemplateId === t.id ? "selected" : ""}`}
                  onClick={() => setArcTemplateId(t.id)}
                >
                  <strong>{t.name}</strong>
                  <span>{t.description}</span>
                  {t.beats.length > 0 && (
                    <div className="wizard-arc-beats">
                      {t.beats.map((b, i) => (
                        <span
                          key={i}
                          className="wizard-arc-beat-tag"
                          style={{ borderColor: b.color, color: b.color }}
                        >
                          {b.label}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>

            <div className="wizard-section-label" style={{ marginTop: 24 }}>
              Narrative Pattern (optional)
            </div>
            <div className="wizard-narrative-list">
              <button
                className={`wizard-narrative-opt ${narrativeArcId === "" ? "selected" : ""}`}
                onClick={() => setNarrativeArcId("")}
              >
                <strong>None</strong>
                <span>Let AI choose the narrative shape</span>
              </button>
              {NARRATIVE_ARC_TEMPLATES.map((n) => (
                <button
                  key={n.id}
                  className={`wizard-narrative-opt ${narrativeArcId === n.id ? "selected" : ""}`}
                  onClick={() => setNarrativeArcId(n.id)}
                >
                  <strong>{n.label}</strong>
                  <span>{n.description}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ─── Step 4: Steering & Constraints ──────────── */}
        {step === "steering" && (
          <div className="wizard-panel">
            <h2>Creative Direction</h2>
            <p className="wizard-desc">Optionally guide the AI with specific instructions or constraints.</p>

            <label>
              Steering Prompt (optional)
              <textarea
                value={steeringPrompt}
                onChange={(e) => setSteeringPrompt(e.target.value)}
                placeholder={'e.g. "use the truck" / "set at night" / "Walter and Rusty only" / "minimal dialogue"'}
                rows={3}
              />
            </label>

            <div className="wizard-section-label">Constraints</div>
            <div className="wizard-constraints">
              <label className="wizard-constraint-row">
                <input
                  type="checkbox"
                  checked={constraints.easyToFilm}
                  onChange={(e) => setConstraints({ ...constraints, easyToFilm: e.target.checked })}
                />
                Easy-to-film mode (simpler setups)
              </label>
              <label className="wizard-constraint-row">
                <input
                  type="checkbox"
                  checked={constraints.narrationHeavy}
                  onChange={(e) => setConstraints({ ...constraints, narrationHeavy: e.target.checked })}
                />
                Narration heavy
              </label>
              <label className="wizard-constraint-row">
                <input
                  type="checkbox"
                  checked={constraints.dialogueHeavy}
                  onChange={(e) => setConstraints({ ...constraints, dialogueHeavy: e.target.checked })}
                />
                Dialogue heavy
              </label>

              <div className="wizard-constraint-row" style={{ marginTop: 8 }}>
                <span className="wizard-constraint-label">Shot Density</span>
                <div className="wizard-density-group">
                  {(["low", "normal", "high"] as const).map((d) => (
                    <button
                      key={d}
                      className={`wizard-density-btn ${constraints.shotDensity === d ? "selected" : ""}`}
                      onClick={() => setConstraints({ ...constraints, shotDensity: d })}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <span className="wizard-constraint-label">Characters (from Brain)</span>
                <div className="wizard-char-chips">
                  {brain.characters.map((c) => (
                    <button
                      key={c.id}
                      className={`wizard-char-chip ${constraints.allowedCharacters.includes(c.name) ? "selected" : ""}`}
                      onClick={() => {
                        const has = constraints.allowedCharacters.includes(c.name);
                        setConstraints({
                          ...constraints,
                          allowedCharacters: has
                            ? constraints.allowedCharacters.filter((n) => n !== c.name)
                            : [...constraints.allowedCharacters, c.name],
                        });
                      }}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <span className="wizard-constraint-label">Locations (from Brain)</span>
                <div className="wizard-char-chips">
                  {brain.locations.map((l) => (
                    <button
                      key={l.id}
                      className={`wizard-char-chip ${constraints.allowedLocations.includes(l.name) ? "selected" : ""}`}
                      onClick={() => {
                        const has = constraints.allowedLocations.includes(l.name);
                        setConstraints({
                          ...constraints,
                          allowedLocations: has
                            ? constraints.allowedLocations.filter((n) => n !== l.name)
                            : [...constraints.allowedLocations, l.name],
                        });
                      }}
                    >
                      {l.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── Step 5: AI Premise Generation ───────────── */}
        {step === "premises" && (
          <div className="wizard-panel">
            <h2>Episode Concepts</h2>
            <p className="wizard-desc">
              AI generates episode concepts based on your choices. Select one to use, or edit it.
            </p>

            {premises.length === 0 && !generating && (
              <div className="wizard-gen-empty">
                <Brain size={32} style={{ color: "var(--accent)", marginBottom: 12 }} />
                <p>Ready to generate concepts using the Walter Brain and your creative direction.</p>
                <button className="btn btn-primary" onClick={generatePremises} style={{ maxWidth: 280 }}>
                  <Wand2 size={14} /> Generate Concepts
                </button>
                <p style={{ marginTop: 16, fontSize: 12, color: "var(--fg-muted)" }}>
                  Or skip this step to create a blank episode.
                </p>
              </div>
            )}

            {generating && (
              <div className="wizard-gen-empty">
                <Loader2 size={28} className="aw-spinner" style={{ color: "var(--accent)", marginBottom: 12 }} />
                <p>Generating episode concepts...</p>
              </div>
            )}

            {premises.length > 0 && !generating && (
              <>
                <div className="wizard-premise-list">
                  {premises.map((p) => (
                    <button
                      key={p.id}
                      className={`wizard-premise-card ${selectedPremiseId === p.id ? "selected" : ""}`}
                      onClick={() => setSelectedPremiseId(p.id)}
                    >
                      <div className="wizard-premise-header">
                        <strong>{p.title}</strong>
                        <span className="wizard-premise-tone">{p.tone}</span>
                      </div>
                      {editingPremise === p.id ? (
                        <textarea
                          className="wizard-premise-edit"
                          value={p.premise}
                          onChange={(e) => {
                            setPremises(premises.map((pr) =>
                              pr.id === p.id ? { ...pr, premise: e.target.value } : pr
                            ));
                          }}
                          onBlur={() => setEditingPremise(null)}
                          rows={3}
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <p
                          className="wizard-premise-text"
                          onDoubleClick={(e) => { e.stopPropagation(); setEditingPremise(p.id); }}
                        >
                          {p.premise}
                        </p>
                      )}
                      <div className="wizard-premise-meta">
                        <span>{p.characters?.join(", ")}</span>
                        <span className="wizard-premise-fit">{p.whyItFitsWalter}</span>
                      </div>
                    </button>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  <button className="btn-sm" onClick={generatePremises}>
                    <Sparkles size={11} /> Regenerate
                  </button>
                  <span style={{ fontSize: 11, color: "var(--fg-muted)", alignSelf: "center" }}>
                    Double-click a premise to edit it
                  </span>
                </div>
              </>
            )}
          </div>
        )}

        {/* ─── Step 6: Confirm & Create ────────────────── */}
        {step === "confirm" && (
          <div className="wizard-panel">
            <h2>Ready to Create</h2>
            <p className="wizard-desc">Review your episode setup before creating.</p>

            <div className="wizard-summary">
              <div className="wizard-summary-row">
                <span className="wizard-summary-label">Title</span>
                <span>{title || selectedPremise?.title || "Untitled Episode"}</span>
              </div>
              <div className="wizard-summary-row">
                <span className="wizard-summary-label">Runtime</span>
                <span>{preset?.label} ({preset?.durationSec}s)</span>
              </div>
              <div className="wizard-summary-row">
                <span className="wizard-summary-label">Tone</span>
                <span style={{ textTransform: "capitalize" }}>{tone || "—"}</span>
              </div>
              <div className="wizard-summary-row">
                <span className="wizard-summary-label">Structure</span>
                <span>{selectedArc?.name}</span>
              </div>
              {selectedNarrative && (
                <div className="wizard-summary-row">
                  <span className="wizard-summary-label">Pattern</span>
                  <span>{selectedNarrative.label}</span>
                </div>
              )}
              {steeringPrompt && (
                <div className="wizard-summary-row">
                  <span className="wizard-summary-label">Direction</span>
                  <span>{steeringPrompt}</span>
                </div>
              )}
              {selectedPremise && (
                <div className="wizard-summary-premise">
                  <strong>{selectedPremise.title}</strong>
                  <p>{selectedPremise.premise}</p>
                </div>
              )}
            </div>

            <button className="btn btn-primary" onClick={handleCreate} style={{ maxWidth: 320, marginTop: 20 }}>
              <Clapperboard size={14} /> Create Episode
            </button>
          </div>
        )}
      </div>

      {/* Navigation footer */}
      <div className="wizard-footer">
        {stepIdx > 0 ? (
          <button className="btn-ghost" onClick={goBack}>
            <ChevronLeft size={14} /> Back
          </button>
        ) : (
          <div />
        )}
        {step !== "confirm" && (
          <button
            className="btn-sm btn-primary"
            onClick={goNext}
            disabled={!canNext()}
          >
            {step === "premises" && premises.length === 0 ? "Skip" : "Next"}
            <ChevronRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
