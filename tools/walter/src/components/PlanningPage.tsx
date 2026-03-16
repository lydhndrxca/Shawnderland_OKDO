"use client";

import { useCallback, useState } from "react";
import { useWalterStore } from "../store";
import { EPISODE_PRESETS } from "../episodePresets";
import { TONE_OPTIONS, SEASON_OPTIONS } from "../types";
import type { SeasonalMode, PlanningData, Season } from "../types";
import { getBrain } from "../walterBrain";
import { compileBrief, randomizePlanning, createBriefMessage } from "../agentEngine";


const SEASONAL_MODES: { id: SeasonalMode; label: string }[] = [
  { id: "none", label: "None" },
  { id: "date", label: "Specific Date" },
  { id: "holiday", label: "Holiday" },
  { id: "national-day", label: "National Day" },
  { id: "historical", label: "This Day in History" },
];

export function PlanningPage() {
  const { session, actions, generating } = useWalterStore();
  const [randomizing, setRandomizing] = useState(false);

  const brain = getBrain();
  const planning = session?.planning;

  const updateField = useCallback(
    <K extends keyof PlanningData>(key: K, value: PlanningData[K]) => {
      actions.updatePlanning({ [key]: value });
    },
    [actions],
  );

  const toggleLocation = useCallback(
    (locName: string) => {
      if (!planning) return;
      const locs = planning.locations.includes(locName)
        ? planning.locations.filter((l) => l !== locName)
        : [...planning.locations, locName];
      actions.updatePlanning({ locations: locs });
    },
    [actions, planning],
  );

  const handleSendToProducer = useCallback(() => {
    if (!session || !planning) return;
    const brief = compileBrief(planning);
    actions.setProducerBrief(brief);

    const DEFAULT_AGENT_IDS = [
      "preset-producer",
      "preset-rod-serling",
      "preset-rod-serling-director",
      "preset-cinematographer",
    ];
    const defaultAgents = DEFAULT_AGENT_IDS.map((id) => ({
      personaId: id,
      approved: false,
    }));
    actions.setRoomAgents(defaultAgents);

    actions.addChatMessage(createBriefMessage(brief));
    actions.setRoomPhase("briefing");
    actions.setScreen("writing");
    actions.addToast("Brief sent to producer — Writing Room ready", "success");
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
        "preset-rod-serling-director",
        "preset-cinematographer",
      ];
      const defaultAgents = DEFAULT_AGENT_IDS.map((id) => ({
        personaId: id,
        approved: false,
      }));
      actions.setRoomAgents(defaultAgents);
      actions.addChatMessage(createBriefMessage(brief));
      actions.setRoomPhase("briefing");
      actions.setScreen("writing");
      actions.addToast("Randomized and sent to producer", "success");
    } catch (e) {
      actions.addToast("Failed: " + (e instanceof Error ? e.message : "unknown"), "error");
    } finally {
      setRandomizing(false);
    }
  }, [planning, actions]);

  if (!session || !planning) return null;

  return (
    <div className="ws-planning">
      <div className="ws-planning-scroll">
        <h2 className="ws-planning-title">Episode Planning</h2>
        <p className="ws-planning-subtitle">
          Set your creative constraints before sending to the writing room.
        </p>

        {/* Episode Length */}
        <section className="ws-field">
          <label className="ws-label">Episode Length</label>
          <select
            className="ws-select"
            value={planning.episodeLength}
            onChange={(e) => updateField("episodeLength", e.target.value)}
          >
            {EPISODE_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label} — {p.description}
              </option>
            ))}
          </select>
        </section>

        {/* Mood / Vibe */}
        <section className="ws-field">
          <label className="ws-label">Mood / Vibe</label>
          <select
            className="ws-select"
            value={planning.mood}
            onChange={(e) => updateField("mood", e.target.value as PlanningData["mood"])}
          >
            <option value="">— Let the writers decide —</option>
            {TONE_OPTIONS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </section>

        {/* Seasonal / Date-Based */}
        <section className="ws-field">
          <label className="ws-label">Seasonal / Date-Based</label>
          <div className="ws-toggle-row">
            {SEASONAL_MODES.map((m) => (
              <button
                key={m.id}
                className={`ws-toggle-btn ${planning.seasonalMode === m.id ? "ws-toggle-btn--active" : ""}`}
                onClick={() => updateField("seasonalMode", m.id)}
              >
                {m.label}
              </button>
            ))}
          </div>
          {planning.seasonalMode === "date" && (
            <input
              type="date"
              className="ws-input"
              value={planning.releaseDate}
              onChange={(e) => updateField("releaseDate", e.target.value)}
              style={{ marginTop: 8 }}
            />
          )}
          {planning.seasonalMode !== "none" && (
            <input
              className="ws-input"
              placeholder={
                planning.seasonalMode === "holiday"
                  ? "e.g. Halloween, Christmas, Valentine's Day"
                  : planning.seasonalMode === "national-day"
                    ? "e.g. National Candy Bar Day, Teacher Appreciation Day"
                    : planning.seasonalMode === "historical"
                      ? "e.g. something that happened on this date"
                      : "Theme or context"
              }
              value={planning.seasonalTheme}
              onChange={(e) => updateField("seasonalTheme", e.target.value)}
              style={{ marginTop: 8 }}
            />
          )}
        </section>

        {/* Character Focus */}
        <section className="ws-field">
          <label className="ws-label">Character Focus</label>
          <p className="ws-hint">
            Canon characters: {brain.characters.map((c) => c.name).join(", ")}
          </p>
          <textarea
            className="ws-textarea"
            rows={2}
            placeholder="Type character names to focus on (or leave blank for writers to decide)"
            value={planning.characterFocus}
            onChange={(e) => updateField("characterFocus", e.target.value)}
          />
        </section>

        {/* Unique Story Elements */}
        <section className="ws-field">
          <label className="ws-label">Unique Story Elements / Props</label>
          <textarea
            className="ws-textarea"
            rows={3}
            placeholder="A mysterious package, a new garden ornament, a strange sound at night..."
            value={planning.uniqueElements}
            onChange={(e) => updateField("uniqueElements", e.target.value)}
          />
        </section>

        {/* Locations */}
        <section className="ws-field">
          <label className="ws-label">Locations / Settings</label>
          <div className="ws-checkbox-grid">
            {brain.locations.map((loc) => (
              <label key={loc.id} className="ws-checkbox-label">
                <input
                  type="checkbox"
                  checked={planning.locations.includes(loc.name)}
                  onChange={() => toggleLocation(loc.name)}
                />
                {loc.name}
              </label>
            ))}
          </div>
          <input
            className="ws-input"
            placeholder="Other location (describe new setting)"
            value={planning.customLocation}
            onChange={(e) => updateField("customLocation", e.target.value)}
            style={{ marginTop: 8 }}
          />
        </section>

        {/* Time of Day */}
        <section className="ws-field">
          <label className="ws-label">Time of Day</label>
          <select
            className="ws-select"
            value={planning.timeOfDay}
            onChange={(e) =>
              updateField("timeOfDay", e.target.value as PlanningData["timeOfDay"])
            }
          >
            <option value="">— Let the writers decide —</option>
            <option value="day">Day</option>
            <option value="night">Night</option>
          </select>
        </section>

        {/* Season */}
        <section className="ws-field">
          <label className="ws-label">Season</label>
          <select
            className="ws-select"
            value={planning.season}
            onChange={(e) => updateField("season", e.target.value as Season)}
          >
            {SEASON_OPTIONS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.id ? `${s.label} — ${s.description}` : `— ${s.description} —`}
              </option>
            ))}
          </select>
        </section>

        {/* Final Notes */}
        <section className="ws-field">
          <label className="ws-label">Final Notes</label>
          <textarea
            className="ws-textarea ws-textarea-lg"
            rows={5}
            placeholder="Story ideas, extra instructions, anything you want the team to know..."
            value={planning.finalNotes}
            onChange={(e) => updateField("finalNotes", e.target.value)}
          />
        </section>
      </div>

      {/* Action buttons */}
      <div className="ws-planning-actions">
        <button
          className="ws-btn ws-btn-secondary"
          onClick={handleRandomize}
          disabled={randomizing || generating}
        >
          {randomizing ? "Randomizing..." : "Randomize Blanks"}
        </button>
        <button
          className="ws-btn ws-btn-primary"
          onClick={handleSendToProducer}
          disabled={generating}
        >
          Send to Producer →
        </button>
        <button
          className="ws-btn ws-btn-accent"
          onClick={handleRandomizeAndSend}
          disabled={randomizing || generating}
        >
          {randomizing ? "Working..." : "Randomize & Send →"}
        </button>
      </div>
    </div>
  );
}
