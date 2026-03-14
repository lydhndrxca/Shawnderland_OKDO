"use client";

import { memo, useCallback, useRef, useEffect, useState } from 'react';
import { Handle, Position, useReactFlow, useStore } from '@xyflow/react';
import {
  saveContextPreset,
  listContextPresets,
  deleteContextPreset,
  gatherContextSnapshot,
  restoreContextSnapshot,
  type ContextPreset,
} from '@/lib/contextPresetStore';
import './CharacterNodes.css';

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

interface HubToggles {
  bible: boolean;
  lock: boolean;
  costume: boolean;
  styleFusion: boolean;
  environment: boolean;
}

const DEFAULT_TOGGLES: HubToggles = {
  bible: true,
  lock: true,
  costume: true,
  styleFusion: true,
  environment: true,
};

const SOURCE_TYPES: Record<keyof HubToggles, { types: string[]; label: string; color: string }> = {
  bible:        { types: ['charBible'],           label: 'Character Bible', color: '#d84315' },
  lock:         { types: ['charPreservationLock'], label: 'Preservation Lock', color: '#37474f' },
  costume:      { types: ['costumeDirector'],      label: 'Costume Director', color: '#ad1457' },
  styleFusion:  { types: ['charStyleFusion'],      label: 'Style Fusion', color: '#6a1b9a' },
  environment:  { types: ['envPlacement'],         label: 'Environment', color: '#1b5e20' },
};

const HUB_KEYS = Object.keys(SOURCE_TYPES) as (keyof HubToggles)[];

