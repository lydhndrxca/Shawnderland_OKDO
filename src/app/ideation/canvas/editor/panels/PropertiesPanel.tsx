"use client";

import { useEditor } from '../EditorContext';
import { TOOL_LABELS } from '../types';

export default function PropertiesPanel() {
  const { imgSize, zoom, activeImage, editModel, activeTool, brushSize, activeSource } = useEditor();

  const estimatedSize = activeImage
    ? `~${(activeImage.base64.length * 0.75 / 1024).toFixed(0)} KB`
    : '—';

  return (
    <div className="ps-props-panel">
      <div className="ps-props-section">
        <div className="ps-props-section-title">Image</div>
        <div className="ps-props-grid">
          <span className="ps-props-label">Source</span>
          <span className="ps-props-value">{activeSource?.label ?? '—'}</span>
          <span className="ps-props-label">Dimensions</span>
          <span className="ps-props-value">{imgSize.w ? `${imgSize.w} × ${imgSize.h}` : '—'}</span>
          <span className="ps-props-label">Est. Size</span>
          <span className="ps-props-value">{estimatedSize}</span>
          <span className="ps-props-label">Zoom</span>
          <span className="ps-props-value">{Math.round(zoom * 100)}%</span>
        </div>
      </div>
      <div className="ps-props-section">
        <div className="ps-props-section-title">Model</div>
        <div className="ps-props-grid">
          <span className="ps-props-label">Engine</span>
          <span className="ps-props-value">
            {editModel === 'gemini-flash-image' ? 'Nano Banana 2' : editModel === 'gemini-3-pro' ? 'Nano Banana Pro' : 'Gemini 2.5 Flash'}
          </span>
          <span className="ps-props-label">Output</span>
          <span className="ps-props-value">4K</span>
        </div>
      </div>
      <div className="ps-props-section">
        <div className="ps-props-section-title">Tool</div>
        <div className="ps-props-grid">
          <span className="ps-props-label">Active</span>
          <span className="ps-props-value">{TOOL_LABELS[activeTool]}</span>
          {(activeTool === 'brush' || activeTool === 'eraser') && (
            <>
              <span className="ps-props-label">Brush Size</span>
              <span className="ps-props-value">{brushSize}px</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
