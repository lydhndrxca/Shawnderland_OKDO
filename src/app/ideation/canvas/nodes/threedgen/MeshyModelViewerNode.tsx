"use client";

import {
  Component,
  memo,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ErrorInfo,
  type ReactNode,
} from 'react';
import { Handle, Position, useReactFlow, useStore } from '@xyflow/react';
import type { MeshyTaskResult, PBRTextureUrls } from '@/lib/ideation/engine/meshyApi';
import { exportModel, sendToUE5 } from '@/lib/ideation/engine/meshyApi';
import type { Hitem3DTaskResult } from '@/lib/ideation/engine/hitem3dApi';
import { getGlobalSettings } from '@/lib/globalSettings';

interface UnifiedModelResult {
  source: 'meshy' | 'hitem3d';
  id: string;
  glbUrl: string | null;
  downloadUrl: string | null;
  thumbnailUrl: string | null;
  modelUrls: Record<string, string | undefined>;
  textureUrls?: PBRTextureUrls;
}
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, useGLTF, Center } from '@react-three/drei';
import * as THREE from 'three';
import './ThreeDNodes.css';

/* ── Error Boundary ─────────────────────────────────────────────── */

interface EBProps { children: ReactNode; fallback?: ReactNode }
interface EBState { hasError: boolean; message: string }

class ViewerErrorBoundary extends Component<EBProps, EBState> {
  state: EBState = { hasError: false, message: '' };
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[3D Viewer]', error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
            minHeight: 200, background: '#1a1a2e', borderRadius: 6, color: '#f44336', fontSize: 11, gap: 6, padding: 12,
          }}>
            <span>3D viewer error</span>
            <span style={{ fontSize: 9, color: '#888', textAlign: 'center' }}>{this.state.message}</span>
            <button
              onClick={() => this.setState({ hasError: false, message: '' })}
              style={{ padding: '4px 12px', fontSize: 10, background: '#333', border: '1px solid #555', borderRadius: 4, color: '#ccc', cursor: 'pointer' }}
            >
              Retry
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}

/* ── Blob URL cache for proxied GLBs ───────────────────────────── */

const blobCache = new Map<string, string>();

