"use client";

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import '../character/CharacterNodes.css';

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

interface EnvData {
  location: string;
  timeOfDay: string;
  lighting: string;
  pose: string;
  props: string;
  camera: string;
  outputFormat: string;
}

const LOCATION_PRESETS = [
  '', 'Pacific Northwest rainforest', 'Abandoned summer camp', 'Urban alley — night',
  'Industrial warehouse', 'Gothic cathedral interior', 'Desert highway', 'Rooftop — city skyline',
  'Underground bunker', 'Victorian manor', 'Neon-lit street market', 'Frozen tundra',
  'Jungle temple ruins', 'Spaceship interior', 'Studio — solid grey backdrop',
];

const TIME_OPTIONS = [
  '', 'Dawn — cold blue', 'Golden hour — warm amber', 'Midday — harsh direct',
  'Overcast — soft diffused', 'Dusk — purple-orange', 'Night — moonlit',
  'Night — artificial light', 'Twilight — blue hour',
];

const LIGHTING_OPTIONS = [
  '', 'Dappled forest light', 'Harsh direct sun', 'Soft diffused overcast',
  'Rim-lit from behind', 'Campfire / torch light', 'Neon mixed color',
  'Studio three-point', 'Dramatic chiaroscuro', 'Volumetric fog',
  'Underwater caustics', 'Fluorescent industrial',
];

const POSE_PRESETS = [
  '', 'Standing — relaxed', 'Standing — soldier\'s stance', 'Walking toward camera',
  'Seated — throne / chair', 'Crouching — ready', 'Action — mid-combat',
  'Portrait 3/4 turn', 'Full body — arms at sides', 'From behind — looking over shoulder',
  'Silhouette — backlit',
];

const CAMERA_OPTIONS = [
  '', 'Full body', 'Waist up (cowboy)', 'Portrait — head & shoulders',
  'Extreme close-up', 'Wide establishing', 'Low angle — heroic',
  'High angle — vulnerable', 'Dutch angle — tension', 'Over-the-shoulder',
];

const FORMAT_OPTIONS = [
  '1:1 — square', '3:4 — portrait', '4:3 — landscape',
  '9:16 — vertical reel', '16:9 — cinematic wide', '2.39:1 — anamorphic',
];

const EMPTY: EnvData = {
  location: '', timeOfDay: '', lighting: '', pose: '', props: '', camera: '', outputFormat: '3:4 — portrait',
};

