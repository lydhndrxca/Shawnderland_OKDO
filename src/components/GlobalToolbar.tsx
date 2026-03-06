"use client";

import { Undo2, Redo2, Copy, Maximize2, Trash2, Upload, Save, Download, LayoutGrid } from 'lucide-react';
import './GlobalToolbar.css';

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
  onExportSelected?: () => void;
  onSaveLayout?: () => void;
  onImportLayout?: () => void;
  /** @deprecated use onImportLayout */
  onImport?: () => void;
  /** @deprecated use onSaveLayout */
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
  onExportSelected,
  onSaveLayout,
  onImportLayout,
  onImport,
  onSave,
  onExport,
}: GlobalToolbarProps) {
  const handleImport = onImportLayout ?? onImport;
  const handleSave = onSaveLayout ?? onSave;
  const handleExport = onExportSelected ?? onExport;

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
        {handleExport && (
          <button className="global-toolbar-btn" onClick={handleExport} disabled={!hasSelection} title="Export selected to JSON">
            <Download size={14} />
            <span>Export</span>
          </button>
        )}
        {handleSave && (
          <button className="global-toolbar-btn" onClick={handleSave} title="Save layout">
            <Save size={14} />
            <span>Save</span>
          </button>
        )}
        {handleImport && (
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
