"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useWalterStore, walterActions } from "./store";
import { Tabs } from "./components/Tabs";
import { EpisodeBuilder } from "./components/EpisodeBuilder";
import { StoryboardEditor } from "./components/StoryboardEditor";
import { TimelineEditor } from "./components/TimelineEditor";
import { ThinkTankView } from "./components/ThinkTankView";
import { ExportPanel } from "./components/ExportPanel";
import { SettingsPanel } from "./components/SettingsPanel";
import { ToastContainer } from "./components/ToastContainer";
import { AIWriterPanel } from "./components/AIWriterPanel";
import { ARC_TEMPLATES } from "./arcTemplates";
import {
  Clapperboard,
  Settings2,
  Sparkles,
  RotateCcw,
  Plus,
  FilePlus,
  FileText,
  ChevronDown,
} from "lucide-react";
import "./Walter.css";

function useClickOutside(ref: React.RefObject<HTMLElement | null>, onClose: () => void) {
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [ref, onClose]);
}

function NewEpisodeScreen({
  onOpenSettings,
  onAIWriter,
}: {
  onOpenSettings: () => void;
  onAIWriter: () => void;
}) {
  const { projects, actions } = useWalterStore();
  const [name, setName] = useState("");
  const [arcId, setArcId] = useState("three-act");
  const selectedArc = ARC_TEMPLATES.find((t) => t.id === arcId);

  function handleCreate() {
    walterActions.createProject(name.trim() || "Untitled Storyboard", arcId);
  }

  const recent = projects.slice().reverse().slice(0, 8);

  return (
    <div className="new-episode-screen">
      <div className="new-episode-header">
        <h2 style={{ margin: 0 }}>
          <Clapperboard size={20} style={{ marginRight: 8, verticalAlign: "text-bottom" }} />
          Walter
        </h2>
        <button className="btn-sm" onClick={onOpenSettings}>
          <Settings2 size={12} /> Settings
        </button>
      </div>

      <h1>New Episode</h1>
      <p className="subtitle">Create a new storyboard episode or open an existing one.</p>

      <div className="form-section">
        <h2>Create Episode</h2>
        <label>
          Project Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Untitled Storyboard"
            onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
          />
        </label>

        <div className="arc-dropdown-section">
          <h3>Arc Template</h3>
          <select value={arcId} onChange={(e) => setArcId(e.target.value)}>
            {ARC_TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          {selectedArc && (
            <div className="arc-selected-card">
              <div className="arc-selected-name">{selectedArc.name}</div>
              <div className="arc-selected-desc">{selectedArc.description}</div>
              <div className="tc-tags">
                {selectedArc.beats.map((b, i) => (
                  <span key={i} className="tc-tag" style={{ borderLeft: `3px solid ${b.color}` }}>
                    {b.label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <button className="btn btn-primary" onClick={handleCreate}>
          Create Episode
        </button>
        <button
          className="btn btn-secondary"
          onClick={onAIWriter}
          style={{ marginTop: 8 }}
        >
          <Sparkles size={14} style={{ marginRight: 4 }} /> Generate with AI
        </button>
      </div>

      {recent.length > 0 && (
        <div className="form-section">
          <h2>Recent Projects</h2>
          <ul className="recent-list">
            {recent.map((p) => (
              <li key={p.id}>
                <button
                  className="recent-btn"
                  onClick={() => actions.openProject(p.id)}
                >
                  <span className="recent-title">{p.name}</span>
                  <span className="recent-date">
                    {p.beats.length} beats &middot; {p.shots.length} shots
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function AIWriterModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="settings-overlay" style={{ zIndex: 1100 }}>
      <div
        style={{
          width: "90vw",
          maxWidth: 700,
          maxHeight: "85vh",
          overflow: "auto",
          background: "var(--bg-alt)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
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

export default function WalterShell() {
  const { project, projects, activeTab, actions } = useWalterStore();
  const [showSettings, setShowSettings] = useState(false);
  const [showAIWriter, setShowAIWriter] = useState(false);

  const totalDuration = project?.shots.reduce((sum, s) => sum + s.durationSec, 0) ?? 0;

  if (!project) {
    return (
      <div className="app">
        <NewEpisodeScreen
          onOpenSettings={() => setShowSettings(true)}
          onAIWriter={() => setShowAIWriter(true)}
        />
        {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
        {showAIWriter && <AIWriterModal onClose={() => setShowAIWriter(false)} />}
        <ToastContainer />
      </div>
    );
  }

  return (
    <div className="app">
      {/* Toolbar */}
      <div className="app-toolbar">
        <Clapperboard size={16} style={{ color: "var(--accent)" }} />
        <span className="project-title">{project.name || "Untitled"}</span>
        <span className="project-meta">
          {project.beats.length} beats &middot; {project.shots.length} shots &middot; {fmtSec(totalDuration)}
        </span>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setShowAIWriter(true)}
        >
          <Sparkles size={11} style={{ marginRight: 3 }} />
          AI Writer
        </button>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => setShowSettings(true)}
        >
          Settings
        </button>
        <button
          className="btn btn-ghost btn-sm toolbar-start-over"
          onClick={() => {
            if (window.confirm("Discard this episode and start over?")) {
              actions.deleteProject(project.id);
            }
          }}
        >
          <RotateCcw size={11} style={{ marginRight: 3 }} />
          Start Over
        </button>
      </div>

      {/* Tab Bar */}
      <Tabs active={activeTab} onChange={actions.setActiveTab} />

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === "episode" && <EpisodeBuilder />}
        {activeTab === "storyboard" && <StoryboardEditor />}
        {activeTab === "timeline" && <TimelineEditor />}
        {activeTab === "ideation" && <ThinkTankView />}
        {activeTab === "export" && <ExportPanel />}
      </div>

      {/* Overlays */}
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
      {showAIWriter && <AIWriterModal onClose={() => setShowAIWriter(false)} />}
      <ToastContainer />
    </div>
  );
}
