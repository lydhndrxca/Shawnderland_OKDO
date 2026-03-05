'use client';

import { useState, useCallback, useMemo } from 'react';
import { Download, Trash2 } from 'lucide-react';
import { ReactFlowProvider, type Node } from '@xyflow/react';
import ToolEditorCanvas from './ToolEditorCanvas';
import EditorToolDock from './EditorToolDock';
import PropertyPanel from './PropertyPanel';
import ExportDialog from './ExportDialog';
import { useToolEditorStore } from './useToolEditorStore';
import type { TENodeData } from './types';
import './ToolEditorShell.css';

function ToolEditorInner() {
  const { nodes, gridSize, selectedIds, setGridSize, updateNodeData, clearAll } = useToolEditorStore();
  const [exportOpen, setExportOpen] = useState(false);

  const selectedNode: Node<TENodeData> | null = useMemo(() => {
    if (selectedIds.length !== 1) return null;
    return nodes.find((n) => n.id === selectedIds[0]) ?? null;
  }, [nodes, selectedIds]);

  const handleUpdate = useCallback(
    (id: string, patch: Partial<TENodeData>) => updateNodeData(id, patch),
    [updateNodeData],
  );

  return (
    <div className="te-shell">
      {/* toolbar */}
      <header className="te-toolbar">
        <div className="te-toolbar-left">
          <h1 className="te-toolbar-title">Tool Editor</h1>
          <span className="te-toolbar-hint">Drag templates from the left panel onto the canvas</span>
        </div>
        <div className="te-toolbar-right">
          <button className="te-toolbar-btn" onClick={clearAll} title="Clear canvas">
            <Trash2 size={14} />
            <span>Clear</span>
          </button>
          <button className="te-toolbar-btn te-toolbar-export" onClick={() => setExportOpen(true)} title="Export">
            <Download size={14} />
            <span>Export</span>
          </button>
        </div>
      </header>

      {/* main area */}
      <div className="te-main">
        <EditorToolDock gridSize={gridSize} onGridSizeChange={setGridSize} />
        <ToolEditorCanvas />
        <PropertyPanel node={selectedNode} onUpdate={handleUpdate} />
      </div>

      <ExportDialog open={exportOpen} onClose={() => setExportOpen(false)} />
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
