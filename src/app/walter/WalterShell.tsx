"use client";

import React, { useState } from "react";
import { useWalterStore } from "./store";
import { BeatSidebar } from "./components/BeatSidebar";
import { ShotGrid } from "./components/ShotGrid";
import { ShotEditor } from "./components/ShotEditor";
import { Timeline } from "./components/Timeline";
import { ExportDialog } from "./components/ExportDialog";
import { WelcomeScreen } from "./components/WelcomeScreen";
import { ARC_TEMPLATES } from "./arcTemplates";
import { AIWriterPanel } from "./components/AIWriterPanel";
import { Clapperboard, Download, FolderOpen, Trash2, Settings2, Sparkles } from "lucide-react";
import "./Walter.css";

function ProjectSettings({ onClose }: { onClose: () => void }) {
  const { project, actions } = useWalterStore();
  if (!project) return null;
  return (
    <div className="walter-export-overlay" onClick={onClose}>
      <div className="walter-export-dialog" style={{ minWidth: 400 }} onClick={(e) => e.stopPropagation()}>
        <h2>Project Settings</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 8 }}>
          <div className="walter-field">
            <label>Project Name</label>
            <input
              value={project.name}
              onChange={(e) => actions.updateProjectMeta({ name: e.target.value })}
            />
          </div>
          <div className="walter-field">
            <label>Description</label>
            <textarea
              rows={3}
              value={project.description}
              onChange={(e) => actions.updateProjectMeta({ description: e.target.value })}
              placeholder="What is this storyboard about?"
            />
          </div>
          <div className="walter-field-row">
            <div className="walter-field">
              <label>Aspect Ratio</label>
              <select
                value={project.aspectRatio}
                onChange={(e) => actions.updateProjectMeta({ aspectRatio: e.target.value as "16:9" | "9:16" | "1:1" | "4:5" })}
              >
                <option value="16:9">16:9 (Landscape)</option>
                <option value="9:16">9:16 (Portrait / Reels)</option>
                <option value="1:1">1:1 (Square)</option>
                <option value="4:5">4:5 (Instagram)</option>
              </select>
            </div>
            <div className="walter-field">
              <label>FPS</label>
              <select
                value={project.fps}
                onChange={(e) => actions.updateProjectMeta({ fps: parseInt(e.target.value) })}
              >
                <option value={24}>24 fps</option>
                <option value={30}>30 fps</option>
                <option value={60}>60 fps</option>
              </select>
            </div>
          </div>
          <div className="walter-field">
            <label>Arc Template</label>
            <select
              value={project.arcTemplateId}
              onChange={(e) => {
                if (confirm("Changing the arc template will replace all current beats and shots. Continue?")) {
                  actions.applyArcTemplate(e.target.value);
                }
              }}
            >
              {ARC_TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="walter-export-actions">
          <button className="walter-topbar-btn" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}

export default function WalterShell() {
  const { project, projects, actions } = useWalterStore();
  const [showExport, setShowExport] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAIWriter, setShowAIWriter] = useState(false);

  if (!project && !showAIWriter) {
    return (
      <div className="walter-shell">
        <WelcomeScreen onOpenAIWriter={() => setShowAIWriter(true)} />
      </div>
    );
  }

  if (showAIWriter) {
    return (
      <div className="walter-shell">
        <AIWriterPanel
          onClose={() => setShowAIWriter(false)}
          onProjectCreated={() => setShowAIWriter(false)}
        />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="walter-shell">
        <WelcomeScreen onOpenAIWriter={() => setShowAIWriter(true)} />
      </div>
    );
  }

  const totalDuration = project.shots.reduce((sum, s) => sum + s.durationSec, 0);

  return (
    <div className="walter-shell">
      <div className="walter-topbar">
        <Clapperboard size={16} style={{ color: "var(--color-tool-walter)" }} />
        <span className="walter-topbar-title">{project.name}</span>
        <span className="walter-topbar-meta">
          {project.beats.length} beats &middot; {project.shots.length} shots &middot; {totalDuration.toFixed(1)}s
        </span>
        <div className="walter-topbar-spacer" />
        <button
          className="walter-topbar-btn"
          onClick={() => setShowAIWriter(true)}
          title="Generate a new episode with AI"
        >
          <Sparkles size={12} style={{ marginRight: 4 }} />
          AI Writer
        </button>
        <button
          className="walter-topbar-btn"
          onClick={() => {
            actions.openProject("");
          }}
          title="Back to projects"
        >
          <FolderOpen size={12} style={{ marginRight: 4 }} />
          Projects
        </button>
        <button
          className="walter-topbar-btn"
          onClick={() => setShowSettings(true)}
        >
          <Settings2 size={12} style={{ marginRight: 4 }} />
          Settings
        </button>
        <button
          className="walter-topbar-btn danger"
          onClick={() => {
            if (confirm(`Delete "${project.name}"? This cannot be undone.`)) {
              actions.deleteProject(project.id);
            }
          }}
        >
          <Trash2 size={12} />
        </button>
        <button
          className="walter-topbar-btn primary"
          onClick={() => setShowExport(true)}
          disabled={project.shots.length === 0}
        >
          <Download size={12} style={{ marginRight: 4 }} />
          Export
        </button>
      </div>

      <div className="walter-main">
        <BeatSidebar />
        <ShotGrid />
        <ShotEditor />
      </div>

      <Timeline />

      {showExport && <ExportDialog onClose={() => setShowExport(false)} />}
      {showSettings && <ProjectSettings onClose={() => setShowSettings(false)} />}
    </div>
  );
}
