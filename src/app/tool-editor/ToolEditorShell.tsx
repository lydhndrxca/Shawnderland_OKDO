'use client';

import { useState, useCallback, useMemo } from 'react';
import { Download, Trash2, Save, Upload, Undo2, Redo2, Maximize2, Copy } from 'lucide-react';
import { ReactFlowProvider, useReactFlow, type Node, type Edge } from '@xyflow/react';
import ToolEditorCanvas from './ToolEditorCanvas';
import EditorToolDock from './EditorToolDock';
import PropertyPanel from './PropertyPanel';
import ExportDialog from './ExportDialog';
import SaveDialog from './SaveDialog';
import ImportDialog from './ImportDialog';
import { useToolEditorStore } from './useToolEditorStore';
import type { TENodeData } from './types';
import './ToolEditorShell.css';

function ToolEditorInner() {
  const {
    nodes, edges, gridSize, selectedIds, selectedEdgeIds,
    canUndo, canRedo,
    setGridSize, updateNodeData, clearAll,
    undo, redo, duplicateSelected, updateEdgeLabel,
  } = useToolEditorStore();

  const [exportOpen, setExportOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const rf = useReactFlow();

  const selectedNode: Node<TENodeData> | null = useMemo(() => {
    if (selectedIds.length !== 1) return null;
    return nodes.find((n) => n.id === selectedIds[0]) ?? null;
  }, [nodes, selectedIds]);

  const selectedEdge: Edge | null = useMemo(() => {
    if (selectedIds.length > 0 || selectedEdgeIds.length !== 1) return null;
    return edges.find((e) => e.id === selectedEdgeIds[0]) ?? null;
  }, [edges, selectedIds, selectedEdgeIds]);

  const handleUpdate = useCallback(
    (id: string, patch: Partial<TENodeData>) => updateNodeData(id, patch),
    [updateNodeData],
  );

  const handleEdgeLabelChange = useCallback(
    (edgeId: string, label: string) => updateEdgeLabel(edgeId, label),
    [updateEdgeLabel],
  );

  const handleFitView = useCallback(() => {
    rf.fitView({ padding: 0.15, duration: 300 });
  }, [rf]);

  return (
    <div className="te-shell">
      <header className="te-toolbar">
        <div className="te-toolbar-left">
          <h1 className="te-toolbar-title">Tool Editor</h1>
          <span className="te-toolbar-hint">Drag templates from the left panel onto the canvas</span>
        </div>
        <div className="te-toolbar-right">
          <button className="te-toolbar-btn" onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)">
            <Undo2 size={14} />
          </button>
          <button className="te-toolbar-btn" onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Y)">
            <Redo2 size={14} />
          </button>
          <div className="te-toolbar-sep" />
          <button className="te-toolbar-btn" onClick={duplicateSelected} disabled={selectedIds.length === 0} title="Duplicate selected (Ctrl+D)">
            <Copy size={14} />
          </button>
          <button className="te-toolbar-btn" onClick={handleFitView} title="Zoom to fit">
            <Maximize2 size={14} />
          </button>
          <div className="te-toolbar-sep" />
          <button className="te-toolbar-btn" onClick={clearAll} title="Clear canvas">
            <Trash2 size={14} />
            <span>Clear</span>
          </button>
          <button className="te-toolbar-btn" onClick={() => setImportOpen(true)} title="Import layout">
            <Upload size={14} />
            <span>Import</span>
          </button>
          <button className="te-toolbar-btn" onClick={() => setSaveOpen(true)} title="Save / Load layout">
            <Save size={14} />
            <span>Save</span>
          </button>
          <button className="te-toolbar-btn te-toolbar-export" onClick={() => setExportOpen(true)} title="Export">
            <Download size={14} />
            <span>Export</span>
          </button>
        </div>
      </header>

      <div className="te-main">
        <EditorToolDock gridSize={gridSize} onGridSizeChange={setGridSize} />
        <ToolEditorCanvas />
        <PropertyPanel
          node={selectedNode}
          edge={selectedEdge}
          onUpdate={handleUpdate}
          onEdgeLabelChange={handleEdgeLabelChange}
        />
      </div>

      <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} />
      <SaveDialog open={saveOpen} onClose={() => setSaveOpen(false)} />
      <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}

export default function ToolEditorShell() {
  return (
    <ReactFlowProvider>
      <ToolEditorInner />
    </ReactFlowProvider>
  );
}
