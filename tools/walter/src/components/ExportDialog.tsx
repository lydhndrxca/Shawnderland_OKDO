"use client";

import React, { useMemo } from "react";
import { useWalterStore } from "../store";

interface Props {
  onClose: () => void;
}

export function ExportDialog({ onClose }: Props) {
  const { actions, project } = useWalterStore();

  const json = useMemo(() => actions.exportCapCutJson(), [project]);

  function handleCopy() {
    navigator.clipboard.writeText(json);
  }

  function handleDownload() {
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project?.name ?? "storyboard"}-export.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="walter-export-overlay" onClick={onClose}>
      <div className="walter-export-dialog" onClick={(e) => e.stopPropagation()}>
        <h2>Export Storyboard</h2>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
          CapCut-ready JSON with shot timings, descriptions, and audio notes.
          Import into CapCut or use as a reference for any video editor.
        </p>
        <pre className="walter-export-pre">{json}</pre>
        <div className="walter-export-actions">
          <button className="walter-topbar-btn" onClick={onClose}>Close</button>
          <button className="walter-topbar-btn" onClick={handleCopy}>Copy JSON</button>
          <button className="walter-topbar-btn primary" onClick={handleDownload}>Download .json</button>
        </div>
      </div>
    </div>
  );
}
