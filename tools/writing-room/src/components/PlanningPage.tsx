"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useWritingStore } from "../store";
import { TONE_OPTIONS, WRITING_TYPE_OPTIONS, SCOPE_OPTIONS } from "../types";
import type { ToneMood, PlanningData } from "../types";
import { compileBrief, randomizePlanning, createBriefMessage } from "../agentEngine";
import { getAllPersonas } from "../agents";
import { PersonaBuilder } from "./PersonaBuilder";

const LS_CUSTOM_TONES = "writing-room-custom-tones";
const LS_PLANNING_PRESETS = "writing-room-planning-presets";

interface PlanningPreset {
  name: string;
  data: PlanningData;
  selectedAgents: string[];
  customTones: string[];
  savedAt: number;
}

function loadCustomTones(): string[] {
  try {
    const raw = localStorage.getItem(LS_CUSTOM_TONES);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveCustomTones(tones: string[]) {
  localStorage.setItem(LS_CUSTOM_TONES, JSON.stringify(tones));
}

function loadPresets(): PlanningPreset[] {
  try {
    const raw = localStorage.getItem(LS_PLANNING_PRESETS);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function savePresets(presets: PlanningPreset[]) {
  localStorage.setItem(LS_PLANNING_PRESETS, JSON.stringify(presets));
}

const DEFAULT_AGENT_IDS = [
  "preset-producer",
  "preset-rod-serling",
  "preset-gritty-writer",
  "preset-game-designer",
];

export function PlanningPage() {
  const { session, actions, generating } = useWritingStore();
  const [randomizing, setRandomizing] = useState(false);
  const [customTones, setCustomTones] = useState<string[]>(() => loadCustomTones());
  const [newTone, setNewTone] = useState("");
  const [selectedAgents, setSelectedAgents] = useState<string[]>(DEFAULT_AGENT_IDS);
  const [showPersonaBuilder, setShowPersonaBuilder] = useState(false);
  const [presets, setPresets] = useState<PlanningPreset[]>(() => loadPresets());
  const planning = session?.planning;

  const allPersonas = useMemo(() => getAllPersonas(), []);

  const updateField = useCallback(
    <K extends keyof PlanningData>(key: K, value: PlanningData[K]) => {
      actions.updatePlanning({ [key]: value });
    },
    [actions],
  );

  const toggleTone = useCallback(
    (tone: string) => {
      if (!planning) return;
      const toneId = tone as ToneMood;
      const tones = planning.tones.includes(toneId)
        ? planning.tones.filter((t) => t !== toneId)
        : [...planning.tones, toneId];
      actions.updatePlanning({ tones });
    },
    [actions, planning],
  );

  const handleAddCustomTone = useCallback(() => {
    const t = newTone.trim().toLowerCase();
    if (!t || customTones.includes(t)) return;
    const next = [...customTones, t];
    setCustomTones(next);
    saveCustomTones(next);
    setNewTone("");
  }, [newTone, customTones]);

  const handleRemoveCustomTone = useCallback(
    (tone: string) => {
      const next = customTones.filter((t) => t !== tone);
      setCustomTones(next);
      saveCustomTones(next);
      if (planning?.tones.includes(tone as ToneMood)) {
        actions.updatePlanning({ tones: planning.tones.filter((t) => t !== tone) });
      }
    },
    [customTones, planning, actions],
  );

  const toggleAgent = useCallback(
    (id: string) => {
      setSelectedAgents((prev) =>
        prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
      );
    },
    [],
  );

  const handleSendToRoom = useCallback(() => {
    if (!session || !planning) return;
    const brief = compileBrief(planning);
    actions.setProducerBrief(brief);
    const agents = selectedAgents.map((id) => ({ personaId: id, approved: false }));
    actions.setRoomAgents(agents);
    actions.addChatMessage(createBriefMessage(brief));
    actions.setRoomPhase("briefing");
    actions.setScreen("writing");
    actions.addToast("Brief sent to the writing room", "success");
  }, [session, planning, actions, selectedAgents]);

  const handleRandomize = useCallback(async () => {
    if (!planning) return;
    setRandomizing(true);
    try {
      const filled = await randomizePlanning(planning);
      actions.setFullPlanning(filled);
      actions.addToast("Planning fields randomized", "success");
    } catch (e) {
      actions.addToast("Failed to randomize: " + (e instanceof Error ? e.message : "unknown"), "error");
    } finally {
      setRandomizing(false);
    }
  }, [planning, actions]);

  const handleRandomizeAndSend = useCallback(async () => {
    if (!planning) return;
    setRandomizing(true);
    try {
      const filled = await randomizePlanning(planning);
      actions.setFullPlanning(filled);
      const brief = compileBrief(filled);
      actions.setProducerBrief(brief);
      actions.setRoomAgents(selectedAgents.map((id) => ({ personaId: id, approved: false })));
      actions.addChatMessage(createBriefMessage(brief));
      actions.setRoomPhase("briefing");
      actions.setScreen("writing");
      actions.addToast("Randomized and sent to the writing room", "success");
    } catch (e) {
      actions.addToast("Failed: " + (e instanceof Error ? e.message : "unknown"), "error");
    } finally {
      setRandomizing(false);
    }
  }, [planning, actions, selectedAgents]);

  /* ─── Preset management ───────────────────────────── */
  const handleSavePreset = useCallback(() => {
    if (!planning) return;
    const name = prompt("Preset name:", "My Preset");
    if (!name) return;
    const preset: PlanningPreset = {
      name,
      data: { ...planning },
      selectedAgents: [...selectedAgents],
      customTones: [...customTones],
      savedAt: Date.now(),
    };
    const next = [...presets.filter((p) => p.name !== name), preset];
    setPresets(next);
    savePresets(next);
    actions.addToast(`Preset "${name}" saved`, "success");
  }, [planning, selectedAgents, customTones, presets, actions]);

  const handleLoadPreset = useCallback(
    (preset: PlanningPreset) => {
      actions.setFullPlanning(preset.data);
      setSelectedAgents(preset.selectedAgents);
      if (preset.customTones?.length) {
        setCustomTones(preset.customTones);
        saveCustomTones(preset.customTones);
      }
      actions.addToast(`Preset "${preset.name}" loaded`, "success");
    },
    [actions],
  );

  const handleDeletePreset = useCallback(
    (name: string) => {
      const next = presets.filter((p) => p.name !== name);
      setPresets(next);
      savePresets(next);
    },
    [presets],
  );

  if (!session || !planning) return null;

  const allToneOptions = [
    ...TONE_OPTIONS,
    ...customTones
      .filter((t) => !TONE_OPTIONS.some((o) => o.id === t))
      .map((t) => ({ id: t as ToneMood, label: t.charAt(0).toUpperCase() + t.slice(1) })),
  ];

  return (
    <div className="wr-planning">
      {showPersonaBuilder && (
        <PersonaBuilder onClose={() => setShowPersonaBuilder(false)} />
      )}

      <div className="wr-planning-scroll">
        <h2 className="wr-planning-title">Project Planning</h2>
        <p className="wr-planning-subtitle">
          Set your creative constraints before sending to the writing room.
        </p>

        {/* Preset Bar */}
        <div className="wr-preset-bar">
          <button className="wr-btn wr-btn-secondary wr-btn-sm" onClick={handleSavePreset}>
            Save Preset
          </button>
          {presets.length > 0 && (
            <>
              <select
                className="wr-select"
                style={{ width: "auto", minWidth: 120 }}
                value=""
                onChange={(e) => {
                  const p = presets.find((p) => p.name === e.target.value);
                  if (p) handleLoadPreset(p);
                }}
              >
                <option value="">Load Preset...</option>
                {presets.map((p) => (
                  <option key={p.name} value={p.name}>{p.name}</option>
                ))}
              </select>
              <select
                className="wr-select"
                style={{ width: "auto", minWidth: 100 }}
                value=""
                onChange={(e) => {
                  if (e.target.value && confirm(`Delete preset "${e.target.value}"?`)) {
                    handleDeletePreset(e.target.value);
                  }
                }}
              >
                <option value="">Delete...</option>
                {presets.map((p) => (
                  <option key={p.name} value={p.name}>{p.name}</option>
                ))}
              </select>
            </>
          )}
        </div>

        {/* Writing Type */}
        <section className="wr-field">
          <label className="wr-label">What are you writing?</label>
          <select
            className="wr-select"
            value={planning.writingType}
            onChange={(e) => updateField("writingType", e.target.value as PlanningData["writingType"])}
          >
            <option value="">— Select a type —</option>
            {WRITING_TYPE_OPTIONS.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
          {planning.writingType === "other" && (
            <input
              className="wr-input"
              placeholder="Describe what you're writing..."
              value={planning.writingTypeOther}
              onChange={(e) => updateField("writingTypeOther", e.target.value)}
              style={{ marginTop: 8 }}
            />
          )}
        </section>

        {/* Scope with inline descriptions */}
        <section className="wr-field">
          <label className="wr-label">Scope / Length</label>
          <div className="wr-scope-cards">
            {SCOPE_OPTIONS.map((s) => (
              <button
                key={s.id}
                className={`wr-scope-card ${planning.scopeLength === s.id ? "wr-scope-card--active" : ""}`}
                onClick={() => updateField("scopeLength", s.id)}
              >
                <span className="wr-scope-card-label">{s.label}</span>
                <span className="wr-scope-card-desc">{s.description}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Project Context */}
        <section className="wr-field">
          <label className="wr-label">Project Context</label>
          <textarea
            className="wr-textarea"
            rows={3}
            placeholder="What's the project? Background context, setting, goals..."
            value={planning.projectContext}
            onChange={(e) => updateField("projectContext", e.target.value)}
          />
        </section>

        {/* Target Audience */}
        <section className="wr-field">
          <label className="wr-label">Target Audience</label>
          <input
            className="wr-input"
            placeholder="Who is this for? e.g. gamers ages 18-35, enterprise clients..."
            value={planning.targetAudience}
            onChange={(e) => updateField("targetAudience", e.target.value)}
          />
        </section>

        {/* Tone */}
        <section className="wr-field">
          <label className="wr-label">Tone (select multiple)</label>
          <div className="wr-checkbox-grid">
            {allToneOptions.map((t) => {
              const isCustom = customTones.includes(t.id);
              return (
                <button
                  key={t.id}
                  className={`wr-toggle-btn wr-toggle-btn--sm ${planning.tones.includes(t.id) ? "wr-toggle-btn--active" : ""}`}
                  onClick={() => toggleTone(t.id)}
                >
                  {t.label}
                  {isCustom && (
                    <span
                      className="wr-tone-remove"
                      onClick={(e) => { e.stopPropagation(); handleRemoveCustomTone(t.id); }}
                    >
                      ×
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="wr-custom-tone-row">
            <input
              className="wr-input"
              placeholder="Add custom tone..."
              value={newTone}
              onChange={(e) => setNewTone(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddCustomTone()}
            />
            <button
              className="wr-btn wr-btn-secondary wr-btn-sm"
              onClick={handleAddCustomTone}
              disabled={!newTone.trim()}
            >
              Add
            </button>
          </div>
        </section>

        {/* Hard Rules */}
        <section className="wr-field">
          <label className="wr-label">Hard Rules / Constraints</label>
          <textarea
            className="wr-textarea"
            rows={3}
            placeholder="Things the writing MUST or MUST NOT include..."
            value={planning.hardRules}
            onChange={(e) => updateField("hardRules", e.target.value)}
          />
        </section>

        {/* Reference Material */}
        <section className="wr-field">
          <label className="wr-label">Reference Material</label>
          <textarea
            className="wr-textarea"
            rows={3}
            placeholder="Inspirations, existing documents, URLs, tone references..."
            value={planning.referenceMaterial}
            onChange={(e) => updateField("referenceMaterial", e.target.value)}
          />
        </section>

        {/* Additional Notes */}
        <section className="wr-field">
          <label className="wr-label">Additional Notes</label>
          <textarea
            className="wr-textarea wr-textarea-lg"
            rows={5}
            placeholder="Anything else the writing room should know..."
            value={planning.additionalNotes}
            onChange={(e) => updateField("additionalNotes", e.target.value)}
          />
        </section>

        {/* Agent Selection */}
        <section className="wr-field" style={{ marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--wr-border)" }}>
          <label className="wr-label">Prepare the Writing Room</label>
          <p className="wr-hint">Select which agents will participate in the conversation.</p>
          <div className="wr-agent-grid">
            {allPersonas.map((p) => (
              <button
                key={p.id}
                className={`wr-agent-card ${selectedAgents.includes(p.id) ? "wr-agent-card--active" : ""}`}
                onClick={() => toggleAgent(p.id)}
              >
                <span className="wr-agent-card-avatar">{p.avatar}</span>
                <div className="wr-agent-card-info">
                  <span className="wr-agent-card-name">{p.name}</span>
                  <span className="wr-agent-card-role">{p.role}</span>
                </div>
              </button>
            ))}
          </div>
          <button
            className="wr-btn wr-btn-ghost wr-btn-sm"
            onClick={() => setShowPersonaBuilder(true)}
            style={{ marginTop: 8 }}
          >
            Manage Personas
          </button>
        </section>
      </div>

      {/* Action buttons */}
      <div className="wr-planning-actions">
        <button
          className="wr-btn wr-btn-secondary"
          onClick={handleRandomize}
          disabled={randomizing || generating}
        >
          {randomizing ? "Randomizing..." : "Randomize Blanks"}
        </button>
        <button
          className="wr-btn wr-btn-primary"
          onClick={handleSendToRoom}
          disabled={generating || selectedAgents.length === 0}
        >
          Send to Writing Room →
        </button>
        <button
          className="wr-btn wr-btn-accent"
          onClick={handleRandomizeAndSend}
          disabled={randomizing || generating}
        >
          {randomizing ? "Working..." : "Randomize & Send →"}
        </button>
      </div>
    </div>
  );
}
