"use client";

import React, { useState } from "react";
import { useWalterStore } from "./store";
import { Tabs } from "./components/Tabs";
import { EpisodeBuilder } from "./components/EpisodeBuilder";
import { StoryboardEditor } from "./components/StoryboardEditor";
import { TimelineEditor } from "./components/TimelineEditor";
import { ThinkTankView } from "./components/ThinkTankView";
import { ExportPanel } from "./components/ExportPanel";
import { SettingsPanel } from "./components/SettingsPanel";
import { ToastContainer } from "./components/ToastContainer";
import { AIWriterPanel } from "./components/AIWriterPanel";
import { EpisodeWizard } from "./components/EpisodeWizard";
import {
  Clapperboard, Sparkles, RotateCcw, Settings2,
} from "lucide-react";
import "./Walter.css";

function AIWriterModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="settings-overlay" style={{ zIndex: 1100 }}>
      <div
        style={{
          width: "90vw",
          maxWidth: 700,
          maxHeight: "85vh",
          overflow: "auto",
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: 24,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <AIWriterPanel onClose={onClose} onProjectCreated={onClose} />
      </div>
    </div>
  );
}

function fmtSec(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m > 0 ? `${m}:${s.toString().padStart(2, "0")}` : `${s}s`;
}

function LandingScreen({
  onNew,
  onOpenSettings,
}: {
  onNew: () => void;
  onOpenSettings: () => void;
}) {
  const { projects, actions } = useWalterStore();
  const recent = projects.slice().reverse().slice(0, 8);

  return (
    <div className="landing">
      <div className="landing-header">
        <Clapperboard size={28} style={{ color: "var(--accent)" }} />
        <div>
          <h1 className="landing-title">Walter Storyboard Builder</h1>
          <p className="landing-subtitle">AI-assisted episode planning for the Walter universe</p>
        </div>
        <button className="btn-ghost" onClick={onOpenSettings} style={{ marginLeft: "auto" }}>
          <Settings2 size={13} /> Settings
        </button>
      </div>

      <div className="landing-actions">
        <button className="landing-action-card primary" onClick={onNew}>
          <Sparkles size={20} />
          <strong>New Episode</strong>
          <span>Create with the guided wizard</span>
        </button>
      </div>

      {recent.length > 0 && (
        <div className="landing-recent">
          <h3>Recent Projects</h3>
          <div className="landing-recent-list">
            {recent.map((p) => (
              <button
                key={p.id}
                className="recent-btn"
                onClick={() => actions.openProject(p.id)}
              >
                <span className="recent-title">{p.name}</span>
                <span className="recent-date">
                  {p.beats.length} beats &middot; {p.shots.length} shots
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function WalterShell() {
  const { project, activeTab, actions } = useWalterStore();
  const [showSettings, setShowSettings] = useState(false);
  const [showAIWriter, setShowAIWriter] = useState(false);
  const [showWizard, setShowWizard] = useState(false);

  const totalDuration = project?.shots.reduce((sum, s) => sum + s.durationSec, 0) ?? 0;

  if (!project && !showWizard) {
    return (
      <div className="app">
        <LandingScreen
          onNew={() => setShowWizard(true)}
          onOpenSettings={() => setShowSettings(true)}
        />
        {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
        <ToastContainer />
      </div>
    );
  }

  if (!project && showWizard) {
    return (
      <div className="app">
        <div className="wizard-shell">
          <div className="wizard-shell-header">
            <button className="btn-ghost" onClick={() => setShowWizard(false)}>
              &larr; Back
            </button>
            <button className="btn-ghost" onClick={() => setShowSettings(true)}>
              <Settings2 size={13} /> Settings
            </button>
          </div>
          <EpisodeWizard onComplete={() => setShowWizard(false)} />
        </div>
        {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
        <ToastContainer />
      </div>
    );
  }

  return (
    <div className="app">
      <div className="app-toolbar">
        <Clapperboard size={16} style={{ color: "var(--accent)" }} />
        <span className="project-title">{project!.name || "Untitled"}</span>
        <span className="project-meta">
          {project!.beats.length} beats &middot; {project!.shots.length} shots &middot; {fmtSec(totalDuration)}
        </span>
        <div style={{ flex: 1 }} />
        <button className="btn-ghost" onClick={() => setShowAIWriter(true)}>
          <Sparkles size={12} /> AI Writer
        </button>
        <button className="btn-ghost" onClick={() => setShowSettings(true)}>
          <Settings2 size={12} /> Settings
        </button>
        <button
          className="btn-ghost toolbar-start-over"
          onClick={() => {
            if (window.confirm("Discard this episode and start over?")) {
              actions.deleteProject(project!.id);
              setShowWizard(false);
            }
          }}
        >
          <RotateCcw size={12} /> Start Over
        </button>
      </div>

      <Tabs active={activeTab} onChange={actions.setActiveTab} />

      <div className="tab-content">
        {activeTab === "episode" && <EpisodeBuilder />}
        {activeTab === "storyboard" && <StoryboardEditor />}
        {activeTab === "timeline" && <TimelineEditor />}
        {activeTab === "ideation" && <ThinkTankView />}
        {activeTab === "export" && <ExportPanel />}
      </div>

      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
      {showAIWriter && <AIWriterModal onClose={() => setShowAIWriter(false)} />}
      <ToastContainer />
    </div>
  );
}
