"use client";

import { useState, useRef, useEffect, useCallback, useSyncExternalStore } from 'react';
import { Undo2, Redo2, Copy, Maximize2, Trash2, Upload, Download, LayoutGrid, ChevronDown, Layers, Save, XCircle, RotateCcw } from 'lucide-react';
import { cancelAll, getActiveCount, subscribe } from '@/lib/activeRequests';
import './GlobalToolbar.css';

export interface SavedLayoutEntry {
  name: string;
  savedAt: string;
}

export interface SavedSessionEntry {
  name: string;
  savedAt: string;
}

export interface GlobalToolbarProps {
  title: string;
  hint?: string;
  canUndo?: boolean;
  canRedo?: boolean;
  hasSelection?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onDuplicate?: () => void;
  onFitView?: () => void;
  onAutoLayout?: () => void;
  onClear?: () => void;
  onResetNodes?: () => void;
  onImportLayout?: () => void;

  onExportSelectedNodesOnly?: () => void;
  onExportSelectedWithConnections?: () => void;
  onExportAllNodesOnly?: () => void;
  onExportAllWithConnections?: () => void;

  onSaveLayoutNamed?: (name: string) => void;
  onLoadLayout?: (name: string) => void;
  onSetDefault?: () => void;
  onDeleteLayout?: (name: string) => void;
  onUpdateLayout?: () => void;
  activeLayoutName?: string | null;
  savedLayouts?: SavedLayoutEntry[];

  onSaveSessionNamed?: (name: string) => void;
  onSaveCurrentSession?: () => void;
  onLoadSession?: (name: string) => void;
  onDeleteSession?: (name: string) => void;
  onResetSession?: () => void;
  activeSessionName?: string | null;
  savedSessions?: SavedSessionEntry[];

  /** @deprecated */
  onExportAll?: () => void;
  /** @deprecated */
  onExportSelected?: () => void;
  /** @deprecated */
  onSaveLayout?: () => void;
  /** @deprecated */
  onImport?: () => void;
  /** @deprecated */
  onSave?: () => void;
  /** @deprecated */
  onExport?: () => void;
}

