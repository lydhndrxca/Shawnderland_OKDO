"use client";

import { useCallback, useState } from "react";
import { useWritingStore } from "../store";
import { TONE_OPTIONS, WRITING_TYPE_OPTIONS, SCOPE_OPTIONS } from "../types";
import type { ToneMood, PlanningData } from "../types";
import { compileBrief, randomizePlanning, createBriefMessage } from "../agentEngine";

export function PlanningPage() {
  const { session, actions, generating } = useWritingStore();
  const [randomizing, setRandomizing] = useState(false);
  const planning = session?.planning;

  const updateField = useCallback(
    <K extends keyof PlanningData>(key: K, value: PlanningData[K]) => {
      actions.updatePlanning({ [key]: value });
    },
    [actions],
  );

  const toggleTone = useCallback(
    (tone: ToneMood) => {
      if (!planning) return;
      const tones = planning.tones.includes(tone)
        ? planning.tones.filter((t) => t !== tone)
        : [...planning.tones, tone];
      actions.updatePlanning({ tones });
    },
    [actions, planning],
  );

  const handleSendToRoom = useCallback(() => {
    if (!session || !planning) return;
    const brief = compileBrief(planning);
    actions.setProducerBrief(brief);

    const DEFAULT_AGENT_IDS = [
      "preset-producer",
      "preset-rod-serling",
      "preset-gritty-writer",
      "preset-game-designer",
    ];
    const defaultAgents = DEFAULT_AGENT_IDS.map((id) => ({
      personaId: id,
      approved: false,
    }));
    actions.setRoomAgents(defaultAgents);
    actions.addChatMessage(createBriefMessage(brief));
    actions.setRoomPhase("briefing");
    actions.setScreen("writing");
    actions.addToast("Brief sent to the writing room", "success");
  }, [session, planning, actions]);

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
      const DEFAULT_AGENT_IDS = [
        "preset-producer",
        "preset-rod-serling",
        "preset-gritty-writer",
        "preset-game-designer",
      ];
      actions.setRoomAgents(DEFAULT_AGENT_IDS.map((id) => ({ personaId: id, approved: false })));
      actions.addChatMessage(createBriefMessage(brief));
      actions.setRoomPhase("briefing");
      actions.setScreen("writing");
      actions.addToast("Randomized and sent to the writing room", "success");
    } catch (e) {
      actions.addToast("Failed: " + (e instanceof Error ? e.message : "unknown"), "error");
    } finally {
      setRandomizing(false);
    }
  }, [planning, actions]);

  if (!session || !planning) return null;

  return (
    <div className="wr-planning">
      <div className="wr-planning-scroll">
        <h2 className="wr-planning-title">Project Planning</h2>
        <p className="wr-planning-subtitle">
          Set your creative constraints before sending to the writing room.
        </p>

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

        {/* Scope */}
        <section className="wr-field">
          <label className="wr-label">Scope / Length</label>
          <div className="wr-toggle-row">
            {SCOPE_OPTIONS.map((s) => (
              <button
                key={s.id}
                className={`wr-toggle-btn ${planning.scopeLength === s.id ? "wr-toggle-btn--active" : ""}`}
                onClick={() => updateField("scopeLength", s.id)}
                title={s.description}
              >
                {s.label}
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
            {TONE_OPTIONS.map((t) => (
              <button
                key={t.id}
                className={`wr-toggle-btn wr-toggle-btn--sm ${planning.tones.includes(t.id) ? "wr-toggle-btn--active" : ""}`}
                onClick={() => toggleTone(t.id)}
              >
                {t.label}
              </button>
            ))}
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
          disabled={generating}
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
