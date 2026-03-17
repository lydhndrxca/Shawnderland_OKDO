"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useWritingStore, storeActions } from "./store";
import { setUsageCallback } from "@shawnderland/ai";
import {
  setActiveApp,
  recordUsage,
} from "@/lib/ideation/engine/provider/costTracker";
import CostWidget from "@/components/CostWidget";
import type { ScreenId } from "./types";
import { PlanningPage } from "./components/PlanningPage";
import { WritingRoom } from "./components/WritingRoom";
import { ToastContainer } from "./components/ToastContainer";
import "./WritingRoom.css";

const SCREENS: { id: ScreenId; label: string; icon: string }[] = [
  { id: "planning", label: "Planning", icon: "📋" },
  { id: "writing", label: "Writing Room", icon: "💬" },
];

export default function WritingShell() {
  const { session, sessions, toasts, actions } = useWritingStore();
  const [showSessions, setShowSessions] = useState(false);
  const [showFileMenu, setShowFileMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActiveApp("writing-room");
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

  const handleOpen = useCallback((id: string) => {
    actions.openSession(id);
    setShowSessions(false);
  }, [actions]);

  const handleDelete = useCallback((id: string) => {
    if (confirm("Delete this session?")) actions.deleteSession(id);
  }, [actions]);

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
    a.download = `${session?.name ?? "writing-session"}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setShowFileMenu(false);
  }, [actions, session?.name]);

  const handleSaveAs = useCallback(() => {
    const name = prompt("Save as:", session?.name ?? "Untitled Project");
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

  const handleFileImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
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
  }, [actions]);

  if (!session) {
    return (
      <div className="wr-root">
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          style={{ display: "none" }}
          onChange={handleFileImport}
        />
        <div className="wr-landing">
          <div className="wr-landing-hero">
            <h1>AI Writing Room</h1>
            <p>
              Brainstorm and develop creative projects with a multi-agent AI
              writing room. Set your brief, assemble your team, and let the
              ideas flow.
            </p>
          </div>
          <div className="wr-landing-actions">
            <button className="wr-btn wr-btn-primary" onClick={handleNew}>
              New Project
            </button>
            <button className="wr-btn wr-btn-secondary" onClick={() => fileInputRef.current?.click()}>
              Open File...
            </button>
            {sessions.length > 0 && (
              <button
                className="wr-btn wr-btn-secondary"
                onClick={() => setShowSessions(true)}
              >
                Open Session ({sessions.length})
              </button>
            )}
          </div>

          {showSessions && (
            <div className="wr-session-list">
              <h3>Saved Sessions</h3>
              {sessions.map((s) => (
                <div key={s.id} className="wr-session-row">
                  <button className="wr-session-name" onClick={() => handleOpen(s.id)}>
                    <strong>{s.name}</strong>
                    <span className="wr-session-meta">
                      {s.activeScreen} &middot; {new Date(s.updatedAt).toLocaleDateString()}
                    </span>
                  </button>
                  <button className="wr-btn wr-btn-ghost wr-btn-sm" onClick={() => handleDelete(s.id)}>
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <ToastContainer toasts={toasts} onDismiss={actions.removeToast} />
        <CostWidget appKey="writing-room" />
      </div>
    );
  }

  const activeScreen = session.activeScreen;

  return (
    <div className="wr-root">
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: "none" }}
        onChange={handleFileImport}
      />

      <header className="wr-topbar">
        <div className="wr-topbar-left">
          <button
            className="wr-btn wr-btn-ghost wr-btn-sm"
            onClick={() => {
              storeActions.openSession("");
              localStorage.setItem("writing-room-active-session", "");
            }}
            title="Back to sessions"
          >
            ←
          </button>

          <div className="wr-file-menu-wrap" ref={fileMenuRef}>
            <button
              className="wr-btn wr-btn-ghost wr-btn-sm"
              onClick={() => { setShowFileMenu(!showFileMenu); setShowSessions(false); }}
            >
              File
            </button>
            {showFileMenu && (
              <div className="wr-file-menu">
                <button onClick={handleNew}>New</button>
                <button onClick={handleOpenFile}>Open...</button>
                <div className="wr-file-menu-divider" />
                <button onClick={handleSave}>Save</button>
                <button onClick={handleSaveAs}>Save As...</button>
                <div className="wr-file-menu-divider" />
                <button onClick={handleReset} className="wr-file-menu-danger">Reset</button>
              </div>
            )}
          </div>

          <input
            className="wr-session-title-input"
            value={session.name}
            onChange={(e) => actions.renameSession(e.target.value)}
          />
        </div>

        <nav className="wr-screen-nav">
          {SCREENS.map((sc) => (
            <button
              key={sc.id}
              className={`wr-screen-tab ${activeScreen === sc.id ? "wr-screen-tab--active" : ""}`}
              onClick={() => actions.setScreen(sc.id)}
            >
              <span className="wr-screen-tab-icon">{sc.icon}</span>
              {sc.label}
            </button>
          ))}
        </nav>

        <div className="wr-topbar-right">
          <button
            className="wr-btn wr-btn-ghost wr-btn-sm"
            onClick={() => setShowSessions(!showSessions)}
          >
            Sessions
          </button>
        </div>
      </header>

      {showSessions && (
        <div className="wr-session-dropdown">
          <button className="wr-btn wr-btn-primary wr-btn-sm" onClick={handleNew}>
            + New Project
          </button>
          {sessions.map((s) => (
            <button
              key={s.id}
              className={`wr-session-row ${s.id === session.id ? "wr-session-row--active" : ""}`}
              onClick={() => handleOpen(s.id)}
            >
              <strong>{s.name}</strong>
              <span className="wr-session-meta">
                {new Date(s.updatedAt).toLocaleDateString()}
              </span>
            </button>
          ))}
        </div>
      )}

      <main className="wr-content">
        <div style={{ display: activeScreen === "planning" ? "flex" : "none" }} className="wr-screen">
          <PlanningPage />
        </div>
        <div style={{ display: activeScreen === "writing" ? "flex" : "none" }} className="wr-screen">
          <WritingRoom />
        </div>
      </main>

      <ToastContainer toasts={toasts} onDismiss={actions.removeToast} />
      <CostWidget appKey="writing-room" />
    </div>
  );
}