async function fetchGlbViaProxy(remoteUrl: string): Promise<string> {
  const cached = blobCache.get(remoteUrl);
  if (cached) return cached;

  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  const meshyKey = getGlobalSettings().meshyApiKey;
  if (meshyKey) h['x-meshy-key'] = meshyKey;
  const res = await fetch('/api/meshy', {
    method: 'POST',
    headers: h,
    body: JSON.stringify({ action: 'proxy-model', url: remoteUrl }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Model download failed (${res.status}): ${text.slice(0, 200)}`);
  }
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  blobCache.set(remoteUrl, blobUrl);
  return blobUrl;
}

/* ── Three.js sub-components ────────────────────────────────────── */

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

const EXPORT_FORMATS = ['glb', 'fbx', 'obj', 'usdz'] as const;
type ExportFormat = (typeof EXPORT_FORMATS)[number];

function ModelScene({
  url,
  wireframe,
  showNormals,
}: {
  url: string;
  wireframe: boolean;
  showNormals: boolean;
}) {
  const { scene } = useGLTF(url);
  const clonedScene = useMemo(() => scene.clone(true), [scene]);

  useEffect(() => {
    clonedScene.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      if (showNormals) {
        child.material = new THREE.MeshNormalMaterial({ wireframe });
      } else {
        const setWF = (m: THREE.Material) => {
          if ('wireframe' in m) (m as THREE.MeshStandardMaterial).wireframe = wireframe;
        };
        if (Array.isArray(child.material)) child.material.forEach(setWF);
        else setWF(child.material);
      }
    });
  }, [clonedScene, wireframe, showNormals]);

  return (
    <Center>
      <primitive object={clonedScene} />
    </Center>
  );
}

function AutoRotate({ enabled }: { enabled: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_s, delta) => {
    if (enabled && ref.current) ref.current.rotation.y += delta * 0.3;
  });
  return <group ref={ref} />;
}

/* ── Main Node ──────────────────────────────────────────────────── */

function MeshyModelViewerNodeInner({ id, data, selected }: Props) {
  const { setNodes, getNode } = useReactFlow();

  const persistData = useCallback(
    (patch: Record<string, unknown>) => {
      setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)));
    },
    [id, setNodes],
  );

  const [wireframe, setWireframe] = useState(false);
  const [showNormals, setShowNormals] = useState(false);
  const [showMaterials, setShowMaterials] = useState(true);
  const [autoRotate, setAutoRotate] = useState(true);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('obj');
  const [exportName, setExportName] = useState((data.exportName as string) ?? 'model');
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const [localGlbUrl, setLocalGlbUrl] = useState<string | null>(null);
  const [loadingModel, setLoadingModel] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [ue5Sending, setUe5Sending] = useState(false);
  const [ue5Status, setUe5Status] = useState<string | null>(null);
  const [ue5Error, setUe5Error] = useState<string | null>(null);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

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

  const resultSigSelector = useCallback(
    (state: {
      nodes: Array<{ id: string; data: Record<string, unknown> }>;
      edges: Array<{ source: string; target: string }>;
    }) => {
      let sig = '';
      for (const e of state.edges) {
        if (e.target !== id) continue;
        const peer = state.nodes.find((n) => n.id === e.source);
        const d = peer?.data as Record<string, unknown> | undefined;
        const meshy = d?.meshyResult as MeshyTaskResult | undefined;
        if (meshy?.id) sig += `m:${meshy.id},`;
        const hitem = d?.hitem3dResult as Hitem3DTaskResult | undefined;
        if (hitem?.task_id) sig += `h:${hitem.task_id},`;
      }
      return sig;
    },
    [id],
  );
  const resultSig = useStore(resultSigSelector);

  const allResults = useMemo((): UnifiedModelResult[] => {
    void resultSig;
    const results: UnifiedModelResult[] = [];
    for (const e of edgesRef.current) {
      if (e.target !== id) continue;
      const peer = getNode(e.source);
      if (!peer?.data) continue;
      const d = peer.data as Record<string, unknown>;

      const meshy = d.meshyResult as MeshyTaskResult | undefined;
      if (meshy?.status === 'SUCCEEDED') {
        const tex = meshy.texture_urls?.[0];
        results.push({
          source: 'meshy',
          id: meshy.id,
          glbUrl: meshy.model_urls?.glb ?? null,
          downloadUrl: meshy.model_urls?.glb ?? null,
          thumbnailUrl: meshy.thumbnail_url ?? null,
          modelUrls: (meshy.model_urls ?? {}) as Record<string, string | undefined>,
          textureUrls: tex ? { base_color: tex.base_color, metallic: tex.metallic, normal: tex.normal, roughness: tex.roughness } : undefined,
        });
      }

      const hitem = d.hitem3dResult as Hitem3DTaskResult | undefined;
      if (hitem?.status === 'success' && hitem.url) {
        const ext = hitem.url.split('.').pop()?.split('?')[0]?.toLowerCase() ?? '';
        const isGlb = ext === 'glb' || hitem.url.includes('.glb');
        results.push({
          source: 'hitem3d',
          id: hitem.task_id,
          glbUrl: isGlb ? hitem.url : null,
          downloadUrl: hitem.url,
          thumbnailUrl: hitem.cover_url ?? null,
          modelUrls: { [ext || 'model']: hitem.url },
        });
      }
    }
    return results;
  }, [id, getNode, resultSig]);

  const [currentIdx, setCurrentIdx] = useState(0);
  const current = allResults[currentIdx] ?? allResults[0] ?? null;
  const remoteGlbUrl = current?.glbUrl ?? null;

  useEffect(() => {
    if (!remoteGlbUrl) {
      setLocalGlbUrl(null);
      setLoadError(null);
      return;
    }

    let cancelled = false;
    setLoadingModel(true);
    setLoadError(null);
    setLocalGlbUrl(null);

    fetchGlbViaProxy(remoteGlbUrl)
      .then((blobUrl) => {
        if (!cancelled && mountedRef.current) {
          setLocalGlbUrl(blobUrl);
          setLoadingModel(false);
        }
      })
      .catch((err) => {
        if (!cancelled && mountedRef.current) {
          setLoadError(err instanceof Error ? err.message : String(err));
          setLoadingModel(false);
        }
      });

    return () => { cancelled = true; };
  }, [remoteGlbUrl]);

  const handleExport = useCallback(async () => {
    if (!current || exporting) return;

    let downloadUrl: string | undefined;
    if (current.source === 'hitem3d') {
      downloadUrl = current.downloadUrl ?? undefined;
    } else {
      downloadUrl = current.modelUrls[exportFormat];
    }

    if (!downloadUrl) {
      setExportError(`No ${exportFormat.toUpperCase()} URL available for this model.`);
      return;
    }

    const dir = getGlobalSettings().threeDExportDir || '';
    if (!dir) {
      setExportError('Set 3D export directory in Settings (top-left gear icon).');
      return;
    }

    setExporting(true);
    setExportError(null);
    setExportStatus('Downloading & saving...');

    try {
      const ext = current.source === 'hitem3d'
        ? (downloadUrl.split('.').pop()?.split('?')[0] ?? exportFormat)
        : exportFormat;
      const filename = `${exportName.trim() || 'model'}.${ext}`;
      const result = await exportModel(downloadUrl, dir, filename);
      if (mountedRef.current) {
        setExportStatus(`Saved to ${result.path} (${(result.size / 1024).toFixed(0)} KB)`);
        setTimeout(() => { if (mountedRef.current) setExportStatus(null); }, 5000);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (mountedRef.current) setExportError(msg);
      setExportStatus(null);
    } finally {
      if (mountedRef.current) setExporting(false);
    }
  }, [current, exportFormat, exportName, exporting]);

  useEffect(() => {
    persistData({ exportName });
  }, [exportName, persistData]);

  const handleSendToUE5 = useCallback(async () => {
    if (!current || ue5Sending) return;

    const ue5Path = getGlobalSettings().ue5ProjectPath;
    if (!ue5Path) {
      setUe5Error('Set UE5 Project Path in Settings (top-left gear icon).');
      return;
    }

    const downloadUrl = current.glbUrl || current.modelUrls?.glb || current.modelUrls?.fbx;
    if (!downloadUrl) {
      setUe5Error('No GLB/FBX URL available for this model.');
      return;
    }

    setUe5Sending(true);
    setUe5Error(null);
    setUe5Status('Staging model + textures...');

    try {
      const name = exportName.trim() || 'model';
      const result = await sendToUE5({
        url: downloadUrl,
        assetName: name,
        projectPath: ue5Path,
        destFolder: '/Game/OKDO',
        textureUrls: current.textureUrls,
      });

      if (!mountedRef.current) return;

      if (result.message) {
        setUe5Status(result.message);
      } else {
        setUe5Status(`Staged ${result.assetName ?? name}`);
      }
      setTimeout(() => { if (mountedRef.current) setUe5Status(null); }, 8000);
    } catch (e) {
      if (mountedRef.current) setUe5Error(e instanceof Error ? e.message : String(e));
      setUe5Status(null);
    } finally {
      if (mountedRef.current) setUe5Sending(false);
    }
  }, [current, ue5Sending, exportName]);

  const hasModels = allResults.length > 0;

  return (
    <div
      className={`threed-node threed-viewer-node ${selected ? 'selected' : ''}`}
      style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}
    >
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />

      <div className="threed-node-header" style={{ background: 'linear-gradient(135deg, #6a1b9a, #8e24aa)' }}>
        <span>3D Model Viewer</span>
        {hasModels && (
          <span style={{ fontSize: 9, opacity: 0.8 }}>
            {allResults.length} model{allResults.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="threed-node-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0, padding: 0, overflow: 'hidden' }}>
        {loadingModel && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1,
            background: '#0d0d1a', color: '#00e5ff', fontSize: 13,
          }}>
            Loading 3D model...
          </div>
        )}

        {loadError && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', flex: 1,
            background: '#0d0d1a', color: '#f44336', fontSize: 12, gap: 8, padding: 20,
          }}>
            <span>Failed to load model</span>
            <span style={{ fontSize: 10, color: '#888', textAlign: 'center' }}>{loadError}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (remoteGlbUrl) blobCache.delete(remoteGlbUrl);
                setLoadError(null);
                setLoadingModel(true);
                if (remoteGlbUrl) {
                  fetchGlbViaProxy(remoteGlbUrl)
                    .then((url) => { if (mountedRef.current) { setLocalGlbUrl(url); setLoadingModel(false); } })
                    .catch((err) => { if (mountedRef.current) { setLoadError(err instanceof Error ? err.message : String(err)); setLoadingModel(false); } });
                }
              }}
              style={{ padding: '4px 12px', fontSize: 10, background: '#333', border: '1px solid #555', borderRadius: 4, color: '#ccc', cursor: 'pointer' }}
            >
              Retry
            </button>
          </div>
        )}

        {localGlbUrl && !loadingModel && !loadError ? (
          <ViewerErrorBoundary>
            <div className="threed-viewer-canvas nodrag nowheel">
              <Canvas
                camera={{ position: [0, 1.5, 3], fov: 45 }}
                style={{ width: '100%', height: '100%' }}
                gl={{ preserveDrawingBuffer: true }}
              >
                <ambientLight intensity={0.5} />
                <directionalLight position={[5, 5, 5]} intensity={1} />
                <Suspense fallback={null}>
                  {showMaterials && <Environment preset="studio" />}
                  <ModelScene url={localGlbUrl} wireframe={wireframe} showNormals={showNormals} />
                </Suspense>
                <AutoRotate enabled={autoRotate} />
                <OrbitControls makeDefault enablePan enableZoom enableRotate />
              </Canvas>
            </div>
          </ViewerErrorBoundary>
        ) : (
          !loadingModel && !loadError && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1,
              background: '#0d0d1a', color: '#555', fontSize: 13,
            }}>
              {hasModels ? 'No GLB URL available' : 'Connect an Image\u21923D node'}
            </div>
          )
        )}

        {current?.thumbnailUrl && !localGlbUrl && !loadingModel && (
          <img src={current.thumbnailUrl} alt="Preview" className="threed-thumbnail" style={{ position: 'absolute', bottom: 48, left: 14, width: 80, height: 80, objectFit: 'cover', borderRadius: 6, border: '1px solid #333' }} />
        )}

        {/* ── Bottom toolbar ── */}
        <div className="threed-viewer-toolbar" style={{ padding: '6px 10px', borderTop: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
          <button className={`threed-btn nodrag ${wireframe ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); setWireframe(!wireframe); setShowNormals(false); }}>
            Wireframe
          </button>
          <button className={`threed-btn nodrag ${showNormals ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); setShowNormals(!showNormals); }}>
            Normals
          </button>
          <button className={`threed-btn nodrag ${showMaterials ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); setShowMaterials(!showMaterials); }}>
            Materials
          </button>
          <button className={`threed-btn nodrag ${autoRotate ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); setAutoRotate(!autoRotate); }}>
            Rotate
          </button>

          {allResults.length > 1 && (
            <>
              <div className="threed-separator" />
              <button className="threed-btn nodrag" onClick={(e) => { e.stopPropagation(); setCurrentIdx((i) => Math.max(0, i - 1)); }} disabled={currentIdx === 0}>&#9664;</button>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{currentIdx + 1}/{allResults.length}</span>
              <button className="threed-btn nodrag" onClick={(e) => { e.stopPropagation(); setCurrentIdx((i) => Math.min(allResults.length - 1, i + 1)); }} disabled={currentIdx >= allResults.length - 1}>&#9654;</button>
            </>
          )}

          {hasModels && (
            <>
              <div className="threed-separator" />
              <select className="threed-select nodrag" value={exportFormat} onChange={(e) => setExportFormat(e.target.value as ExportFormat)}>
                {EXPORT_FORMATS.map((f) => {
                  const urlMap = (current?.modelUrls ?? {}) as Record<string, string | undefined>;
                  const available = !!urlMap[f];
                  return <option key={f} value={f} disabled={!available}>{f.toUpperCase()}{!available ? ' (N/A)' : ''}</option>;
                })}
              </select>
              <input className="threed-input nodrag" placeholder="filename" value={exportName} onChange={(e) => setExportName(e.target.value)} />
              <button className="threed-btn primary nodrag" onClick={(e) => { e.stopPropagation(); handleExport(); }} disabled={exporting || !current}>
                {exporting ? '...' : 'Save'}
              </button>
              <button
                className="threed-btn primary nodrag"
                style={{ background: '#ff6e40', borderColor: '#ff6e40' }}
                onClick={(e) => { e.stopPropagation(); handleSendToUE5(); }}
                disabled={ue5Sending || !current}
                title="Send model to UE5 via Remote Control API"
              >
                {ue5Sending ? '...' : '→ UE5'}
              </button>
            </>
          )}
        </div>
        {exportStatus && <div className="threed-success" style={{ padding: '2px 10px', fontSize: 9 }}>{exportStatus}</div>}
        {exportError && <div className="threed-error" style={{ margin: '0 10px 4px', fontSize: 10 }}>{exportError}</div>}
        {ue5Status && <div className="threed-success" style={{ padding: '2px 10px', fontSize: 9 }}>{ue5Status}</div>}
        {ue5Error && <div className="threed-error" style={{ margin: '0 10px 4px', fontSize: 10 }}>{ue5Error}</div>}
      </div>
    </div>
  );
}

const MeshyModelViewerNode = memo(MeshyModelViewerNodeInner);
export default MeshyModelViewerNode;
