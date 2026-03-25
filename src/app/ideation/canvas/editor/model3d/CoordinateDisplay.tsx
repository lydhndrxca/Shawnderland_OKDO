"use client";

import { useCallback, useState } from 'react';
import * as THREE from 'three';
import { useModel3DEditor } from './Model3DEditorContext';

const UU_PER_UNIT = 100;

function NumInput({ label, value, color, onChange }: {
  label: string; value: number; color: string; onChange: (v: number) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <span className="m3d-props-xyz-label" style={{ color }}>{label}</span>
      <input
        className="m3d-props-input"
        type="number"
        step={0.01}
        value={Number(value.toFixed(3))}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: '100%' }}
      />
    </div>
  );
}

function Section({ id, title, children, defaultCollapsed = false }: {
  id: string; title: string; children: React.ReactNode; defaultCollapsed?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  return (
    <div className={`m3d-props-section ${collapsed ? 'collapsed' : ''}`}>
      <div className="m3d-props-title" onClick={() => setCollapsed(!collapsed)}>{title}</div>
      {!collapsed && children}
    </div>
  );
}

export function PropertiesPanel() {
  const { state, actions } = useModel3DEditor();
  const pos = state.position;
  const rot = state.rotation;
  const scl = state.scale;

  const setPos = useCallback((axis: 'x' | 'y' | 'z', v: number) => {
    const p = pos.clone(); p[axis] = v; actions.setPosition(p);
  }, [pos, actions]);

  const setRot = useCallback((axis: 'x' | 'y' | 'z', deg: number) => {
    const r = rot.clone(); r[axis] = (deg * Math.PI) / 180; actions.setRotation(r);
  }, [rot, actions]);

  const setScl = useCallback((axis: 'x' | 'y' | 'z', v: number) => {
    const s = scl.clone(); s[axis] = v; actions.setScale(s);
  }, [scl, actions]);

  const sizeUU = state.modelSize ? {
    h: Math.round(state.modelSize.y * UU_PER_UNIT * scl.y),
    w: Math.round(state.modelSize.x * UU_PER_UNIT * scl.x),
    d: Math.round(state.modelSize.z * UU_PER_UNIT * scl.z),
  } : null;

  return (
    <div className="m3d-props-panel">
      {/* Transform */}
      <Section id="transform" title="Transform">
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 4, fontWeight: 600 }}>Position</div>
          <div className="m3d-props-xyz">
            <NumInput label="X" value={pos.x} color="#f44336" onChange={(v) => setPos('x', v)} />
            <NumInput label="Y" value={pos.y} color="#4caf50" onChange={(v) => setPos('y', v)} />
            <NumInput label="Z" value={pos.z} color="#2196f3" onChange={(v) => setPos('z', v)} />
          </div>
        </div>
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 4, fontWeight: 600 }}>Rotation (deg)</div>
          <div className="m3d-props-xyz">
            <NumInput label="X" value={(rot.x * 180) / Math.PI} color="#f44336" onChange={(v) => setRot('x', v)} />
            <NumInput label="Y" value={(rot.y * 180) / Math.PI} color="#4caf50" onChange={(v) => setRot('y', v)} />
            <NumInput label="Z" value={(rot.z * 180) / Math.PI} color="#2196f3" onChange={(v) => setRot('z', v)} />
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 4, fontWeight: 600 }}>Scale</div>
          <div className="m3d-props-xyz">
            <NumInput label="X" value={scl.x} color="#f44336" onChange={(v) => setScl('x', v)} />
            <NumInput label="Y" value={scl.y} color="#4caf50" onChange={(v) => setScl('y', v)} />
            <NumInput label="Z" value={scl.z} color="#2196f3" onChange={(v) => setScl('z', v)} />
          </div>
        </div>
      </Section>

      {/* Dimensions */}
      {sizeUU && (
        <Section id="dims" title="Dimensions (UU)">
          <div className="m3d-props-grid">
            <span className="m3d-props-label" style={{ color: '#6c63ff' }}>H</span>
            <span style={{ fontSize: 13, color: '#ccc', fontFamily: 'monospace' }}>{sizeUU.h}</span>
            <span className="m3d-props-label" style={{ color: '#4db6ac' }}>W</span>
            <span style={{ fontSize: 13, color: '#ccc', fontFamily: 'monospace' }}>{sizeUU.w}</span>
            <span className="m3d-props-label" style={{ color: '#ff6e40' }}>D</span>
            <span style={{ fontSize: 13, color: '#ccc', fontFamily: 'monospace' }}>{sizeUU.d}</span>
          </div>
        </Section>
      )}

      {/* Pivot */}
      <Section id="pivot" title="Pivot">
        <div style={{ fontSize: 12, color: '#aaa', fontFamily: 'monospace', marginBottom: 8 }}>
          {state.pivotOffset.x.toFixed(2)}, {state.pivotOffset.y.toFixed(2)}, {state.pivotOffset.z.toFixed(2)}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="m3d-props-btn secondary" onClick={actions.snapPivotToBottom} style={{ flex: 1 }}>
            Bottom
          </button>
          <button className="m3d-props-btn secondary" onClick={actions.snapPivotToCenter} style={{ flex: 1 }}>
            Center
          </button>
        </div>
      </Section>

      {/* Snapping */}
      <Section id="snapping" title="Snapping">
        <div className="m3d-snap-row">
          <button
            className={`m3d-snap-toggle ${state.gridSnap.enabled ? 'active' : ''}`}
            onClick={() => actions.setGridSnap({ enabled: !state.gridSnap.enabled })}
          >
            Grid
          </button>
          <select
            className="m3d-snap-select"
            value={state.gridSnap.value}
            onChange={(e) => actions.setGridSnap({ value: Number(e.target.value) })}
          >
            {[10, 50, 100, 200, 300, 400, 500].map((v) => (
              <option key={v} value={v}>{v} UU</option>
            ))}
          </select>
        </div>
        <div className="m3d-snap-row" style={{ marginTop: 6 }}>
          <button
            className={`m3d-snap-toggle ${state.rotateSnap.enabled ? 'active' : ''}`}
            onClick={() => actions.setRotateSnap({ enabled: !state.rotateSnap.enabled })}
          >
            Rotate
          </button>
          <select
            className="m3d-snap-select"
            value={state.rotateSnap.value}
            onChange={(e) => actions.setRotateSnap({ value: Number(e.target.value) })}
          >
            {[5, 10, 15, 30, 45, 90].map((v) => (
              <option key={v} value={v}>{v}°</option>
            ))}
          </select>
        </div>
        <div className="m3d-snap-row" style={{ marginTop: 6 }}>
          <button
            className={`m3d-snap-toggle ${state.scaleSnap.enabled ? 'active' : ''}`}
            onClick={() => actions.setScaleSnap({ enabled: !state.scaleSnap.enabled })}
          >
            Scale
          </button>
          <select
            className="m3d-snap-select"
            value={state.scaleSnap.value}
            onChange={(e) => actions.setScaleSnap({ value: Number(e.target.value) })}
          >
            {[10, 50, 100, 200, 300, 400, 500].map((v) => (
              <option key={v} value={v}>{v} UU</option>
            ))}
          </select>
        </div>
      </Section>

      {/* Reference Blocks */}
      <Section id="refblocks" title="Reference Blocks">
        <div className="m3d-refblock-presets">
          {[128, 256, 512, 500].map((size) => (
            <button
              key={size}
              className="m3d-props-btn secondary"
              onClick={() => actions.addRefBlock(size)}
              style={{ flex: 1, padding: '5px 2px' }}
            >
              {size}
            </button>
          ))}
        </div>
        {state.refBlocks.length > 0 && (
          <div className="m3d-refblock-list">
            {state.refBlocks.map((block) => (
              <div
                key={block.id}
                className={`m3d-refblock-item ${state.selectedBlockId === block.id ? 'selected' : ''}`}
                onClick={() => actions.setSelectedBlock(block.id)}
              >
                <span className="m3d-refblock-label">{block.sizeUU}×{block.sizeUU}</span>
                <button
                  className="m3d-refblock-action"
                  onClick={(e) => { e.stopPropagation(); actions.toggleBlockVisibility(block.id); }}
                  title={block.visible ? 'Hide' : 'Show'}
                >
                  {block.visible ? '👁' : '👁‍🗨'}
                </button>
                <button
                  className="m3d-refblock-action"
                  onClick={(e) => { e.stopPropagation(); actions.duplicateRefBlock(block.id); }}
                  title="Duplicate (Ctrl+D)"
                >
                  ⧉
                </button>
                <button
                  className="m3d-refblock-action del"
                  onClick={(e) => { e.stopPropagation(); actions.removeRefBlock(block.id); }}
                  title="Delete"
                >
                  ✕
                </button>
              </div>
            ))}
            <button className="m3d-props-btn secondary" onClick={actions.clearAllBlocks} style={{ marginTop: 6 }}>
              Clear All
            </button>
          </div>
        )}
      </Section>

      {/* FFD Modifier */}
      <Section id="ffd" title="FFD Modifier" defaultCollapsed={!state.ffd.enabled}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          <button
            className={`m3d-props-btn ${state.ffd.enabled ? '' : 'secondary'}`}
            onClick={() => actions.setFFDEnabled(!state.ffd.enabled)}
          >
            {state.ffd.enabled ? 'Disable FFD' : 'Enable FFD'}
          </button>
        </div>
        {state.ffd.enabled && (
          <>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 6, fontWeight: 600 }}>Grid Divisions</div>
            <div className="m3d-ffd-grid">
              {(['x', 'y', 'z'] as const).map((axis) => (
                <div key={axis} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: axis === 'x' ? '#f44336' : axis === 'y' ? '#4caf50' : '#2196f3' }}>
                    {axis.toUpperCase()}
                  </span>
                  <input
                    className="m3d-ffd-input"
                    type="number"
                    min={1}
                    max={8}
                    value={state.ffd.divisions[axis]}
                    onChange={(e) => {
                      const v = Math.max(1, Math.min(8, Number(e.target.value)));
                      actions.setFFDDivisions({ ...state.ffd.divisions, [axis]: v });
                    }}
                  />
                </div>
              ))}
            </div>
            {state.ffd.selectedPointIndices.length > 0 && (
              <div style={{ fontSize: 11, color: '#ff6e40', marginTop: 6 }}>
                {state.ffd.selectedPointIndices.length} point{state.ffd.selectedPointIndices.length > 1 ? 's' : ''} selected — drag to deform
              </div>
            )}
            <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
              Hold Shift + drag to select points
            </div>
          </>
        )}
      </Section>

      {/* Actions */}
      <Section id="actions" title="Actions">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button className="m3d-props-btn" onClick={() => { actions.pushUndo('Center to origin'); actions.centerToOrigin(); }}>Center to Origin</button>
          <button className="m3d-props-btn secondary" onClick={() => { actions.pushUndo('Reset transform'); actions.resetTransform(); }}>Reset Transform</button>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              className="m3d-props-btn secondary"
              onClick={actions.undo}
              disabled={!state.canUndo}
              style={{ flex: 1 }}
            >
              Undo
            </button>
            <button
              className="m3d-props-btn secondary"
              onClick={actions.redo}
              disabled={!state.canRedo}
              style={{ flex: 1 }}
            >
              Redo
            </button>
          </div>
        </div>
      </Section>
    </div>
  );
}

