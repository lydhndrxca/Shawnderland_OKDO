"use client";

import { useEditor } from './EditorContext';
import { TOOL_LABELS } from './types';

export default function StatusBar() {
  const { zoom, imgSize, activeTool, cursorPos, editModel, activeSource, sources } = useEditor();

  return (
    <div className="ps-statusbar">
      <span>{Math.round(zoom * 100)}%</span>
      {imgSize.w > 0 && (
        <>
          <span className="ps-statusbar-sep" />
          <span>{imgSize.w} &times; {imgSize.h}</span>
        </>
      )}
      <span className="ps-statusbar-sep" />
      <span>{TOOL_LABELS[activeTool]}</span>
      {cursorPos && (
        <>
          <span className="ps-statusbar-sep" />
          <span>X: {cursorPos.imgX} Y: {cursorPos.imgY}</span>
        </>
      )}
      <span style={{ flex: 1 }} />
      {activeSource && (
        <span className="ps-statusbar-source">
          {activeSource.label}
          {sources.length > 1 && ` (${sources.indexOf(activeSource) + 1}/${sources.length})`}
        </span>
      )}
      <span className="ps-statusbar-sep" />
      <span className="ps-statusbar-model">
        {editModel === 'gemini-flash-image' ? 'NB2' : editModel === 'gemini-3-pro' ? 'NB Pro' : '2.5 Flash'}
      </span>
    </div>
  );
}
