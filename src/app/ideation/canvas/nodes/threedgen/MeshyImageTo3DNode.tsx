"use client";

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Handle, Position, useReactFlow, useStore } from '@xyflow/react';
import {
  createImageTo3D,
  createMultiImageTo3D,
  pollTask,
  type MeshyCreateParams,
  type MeshyTaskResult,
} from '@/lib/ideation/engine/meshyApi';
import { autoSaveModel } from '@/lib/ideation/engine/modelAutoSave';
import './ThreeDNodes.css';

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

const AI_MODELS: Array<{ value: MeshyCreateParams['ai_model']; label: string }> = [
  { value: 'meshy-6', label: 'Meshy-6 (Latest)' },
  { value: 'meshy-5', label: 'Meshy-5' },
];
const TOPOLOGIES: Array<{ value: 'triangle' | 'quad'; label: string }> = [
  { value: 'triangle', label: 'Triangle' },
  { value: 'quad', label: 'Quad' },
];
const SYMMETRY_MODES: Array<{ value: 'on' | 'auto' | 'off'; label: string }> = [
  { value: 'auto', label: 'Auto' },
  { value: 'on', label: 'On' },
  { value: 'off', label: 'Off' },
];
const POSE_MODES: Array<{ value: '' | 't-pose' | 'a-pose'; label: string }> = [
  { value: '', label: 'Default' },
  { value: 't-pose', label: 'T-Pose' },
  { value: 'a-pose', label: 'A-Pose' },
];
const POLY_PRESETS = [10_000, 30_000, 50_000, 100_000];
const POLL_INTERVAL_MS = 3000;
const PARAM_NODE_TYPES = new Set(['designSpec']);
const MESHY_MAX_IMAGES = 4;

const VIEW_LABEL: Record<string, string> = {
  front: 'Front', back: 'Back', side: 'Side', left: 'Left', right: 'Right',
  top: 'Top', main: 'Main', custom: 'Custom',
  propMainViewer: 'Main', propFrontViewer: 'Front', propBackViewer: 'Back',
  propSideViewer: 'Side', propTopViewer: 'Top',
};
const VIEW_COLOR: Record<string, string> = {
  front: '#42a5f5', back: '#ab47bc', side: '#ff7043', left: '#ff7043',
  right: '#ff7043', top: '#26a69a', main: '#66bb6a',
  propMainViewer: '#66bb6a', propFrontViewer: '#42a5f5', propBackViewer: '#ab47bc',
  propSideViewer: '#ff7043', propTopViewer: '#26a69a',
};