export default function GlobalToolbar({
  title,
  hint,
  canUndo = false,
  canRedo = false,
  hasSelection = false,
  onUndo,
  onRedo,
  onDuplicate,
  onFitView,
  onAutoLayout,
  onClear,
  onResetNodes,
  onImportLayout,
  onExportSelectedNodesOnly,
  onExportSelectedWithConnections,
  onExportAllNodesOnly,
  onExportAllWithConnections,
  onSaveLayoutNamed,
  onLoadLayout,
  onSetDefault,
  onDeleteLayout,
  onUpdateLayout,
  activeLayoutName,
  savedLayouts,
  onExportAll,
  onExportSelected,
  onSaveLayout,
  onImport,
  onSave,
  onExport,
  onSaveSessionNamed,
  onSaveCurrentSession,
  onLoadSession,
  onDeleteSession,
  onResetSession,
  activeSessionName,
  savedSessions,
}: GlobalToolbarProps) {
  const handleImport = onImportLayout ?? onImport;
  const hasLayoutSystem = !!(onSaveLayoutNamed || onLoadLayout || onSetDefault);
  const legacySave = onSaveLayout ?? onSave;
  const hasSessionSystem = !!(onSaveSessionNamed || onLoadSession);

  const activeRequestCount = useSyncExternalStore(subscribe, getActiveCount, getActiveCount);

  const hasExportSystem = !!(onExportSelectedNodesOnly || onExportSelectedWithConnections || onExportAllNodesOnly || onExportAllWithConnections);
  const legacyExportAll = onExportAll;
  const legacyExportSelected = onExportSelected ?? onExport;

  const [layoutDropdownOpen, setLayoutDropdownOpen] = useState(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [sessionDropdownOpen, setSessionDropdownOpen] = useState(false);
  const [savePrompt, setSavePrompt] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [sessionSavePrompt, setSessionSavePrompt] = useState(false);
  const [sessionSaveName, setSessionSaveName] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<'clear' | 'reset' | null>(null);
  const layoutRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const sessionRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sessionInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!layoutDropdownOpen && !exportDropdownOpen && !sessionDropdownOpen) return;
    const close = (e: MouseEvent) => {
      if (layoutDropdownOpen && layoutRef.current && !layoutRef.current.contains(e.target as HTMLElement)) {
        setLayoutDropdownOpen(false);
      }
      if (exportDropdownOpen && exportRef.current && !exportRef.current.contains(e.target as HTMLElement)) {
        setExportDropdownOpen(false);
      }
      if (sessionDropdownOpen && sessionRef.current && !sessionRef.current.contains(e.target as HTMLElement)) {
        setSessionDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [layoutDropdownOpen, exportDropdownOpen, sessionDropdownOpen]);

  useEffect(() => {
    if (savePrompt) inputRef.current?.focus();
  }, [savePrompt]);

  useEffect(() => {
    if (sessionSavePrompt) sessionInputRef.current?.focus();
  }, [sessionSavePrompt]);

  const handleSaveSubmit = useCallback(() => {
    const name = saveName.trim();
    if (!name || !onSaveLayoutNamed) return;
    onSaveLayoutNamed(name);
    setSaveName('');
    setSavePrompt(false);
    setLayoutDropdownOpen(false);
  }, [saveName, onSaveLayoutNamed]);

  const handleSessionSaveSubmit = useCallback(() => {
    const name = sessionSaveName.trim();
    if (!name || !onSaveSessionNamed) return;
    onSaveSessionNamed(name);
    setSessionSaveName('');
    setSessionSavePrompt(false);
    setSessionDropdownOpen(false);
  }, [sessionSaveName, onSaveSessionNamed]);

  return (
    <header className="global-toolbar">
      <div className="global-toolbar-left">
        <h1 className="global-toolbar-title">{title}</h1>
        {hint && <span className="global-toolbar-hint">{hint}</span>}
      </div>
      <div className="global-toolbar-right">
        {activeRequestCount > 0 && (
          <>
            <div className="global-toolbar-processing-bar" title={`${activeRequestCount} active API request${activeRequestCount > 1 ? 's' : ''}`}>
              <div className="global-toolbar-processing-glow" />
              <span className="global-toolbar-processing-text">
                Processing{activeRequestCount > 1 ? ` (${activeRequestCount})` : ''}…
              </span>
            </div>
            <button
              className="global-toolbar-btn global-toolbar-cancel-all"
              onClick={cancelAll}
              title={`Cancel all requests (${activeRequestCount} active)`}
            >
              <XCircle size={14} />
              <span>Cancel All</span>
            </button>
            <div className="global-toolbar-sep" />
          </>
        )}
        {onUndo && (
          <button className="global-toolbar-btn" onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl+Z)">
            <Undo2 size={14} />
          </button>
        )}
        {onRedo && (
          <button className="global-toolbar-btn" onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl+Y)">
            <Redo2 size={14} />
          </button>
        )}
        {(onUndo || onRedo) && <div className="global-toolbar-sep" />}
        {onDuplicate && (
          <button className="global-toolbar-btn" onClick={onDuplicate} disabled={!hasSelection} title="Duplicate selected (Ctrl+D)">
            <Copy size={14} />
          </button>
        )}
        {onFitView && (
          <button className="global-toolbar-btn" onClick={onFitView} title="Zoom to fit">
            <Maximize2 size={14} />
          </button>
        )}
        {onAutoLayout && (
          <button className="global-toolbar-btn" onClick={onAutoLayout} title="Auto-layout">
            <LayoutGrid size={14} />
          </button>
        )}
        <div className="global-toolbar-sep" />

        {/* ── Export dropdown ── */}
        {hasExportSystem ? (
          <div className="layout-dropdown-wrapper" ref={exportRef}>
            <button
              className="global-toolbar-btn"
              onClick={() => { setExportDropdownOpen(!exportDropdownOpen); setLayoutDropdownOpen(false); }}
              title="Export options"
            >
              <Download size={14} />
              <span>Export</span>
              <ChevronDown size={12} />
            </button>

            {exportDropdownOpen && (
              <div className="layout-dropdown-menu">
                {onExportSelectedNodesOnly && (
                  <button
                    className="layout-menu-btn"
                    disabled={!hasSelection}
                    onClick={() => { onExportSelectedNodesOnly(); setExportDropdownOpen(false); }}
                  >
                    Selected &mdash; nodes only
                  </button>
                )}
                {onExportSelectedWithConnections && (
                  <button
                    className="layout-menu-btn"
                    disabled={!hasSelection}
                    onClick={() => { onExportSelectedWithConnections(); setExportDropdownOpen(false); }}
                  >
                    Selected &mdash; with connections
                  </button>
                )}
                {(onExportSelectedNodesOnly || onExportSelectedWithConnections) &&
                  (onExportAllNodesOnly || onExportAllWithConnections) && (
                    <div className="layout-menu-sep" />
                  )}
                {onExportAllNodesOnly && (
                  <button
                    className="layout-menu-btn"
                    onClick={() => { onExportAllNodesOnly(); setExportDropdownOpen(false); }}
                  >
                    All &mdash; nodes only
                  </button>
                )}
                {onExportAllWithConnections && (
                  <button
                    className="layout-menu-btn"
                    onClick={() => { onExportAllWithConnections(); setExportDropdownOpen(false); }}
                  >
                    All &mdash; with connections
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <>
            {legacyExportAll && (
              <button className="global-toolbar-btn" onClick={legacyExportAll} title="Export all to JSON + clipboard">
                <Download size={14} />
                <span>Export All</span>
              </button>
            )}
            {legacyExportSelected && (
              <button className="global-toolbar-btn" onClick={legacyExportSelected} disabled={!hasSelection} title="Export selected to JSON + clipboard">
                <Download size={14} />
                <span>Export Selected</span>
              </button>
            )}
          </>
        )}

        {/* ── Layout dropdown ── */}
        {hasLayoutSystem ? (
          <div className="layout-dropdown-wrapper" ref={layoutRef}>
            <button
              className="global-toolbar-btn"
              onClick={() => { setLayoutDropdownOpen(!layoutDropdownOpen); setExportDropdownOpen(false); }}
              title="Layout options"
            >
              <Layers size={14} />
              <span>Layout</span>
              <ChevronDown size={12} />
            </button>

            {layoutDropdownOpen && (
              <div className="layout-dropdown-menu">
                {savePrompt ? (
                  <div className="layout-save-prompt">
                    <input
                      ref={inputRef}
                      className="layout-save-input"
                      value={saveName}
                      onChange={(e) => setSaveName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSaveSubmit(); if (e.key === 'Escape') setSavePrompt(false); }}
                      placeholder="Layout name..."
                    />
                    <div className="layout-save-actions">
                      <button className="layout-menu-btn layout-save-confirm" onClick={handleSaveSubmit} disabled={!saveName.trim()}>Save</button>
                      <button className="layout-menu-btn" onClick={() => setSavePrompt(false)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button className="layout-menu-btn" onClick={() => setSavePrompt(true)}>
                      Save Layout...
                    </button>
                    {onUpdateLayout && activeLayoutName && activeLayoutName !== '__default__' && (
                      <button
                        className="layout-menu-btn"
                        onClick={() => { onUpdateLayout(); setLayoutDropdownOpen(false); }}
                      >
                        Save Updated Layout ({activeLayoutName})
                      </button>
                    )}
                    {onSetDefault && (
                      <button className="layout-menu-btn" onClick={() => { onSetDefault(); setLayoutDropdownOpen(false); }}>
                        Set as Default
                      </button>
                    )}
                    {handleImport && (
                      <button className="layout-menu-btn" onClick={() => { handleImport(); setLayoutDropdownOpen(false); }}>
                        Import Layout...
                      </button>
                    )}
                    {savedLayouts && savedLayouts.length > 0 && (
                      <>
                        <div className="layout-menu-sep" />
                        <div className="layout-menu-label">Saved Layouts</div>
                        <div className="layout-menu-list">
                          {savedLayouts.map((l) => (
                            <div key={l.name} className="layout-menu-entry">
                              <button
                                className="layout-menu-btn layout-entry-load"
                                onClick={() => { onLoadLayout?.(l.name); setLayoutDropdownOpen(false); }}
                                title={`Saved ${new Date(l.savedAt).toLocaleString()}`}
                              >
                                {l.name === '__default__' ? '(Auto-saved default)' : l.name}
                              </button>
                              {onDeleteLayout && l.name !== '__default__' && (
                                <button
                                  className="layout-menu-delete"
                                  onClick={() => onDeleteLayout(l.name)}
                                  title="Delete this layout"
                                >
                                  &times;
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        ) : legacySave ? (
          <button className="global-toolbar-btn" onClick={legacySave} title="Save layout">
            <Layers size={14} />
            <span>Save Layout</span>
          </button>
        ) : null}

        {!hasLayoutSystem && handleImport && (
          <button className="global-toolbar-btn" onClick={handleImport} title="Import layout">
            <Upload size={14} />
            <span>Import</span>
          </button>
        )}

        {/* ── Session dropdown ── */}
        {hasSessionSystem && (
          <>
            <div className="global-toolbar-sep" />
            <div className="layout-dropdown-wrapper" ref={sessionRef}>
              <button
                className="global-toolbar-btn"
                onClick={() => { setSessionDropdownOpen(!sessionDropdownOpen); setLayoutDropdownOpen(false); setExportDropdownOpen(false); }}
                title="Session options"
              >
                <Save size={14} />
                <span>Session{activeSessionName ? `: ${activeSessionName}` : ''}</span>
                <ChevronDown size={12} />
              </button>

              {sessionDropdownOpen && (
                <div className="layout-dropdown-menu">
                  {sessionSavePrompt ? (
                    <div className="layout-save-prompt">
                      <input
                        ref={sessionInputRef}
                        className="layout-save-input"
                        value={sessionSaveName}
                        onChange={(e) => setSessionSaveName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSessionSaveSubmit(); if (e.key === 'Escape') setSessionSavePrompt(false); }}
                        placeholder="Session name..."
                      />
                      <div className="layout-save-actions">
                        <button className="layout-menu-btn layout-save-confirm" onClick={handleSessionSaveSubmit} disabled={!sessionSaveName.trim()}>Save</button>
                        <button className="layout-menu-btn" onClick={() => setSessionSavePrompt(false)}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {activeSessionName && onSaveCurrentSession && (
                        <button className="layout-menu-btn" onClick={() => { onSaveCurrentSession(); setSessionDropdownOpen(false); }}>
                          Save Session
                        </button>
                      )}
                      <button className="layout-menu-btn" onClick={() => setSessionSavePrompt(true)}>
                        Save Session As...
                      </button>
                      {onResetSession && (
                        <>
                          <div className="layout-menu-sep" />
                          <button
                            className="layout-menu-btn layout-menu-danger"
                            onClick={() => { onResetSession(); setSessionDropdownOpen(false); }}
                          >
                            Reset to Defaults
                          </button>
                        </>
                      )}
                      {savedSessions && savedSessions.length > 0 && (
                        <>
                          <div className="layout-menu-sep" />
                          <div className="layout-menu-label">Saved Sessions</div>
                          <div className="layout-menu-list">
                            {savedSessions.map((s) => (
                              <div key={s.name} className="layout-menu-entry">
                                <button
                                  className={`layout-menu-btn layout-entry-load ${s.name === activeSessionName ? 'layout-active' : ''}`}
                                  onClick={() => { onLoadSession?.(s.name); setSessionDropdownOpen(false); }}
                                  title={`Saved ${new Date(s.savedAt).toLocaleString()}`}
                                >
                                  {s.name}
                                </button>
                                {onDeleteSession && (
                                  <button
                                    className="layout-menu-delete"
                                    onClick={() => onDeleteSession(s.name)}
                                    title="Delete this session"
                                  >
                                    &times;
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {onResetNodes && (
          <button className="global-toolbar-btn" onClick={() => setConfirmDialog('reset')} title="Reset all node data (keep layout &amp; connections)">
            <RotateCcw size={14} />
            <span>Reset Node Data</span>
          </button>
        )}

        {onClear && (
          <button
            className="global-toolbar-btn global-toolbar-btn--danger"
            onClick={() => setConfirmDialog('clear')}
            title="Clear entire canvas — removes all nodes and data"
          >
            <Trash2 size={14} />
            <span>Clear Entire Canvas</span>
          </button>
        )}
      </div>

      {confirmDialog && (
        <div className="gt-confirm-overlay" onClick={() => setConfirmDialog(null)}>
          <div className="gt-confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <h3 className="gt-confirm-title">
              {confirmDialog === 'clear' ? 'Clear Entire Canvas?' : 'Reset Node Data?'}
            </h3>
            <p className="gt-confirm-message">
              {confirmDialog === 'clear'
                ? 'This will remove ALL nodes and ALL data from this session. This cannot be undone. If you just want to reset node data back to defaults (keeping layout and connections), use "Reset Node Data" instead.'
                : 'This will reset all nodes back to their default values. Your layout and connections will be preserved.'}
            </p>
            <div className="gt-confirm-actions">
              <button className="gt-confirm-btn gt-confirm-cancel" onClick={() => setConfirmDialog(null)}>Cancel</button>
              <button
                className={`gt-confirm-btn ${confirmDialog === 'clear' ? 'gt-confirm-danger' : 'gt-confirm-primary'}`}
                onClick={() => {
                  if (confirmDialog === 'clear') onClear?.();
                  else onResetNodes?.();
                  setConfirmDialog(null);
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
