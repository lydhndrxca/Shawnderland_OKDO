"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useWalterStore, walterActions } from "./store";
import { useSerlingLoader } from "@shawnderland/serling";
import { useFielderLoader } from "@shawnderland/fielder";
import { usePeraLoader } from "@shawnderland/pera";
import { setUsageCallback } from "@shawnderland/ai";
import {
  setActiveApp,
  recordUsage,
} from "@/lib/ideation/engine/provider/costTracker";
import CostWidget from "@/components/CostWidget";
import type { ScreenId } from "./types";
import { PlanningPage } from "./components/PlanningPage";
import { WritingRoom } from "./components/WritingRoom";
import { StagingRoom } from "./components/StagingRoom";
import { ToastContainer } from "./components/ToastContainer";
import "./Walter.css";

const SCREENS: { id: ScreenId; label: string; icon: string }[] = [
  { id: "planning", label: "Planning", icon: "📋" },
  { id: "writing", label: "Writing Room", icon: "💬" },
  { id: "staging", label: "Staging Room", icon: "🎬" },
];

export default function WalterShell() {
  const { session, sessions, toasts, actions } = useWalterStore();
  const serling = useSerlingLoader();
  const fielder = useFielderLoader();
  const pera = usePeraLoader();
  const [showSessions, setShowSessions] = useState(false);
  const [showFileMenu, setShowFileMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActiveApp("walter");
    setUsageCallback((usage, model) => recordUsage(usage, model));
    return () => setUsageCallback(null);
  }, []);

  useEffect(() => {
    if (!showFileMenu) return;
    function onClickOutside(e: MouseEvent) {
      if (fileMenuRef.current && !fileMenuRef.current.contains(e.target as Node)) {
        setShowFileMenu(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [showFileMenu]);

  const handleNew = useCallback(() => {
    actions.newSession();
    setShowSessions(false);
  }, [actions]);

  const handleOpen = useCallback(
    (id: string) => {
      actions.openSession(id);
      setShowSessions(false);
    },
    [actions],
  );

  const handleDelete = useCallback(
    (id: string) => {
      if (confirm("Delete this session?")) actions.deleteSession(id);
    },
    [actions],
  );

  const handleReset = useCallback(() => {
    if (confirm("Reset this session? All progress will be lost.")) {
      actions.resetSession();
      setShowFileMenu(false);
    }
  }, [actions]);

  const handleSave = useCallback(() => {
    const json = actions.exportSession();
    if (!json) return;
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${session?.name ?? "walter-session"}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setShowFileMenu(false);
  }, [actions, session?.name]);

  const handleSaveAs = useCallback(() => {
    const name = prompt("Save as:", session?.name ?? "Untitled Episode");
    if (!name) return;
    actions.renameSession(name);
    setTimeout(() => {
      const json = actions.exportSession();
      if (!json) return;
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${name}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }, 50);
    setShowFileMenu(false);
  }, [actions, session?.name]);

  const handleOpenFile = useCallback(() => {
    fileInputRef.current?.click();
    setShowFileMenu(false);
  }, []);

  const handleFileImport = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const result = actions.importSession(reader.result as string);
        if (!result) {
          actions.addToast("Failed to import session file.", "error");
        } else {
          actions.addToast("Session imported.", "success");
        }
      };
      reader.readAsText(file);
      e.target.value = "";
    },
    [actions],
  );

  /* ─── No session: landing screen ─────────────────── */
  if (!session) {
    return (
      <div className="ws-root">
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          style={{ display: "none" }}
          onChange={handleFileImport}
        />
        <div className="ws-landing">
          <div className="ws-landing-hero">
            <h1>W_w_W Story Generator</h1>
            <p>
              Brainstorm, develop, and plan Walter episodes with a collaborative
              AI writing room. Walk onto set with a complete production plan.
            </p>
          </div>
          <div className="ws-landing-actions">
            <button className="ws-btn ws-btn-primary" onClick={handleNew}>
              New Episode
            </button>
            <button
              className="ws-btn ws-btn-secondary"
              onClick={() => fileInputRef.current?.click()}
            >
              Open File...
            </button>
            {sessions.length > 0 && (
              <button
                className="ws-btn ws-btn-secondary"
                onClick={() => setShowSessions(true)}
              >
                Open Session ({sessions.length})
              </button>
            )}
          </div>
          {serling.loaded && (
            <div className="ws-serling-landing-badge">
              🚬 Serling Engine: {serling.corpusSize} corpus chunks · {serling.decisionCount} decisions
            </div>
          )}
          {serling.loading && (
            <div className="ws-serling-landing-badge ws-serling-loading">
              Loading Serling corpus...
            </div>
          )}

          {showSessions && (
            <div className="ws-session-list">
              <h3>Saved Sessions</h3>
              {sessions.map((s) => (
                <div key={s.id} className="ws-session-row">
                  <button
                    className="ws-session-name"
                    onClick={() => handleOpen(s.id)}
                  >
                    <strong>{s.name}</strong>
                    <span className="ws-session-meta">
                      {s.activeScreen} &middot;{" "}
                      {new Date(s.updatedAt).toLocaleDateString()}
                    </span>
                  </button>
                  <button
                    className="ws-btn ws-btn-ghost ws-btn-sm"
                    onClick={() => handleDelete(s.id)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <ToastContainer toasts={toasts} onDismiss={actions.removeToast} />
        <CostWidget appKey="walter" />
      </div>
    );
  }

  /* ─── Active session ─────────────────────────────── */
  const activeScreen = session.activeScreen;

  return (
    <div className="ws-root">
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: "none" }}
        onChange={handleFileImport}
      />

      {/* Top bar */}
      <header className="ws-topbar">
        <div className="ws-topbar-left">
          <button
            className="ws-btn ws-btn-ghost ws-btn-sm"
            onClick={() => {
              walterActions.openSession("");
              localStorage.setItem("walter-active-session", "");
            }}
            title="Back to sessions"
          >
            ←
          </button>

          <div className="ws-file-menu-wrap" ref={fileMenuRef}>
            <button
              className="ws-btn ws-btn-ghost ws-btn-sm"
              onClick={() => { setShowFileMenu(!showFileMenu); setShowSessions(false); }}
            >
              File
            </button>
            {showFileMenu && (
              <div className="ws-file-menu">
                <button onClick={handleNew}>New</button>
                <button onClick={handleOpenFile}>Open...</button>
                <div className="ws-file-menu-divider" />
                <button onClick={handleSave}>Save</button>
                <button onClick={handleSaveAs}>Save As...</button>
                <div className="ws-file-menu-divider" />
                <button onClick={handleReset} className="ws-file-menu-danger">Reset</button>
              </div>
            )}
          </div>

          <input
            className="ws-session-title-input"
            value={session.name}
            onChange={(e) => actions.renameSession(e.target.value)}
          />
        </div>

        <nav className="ws-screen-nav">
          {SCREENS.map((sc) => (
            <button
              key={sc.id}
              className={`ws-screen-tab ${activeScreen === sc.id ? "ws-screen-tab--active" : ""}`}
              onClick={() => actions.setScreen(sc.id)}
            >
              <span className="ws-screen-tab-icon">{sc.icon}</span>
              {sc.label}
            </button>
          ))}
        </nav>

        <div className="ws-topbar-right">
          <button
            className="ws-btn ws-btn-ghost ws-btn-sm"
            onClick={() => setShowSessions(!showSessions)}
          >
            Sessions
          </button>
        </div>
      </header>

      {/* Session picker dropdown */}
      {showSessions && (
        <div className="ws-session-dropdown">
          <button className="ws-btn ws-btn-primary ws-btn-sm" onClick={handleNew}>
            + New Episode
          </button>
          {sessions.map((s) => (
            <button
              key={s.id}
              className={`ws-session-row ${s.id === session.id ? "ws-session-row--active" : ""}`}
              onClick={() => handleOpen(s.id)}
            >
              <strong>{s.name}</strong>
              <span className="ws-session-meta">
                {new Date(s.updatedAt).toLocaleDateString()}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Screen content — all three stay mounted for persistence */}
      <main className="ws-content">
        <div style={{ display: activeScreen === "planning" ? "flex" : "none" }} className="ws-screen">
          <PlanningPage />
        </div>
        <div style={{ display: activeScreen === "writing" ? "flex" : "none" }} className="ws-screen">
          <WritingRoom />
        </div>
        <div style={{ display: activeScreen === "staging" ? "flex" : "none" }} className="ws-screen">
          <StagingRoom />
        </div>
      </main>

      <ToastContainer toasts={toasts} onDismiss={actions.removeToast} />
      <CostWidget appKey="walter" />
    </div>
  );
}