export function StatusBar() {
  const { state } = useModel3DEditor();
  const pos = state.position;
  const rot = state.rotation;
  const scl = state.scale;

  const sizeUU = state.modelSize ? {
    h: Math.round(state.modelSize.y * UU_PER_UNIT * scl.y),
    w: Math.round(state.modelSize.x * UU_PER_UNIT * scl.x),
    d: Math.round(state.modelSize.z * UU_PER_UNIT * scl.z),
  } : null;

  return (
    <div className="m3d-statusbar">
      <span className="m3d-statusbar-label">Pos</span>
      <span className="m3d-statusbar-value">
        {pos.x.toFixed(2)}, {pos.y.toFixed(2)}, {pos.z.toFixed(2)}
      </span>
      <span className="m3d-statusbar-sep" />
      <span className="m3d-statusbar-label">Rot</span>
      <span className="m3d-statusbar-value">
        {((rot.x * 180) / Math.PI).toFixed(1)}°, {((rot.y * 180) / Math.PI).toFixed(1)}°, {((rot.z * 180) / Math.PI).toFixed(1)}°
      </span>
      <span className="m3d-statusbar-sep" />
      <span className="m3d-statusbar-label">Scl</span>
      <span className="m3d-statusbar-value">
        {scl.x.toFixed(2)}, {scl.y.toFixed(2)}, {scl.z.toFixed(2)}
      </span>
      {sizeUU && (
        <>
          <span className="m3d-statusbar-sep" />
          <span className="m3d-statusbar-label">Size</span>
          <span className="m3d-statusbar-value highlight">
            {sizeUU.h}×{sizeUU.w}×{sizeUU.d} UU
          </span>
        </>
      )}
      {state.ffd.enabled && (
        <>
          <span className="m3d-statusbar-sep" />
          <span className="m3d-statusbar-value" style={{ color: '#ff6e40' }}>
            FFD {state.ffd.divisions.x}×{state.ffd.divisions.y}×{state.ffd.divisions.z}
          </span>
        </>
      )}
      {state.gridSnap.enabled && (
        <>
          <span className="m3d-statusbar-sep" />
          <span className="m3d-statusbar-value" style={{ color: '#4db6ac' }}>
            Snap: {state.gridSnap.value} UU
          </span>
        </>
      )}
      {state.rotateSnap.enabled && (
        <>
          <span className="m3d-statusbar-sep" />
          <span className="m3d-statusbar-value" style={{ color: '#81c784' }}>
            Rot: {state.rotateSnap.value}°
          </span>
        </>
      )}
      {state.scaleSnap.enabled && (
        <>
          <span className="m3d-statusbar-sep" />
          <span className="m3d-statusbar-value" style={{ color: '#7e57c2' }}>
            ScaleSnap: {state.scaleSnap.value} UU
          </span>
        </>
      )}
      {state.refBlocks.length > 0 && (
        <>
          <span className="m3d-statusbar-sep" />
          <span className="m3d-statusbar-value">
            Blocks: {state.refBlocks.length}
          </span>
        </>
      )}
    </div>
  );
}
