"use client";

import { useState, useRef, useEffect, useCallback, useSyncExternalStore } from 'react';
import SettingsPanel from './SettingsPanel';
import FooterNote from './FooterNote';
import FlowCanvas from '@/app/ideation/canvas/FlowCanvas';
import SaveDialog from './SaveDialog';
import OpenDialog from './OpenDialog';
import { useSession } from '@/lib/ideation/context/SessionContext';
import { subscribeCosts, getSnapshot, resetCosts, type CostSnapshot } from '@/lib/ideation/engine/provider/costTracker';
import { exportForResearch, downloadResearchExport } from '@/lib/ideation/engine/generationLog';
import './Shell.css';

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function formatCost(cost: number): string {
  if (cost < 0.0001) return '$0.0000';
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(4)}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' +
    d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export default function Shell() {
  const { loaded, loadWarning, dismissLoadWarning, session, saveSessionAs, listSavedSessions, loadSessionByName } = useSession();
  const [showSettings, setShowSettings] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showOpenDialog, setShowOpenDialog] = useState(false);
  const [fileMenuOpen, setFileMenuOpen] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);
  const [recentSessions, setRecentSessions] = useState<Array<{ name: string; savedAt: string }>>([]);
  const fileMenuRef = useRef<HTMLDivElement>(null);
  const debugRef = useRef<HTMLDivElement>(null);
  const cost = useSyncExternalStore(subscribeCosts, getSnapshot, getSnapshot);

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
    if (!debugOpen) return;
    const handler = (e: MouseEvent) => {
      if (debugRef.current && !debugRef.current.contains(e.target as Node)) {
        setDebugOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [debugOpen]);

  useEffect(() => {
    if (fileMenuOpen) {
      listSavedSessions().then(setRecentSessions);
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
        <div className="shell-brand">ShawnderMind</div>
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
        <div className="debug-wrapper" ref={debugRef}>
          <button
            className={`debug-btn ${debugOpen ? 'active' : ''} ${cost.apiCalls > 0 ? 'has-data' : ''}`}
            onClick={() => setDebugOpen(!debugOpen)}
            title="API usage & costs"
          >
            <span className="debug-btn-icon">&#x26A1;</span>
            {cost.apiCalls > 0 && (
              <span className="debug-btn-cost">{formatCost(cost.estimatedCost)}</span>
            )}
          </button>
          {debugOpen && <DebugPanel cost={cost} />}
        </div>
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
    </div>
  );
}

function DebugPanel({ cost }: { cost: CostSnapshot }) {
  const models = Object.entries(cost.byModel);

  return (
    <div className="debug-panel">
      <div className="debug-panel-header">
        <span className="debug-panel-title">API Usage</span>
        <span className="debug-panel-badge">{cost.apiCalls} calls</span>
      </div>

      <div className="debug-stats">
        {/* Overall totals */}
        <div className="debug-stat-row debug-stat-total">
          <span className="debug-stat-label">Estimated Total</span>
          <span className="debug-stat-value debug-stat-cost">{formatCost(cost.estimatedCost)}</span>
        </div>

        {cost.totalTokens > 0 && (
          <>
            <div className="debug-stat-row">
              <span className="debug-stat-label">Input Tokens</span>
              <span className="debug-stat-value">{formatTokens(cost.inputTokens)}</span>
            </div>
            <div className="debug-stat-row">
              <span className="debug-stat-label">Output Tokens</span>
              <span className="debug-stat-value">{formatTokens(cost.outputTokens)}</span>
            </div>
          </>
        )}

        {/* Per-model breakdown */}
        {models.length > 0 && (
          <>
            <div className="debug-stat-divider" />
            <div className="debug-section-label">By Model</div>
            {models.map(([name, usage]) => (
              <div key={name} className="debug-model-block">
                <div className="debug-model-name">
                  <span>{name}</span>
                  <span className="debug-model-calls">{usage.calls}x</span>
                </div>
                <div className="debug-model-details">
                  {usage.inputTokens > 0 && (
                    <span>{formatTokens(usage.inputTokens)} in</span>
                  )}
                  {usage.outputTokens > 0 && (
                    <span>{formatTokens(usage.outputTokens)} out</span>
                  )}
                  {usage.imagesGenerated > 0 && (
                    <span>{usage.imagesGenerated} img{usage.imagesGenerated !== 1 ? 's' : ''}</span>
                  )}
                  {usage.videoSeconds > 0 && (
                    <span>{usage.videoSeconds}s video</span>
                  )}
                  <span className="debug-model-cost">{formatCost(usage.cost)}</span>
                </div>
              </div>
            ))}
          </>
        )}

        <div className="debug-stat-divider" />
        <div className="debug-stat-row">
          <span className="debug-stat-label">Tracking Since</span>
          <span className="debug-stat-value debug-stat-date">{formatDate(cost.firstCallAt)}</span>
        </div>
        <div className="debug-stat-row">
          <span className="debug-stat-label">Last Call</span>
          <span className="debug-stat-value debug-stat-date">{formatDate(cost.lastCallAt)}</span>
        </div>
      </div>

      <div className="debug-pricing-note">
        Flash: $0.10/$0.40 per 1M tok &middot; Imagen: $0.03-0.04/img &middot; Veo: $0.35/sec
      </div>
      <div className="debug-actions">
        <button className="debug-reset-btn" onClick={resetCosts}>
          Reset Counter
        </button>
        <button className="debug-export-btn" onClick={async () => {
          const data = await exportForResearch();
          downloadResearchExport(data);
        }}>
          Export Research Log
        </button>
      </div>
    </div>
  );
}
