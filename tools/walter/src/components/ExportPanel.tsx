"use client";

import React, { useState, useCallback } from "react";
import { useWalterStore, walterActions } from "../store";
import { Download, Copy, Check, FileText, Clapperboard } from "lucide-react";

type ExportFormat = "shoot-sheet" | "json";

function buildShootSheet(project: NonNullable<ReturnType<typeof useWalterStore>["project"]>): string {
  const beats = [...project.beats].sort((a, b) => a.order - b.order);
  const allChars = new Set<string>();
  const allLocs = new Set<string>();
  let totalDur = 0;
  const complexShots: string[] = [];

  const shotList = beats.flatMap((beat) => {
    const shots = project.shots
      .filter((s) => s.beatId === beat.id)
      .sort((a, b) => a.order - b.order);
    return shots.map((shot, i) => {
      totalDur += shot.durationSec;
      shot.characters?.forEach((c) => allChars.add(c));
      if (shot.location) allLocs.add(shot.location);
      if (["aerial", "tracking", "steadicam", "crane-up", "crane-down"].includes(shot.cameraMove)) {
        complexShots.push(`Shot ${shot.order + 1}: ${shot.title} (${shot.cameraMove})`);
      }
      const ts = totalDur - shot.durationSec;
      const m = Math.floor(ts / 60);
      const s = Math.round(ts % 60);
      return [
        `  #${String(shot.order + 1).padStart(2, "0")}  |  ${m}:${String(s).padStart(2, "0")}  |  ${shot.durationSec}s  |  ${beat.label}`,
        `        Framing: ${shot.shotType} / ${shot.cameraMove}`,
        shot.characters?.length ? `        Characters: ${shot.characters.join(", ")}` : "",
        shot.location ? `        Location: ${shot.location}` : "",
        `        Action: ${shot.visualDescription || shot.description || "(no description)"}`,
        shot.dialogue ? `        Dialogue: "${shot.dialogue}"` : "",
        shot.narration || shot.voiceOver ? `        Narration: "${shot.narration || shot.voiceOver}"` : "",
        shot.audioNote ? `        Audio: ${shot.audioNote}` : "",
        shot.purpose ? `        Purpose: ${shot.purpose}` : "",
        "",
      ].filter(Boolean).join("\n");
    });
  });

  const header = [
    "╔══════════════════════════════════════════════════════════════╗",
    `║  SHOOT SHEET — ${project.name.toUpperCase().padEnd(44)}║`,
    "╚══════════════════════════════════════════════════════════════╝",
    "",
    "EPISODE INFO",
    "────────────",
    `  Title:      ${project.name}`,
    `  Runtime:    ${Math.round(totalDur)}s (${Math.floor(totalDur / 60)}:${String(Math.round(totalDur % 60)).padStart(2, "0")})`,
    `  Tone:       ${project.tone || "—"}`,
    `  Characters: ${allChars.size > 0 ? Array.from(allChars).join(", ") : "—"}`,
    `  Locations:  ${allLocs.size > 0 ? Array.from(allLocs).join(", ") : "—"}`,
    `  Beats:      ${beats.length}`,
    `  Shots:      ${project.shots.length}`,
    `  Aspect:     ${project.aspectRatio}`,
    "",
    project.storyOverview ? `PREMISE\n────────\n  ${project.storyOverview.split("\n").join("\n  ")}\n` : "",
    "SHOT LIST",
    "─────────",
    "  #     Time    Dur    Block",
    "  ─── ─────── ───── ─────────────",
    ...shotList,
    "",
    "PRODUCTION SUMMARY",
    "──────────────────",
    `  Required Locations: ${allLocs.size > 0 ? Array.from(allLocs).join(", ") : "None specified"}`,
    `  Required Characters: ${allChars.size > 0 ? Array.from(allChars).join(", ") : "None specified"}`,
    `  Complex Shots: ${complexShots.length > 0 ? `\n    ${complexShots.join("\n    ")}` : "None"}`,
    `  Audio Requirements: ${project.shots.some((s) => s.audioNote) ? "See per-shot audio notes above" : "Not specified"}`,
    "",
    "────────────────────────────────────────",
    `Generated: ${new Date().toISOString().split("T")[0]}`,
    "",
  ].filter((l) => l !== undefined);

  return header.join("\n");
}

