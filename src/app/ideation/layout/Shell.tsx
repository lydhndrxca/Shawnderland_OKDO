"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import SettingsPanel from './SettingsPanel';
import FooterNote from './FooterNote';
import FlowCanvas from '@/app/ideation/canvas/FlowCanvas';
import SaveDialog from './SaveDialog';
import OpenDialog from './OpenDialog';
import { useSession } from '@/lib/ideation/context/SessionContext';
import CostWidget from '@/components/CostWidget';
import './Shell.css';

export default function Shell() {
  const { loaded, loadWarning, dismissLoadWarning, session, saveSessionAs, listSavedSessions, loadSessionByName } = useSession();
  const [showSettings, setShowSettings] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showOpenDialog, setShowOpenDialog] = useState(false);
  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const [recentSessions, setRecentSessions] = useState<Array<{ name: string; savedAt: string }>>([]);
  const fileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!fileMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (fileMenuRef.current && !fileMenuRef.current.contains(e.target as Node)) {
        setFileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [fileMenuOpen]);

  useEffect(() => {
    if (fileMenuOpen) {
      listSavedSessions().then(setRecentSessions).catch(() => {});
    }
  }, [fileMenuOpen, listSavedSessions]);

  const handleQuickSave = useCallback(async () => {
    const name = session.projectName || 'Untitled Session';
    await saveSessionAs(name);
    setFileMenuOpen(false);
  }, [session.projectName, saveSessionAs]);

  const handleLoadRecent = useCallback(async (name: string) => {
    await loadSessionByName(name);
    setFileMenuOpen(false);
  }, [loadSessionByName]);

  if (!loaded) {
    return (
      <div className="shell-loading">
        <div className="loading-spinner" />
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="shell">
      {loadWarning && (
        <div className="shell-banner shell-banner-danger">
          <span>{loadWarning}</span>
          <button className="banner-dismiss" onClick={dismissLoadWarning}>&times;</button>
        </div>
      )}
      <header className="shell-header">
        <div className="shell-brand">AI Ideation Pipeline</div>
        {session.projectName && (
          <span className="shell-project-name" title={session.projectName}>
            {session.projectName}
          </span>
        )}
        <nav className="shell-view-tabs">
          <div className="file-menu-wrapper" ref={fileMenuRef}>
            <button
              className={`view-tab ${fileMenuOpen ? 'active' : ''}`}
              onClick={() => setFileMenuOpen(!fileMenuOpen)}
            >
              File
            </button>
            {fileMenuOpen && (
              <div className="file-dropdown">
                <button className="file-dropdown-item" onClick={handleQuickSave}>
                  Save
                </button>
                <button className="file-dropdown-item" onClick={() => { setShowSaveDialog(true); setFileMenuOpen(false); }}>
                  Save As...
                </button>
                <div className="file-dropdown-divider" />
                <button className="file-dropdown-item" onClick={() => { setShowOpenDialog(true); setFileMenuOpen(false); }}>
                  Open...
                </button>
                {recentSessions.length > 0 && (
                  <>
                    <div className="file-dropdown-divider" />
                    <div className="file-dropdown-label">Recent</div>
                    {recentSessions.slice(0, 5).map((s) => (
                      <button
                        key={s.name}
                        className="file-dropdown-item recent"
                        onClick={() => handleLoadRecent(s.name)}
                      >
                        {s.name}
                      </button>
                    ))}
                  </>
                )}
                <div className="file-dropdown-divider" />
                <button className="file-dropdown-item" onClick={() => { setShowSettings(true); setFileMenuOpen(false); }}>
                  Settings
                </button>
              </div>
            )}
          </div>
        </nav>
      </header>
      <main className="shell-main">
        <div className="shell-canvas">
          <FlowCanvas />
        </div>
      </main>
      <footer className="shell-footer">
        <FooterNote />
      </footer>
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
      {showSaveDialog && <SaveDialog onClose={() => setShowSaveDialog(false)} />}
      {showOpenDialog && <OpenDialog onClose={() => setShowOpenDialog(false)} />}
      <CostWidget appKey="shawndermind" />
    </div>
  );
}