function EnvironmentPlacementNodeInner({ id, data, selected }: Props) {
  const { setNodes } = useReactFlow();
  const localEdit = useRef(false);

  const [env, setEnv] = useState<EnvData>(() => ({
    location: (data?.envLocation as string) ?? EMPTY.location,
    timeOfDay: (data?.envTimeOfDay as string) ?? EMPTY.timeOfDay,
    lighting: (data?.envLighting as string) ?? EMPTY.lighting,
    pose: (data?.envPose as string) ?? EMPTY.pose,
    props: (data?.envProps as string) ?? EMPTY.props,
    camera: (data?.envCamera as string) ?? EMPTY.camera,
    outputFormat: (data?.envOutputFormat as string) ?? EMPTY.outputFormat,
  }));
  const [customLocation, setCustomLocation] = useState((data?.envCustomLocation as string) ?? '');
  const [minimized, setMinimized] = useState(false);

  useEffect(() => {
    if (localEdit.current) { localEdit.current = false; return; }
    setEnv({
      location: (data?.envLocation as string) ?? '',
      timeOfDay: (data?.envTimeOfDay as string) ?? '',
      lighting: (data?.envLighting as string) ?? '',
      pose: (data?.envPose as string) ?? '',
      props: (data?.envProps as string) ?? '',
      camera: (data?.envCamera as string) ?? '',
      outputFormat: (data?.envOutputFormat as string) ?? '3:4 — portrait',
    });
    setCustomLocation((data?.envCustomLocation as string) ?? '');
  }, [data?.envLocation, data?.envTimeOfDay, data?.envLighting, data?.envPose, data?.envProps, data?.envCamera, data?.envOutputFormat, data?.envCustomLocation]);

  const persist = useCallback(
    (updates: Record<string, unknown>) => {
      localEdit.current = true;
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...updates } } : n)),
      );
    },
    [id, setNodes],
  );

  const setField = useCallback(
    (key: keyof EnvData, val: string) => {
      setEnv((prev) => {
        const next = { ...prev, [key]: val };
        const brief = buildEnvBrief(next, customLocation);
        persist({
          envLocation: next.location,
          envTimeOfDay: next.timeOfDay,
          envLighting: next.lighting,
          envPose: next.pose,
          envProps: next.props,
          envCamera: next.camera,
          envOutputFormat: next.outputFormat,
          envBrief: brief,
        });
        return next;
      });
    },
    [persist, customLocation],
  );

  const filledCount = [env.location || customLocation, env.timeOfDay, env.lighting, env.pose, env.props, env.camera].filter((v) => v.trim()).length;

  return (
    <div className={`char-node ${selected ? 'selected' : ''}`} style={{ minWidth: 300, maxWidth: 380 }}
      title="Environment Placement — Compose a character into a scene with structured fields for location, lighting, pose, camera, and format.">
      <div className="char-node-header" style={{ background: '#1b5e20', cursor: 'pointer' }} onClick={() => setMinimized((m) => !m)}>
        <span>Environment Placement</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {filledCount > 0 && (
            <span style={{ fontSize: 9, background: 'rgba(0,0,0,0.2)', padding: '1px 6px', borderRadius: 8 }}>
              {filledCount}/6
            </span>
          )}
          <span style={{ fontSize: 10, opacity: 0.7 }}>{minimized ? '\u25BC' : '\u25B2'}</span>
        </span>
      </div>

      {minimized && (
        <div className="char-node-body" style={{ padding: '4px 10px' }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            {env.location || customLocation || 'No location'} — {filledCount}/6 fields
          </span>
        </div>
      )}

      {!minimized && (
        <div className="char-node-body" style={{ gap: 8 }}>
          {/* Location */}
          <div>
            <span className="char-field-label" style={{ display: 'block', marginBottom: 3, minWidth: 0 }}>Location</span>
            <select className="char-select nodrag" value={env.location} onChange={(e) => setField('location', e.target.value)}
              style={{ width: '100%', fontSize: 10 }}>
              {LOCATION_PRESETS.map((l) => <option key={l} value={l}>{l || '— select preset —'}</option>)}
              <option value="__custom">Custom...</option>
            </select>
            {env.location === '__custom' && (
              <input className="char-input nodrag" value={customLocation}
                onChange={(e) => {
                  setCustomLocation(e.target.value);
                  const brief = buildEnvBrief({ ...env, location: '__custom' }, e.target.value);
                  persist({ envCustomLocation: e.target.value, envBrief: brief });
                }}
                placeholder="Describe the location..."
                style={{ width: '100%', fontSize: 10, marginTop: 4 }} />
            )}
          </div>

          {/* Time of Day */}
          <div>
            <span className="char-field-label" style={{ display: 'block', marginBottom: 3, minWidth: 0 }}>Time of Day</span>
            <select className="char-select nodrag" value={env.timeOfDay} onChange={(e) => setField('timeOfDay', e.target.value)}
              style={{ width: '100%', fontSize: 10 }}>
              {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t || '— select —'}</option>)}
            </select>
          </div>

          {/* Lighting */}
          <div>
            <span className="char-field-label" style={{ display: 'block', marginBottom: 3, minWidth: 0 }}>Lighting</span>
            <select className="char-select nodrag" value={env.lighting} onChange={(e) => setField('lighting', e.target.value)}
              style={{ width: '100%', fontSize: 10 }}>
              {LIGHTING_OPTIONS.map((l) => <option key={l} value={l}>{l || '— select —'}</option>)}
            </select>
          </div>

          {/* Pose */}
          <div>
            <span className="char-field-label" style={{ display: 'block', marginBottom: 3, minWidth: 0 }}>Pose</span>
            <select className="char-select nodrag" value={env.pose} onChange={(e) => setField('pose', e.target.value)}
              style={{ width: '100%', fontSize: 10 }}>
              {POSE_PRESETS.map((p) => <option key={p} value={p}>{p || '— select —'}</option>)}
            </select>
          </div>

          {/* Props */}
          <div>
            <span className="char-field-label" style={{ display: 'block', marginBottom: 3, minWidth: 0 }}>Props</span>
            <input className="char-input nodrag" value={env.props}
              onChange={(e) => setField('props', e.target.value)}
              placeholder="e.g. AK-47, fanny pack, torch"
              style={{ width: '100%', fontSize: 10 }} />
          </div>

          {/* Camera */}
          <div>
            <span className="char-field-label" style={{ display: 'block', marginBottom: 3, minWidth: 0 }}>Camera</span>
            <select className="char-select nodrag" value={env.camera} onChange={(e) => setField('camera', e.target.value)}
              style={{ width: '100%', fontSize: 10 }}>
              {CAMERA_OPTIONS.map((c) => <option key={c} value={c}>{c || '— select —'}</option>)}
            </select>
          </div>

          {/* Output Format */}
          <div>
            <span className="char-field-label" style={{ display: 'block', marginBottom: 3, minWidth: 0 }}>Output Format</span>
            <select className="char-select nodrag" value={env.outputFormat} onChange={(e) => setField('outputFormat', e.target.value)}
              style={{ width: '100%', fontSize: 10 }}>
              {FORMAT_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        </div>
      )}

      <Handle type="target" position={Position.Left} id="input" className="char-handle" style={{ top: '50%' }} />
      <Handle type="source" position={Position.Right} id="env-out" className="char-handle" style={{ top: '50%' }} />
    </div>
  );
}

function buildEnvBrief(env: EnvData, customLocation: string): string {
  const lines: string[] = [];
  const loc = env.location === '__custom' ? customLocation : env.location;
  if (loc) lines.push(`Location: ${loc}`);
  if (env.timeOfDay) lines.push(`Time: ${env.timeOfDay}`);
  if (env.lighting) lines.push(`Lighting: ${env.lighting}`);
  if (env.pose) lines.push(`Pose: ${env.pose}`);
  if (env.props) lines.push(`Props: ${env.props}`);
  if (env.camera) lines.push(`Camera: ${env.camera}`);
  if (env.outputFormat) lines.push(`Format: ${env.outputFormat}`);
  return lines.join('\n');
}

export default memo(EnvironmentPlacementNodeInner);
