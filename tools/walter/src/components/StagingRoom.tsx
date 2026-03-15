"use client";

import { useCallback, useState } from "react";
import { useWalterStore } from "../store";
import type { StagingShot } from "../types";
import { createUserMessage, createSystemMessage } from "../agentEngine";

export function StagingRoom() {
  const { session, actions, generating } = useWalterStore();
  const [selectedShotId, setSelectedShotId] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [scopeNarrow, setScopeNarrow] = useState(true);

  const selectedShot = session?.shots.find((s) => s.id === selectedShotId) ?? null;

  const handleShotFieldChange = useCallback(
    (shotId: string, field: keyof StagingShot, value: string | string[]) => {
      actions.updateShot(shotId, { [field]: value } as Partial<StagingShot>);
    },
    [actions],
  );

  const handleSendFeedback = useCallback(() => {
    if (!feedbackText.trim() || !selectedShot || !session) return;

    const scopeNote = scopeNarrow
      ? " [SCOPE: Only affect this scene — do not change anything else.]"
      : " [SCOPE: May adjust surrounding scenes to fit this change.]";

    const msg = `Feedback on Shot "${selectedShot.description.slice(0, 50)}...":

${feedbackText}${scopeNote}`;

    actions.addChatMessage(createUserMessage(msg, selectedShot.id));
    actions.addChatMessage(
      createSystemMessage(
        `Feedback sent to the writing room regarding shot #${selectedShot.order + 1}. Switch to the Writing Room to discuss.`,
      ),
    );
    setFeedbackText("");
    actions.addToast("Feedback sent to writing room", "info");
  }, [feedbackText, selectedShot, session, scopeNarrow, actions]);

  const handleExportOneSheet = useCallback(() => {
    if (!session) return;
    const sortedShots = [...session.shots].sort((a, b) => a.order - b.order);
    const allLocations = [...new Set(sortedShots.map((s) => s.location).filter(Boolean))];
    const allCharacters = [...new Set(sortedShots.flatMap((s) => s.characters))];
    const totalDuration = sortedShots.reduce((sum, s) => sum + s.durationSec, 0);

    const lines: string[] = [];
    lines.push("═══════════════════════════════════════════════════════════");
    lines.push(`  WEEPING WILLOWS WALTER — PRODUCTION ONE-SHEET`);
    lines.push(`  "${session.name}"`);
    lines.push("═══════════════════════════════════════════════════════════");
    lines.push("");
    lines.push("── EPISODE INFO ──");
    lines.push(`  Mood:       ${session.planning.mood || "not set"}`);
    lines.push(`  Format:     ${session.planning.episodeLength}`);
    lines.push(`  Time:       ${session.planning.timeOfDay || "not set"}`);
    if (session.planning.season) {
      lines.push(`  Season:     ${session.planning.season.charAt(0).toUpperCase() + session.planning.season.slice(1)}`);
    }
    lines.push(`  Duration:   ~${totalDuration}s (${sortedShots.length} shots)`);
    lines.push(`  Locations:  ${allLocations.join(", ") || "TBD"}`);
    lines.push(`  Figures:    ${allCharacters.join(", ") || "TBD"}`);
    if (session.planning.uniqueElements) {
      lines.push(`  Props:      ${session.planning.uniqueElements}`);
    }
    lines.push("");

    if (session.storyArc.length > 0) {
      lines.push("── STORY ARC ──");
      session.storyArc.forEach((phase) => {
        lines.push(`  ${phase.label}`);
        lines.push(`    ${phase.description}`);
      });
      lines.push("");
    }

    if (session.storyElements.length > 0) {
      lines.push("── NARRATIVE BEATS ──");
      session.storyElements.forEach((el) => {
        const phase = session.storyArc.find((a) => a.id === el.arcPhaseId);
        lines.push(`  [${phase?.label ?? "—"}] ${el.label}`);
        lines.push(`    ${el.description}`);
      });
      lines.push("");
    }

    lines.push("── SHOT-BY-SHOT PRODUCTION PLAN ──");
    lines.push("  (Each shot = one composed frame. Reposition figures by hand between shots.)");
    lines.push("");
    sortedShots.forEach((shot, i) => {
      const el = session.storyElements.find((e) => e.id === shot.elementId);
      const phase = el ? session.storyArc.find((a) => a.id === el.arcPhaseId) : null;
      const beatLabel = el ? `${phase?.label ?? "—"} > ${el.label}` : "";

      lines.push(`  SHOT ${i + 1}  [${shot.durationSec}s hold]`);
      if (beatLabel) lines.push(`  Beat:       ${beatLabel}`);
      lines.push(`  Frame:      ${shot.shotType} / camera ${shot.cameraMove}`);
      lines.push(`  Location:   ${shot.location || "TBD"}`);
      lines.push(`  Figures:    ${shot.characters.join(", ") || "none"}`);
      lines.push(`  Composition:`);
      lines.push(`    ${shot.description}`);
      if (shot.dialogue) lines.push(`  Dialogue:   "${shot.dialogue}"`);
      if (shot.narration) lines.push(`  Narration:  "${shot.narration}"`);
      if (shot.audioNotes) lines.push(`  Audio:      ${shot.audioNotes}`);
      lines.push(`  Transition: ${shot.transition ?? "cut"} to next`);
      lines.push("");
    });

    lines.push("── SETUP CHECKLIST ──");
    lines.push(`  □ Diorama area: ${allLocations.join(", ") || "TBD"}`);
    allCharacters.forEach((c) => {
      lines.push(`  □ Figure: ${c}`);
    });
    if (session.planning.uniqueElements) {
      lines.push(`  □ Props: ${session.planning.uniqueElements}`);
    }
    lines.push(`  □ Camera: tripod, vertical (9:16)`);
    lines.push(`  □ Lighting: practical sources per shot notes`);
    lines.push(`  □ Audio: record ambient / prepare music tracks`);
    lines.push("");
    lines.push("═══════════════════════════════════════════════════════════");

    const text = lines.join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${session.name.replace(/\s+/g, "_")}_one_sheet.txt`;
    a.click();
    URL.revokeObjectURL(url);
    actions.addToast("One-sheet exported", "success");
  }, [session, actions]);

  if (!session) return null;

  const hasData = session.storyArc.length > 0;

  if (!hasData) {
    return (
      <div className="ws-staging ws-staging--empty">
        <div className="ws-empty-state">
          <h2>Staging Room</h2>
          <p>
            The staging room will be populated after the writing room approves
            an episode. Go to the Writing Room to develop your episode.
          </p>
          <button
            className="ws-btn ws-btn-primary"
            onClick={() => actions.setScreen("writing")}
          >
            Go to Writing Room →
          </button>
        </div>
      </div>
    );
  }

  const sortedArc = [...session.storyArc].sort((a, b) => a.order - b.order);
  const sortedElements = [...session.storyElements].sort((a, b) => a.order - b.order);
  const sortedShots = [...session.shots].sort((a, b) => a.order - b.order);

  return (
    <div className="ws-staging">
      <div className="ws-staging-main">
        {/* Story Arc Row */}
        <section className="ws-tl-section">
          <h3 className="ws-tl-heading">Story Arc</h3>
          <div className="ws-tl-row ws-tl-row--arc">
            {sortedArc.map((phase) => (
              <div
                key={phase.id}
                className="ws-tl-block ws-tl-block--arc"
                style={{ borderLeftColor: phase.color }}
              >
                <strong>{phase.label}</strong>
                <span className="ws-tl-block-desc">{phase.description}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Story Elements Row */}
        <section className="ws-tl-section">
          <h3 className="ws-tl-heading">Story Elements</h3>
          <div className="ws-tl-row ws-tl-row--elements">
            {sortedElements.map((el) => {
              const phase = sortedArc.find((a) => a.id === el.arcPhaseId);
              return (
                <div
                  key={el.id}
                  className="ws-tl-block ws-tl-block--element"
                  style={{ borderLeftColor: phase?.color ?? "#666" }}
                >
                  <strong>{el.label}</strong>
                  <span className="ws-tl-block-desc">{el.description}</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Shots Row */}
        <section className="ws-tl-section">
          <h3 className="ws-tl-heading">Shots</h3>
          <div className="ws-tl-row ws-tl-row--shots">
            {sortedShots.map((shot) => {
              const element = sortedElements.find((e) => e.id === shot.elementId);
              const phase = element
                ? sortedArc.find((a) => a.id === element.arcPhaseId)
                : null;
              return (
                <button
                  key={shot.id}
                  className={`ws-tl-shot ${selectedShotId === shot.id ? "ws-tl-shot--selected" : ""}`}
                  style={{ borderTopColor: phase?.color ?? "#666" }}
                  onClick={() => setSelectedShotId(shot.id)}
                >
                  <span className="ws-tl-shot-num">{shot.order + 1}</span>
                  <span className="ws-tl-shot-type">{shot.shotType}</span>
                  <span className="ws-tl-shot-dur">{shot.durationSec}s</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Shot Detail */}
        {selectedShot && (
          <section className="ws-shot-detail">
            <h3 className="ws-tl-heading">
              Shot {selectedShot.order + 1} Detail
              {selectedShot.userEdited && (
                <span className="ws-edited-badge">edited</span>
              )}
            </h3>

            <div className="ws-detail-grid">
              <label className="ws-label">Description</label>
              <textarea
                className="ws-textarea"
                rows={3}
                value={selectedShot.description}
                onChange={(e) =>
                  handleShotFieldChange(selectedShot.id, "description", e.target.value)
                }
              />

              <div className="ws-detail-row">
                <div>
                  <label className="ws-label">Characters</label>
                  <input
                    className="ws-input"
                    value={selectedShot.characters.join(", ")}
                    onChange={(e) =>
                      handleShotFieldChange(
                        selectedShot.id,
                        "characters",
                        e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                      )
                    }
                  />
                </div>
                <div>
                  <label className="ws-label">Location</label>
                  <input
                    className="ws-input"
                    value={selectedShot.location}
                    onChange={(e) =>
                      handleShotFieldChange(selectedShot.id, "location", e.target.value)
                    }
                  />
                </div>
              </div>

              <div className="ws-detail-row">
                <div>
                  <label className="ws-label">Shot Type</label>
                  <input
                    className="ws-input"
                    value={selectedShot.shotType}
                    onChange={(e) =>
                      handleShotFieldChange(selectedShot.id, "shotType", e.target.value)
                    }
                  />
                </div>
                <div>
                  <label className="ws-label">Camera Move</label>
                  <input
                    className="ws-input"
                    value={selectedShot.cameraMove}
                    onChange={(e) =>
                      handleShotFieldChange(selectedShot.id, "cameraMove", e.target.value)
                    }
                  />
                </div>
                <div>
                  <label className="ws-label">Transition</label>
                  <input
                    className="ws-input"
                    value={selectedShot.transition}
                    onChange={(e) =>
                      handleShotFieldChange(selectedShot.id, "transition", e.target.value)
                    }
                  />
                </div>
              </div>

              <label className="ws-label">Dialogue</label>
              <textarea
                className="ws-textarea"
                rows={2}
                value={selectedShot.dialogue}
                onChange={(e) =>
                  handleShotFieldChange(selectedShot.id, "dialogue", e.target.value)
                }
              />

              <label className="ws-label">Narration</label>
              <textarea
                className="ws-textarea"
                rows={2}
                value={selectedShot.narration}
                onChange={(e) =>
                  handleShotFieldChange(selectedShot.id, "narration", e.target.value)
                }
              />

              <label className="ws-label">Audio Notes</label>
              <input
                className="ws-input"
                value={selectedShot.audioNotes}
                onChange={(e) =>
                  handleShotFieldChange(selectedShot.id, "audioNotes", e.target.value)
                }
              />
            </div>

            {/* Feedback to producer */}
            <div className="ws-feedback-section">
              <h4>Send Feedback to Producer</h4>
              <textarea
                className="ws-textarea"
                rows={2}
                placeholder="Describe what you want changed about this shot..."
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
              />
              <div className="ws-feedback-controls">
                <label className="ws-checkbox-label">
                  <input
                    type="checkbox"
                    checked={scopeNarrow}
                    onChange={(e) => setScopeNarrow(e.target.checked)}
                  />
                  Only affect this scene
                </label>
                <button
                  className="ws-btn ws-btn-secondary ws-btn-sm"
                  onClick={handleSendFeedback}
                  disabled={!feedbackText.trim()}
                >
                  Send Feedback
                </button>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Export button */}
      <div className="ws-staging-footer">
        <button
          className="ws-btn ws-btn-primary"
          onClick={handleExportOneSheet}
        >
          Export One-Sheet
        </button>
      </div>
    </div>
  );
}
