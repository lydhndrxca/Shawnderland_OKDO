"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { Undo2, Redo2, Copy, Maximize2, Trash2, Upload, Download, LayoutGrid, ChevronDown, Layers } from 'lucide-react';
import './GlobalToolbar.css';

export interface SavedLayoutEntry {
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
}: GlobalToolbarProps) {
  const handleImport = onImportLayout ?? onImport;
  const hasLayoutSystem = !!(onSaveLayoutNamed || onLoadLayout || onSetDefault);
  const legacySave = onSaveLayout ?? onSave;

  const hasExportSystem = !!(onExportSelectedNodesOnly || onExportSelectedWithConnections || onExportAllNodesOnly || onExportAllWithConnections);
  const legacyExportAll = onExportAll;
  const legacyExportSelected = onExportSelected ?? onExport;

  const [layoutDropdownOpen, setLayoutDropdownOpen] = useState(false);
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [savePrompt, setSavePrompt] = useState(false);
  const [saveName, setSaveName] = useState('');
  const layoutRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!layoutDropdownOpen && !exportDropdownOpen) return;
    const close = (e: MouseEvent) => {
      if (layoutDropdownOpen && layoutRef.current && !layoutRef.current.contains(e.target as HTMLElement)) {
        setLayoutDropdownOpen(false);
      }
      if (exportDropdownOpen && exportRef.current && !exportRef.current.contains(e.target as HTMLElement)) {
        setExportDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [layoutDropdownOpen, exportDropdownOpen]);

  useEffect(() => {
    if (savePrompt) inputRef.current?.focus();
  }, [savePrompt]);

  const handleSaveSubmit = useCallback(() => {
    const name = saveName.trim();
    if (!name || !onSaveLayoutNamed) return;
    onSaveLayoutNamed(name);
    setSaveName('');
    setSavePrompt(false);
    setLayoutDropdownOpen(false);
  }, [saveName, onSaveLayoutNamed]);

  return (
    <header className="global-toolbar">
      <div className="global-toolbar-left">
        <h1 className="global-toolbar-title">{title}</h1>
        {hint && <span className="global-toolbar-hint">{hint}</span>}
      </div>
      <div className="global-toolbar-right">
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

        {onClear && (
          <button className="global-toolbar-btn" onClick={onClear} title="Clear canvas">
            <Trash2 size={14} />
            <span>Clear</span>
          </button>
        )}
      </div>
    </header>
  );
}
