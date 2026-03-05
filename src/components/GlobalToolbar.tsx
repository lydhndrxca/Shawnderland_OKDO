"use client";

import { Undo2, Redo2, Copy, Maximize2, Trash2, Upload, Save, Download } from 'lucide-react';
import './GlobalToolbar.css';

interface GlobalToolbarProps {
  title: string;
  hint?: string;
  canUndo?: boolean;
  canRedo?: boolean;
  hasSelection?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onDuplicate?: () => void;
  onFitView?: () => void;
  onClear?: () => void;
  onImport?: () => void;
  onSave?: () => void;
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
  onClear,
  onImport,
  onSave,
  onExport,
}: GlobalToolbarProps) {
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
        <div className="global-toolbar-sep" />
        {onClear && (
          <button className="global-toolbar-btn" onClick={onClear} title="Clear canvas">
            <Trash2 size={14} />
            <span>Clear</span>
          </button>
        )}
        {onImport && (
          <button className="global-toolbar-btn" onClick={onImport} title="Import layout">
            <Upload size={14} />
            <span>Import</span>
          </button>
        )}
        {onSave && (
          <button className="global-toolbar-btn" onClick={onSave} title="Save">
            <Save size={14} />
            <span>Save</span>
          </button>
        )}
        {onExport && (
          <button className="global-toolbar-btn global-toolbar-export" onClick={onExport} title="Export">
            <Download size={14} />
            <span>Export</span>
          </button>
        )}
      </div>
    </header>
  );
}
