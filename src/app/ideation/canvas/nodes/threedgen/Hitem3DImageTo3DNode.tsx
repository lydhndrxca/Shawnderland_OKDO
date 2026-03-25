"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Handle, Position, useReactFlow, useStore } from '@xyflow/react';
import {
  submitTask,
  queryTask,
  MODEL_INFO,
  RES_DEFAULTS,
  FORMAT_LABELS,
  type Hitem3DModel,
  type Hitem3DResolution,
  type Hitem3DRequestType,
  type Hitem3DFormat,
  type Hitem3DTaskResult,
} from '@/lib/ideation/engine/hitem3dApi';
import { autoSaveModel } from '@/lib/ideation/engine/modelAutoSave';
import './ThreeDNodes.css';

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

const POLL_MS = 3000;

const REQUEST_TYPES: Array<{ value: Hitem3DRequestType; label: string; desc: string }> = [
  { value: 3, label: 'All-in-One', desc: 'Geometry + texture' },
  { value: 1, label: 'Geometry Only', desc: 'Mesh, no texture' },
  { value: 2, label: 'Staged Texture', desc: 'v1.5 only — texture existing mesh' },
];

const ALL_MODELS = Object.entries(MODEL_INFO) as Array<[Hitem3DModel, typeof MODEL_INFO[Hitem3DModel]]>;

const FORMAT_OPTIONS: Array<{ value: Hitem3DFormat; label: string }> = [
  { value: 1, label: '.obj' },
  { value: 2, label: '.glb' },
  { value: 3, label: '.stl' },
  { value: 4, label: '.fbx' },
  { value: 5, label: '.usdz' },
];

const PARAM_NODE_TYPES = new Set(['designSpec']);

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

