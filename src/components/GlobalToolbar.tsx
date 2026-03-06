"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { Undo2, Redo2, Copy, Maximize2, Trash2, Upload, Download, PackageCheck, LayoutGrid, ChevronDown, Layers } from 'lucide-react';
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
  onExportAll?: () => void;
  onExportSelected?: () => void;
  onImportLayout?: () => void;

  onSaveLayoutNamed?: (name: string) => void;
  onLoadLayout?: (name: string) => void;
  onSetDefault?: () => void;
  onDeleteLayout?: (name: string) => void;
  savedLayouts?: SavedLayoutEntry[];

  /** @deprecated use onSaveLayoutNamed */
  onSaveLayout?: () => void;
  /** @deprecated use onImportLayout */
  onImport?: () => void;
  /** @deprecated use onSaveLayoutNamed */
  onSave?: () => void;
  /** @deprecated use onExportSelected */
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
  onExportAll,
  onExportSelected,
  onImportLayout,
  onSaveLayoutNamed,
  onLoadLayout,
  onSetDefault,
  onDeleteLayout,
  savedLayouts,
  onSaveLayout,
  onImport,
  onSave,
  onExport,
}: GlobalToolbarProps) {
  const handleImport = onImportLayout ?? onImport;
  const handleExportSelected = onExportSelected ?? onExport;
  const hasLayoutSystem = !!(onSaveLayoutNamed || onLoadLayout || onSetDefault);
  const legacySave = onSaveLayout ?? onSave;

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [savePrompt, setSavePrompt] = useState(false);
  const [saveName, setSaveName] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!dropdownOpen) return;
    const close = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as HTMLElement)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [dropdownOpen]);

  useEffect(() => {
    if (savePrompt) inputRef.current?.focus();
  }, [savePrompt]);

  const handleSaveSubmit = useCallback(() => {
    const name = saveName.trim();
    if (!name || !onSaveLayoutNamed) return;
    onSaveLayoutNamed(name);
    setSaveName('');
    setSavePrompt(false);
    setDropdownOpen(false);
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
        {onExportAll && (
          <button className="global-toolbar-btn" onClick={onExportAll} title="Export all to JSON + clipboard">
            <Download size={14} />
            <span>Export All</span>
          </button>
        )}
        {handleExportSelected && (
          <button className="global-toolbar-btn" onClick={handleExportSelected} disabled={!hasSelection} title="Export selected to JSON + clipboard">
            <PackageCheck size={14} />
            <span>Export Selected</span>
          </button>
        )}

        {hasLayoutSystem ? (
          <div className="layout-dropdown-wrapper" ref={dropdownRef}>
            <button
              className="global-toolbar-btn"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              title="Layout options"
            >
              <Layers size={14} />
              <span>Layout</span>
              <ChevronDown size={12} />
            </button>

            {dropdownOpen && (
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
                    {onSetDefault && (
                      <button className="layout-menu-btn" onClick={() => { onSetDefault(); setDropdownOpen(false); }}>
                        Set as Default
                      </button>
                    )}
                    {handleImport && (
                      <button className="layout-menu-btn" onClick={() => { handleImport(); setDropdownOpen(false); }}>
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
                                onClick={() => { onLoadLayout?.(l.name); setDropdownOpen(false); }}
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
