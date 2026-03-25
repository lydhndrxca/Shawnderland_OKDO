"use client";

import { useModel3DEditor, type EditorTool } from './Model3DEditorContext';

const TOOLS: { tool: EditorTool; icon: string; label: string; shortcut: string }[] = [
  { tool: 'select', icon: '⊙', label: 'Select', shortcut: 'Q' },
  { tool: 'move', icon: '✥', label: 'Move', shortcut: 'W' },
  { tool: 'rotate', icon: '↻', label: 'Rotate', shortcut: 'E' },
  { tool: 'scale', icon: '⤢', label: 'Scale', shortcut: 'R' },
];

export default function EditorToolbar() {
  const { state, actions } = useModel3DEditor();

  return (
    <div className="m3d-toolbar">
      <span className="m3d-tool-group-label">Transform</span>

      {TOOLS.map(({ tool, icon, label, shortcut }) => (
        <button
          key={tool}
          className={`m3d-tool-btn ${state.activeTool === tool ? 'active' : ''}`}
          onClick={() => actions.setActiveTool(tool)}
          title={`${label} (${shortcut})`}
        >
          {icon}
        </button>
      ))}

      <div className="m3d-tool-sep" />
      <span className="m3d-tool-group-label">Modifier</span>

      <button
        className={`m3d-tool-btn ${state.ffd.enabled ? 'active' : ''}`}
        onClick={() => actions.setFFDEnabled(!state.ffd.enabled)}
        title="FFD Modifier (F)"
      >
        ⊞
      </button>

      <div className="m3d-tool-sep" />
      <span className="m3d-tool-group-label">Pivot</span>

      <button
        className="m3d-tool-btn"
        onClick={actions.snapPivotToBottom}
        title="Pivot to Bottom (B)"
      >
        ⤓
      </button>

      <button
        className={`m3d-tool-btn ${state.pivotSnapMode ? 'active' : ''}`}
        onClick={() => actions.setPivotSnapMode(!state.pivotSnapMode)}
        title="Snap Pivot to Point"
      >
        ⊕
      </button>

      <button
        className="m3d-tool-btn"
        onClick={actions.centerToOrigin}
        title="Center to Origin (C)"
      >
        ⊹
      </button>

      <div className="m3d-tool-sep" />
      <span className="m3d-tool-group-label">Display</span>

      <button
        className={`m3d-tool-btn ${state.wireframe ? 'active' : ''}`}
        onClick={() => actions.setWireframe(!state.wireframe)}
        title="Wireframe"
      >
        ▦
      </button>

      <button
        className={`m3d-tool-btn ${state.showNormals ? 'active' : ''}`}
        onClick={() => actions.setShowNormals(!state.showNormals)}
        title="Normals"
      >
        N
      </button>

      <button
        className={`m3d-tool-btn ${state.gridSnap.enabled ? 'active' : ''}`}
        onClick={() => actions.setGridSnap({ enabled: !state.gridSnap.enabled })}
        title="Grid Snap (G)"
      >
        #
      </button>
    </div>
  );
}