function Hitem3DImageTo3DNodeInner({ id, data, selected }: Props) {
  const { setNodes, getNode } = useReactFlow();
  const didMountRef = useRef(false);

  const persistData = useCallback(
    (patch: Record<string, unknown>) => {
      setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)));
    },
    [id, setNodes],
  );

  const [model, setModel] = useState<Hitem3DModel>((data.h3dModel as Hitem3DModel) ?? 'hitem3dv2.0');
  const [resolution, setResolution] = useState<Hitem3DResolution>((data.h3dResolution as Hitem3DResolution) ?? '1536pro');
  const [requestType, setRequestType] = useState<Hitem3DRequestType>((data.h3dRequestType as Hitem3DRequestType) ?? 3);
  const [face, setFace] = useState<number>((data.h3dFace as number) ?? 2_000_000);
  const [format, setFormat] = useState<Hitem3DFormat>((data.h3dFormat as Hitem3DFormat) ?? 2);

  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [taskResult, setTaskResult] = useState<Hitem3DTaskResult | null>(
    (data.hitem3dResult as Hitem3DTaskResult) ?? null,
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

  const modelInfo = MODEL_INFO[model];
  const validResolutions = modelInfo.resolutions;

  useEffect(() => {
    if (!validResolutions.includes(resolution)) {
      setResolution(validResolutions[validResolutions.length - 1]);
    }
  }, [model, resolution, validResolutions]);

  useEffect(() => {
    if (requestType === 2 && !modelInfo.supportsStaged) {
      setRequestType(3);
    }
  }, [model, requestType, modelInfo]);

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    persistData({
      h3dModel: model, h3dResolution: resolution, h3dRequestType: requestType,
      h3dFace: face, h3dFormat: format,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model, resolution, requestType, face, format]);

  const edgesRef = useRef<Array<{ source: string; target: string }>>([]);
  useStore(
    useCallback(
      (state: { edges: Array<{ source: string; target: string }> }) => {
        edgesRef.current = state.edges;
        return state.edges.length;
      },
      [],
    ),
  );

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

  type SourceImg = { base64: string; mimeType: string; viewKey: string };

  const collectImages = useCallback((): SourceImg[] => {
    const imgs: SourceImg[] = [];
    for (const e of edgesRef.current) {
      if (e.target !== id) continue;
      const peer = getNode(e.source);
      if (!peer?.data) continue;
      if (PARAM_NODE_TYPES.has(peer.type ?? '')) continue;
      const d = peer.data as Record<string, unknown>;
      const img = d.generatedImage as { base64?: string; mimeType?: string } | undefined;
      if (img?.base64) {
        imgs.push({
          base64: img.base64,
          mimeType: img.mimeType ?? 'image/png',
          viewKey: (d.viewKey as string) ?? 'front',
        });
      }
    }
    return imgs;
  }, [id, getNode]);

  const handleGenerate = useCallback(async () => {
    if (busy) return;
    const images = collectImages();
    if (images.length === 0 && requestType !== 2) {
      setError('No source images connected.');
      return;
    }

    setBusy(true);
    setError(null);
    setProgress(null);
    cancelledRef.current = false;
    setStatus('Submitting to Hitem3D...');

    try {
      const single = images.length === 1 ? { base64: images[0].base64, mimeType: images[0].mimeType } : undefined;
      const multi = images.length > 1 ? images : undefined;

      const taskId = await submitTask(
        { request_type: requestType, model, resolution, face, format },
        single,
        multi,
      );

      if (!mountedRef.current || cancelledRef.current) return;
      setStatus(`Task: ${taskId.slice(0, 12)}... Polling...`);

      await new Promise<void>((resolve, reject) => {
        pollRef.current = setInterval(async () => {
          if (!mountedRef.current || cancelledRef.current) {
            clearInterval(pollRef.current);
            resolve();
            return;
          }
          try {
            const result = await queryTask(taskId);
            if (!mountedRef.current || cancelledRef.current) {
              clearInterval(pollRef.current);
              resolve();
              return;
            }

            const st = result.status;
            if (st === 'created') {
              setStatus('Task created...');
              setProgress('created');
            } else if (st === 'queueing') {
              setStatus('In queue...');
              setProgress('queueing');
            } else if (st === 'processing') {
              setStatus('Generating 3D model...');
              setProgress('processing');
            } else if (st === 'success') {
              clearInterval(pollRef.current);
              setTaskResult(result);
              persistData({ hitem3dResult: result });
              setStatus('Complete!');
              setProgress(null);
              if (result.url) {
                autoSaveModel(result.url, `hitem3d_${result.task_id || Date.now()}`, {
                  source: 'hitem3d',
                  taskId: result.task_id,
                }).catch(() => {});
              }
              resolve();
            } else if (st === 'failed') {
              clearInterval(pollRef.current);
              reject(new Error(result.error ?? 'Hitem3D task failed'));
            } else {
              setStatus(`Unknown status: ${st}...`);
            }
          } catch (err) {
            clearInterval(pollRef.current);
            reject(err);
          }
        }, POLL_MS);
      });

      if (mountedRef.current) {
        setTimeout(() => { if (mountedRef.current) setStatus(null); }, 4000);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.toLowerCase().includes('cancel') && mountedRef.current) {
        setError(msg);
      }
      if (mountedRef.current) setStatus(null);
    } finally {
      if (pollRef.current) clearInterval(pollRef.current);
      if (mountedRef.current) { setBusy(false); setProgress(null); }
    }
  }, [busy, collectImages, requestType, model, resolution, face, format, persistData]);

  const handleCancel = useCallback(() => {
    cancelledRef.current = true;
    if (pollRef.current) clearInterval(pollRef.current);
    setBusy(false);
    setProgress(null);
    setStatus('Cancelled');
    setTimeout(() => { if (mountedRef.current) setStatus(null); }, 2000);
  }, []);

  const hasSource = sourceCount > 0;
  const thumb = taskResult?.cover_url;

  const estCredits = useMemo(() => {
    const costs: Record<string, Record<string, [number, number]>> = {
      'hitem3dv1.5': { '512': [5, 15], '1024': [10, 20], '1536': [40, 50], '1536pro': [60, 70] },
      'hitem3dv2.0': { '1536': [40, 50], '1536pro': [60, 70] },
      'scene-portraitv1.5': { '1536': [40, 70] },
      'scene-portraitv2.0': { '1536pro': [40, 70] },
      'scene-portraitv2.1': { '1536pro': [40, 70] },
    };
    const c = costs[model]?.[resolution];
    if (!c) return null;
    const credits = requestType === 1 ? c[0] : c[1];
    return { credits, usd: (credits * 0.02).toFixed(2) };
  }, [model, resolution, requestType]);

  return (
    <div
      className={`threed-node ${selected ? 'selected' : ''} ${busy ? 'threed-node-processing' : ''}`}
      style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}
    >
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />

      <div className="threed-node-header" style={{ background: 'linear-gradient(135deg, #d84315, #ff6e40)' }}>
        <span>Image &rarr; 3D (Hitem3D)</span>
        {hasSource && (
          <span style={{ fontSize: 9, opacity: 0.8 }}>
            {sourceCount} img{sourceCount > 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="threed-node-body" style={{ flex: 1, overflow: 'auto' }}>
        {hasSource && (
          <div style={{ textAlign: 'center', padding: '2px 0' }}>
            <div style={{ display: 'flex', gap: 4, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 2 }}>
              {connectedViews.map((v, i) => (
                <span key={i} style={{
                  fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 3,
                  background: VIEW_COLOR[v] ?? '#555', color: '#fff',
                }}>{VIEW_LABEL[v] ?? v}</span>
              ))}
            </div>
            <div style={{ fontSize: 10, color: '#69f0ae' }}>
              {sourceCount} source image{sourceCount > 1 ? 's' : ''} connected
            </div>
          </div>
        )}

        {/* Generation Type */}
        <div className="threed-field">
          <span className="threed-field-label">Type</span>
          <select
            className="threed-select nodrag"
            value={requestType}
            onChange={(e) => setRequestType(Number(e.target.value) as Hitem3DRequestType)}
          >
            {REQUEST_TYPES.map((rt) => (
              <option key={rt.value} value={rt.value} disabled={rt.value === 2 && !modelInfo.supportsStaged}>
                {rt.label}{rt.value === 2 && !modelInfo.supportsStaged ? ' (v1.5 only)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Model */}
        <div className="threed-field">
          <span className="threed-field-label">Model</span>
          <select className="threed-select nodrag" value={model} onChange={(e) => setModel(e.target.value as Hitem3DModel)}>
            {ALL_MODELS.map(([key, info]) => (
              <option key={key} value={key}>{info.label}</option>
            ))}
          </select>
        </div>

        {/* Resolution */}
        <div className="threed-field">
          <span className="threed-field-label">Res</span>
          <select
            className="threed-select nodrag"
            value={resolution}
            onChange={(e) => {
              const r = e.target.value as Hitem3DResolution;
              setResolution(r);
              setFace(RES_DEFAULTS[r]);
            }}
          >
            {validResolutions.map((r) => (
              <option key={r} value={r}>{r}{r === '1536pro' ? ' (Pro)' : ''}</option>
            ))}
          </select>
        </div>

        {/* Polygon Count */}
        <div className="threed-field-col" style={{ gap: 2 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="threed-field-label">Faces</span>
            <span style={{ fontSize: 10, color: '#aaa' }}>{(face / 1000).toFixed(0)}K</span>
          </div>
          <input
            type="range"
            className="nodrag"
            min={100_000}
            max={2_000_000}
            step={50_000}
            value={face}
            onChange={(e) => setFace(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#ff6e40' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8, color: '#666' }}>
            <span>100K</span>
            <span>2M</span>
          </div>
        </div>

        {/* Output Format */}
        <div className="threed-field">
          <span className="threed-field-label">Format</span>
          <select className="threed-select nodrag" value={format} onChange={(e) => setFormat(Number(e.target.value) as Hitem3DFormat)}>
            {FORMAT_OPTIONS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>

        {/* Cost estimate */}
        {estCredits && (
          <div style={{ fontSize: 9, color: '#888', textAlign: 'center', padding: '2px 0' }}>
            ~{estCredits.credits} credits (${estCredits.usd})
          </div>
        )}

        {/* Generate / Cancel */}
        {!busy ? (
          <button
            className="threed-btn primary nodrag nopan"
            onClick={(e) => { e.stopPropagation(); handleGenerate(); }}
            disabled={!hasSource && requestType !== 2}
            style={{ width: '100%', padding: '8px 0', fontSize: 12, fontWeight: 700 }}
          >
            Generate 3D
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

        {/* Progress indicator */}
        {progress && (
          <div className="threed-progress-bar">
            <div
              className="threed-progress-fill"
              style={{
                width: progress === 'created' ? '15%'
                  : progress === 'queueing' ? '30%'
                  : progress === 'processing' ? '70%'
                  : '100%',
              }}
            />
          </div>
        )}

        {status && <div className="threed-status">{status}</div>}
        {error && <div className="threed-error">{error}</div>}

        {!hasSource && !error && !busy && requestType !== 2 && (
          <div style={{ fontSize: 10, color: '#666', textAlign: 'center', padding: '4px 0' }}>
            Connect image viewers (max 4). Views: Front (required), Back, Side, Top. Side maps to Left, Top maps to Front.
          </div>
        )}

        {thumb && !busy && (
          <div style={{ textAlign: 'center' }}>
            <img src={thumb} alt="3D preview" className="threed-thumbnail" />
            <div className="threed-success">3D model generated</div>
          </div>
        )}
      </div>
    </div>
  );
}

const Hitem3DImageTo3DNode = memo(Hitem3DImageTo3DNodeInner);
export default Hitem3DImageTo3DNode;