function MeshyImageTo3DNodeInner({ id, data, selected }: Props) {
  const { setNodes, getNode } = useReactFlow();

  /* ── Persist only when user changes a value, never on mount ──── */
  const didMountRef = useRef(false);
  const persistData = useCallback(
    (patch: Record<string, unknown>) => {
      setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)));
    },
    [id, setNodes],
  );

  const [aiModel, setAiModel] = useState<MeshyCreateParams['ai_model']>(
    (data.aiModel as MeshyCreateParams['ai_model']) ?? 'meshy-6',
  );
  const [topology, setTopology] = useState<'triangle' | 'quad'>(
    (data.topology as 'triangle' | 'quad') ?? 'triangle',
  );
  const [targetPoly, setTargetPoly] = useState<number>((data.targetPoly as number) ?? 30_000);
  const [symmetry, setSymmetry] = useState<'on' | 'auto' | 'off'>(
    (data.symmetry as 'on' | 'auto' | 'off') ?? 'auto',
  );
  const [poseMode, setPoseMode] = useState<'' | 't-pose' | 'a-pose'>(
    (data.poseMode as '' | 't-pose' | 'a-pose') ?? '',
  );
  const [shouldRemesh, setShouldRemesh] = useState<boolean>((data.shouldRemesh as boolean) ?? true);
  const [shouldTexture, setShouldTexture] = useState<boolean>((data.shouldTexture as boolean) ?? true);
  const [enablePbr, setEnablePbr] = useState<boolean>((data.enablePbr as boolean) ?? true);
  const [imageEnhance, setImageEnhance] = useState<boolean>((data.imageEnhance as boolean) ?? true);
  const [removeLighting, setRemoveLighting] = useState<boolean>((data.removeLighting as boolean) ?? false);
  const [texturePrompt, setTexturePrompt] = useState<string>((data.texturePrompt as string) ?? '');

  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [taskResult, setTaskResult] = useState<MeshyTaskResult | null>(
    (data.meshyResult as MeshyTaskResult) ?? null,
  );
  const mountedRef = useRef(true);
  const cancelledRef = useRef(false);
  const pollRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    persistData({
      aiModel, topology, targetPoly, symmetry, poseMode,
      shouldRemesh, shouldTexture, enablePbr, imageEnhance, removeLighting, texturePrompt,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiModel, topology, targetPoly, symmetry, poseMode, shouldRemesh, shouldTexture, enablePbr, imageEnhance, removeLighting, texturePrompt]);

  const edgesRef = useRef<Array<{ source: string; target: string }>>([]);
  const edgeSigSelector = useCallback(
    (state: { edges: Array<{ source: string; target: string }> }) => {
      edgesRef.current = state.edges;
      return state.edges.length;
    },
    [],
  );
  useStore(edgeSigSelector);

  type SourceImage = { base64: string; mimeType: string; viewKey?: string };

  const collectSourceImages = useCallback((): SourceImage[] => {
    const images: SourceImage[] = [];
    for (const e of edgesRef.current) {
      if (e.target !== id) continue;
      const peer = getNode(e.source);
      if (!peer?.data) continue;
      if (PARAM_NODE_TYPES.has(peer.type ?? '')) continue;
      const d = peer.data as Record<string, unknown>;
      const img = d.generatedImage as { base64?: string; mimeType?: string } | undefined;
      if (img?.base64) {
        images.push({
          base64: img.base64,
          mimeType: img.mimeType ?? 'image/png',
          viewKey: (d.viewKey as string) ?? undefined,
        });
      }
    }
    return images;
  }, [id, getNode]);

  /* ── Forward designSpec from upstream ── */
  const designSpecSigSelector = useCallback(
    (state: {
      nodes: Array<{ id: string; data: Record<string, unknown> }>;
      edges: Array<{ source: string; target: string }>;
    }) => {
      for (const e of state.edges) {
        if (e.target !== id) continue;
        const peer = state.nodes.find((n) => n.id === e.source);
        const ds = (peer?.data as Record<string, unknown> | undefined)?.designSpec;
        if (ds) return JSON.stringify(ds);
      }
      return '';
    },
    [id],
  );
  const designSpecSig = useStore(designSpecSigSelector);

  useEffect(() => {
    if (!designSpecSig) return;
    try {
      const ds = JSON.parse(designSpecSig);
      persistData({ designSpec: ds });
    } catch { /* ignore */ }
  }, [designSpecSig, persistData]);

  const connectedViewsSelector = useCallback(
    (state: {
      nodes: Array<{ id: string; type?: string; data: Record<string, unknown> }>;
      edges: Array<{ source: string; target: string }>;
    }) => {
      const views: string[] = [];
      for (const e of state.edges) {
        if (e.target !== id) continue;
        const peer = state.nodes.find((n) => n.id === e.source);
        if (!peer || PARAM_NODE_TYPES.has(peer.type ?? '')) continue;
        const d = peer.data as Record<string, unknown>;
        const img = d.generatedImage as { base64: string } | undefined;
        if (img?.base64) {
          const vk = (d.viewKey as string) ?? peer.type ?? 'image';
          views.push(vk);
        }
      }
      return views.sort().join(',');
    },
    [id],
  );
  const connectedViewsSig = useStore(connectedViewsSelector);
  const connectedViews = connectedViewsSig ? connectedViewsSig.split(',') : [];
  const sourceCount = connectedViews.length;

  const handleGenerate = useCallback(async () => {
    if (busy) return;

    let images: SourceImage[];
    try {
      images = collectSourceImages();
    } catch {
      setError('Failed to read source images.');
      return;
    }

    if (images.length === 0) {
      setError('No source images connected. Connect image viewer nodes.');
      return;
    }

    setBusy(true);
    setError(null);
    setProgress(0);
    cancelledRef.current = false;
    setStatus('Submitting to Meshy...');

    const params: MeshyCreateParams = {
      ai_model: aiModel,
      topology,
      target_polycount: targetPoly,
      symmetry_mode: symmetry,
      should_remesh: shouldRemesh,
      should_texture: shouldTexture,
      enable_pbr: enablePbr,
      image_enhancement: imageEnhance,
      remove_lighting: removeLighting,
    };
    if (poseMode) params.pose_mode = poseMode;
    if (texturePrompt.trim()) {
      params.texture_prompt = texturePrompt.trim();
    } else {
      const ds = data.designSpec as { notes?: string } | undefined;
      if (ds?.notes?.trim()) params.texture_prompt = ds.notes.trim();
    }

    try {
      let taskId: string;
      let isMulti = false;

      if (images.length === 1) {
        taskId = await createImageTo3D(images[0].base64, images[0].mimeType, params);
      } else {
        isMulti = true;
        taskId = await createMultiImageTo3D(
          images.map((img) => ({ base64: img.base64, mimeType: img.mimeType })),
          params,
        );
      }

      if (!mountedRef.current || cancelledRef.current) return;
      setStatus(`Task created: ${taskId.slice(0, 8)}... Polling...`);

      await new Promise<void>((resolve, reject) => {
        let polling = false;
        pollRef.current = setInterval(async () => {
          if (polling) return;
          if (!mountedRef.current || cancelledRef.current) {
            clearInterval(pollRef.current);
            resolve();
            return;
          }
          polling = true;
          try {
            const result = await pollTask(taskId, isMulti);
            if (!mountedRef.current || cancelledRef.current) {
              clearInterval(pollRef.current);
              resolve();
              return;
            }
            setProgress(result.progress ?? 0);

            if (result.status === 'IN_PROGRESS') {
              const pct = result.progress ?? 0;
              setStatus(`Processing... ${pct}%${result.preceding_tasks ? ` (${result.preceding_tasks} tasks ahead)` : ''}`);
            } else if (result.status === 'SUCCEEDED') {
              clearInterval(pollRef.current);
              setTaskResult(result);
              persistData({ meshyResult: result });
              setStatus('Complete!');
              if (result.model_urls?.glb) {
                autoSaveModel(result.model_urls.glb, `meshy_${result.id || Date.now()}`, {
                  source: 'meshy',
                  taskId: result.id,
                }).catch(() => {});
              }
              resolve();
            } else if (result.status === 'FAILED') {
              clearInterval(pollRef.current);
              reject(new Error(result.task_error?.message ?? 'Meshy task failed'));
            } else if (result.status === 'CANCELED') {
              clearInterval(pollRef.current);
              reject(new Error('Task was cancelled'));
            }
          } catch (err) {
            clearInterval(pollRef.current);
            reject(err);
          } finally {
            polling = false;
          }
        }, POLL_INTERVAL_MS);
      });

      if (mountedRef.current) {
        setTimeout(() => { if (mountedRef.current) setStatus(null); }, 4000);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.toLowerCase().includes('cancel')) {
        if (mountedRef.current) setError(msg);
      }
      if (mountedRef.current) setStatus(null);
    } finally {
      if (pollRef.current) clearInterval(pollRef.current);
      if (mountedRef.current) {
        setBusy(false);
        setProgress(0);
      }
    }
  }, [
    busy, collectSourceImages, aiModel, topology, targetPoly, symmetry,
    poseMode, shouldRemesh, shouldTexture, enablePbr, imageEnhance,
    removeLighting, texturePrompt, persistData,
  ]);

  const handleCancel = useCallback(() => {
    cancelledRef.current = true;
    if (pollRef.current) clearInterval(pollRef.current);
    setBusy(false);
    setProgress(0);
    setStatus('Cancelled');
    setTimeout(() => { if (mountedRef.current) setStatus(null); }, 2000);
  }, []);

  const hasSource = sourceCount > 0;
  const thumb = taskResult?.thumbnail_url;

  return (
    <div
      className={`threed-node ${selected ? 'selected' : ''} ${busy ? 'threed-node-processing' : ''}`}
      style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}
    >
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />

      <div className="threed-node-header" style={{ background: 'linear-gradient(135deg, #00838f, #00acc1)' }}>
        <span>Image &rarr; 3D (Meshy)</span>
        {hasSource && (
          <span style={{ fontSize: 9, opacity: 0.8 }}>
            {sourceCount} image{sourceCount > 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="threed-node-body" style={{ flex: 1, overflow: 'auto' }}>
        {hasSource && (
          <div style={{ textAlign: 'center', padding: '4px 0' }}>
            <div style={{ display: 'flex', gap: 4, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 2 }}>
              {connectedViews.map((v, i) => (
                <span key={i} style={{
                  fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 3,
                  background: VIEW_COLOR[v] ?? '#555', color: '#fff',
                }}>{VIEW_LABEL[v] ?? v}</span>
              ))}
            </div>
            <div style={{ fontSize: 10, color: sourceCount > MESHY_MAX_IMAGES ? '#ff5252' : '#69f0ae' }}>
              {sourceCount} source image{sourceCount > 1 ? 's' : ''} connected
              {sourceCount > MESHY_MAX_IMAGES && ` (max ${MESHY_MAX_IMAGES})`}
            </div>
          </div>
        )}

        <div className="threed-field">
          <span className="threed-field-label">Model</span>
          <select className="threed-select nodrag" value={aiModel} onChange={(e) => setAiModel(e.target.value as MeshyCreateParams['ai_model'])}>
            {AI_MODELS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>

        <div className="threed-field">
          <span className="threed-field-label">Topo</span>
          <select className="threed-select nodrag" value={topology} onChange={(e) => setTopology(e.target.value as 'triangle' | 'quad')}>
            {TOPOLOGIES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        <div className="threed-field">
          <span className="threed-field-label">Polys</span>
          <select className="threed-select nodrag" value={targetPoly} onChange={(e) => setTargetPoly(Number(e.target.value))}>
            {POLY_PRESETS.map((p) => <option key={p} value={p}>{(p / 1000).toFixed(0)}K</option>)}
          </select>
        </div>

        <div className="threed-field">
          <span className="threed-field-label">Symm</span>
          <select className="threed-select nodrag" value={symmetry} onChange={(e) => setSymmetry(e.target.value as 'on' | 'auto' | 'off')}>
            {SYMMETRY_MODES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

        <div className="threed-field">
          <span className="threed-field-label">Pose</span>
          <select className="threed-select nodrag" value={poseMode} onChange={(e) => setPoseMode(e.target.value as '' | 't-pose' | 'a-pose')}>
            {POSE_MODES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>

        <div className="threed-field-col">
          <div className="threed-checkbox-row">
            <input type="checkbox" checked={shouldTexture} onChange={(e) => setShouldTexture(e.target.checked)} className="nodrag" />
            <span>Texture</span>
          </div>
          <div className="threed-checkbox-row">
            <input type="checkbox" checked={enablePbr} onChange={(e) => setEnablePbr(e.target.checked)} className="nodrag" />
            <span>PBR Maps</span>
          </div>
          <div className="threed-checkbox-row">
            <input type="checkbox" checked={shouldRemesh} onChange={(e) => setShouldRemesh(e.target.checked)} className="nodrag" />
            <span>Remesh</span>
          </div>
          <div className="threed-checkbox-row">
            <input type="checkbox" checked={imageEnhance} onChange={(e) => setImageEnhance(e.target.checked)} className="nodrag" />
            <span>Image Enhancement</span>
          </div>
          <div className="threed-checkbox-row">
            <input type="checkbox" checked={removeLighting} onChange={(e) => setRemoveLighting(e.target.checked)} className="nodrag" />
            <span>Remove Baked Lighting</span>
          </div>
        </div>

        <div className="threed-field-col">
          <span className="threed-field-label">Texture Prompt (optional)</span>
          <input
            className="threed-input nodrag"
            placeholder="e.g. realistic metal, worn leather..."
            value={texturePrompt}
            onChange={(e) => setTexturePrompt(e.target.value)}
          />
        </div>

        {!busy ? (
          <button
            className="threed-btn primary nodrag nopan"
            onClick={(e) => { e.stopPropagation(); handleGenerate(); }}
            disabled={!hasSource || sourceCount > MESHY_MAX_IMAGES}
            style={{ width: '100%', padding: '8px 0', fontSize: 12, fontWeight: 700 }}
          >
            Generate 3D Model
          </button>
        ) : (
          <button
            className="threed-btn nodrag nopan"
            onClick={(e) => { e.stopPropagation(); handleCancel(); }}
            style={{ width: '100%', padding: '8px 0', fontSize: 12, fontWeight: 700, color: '#f44336' }}
          >
            Cancel
          </button>
        )}

        {busy && (
          <div className="threed-progress-bar">
            <div className="threed-progress-fill" style={{ width: `${progress}%` }} />
          </div>
        )}

        {status && <div className="threed-status">{status}</div>}
        {error && <div className="threed-error">{error}</div>}

        {sourceCount > MESHY_MAX_IMAGES && !busy && (
          <div style={{ fontSize: 10, color: '#ff5252', textAlign: 'center', padding: '4px 0' }}>
            Meshy supports 1–{MESHY_MAX_IMAGES} images. Disconnect {sourceCount - MESHY_MAX_IMAGES} view{sourceCount - MESHY_MAX_IMAGES > 1 ? 's' : ''} to continue.
          </div>
        )}

        {!hasSource && !error && !busy && (
          <div style={{ fontSize: 10, color: '#666', textAlign: 'center', padding: '4px 0' }}>
            Connect image viewers (Front, Back, Side, Top — max {MESHY_MAX_IMAGES}) to generate a 3D model.
          </div>
        )}

        {thumb && !busy && (
          <div style={{ textAlign: 'center' }}>
            <img src={thumb} alt="3D thumbnail" className="threed-thumbnail" />
            <div className="threed-success">3D model generated successfully</div>
          </div>
        )}
      </div>
    </div>
  );
}

const MeshyImageTo3DNode = memo(MeshyImageTo3DNodeInner);
export default MeshyImageTo3DNode;