function ContextHubNodeInner({ id, data, selected }: Props) {
  const { setNodes, getEdges, getNode } = useReactFlow();
  const localEdit = useRef(false);

  const [hubActive, setHubActive] = useState<boolean>(() => (data?.hubActive as boolean) ?? true);

  const [toggles, setToggles] = useState<HubToggles>(() => ({
    ...DEFAULT_TOGGLES,
    ...((data?.hubToggles as Partial<HubToggles>) ?? {}),
  }));

  const [showPresetMenu, setShowPresetMenu] = useState(false);
  const [presets, setPresets] = useState<ContextPreset[]>([]);
  const [loadingPresets, setLoadingPresets] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [savePresetName, setSavePresetName] = useState('');
  const [presetMsg, setPresetMsg] = useState('');

  useEffect(() => {
    if (localEdit.current) { localEdit.current = false; return; }
    if (data?.hubToggles) setToggles((prev) => ({ ...prev, ...(data.hubToggles as Partial<HubToggles>) }));
    if (data?.hubActive !== undefined) setHubActive(data.hubActive as boolean);
  }, [data?.hubToggles, data?.hubActive]);

  const persist = useCallback(
    (updates: Record<string, unknown>) => {
      localEdit.current = true;
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...updates } } : n)),
      );
    },
    [id, setNodes],
  );

  const toggleMaster = useCallback(
    () => {
      const next = !hubActive;
      setHubActive(next);
      persist({ hubActive: next });
    },
    [hubActive, persist],
  );

  const toggle = useCallback(
    (key: keyof HubToggles) => {
      const next = { ...toggles, [key]: !toggles[key] };
      setToggles(next);
      persist({ hubToggles: next });
    },
    [toggles, persist],
  );

  const connectedSig = useStore(
    useCallback(
      (s: { edges: Array<{ source: string; target: string }>; nodeLookup: Map<string, { type?: string }> }) => {
        const incoming = s.edges.filter((e) => e.target === id);
        const types: string[] = [];
        for (const e of incoming) {
          const src = s.nodeLookup.get(e.source);
          if (src?.type) types.push(src.type);
        }
        return types.sort().join(',');
      },
      [id],
    ),
  );

  const connectedTypes = new Set(connectedSig.split(',').filter(Boolean));

  const activeCount = HUB_KEYS.filter((k) => toggles[k]).length;

  const handleSavePreset = useCallback(async () => {
    const name = savePresetName.trim();
    if (!name) return;
    const snapshots = gatherContextSnapshot(
      id,
      getNode as (nid: string) => { id: string; type?: string; data: Record<string, unknown> } | undefined,
      getEdges as () => Array<{ source: string; target: string }>,
    );
    const preset: ContextPreset = {
      id: `ctx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      hubToggles: { ...toggles },
      nodes: snapshots,
      savedAt: new Date().toISOString(),
    };
    await saveContextPreset(preset);
    setShowSaveDialog(false);
    setSavePresetName('');
    setPresetMsg(`Saved "${name}"`);
    setTimeout(() => setPresetMsg(''), 2000);
  }, [savePresetName, id, getNode, getEdges, toggles]);

  const handleLoadPresets = useCallback(async () => {
    if (showPresetMenu) { setShowPresetMenu(false); return; }
    setLoadingPresets(true);
    const list = await listContextPresets();
    setPresets(list);
    setLoadingPresets(false);
    setShowPresetMenu(true);
  }, [showPresetMenu]);

  const handleLoadPreset = useCallback(
    (preset: ContextPreset) => {
      const restored = restoreContextSnapshot(
        id,
        preset.nodes,
        getNode as (nid: string) => { id: string; type?: string; data: Record<string, unknown> } | undefined,
        getEdges as () => Array<{ source: string; target: string }>,
        setNodes,
      );
      const restoredToggles = { ...DEFAULT_TOGGLES, ...preset.hubToggles } as HubToggles;
      setToggles(restoredToggles);
      persist({ hubToggles: restoredToggles });
      setShowPresetMenu(false);
      setPresetMsg(`Loaded "${preset.name}" (${restored} node${restored !== 1 ? 's' : ''})`);
      setTimeout(() => setPresetMsg(''), 2500);
    },
    [id, getNode, getEdges, setNodes, persist],
  );

  const handleDeletePreset = useCallback(async (presetId: string) => {
    await deleteContextPreset(presetId);
    setPresets((prev) => prev.filter((p) => p.id !== presetId));
  }, []);

  return (
    <div className={`char-node ${selected ? 'selected' : ''}`} style={{
      minWidth: 260, maxWidth: 300,
      opacity: hubActive ? 1 : 0.5,
      transition: 'opacity 0.2s',
    }}>
      <Handle type="target" position={Position.Left} id="hub-in" className="char-handle" style={{ top: '50%' }} />
      <Handle type="source" position={Position.Right} id="hub-out" className="char-handle" style={{ top: '50%' }} />

      <div className="char-node-header" style={{ background: hubActive ? '#455a64' : '#37474f' }}>
        <span>Context Hub</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 9, background: 'rgba(0,0,0,0.2)', padding: '1px 6px', borderRadius: 8 }}>
            {hubActive ? `${activeCount}/${HUB_KEYS.length}` : 'OFF'}
          </span>
          <button
            className="nodrag"
            onClick={toggleMaster}
            title={hubActive ? 'Deactivate all context nodes' : 'Activate context nodes'}
            style={{
              background: hubActive ? '#4caf50' : '#ef5350',
              border: 'none',
              color: '#fff',
              fontSize: 9,
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 8,
              cursor: 'pointer',
              lineHeight: 1.4,
            }}
          >
            {hubActive ? 'ON' : 'OFF'}
          </button>
        </span>
      </div>

      <div className="char-node-body" style={{ gap: 4, pointerEvents: hubActive ? 'auto' : 'none', filter: hubActive ? 'none' : 'grayscale(1)' }}>
        {!hubActive && (
          <div style={{ fontSize: 10, color: '#ef5350', textAlign: 'center', fontWeight: 600, padding: '4px 0' }}>
            Context Hub is OFF — no context nodes will affect generation
          </div>
        )}

        {HUB_KEYS.map((key) => {
          const cfg = SOURCE_TYPES[key];
          const connected = cfg.types.some((t) => connectedTypes.has(t));
          return (
            <label key={key} className="nodrag" style={{
              display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
              padding: '5px 8px', borderRadius: 6,
              background: toggles[key] ? `${cfg.color}18` : 'rgba(255,255,255,0.02)',
              border: `1px solid ${toggles[key] ? `${cfg.color}55` : 'rgba(255,255,255,0.06)'}`,
              transition: 'all 0.15s',
              opacity: connected ? 1 : 0.45,
            }}>
              <input
                type="checkbox"
                checked={toggles[key]}
                onChange={() => toggle(key)}
                style={{ accentColor: cfg.color, width: 14, height: 14 }}
              />
              <span style={{
                flex: 1, fontSize: 11, fontWeight: 600,
                color: toggles[key] ? '#e0e0e0' : 'var(--text-muted)',
              }}>
                {cfg.label}
              </span>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: connected ? '#4caf50' : 'rgba(255,255,255,0.15)',
                flexShrink: 0,
              }} title={connected ? 'Connected' : 'Not connected'} />
            </label>
          );
        })}

        {/* Preset buttons */}
        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
          <button className="char-btn nodrag" onClick={() => { setShowSaveDialog(true); setSavePresetName(''); }}
            style={{ flex: 1, fontSize: 9, padding: '3px 6px', color: '#90caf9' }}>
            Save Preset
          </button>
          <button className="char-btn nodrag" onClick={handleLoadPresets}
            style={{ flex: 1, fontSize: 9, padding: '3px 6px', color: '#a5d6a7' }}>
            {showPresetMenu ? 'Hide' : 'Load Preset'}
          </button>
        </div>

        {/* Save dialog */}
        {showSaveDialog && (
          <div className="nodrag" style={{ display: 'flex', gap: 4, marginTop: 2 }}>
            <input
              className="char-input nodrag"
              value={savePresetName}
              onChange={(e) => setSavePresetName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSavePreset(); if (e.key === 'Escape') setShowSaveDialog(false); }}
              placeholder="Preset name..."
              autoFocus
              style={{ flex: 1, fontSize: 10 }}
            />
            <button className="char-btn nodrag" onClick={handleSavePreset}
              style={{ fontSize: 9, padding: '2px 6px' }}>Save</button>
            <button className="char-btn nodrag" onClick={() => setShowSaveDialog(false)}
              style={{ fontSize: 9, padding: '2px 6px' }}>Cancel</button>
          </div>
        )}

        {/* Load list */}
        {showPresetMenu && (
          <div className="nodrag nowheel" style={{
            maxHeight: 150, overflowY: 'auto', marginTop: 2,
            border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6,
          }}>
            {loadingPresets ? (
              <div style={{ padding: 8, fontSize: 10, color: 'var(--text-muted)', textAlign: 'center' }}>Loading...</div>
            ) : presets.length === 0 ? (
              <div style={{ padding: 8, fontSize: 10, color: 'var(--text-muted)', textAlign: 'center' }}>No saved presets</div>
            ) : (
              presets.map((p) => (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '4px 8px', borderBottom: '1px solid rgba(255,255,255,0.04)',
                }}>
                  <button className="nodrag" onClick={() => handleLoadPreset(p)}
                    style={{
                      flex: 1, background: 'none', border: 'none', color: '#e0e0e0',
                      fontSize: 10, textAlign: 'left', cursor: 'pointer', padding: 0,
                    }}>
                    <strong>{p.name}</strong>
                    <span style={{ fontSize: 8, color: 'var(--text-muted)', marginLeft: 6 }}>
                      {p.nodes.length} node{p.nodes.length !== 1 ? 's' : ''}
                    </span>
                  </button>
                  <button className="nodrag" onClick={() => handleDeletePreset(p.id)}
                    style={{ background: 'none', border: 'none', color: '#ef5350', fontSize: 12, cursor: 'pointer', padding: 0 }}>
                    &times;
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {presetMsg && (
          <div style={{ fontSize: 9, color: '#69f0ae', textAlign: 'center', marginTop: 2 }}>{presetMsg}</div>
        )}

        <div style={{
          fontSize: 9, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.4,
          textAlign: 'center', opacity: 0.7,
        }}>
          Toggle which context sources affect image generation.
          Unchecked sources are ignored during generation and edits.
        </div>
        <div style={{
          fontSize: 8, color: '#7e57c2', marginTop: 2, lineHeight: 1.3,
          textAlign: 'center', fontStyle: 'italic',
        }}>
          Style node is always active when connected (not controlled by this hub)
        </div>
      </div>
    </div>
  );
}

export default memo(ContextHubNodeInner);
