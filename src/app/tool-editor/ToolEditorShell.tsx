'use client';

import { useState, useCallback, useMemo, useRef } from 'react';
import { ReactFlowProvider, useReactFlow, type Node, type Edge } from '@xyflow/react';
import ToolEditorCanvas from './ToolEditorCanvas';
import EditorToolDock from './EditorToolDock';
import PropertyPanel from './PropertyPanel';
import ExportDialog from './ExportDialog';
import SaveDialog from './SaveDialog';
import ImportDialog from './ImportDialog';
import GlobalToolbar from '@/components/GlobalToolbar';
import CostWidget from '@/components/CostWidget';
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
      <GlobalToolbar
        title="Tool Editor"
        hint="Drag templates from the left panel onto the canvas"
        canUndo={canUndo}
        canRedo={canRedo}
        hasSelection={selectedIds.length > 0}
        onUndo={undo}
        onRedo={redo}
        onDuplicate={duplicateSelected}
        onFitView={handleFitView}
        onClear={clearAll}
        onImportLayout={() => setImportOpen(true)}
        onSaveLayout={() => setSaveOpen(true)}
        onExportSelected={() => setExportOpen(true)}
      />

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
      <CostWidget appKey="tool-editor" />
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
