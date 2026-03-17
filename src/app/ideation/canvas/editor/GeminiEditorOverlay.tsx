"use client";

import { useCallback, useEffect, useRef } from 'react';
import { EditorProvider, useEditor } from './EditorContext';
import MenuBar from './MenuBar';
import ToolBar from './ToolBar';
import OptionsBar from './OptionsBar';
import CanvasViewport from './CanvasViewport';
import PanelDock from './PanelDock';
import StatusBar from './StatusBar';
import ComparisonSlider from './ComparisonSlider';
import { TOOL_SHORTCUTS } from './types';
import './GeminiEditorOverlay.css';

interface Props {
  editorNodeId: string;
  onClose: () => void;
}

function EditorShell() {
  const ctx = useEditor();
  const spaceHeld = useRef(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === 'Escape') {
        if (ctx.pointPin) ctx.setPointPin(null);
        else ctx.onClose();
        return;
      }

      if (e.key === ' ' && !spaceHeld.current) {
        e.preventDefault();
        spaceHeld.current = true;
        ctx.setActiveTool('hand');
        return;
      }

      if (e.key === 'Tab') {
        e.preventDefault();
        ctx.setPanelsVisible((v) => !v);
        return;
      }

      if (e.key === '[') { e.preventDefault(); ctx.setBrushSize((s) => Math.max(3, s - (s > 20 ? 5 : 2))); return; }
      if (e.key === ']') { e.preventDefault(); ctx.setBrushSize((s) => Math.min(200, s + (s >= 20 ? 5 : 2))); return; }

      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault();
          if (ctx.historyEntries.length > 0) ctx.handleHistoryClick(0);
          return;
        }
        if (e.key === 'd') { e.preventDefault(); ctx.clearMask(); return; }
        if (e.key === '0') { e.preventDefault(); ctx.fitToView(); return; }
        if (e.key === '1') { e.preventDefault(); ctx.setZoom(1); ctx.setPan({ x: 0, y: 0 }); return; }
        return;
      }

      const tool = TOOL_SHORTCUTS[e.key.toLowerCase()];
      if (tool) {
        e.preventDefault();
        ctx.setActiveTool(tool);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ' && spaceHeld.current) {
        spaceHeld.current = false;
        ctx.setActiveTool(ctx.prevToolRef.current);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [ctx]);

  const handleBackdropClick = useCallback(() => ctx.onClose(), [ctx]);

  return (
    <div className="ps-editor-backdrop" onClick={handleBackdropClick}>
      <div className="ps-editor-panel" onClick={(e) => e.stopPropagation()}>
        <MenuBar />
        <div className="ps-editor-body">
          <ToolBar />
          <div className="ps-editor-main">
            <OptionsBar />
            <CanvasViewport />
            <ComparisonSlider />
          </div>
          <PanelDock />
        </div>
        <StatusBar />
      </div>
    </div>
  );
}

export default function GeminiEditorOverlay({ editorNodeId, onClose }: Props) {
  return (
    <EditorProvider editorNodeId={editorNodeId} onClose={onClose}>
      <EditorShell />
    </EditorProvider>
  );
}