export function ExportPanel() {
  const { project, actions } = useWalterStore();
  const [exportResult, setExportResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [format, setFormat] = useState<ExportFormat>("shoot-sheet");

  const handleExport = useCallback(() => {
    if (!project) return;
    if (format === "json") {
      setExportResult(walterActions.exportCapCutJson());
    } else {
      setExportResult(buildShootSheet(project));
    }
    walterActions.addToast("Export generated", "success");
  }, [format, project]);

  const handleCopy = useCallback(() => {
    if (exportResult) {
      navigator.clipboard.writeText(exportResult);
      setCopied(true);
      walterActions.addToast("Copied to clipboard", "success");
      setTimeout(() => setCopied(false), 2000);
    }
  }, [exportResult]);

  const handleDownload = useCallback(() => {
    if (!exportResult || !project) return;
    const ext = format === "json" ? "json" : "txt";
    const mime = format === "json" ? "application/json" : "text/plain";
    const blob = new Blob([exportResult], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.name.replace(/\s+/g, "_")}_${format === "json" ? "export" : "shoot_sheet"}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    walterActions.addToast("Downloaded export file", "success");
  }, [exportResult, project, format]);

  if (!project) return null;

  const beats = [...project.beats].sort((a, b) => a.order - b.order);
  const totalShots = project.shots.length;
  const totalDuration = project.shots.reduce((sum, s) => sum + s.durationSec, 0);
  const shotsWithDesc = project.shots.filter((s) => s.visualDescription || s.description).length;

  return (
    <div className="export-panel">
      <h2>Export</h2>
      <p className="export-desc">
        Export your episode as a shoot-ready production plan or structured JSON.
      </p>

      <div className="export-settings">
        <div><strong>Project:</strong> {project.name}</div>
        <div><strong>Beats:</strong> {beats.length}</div>
        <div><strong>Shots:</strong> {totalShots}</div>
        <div><strong>Total Duration:</strong> {totalDuration.toFixed(1)}s ({Math.floor(totalDuration / 60)}:{String(Math.round(totalDuration % 60)).padStart(2, "0")})</div>
        <div><strong>Shots with descriptions:</strong> {shotsWithDesc} / {totalShots}</div>
      </div>

      {shotsWithDesc < totalShots && totalShots > 0 && (
        <div className="export-blocked-notice">
          {totalShots - shotsWithDesc} shot(s) missing descriptions. Consider filling them in for a complete shoot sheet.
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button
          className={`btn-sm ${format === "shoot-sheet" ? "btn-active" : ""}`}
          onClick={() => { setFormat("shoot-sheet"); setExportResult(null); }}
        >
          <FileText size={11} /> Shoot Sheet
        </button>
        <button
          className={`btn-sm ${format === "json" ? "btn-active" : ""}`}
          onClick={() => { setFormat("json"); setExportResult(null); }}
        >
          <Clapperboard size={11} /> JSON
        </button>
      </div>

      <button
        className="btn btn-primary"
        onClick={handleExport}
        style={{ maxWidth: 280 }}
      >
        <Download size={14} /> Generate {format === "shoot-sheet" ? "Shoot Sheet" : "JSON Export"}
      </button>

      {exportResult && (
        <div className="export-result">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <strong>{format === "shoot-sheet" ? "Shoot Sheet" : "Export JSON"}</strong>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="btn-sm" onClick={handleCopy}>
                {copied ? <Check size={11} /> : <Copy size={11} />}
                {copied ? " Copied" : " Copy"}
              </button>
              <button className="btn-sm btn-primary" onClick={handleDownload}>
                <Download size={11} /> Download
              </button>
            </div>
          </div>
          <pre style={{
            fontSize: 11,
            maxHeight: 400,
            overflow: "auto",
            background: "var(--bg-elevated)",
            padding: 12,
            borderRadius: "var(--radius-md)",
            lineHeight: 1.5,
            fontFamily: "'Cascadia Code', 'Fira Code', Consolas, monospace",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}>
            <code>{exportResult}</code>
          </pre>
        </div>
      )}
    </div>
  );
}
