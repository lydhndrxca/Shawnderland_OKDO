"use client";

import React, { useState, useCallback } from "react";
import { useWalterStore, walterActions } from "../store";
import { Download, Copy, Check } from "lucide-react";

export function ExportPanel() {
  const { project, actions } = useWalterStore();
  const [exportResult, setExportResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleExport = useCallback(() => {
    const json = walterActions.exportCapCutJson();
    setExportResult(json);
    walterActions.addToast("Export generated", "success");
  }, []);

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
    const blob = new Blob([exportResult], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.name.replace(/\s+/g, "_")}_export.json`;
    a.click();
    URL.revokeObjectURL(url);
    walterActions.addToast("Downloaded export file", "success");
  }, [exportResult, project]);

  if (!project) return null;

  const beats = [...project.beats].sort((a, b) => a.order - b.order);
  const totalShots = project.shots.length;
  const totalDuration = project.shots.reduce((sum, s) => sum + s.durationSec, 0);
  const shotsWithDesc = project.shots.filter(
    (s) => s.visualDescription || s.description
  ).length;

  return (
    <div className="export-panel">
      <h2>Export</h2>
      <p className="export-desc">
        Export your storyboard as a structured JSON file compatible with editing workflows.
      </p>

      <div className="export-settings">
        <div><strong>Project:</strong> {project.name}</div>
        <div><strong>Beats:</strong> {beats.length}</div>
        <div><strong>Shots:</strong> {totalShots}</div>
        <div><strong>Total Duration:</strong> {totalDuration.toFixed(1)}s</div>
        <div><strong>Shots with descriptions:</strong> {shotsWithDesc} / {totalShots}</div>
        <div><strong>Aspect Ratio:</strong> {project.aspectRatio}</div>
        <div><strong>FPS:</strong> {project.fps}</div>
      </div>

      {shotsWithDesc < totalShots && (
        <div className="export-blocked-notice">
          {totalShots - shotsWithDesc} shot(s) are missing visual descriptions. Consider filling them in first.
        </div>
      )}

      <button
        className="btn btn-primary"
        onClick={handleExport}
        style={{ maxWidth: 240 }}
      >
        <Download size={14} style={{ marginRight: 4 }} /> Generate Export
      </button>

      {exportResult && (
        <div className="export-result">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <strong>Export JSON</strong>
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
          <pre style={{ fontSize: 11, maxHeight: 300, overflow: "auto", background: "var(--bg-widget)", padding: 8, borderRadius: "var(--radius)" }}>
            <code>{exportResult}</code>
          </pre>
        </div>
      )}
    </div>
  );
}
