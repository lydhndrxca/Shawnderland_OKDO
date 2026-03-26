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
import { sendToUE5 } from '@/lib/ideation/engine/meshyApi';
import type { Hitem3DTaskResult } from '@/lib/ideation/engine/hitem3dApi';
import { getGlobalSettings } from '@/lib/globalSettings';
import { requestOpenModelEditor } from '@/app/ideation/canvas/modelEditorBridge';
import type { DesignSpec } from './DesignSpecNode';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, useGLTF, Center, Html, GizmoHelper, GizmoViewport, Line } from '@react-three/drei';
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
    console.error('[UE 3D Viewer]', error, info);
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

const HITEM3D_HOSTS = new Set(['hitem3dstatic.zaohaowu.net', 'api.hitem3d.ai', 'cdn.hitem3d.ai', 'assets.hitem3d.ai']);

function pickProxyEndpoint(remoteUrl: string): { endpoint: string; headers: Record<string, string> } {
  try {
    const host = new URL(remoteUrl).hostname;
    if (HITEM3D_HOSTS.has(host)) {
      const h: Record<string, string> = { 'Content-Type': 'application/json' };
      const s = getGlobalSettings();
      if (s.hitem3dAccessKey) h['x-hitem3d-access'] = s.hitem3dAccessKey;
      if (s.hitem3dSecretKey) h['x-hitem3d-secret'] = s.hitem3dSecretKey;
      return { endpoint: '/api/hitem3d', headers: h };
    }
  } catch { /* fall through */ }
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  const meshyKey = getGlobalSettings().meshyApiKey;
  if (meshyKey) h['x-meshy-key'] = meshyKey;
  return { endpoint: '/api/meshy', headers: h };
}

async function fetchGlbViaProxy(remoteUrl: string): Promise<string> {
  const cached = blobCache.get(remoteUrl);
  if (cached) return cached;

  const { endpoint, headers } = pickProxyEndpoint(remoteUrl);
  const res = await fetch(endpoint, {
    method: 'POST',
    headers,
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

/* ── Blender API helper ────────────────────────────────────────── */

async function callBlender(op: string, payload: Record<string, unknown>): Promise<{ glb: string }> {
  const blenderPath = getGlobalSettings().blenderPath || '';
  const res = await fetch('/api/blender-process', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(blenderPath ? { 'x-blender-path': blenderPath } : {}),
    },
    body: JSON.stringify({ operation: op, ...payload }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Blender ${op} failed (${res.status}): ${text.slice(0, 200)}`);
  }
  return res.json();
}

function base64ToBlob(b64: string, mime = 'model/gltf-binary'): string {
  const raw = atob(b64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return URL.createObjectURL(new Blob([bytes], { type: mime }));
}

function arrayBufferToBase64(ab: ArrayBuffer): string {
  const bytes = new Uint8Array(ab);
  const CHUNK = 0x8000;
  const parts: string[] = [];
  for (let i = 0; i < bytes.length; i += CHUNK) {
    parts.push(String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK) as unknown as number[]));
  }
  return btoa(parts.join(''));
}

/* ── UE dimension constants ────────────────────────────────────── */

const UU_PER_UNIT = 100; // 1 Three.js unit = 100 UU (cm)

/* ── Three.js sub-components ────────────────────────────────────── */

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

interface UnifiedModelResult {
  source: 'meshy' | 'hitem3d';
  id: string;
  glbUrl: string | null;
  thumbnailUrl: string | null;
  textureUrls?: PBRTextureUrls;
}

function ModelScene({
  url,
  wireframe,
  showNormals,
  designSpec,
  showDimGuide,
  onBBoxComputed,
  selectedFaces,
  onFaceClick,
  paintMode,
}: {
  url: string;
  wireframe: boolean;
  showNormals: boolean;
  designSpec: DesignSpec | null;
  showDimGuide: boolean;
  onBBoxComputed: (box: THREE.Box3, size: THREE.Vector3) => void;
  selectedFaces: Set<number>;
  onFaceClick: (faceIdx: number) => void;
  paintMode: boolean;
}) {
  const { scene } = useGLTF(url);
  const clonedScene = useMemo(() => scene.clone(true), [scene]);
  const groupRef = useRef<THREE.Group>(null);
  const { raycaster, pointer, camera } = useThree();

  // Scale model to match design spec
  useEffect(() => {
    if (!groupRef.current) return;
    const box = new THREE.Box3().setFromObject(groupRef.current);
    const size = new THREE.Vector3();
    box.getSize(size);
    onBBoxComputed(box, size);

    if (designSpec) {
      const targetH = designSpec.height / UU_PER_UNIT;
      const currentH = size.y || 1;
      const scale = targetH / currentH;
      groupRef.current.scale.setScalar(scale);
    }
  }, [clonedScene, designSpec, onBBoxComputed]);

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

  const handleClick = useCallback(() => {
    if (!paintMode || !groupRef.current) return;
    raycaster.setFromCamera(pointer, camera);
    const meshes: THREE.Mesh[] = [];
    groupRef.current.traverse((c) => { if (c instanceof THREE.Mesh) meshes.push(c); });
    const hits = raycaster.intersectObjects(meshes);
    if (hits.length > 0 && hits[0].faceIndex != null) {
      onFaceClick(hits[0].faceIndex!);
    }
  }, [paintMode, raycaster, pointer, camera, onFaceClick]);

  return (
    <group ref={groupRef} onClick={handleClick}>
      <Center>
        <primitive object={clonedScene} />
      </Center>
    </group>
  );
}

function AxisLine({ height }: { height: number }) {
  const points = useMemo<[number, number, number][]>(
    () => [[0, 0, 0], [0, height, 0]],
    [height],
  );
  return <Line points={points} color="#6c63ff" lineWidth={1} transparent opacity={0.5} />;
}

function DimensionGrid({ designSpec, showGrid, modelSize }: {
  designSpec: DesignSpec | null;
  showGrid: boolean;
  modelSize: THREE.Vector3 | null;
}) {
  if (!showGrid) return null;
  const h = designSpec?.height ?? 180;
  const w = designSpec?.width ?? 120;
  const d = designSpec?.depth ?? 30;

  const gridSize = Math.max(h, w, d, 300) / UU_PER_UNIT;
  const tickCount = Math.ceil(gridSize * UU_PER_UNIT / 100);

  return (
    <group>
      {/* Floor grid */}
      <gridHelper args={[gridSize * 2, tickCount * 2, '#333', '#1a1a2e']} position={[0, 0, 0]} />

      {/* Axis labels at 100 UU intervals */}
      {Array.from({ length: tickCount + 1 }, (_, i) => {
        const pos = (i * 100) / UU_PER_UNIT;
        return (
          <group key={`tick-${i}`}>
            {i > 0 && (
              <Html position={[-0.15, pos, 0]} style={{ fontSize: 8, color: '#6c63ff', whiteSpace: 'nowrap', pointerEvents: 'none', userSelect: 'none' }}>
                {i * 100} UU
              </Html>
            )}
          </group>
        );
      })}

      {/* Vertical axis line */}
      <AxisLine height={h / UU_PER_UNIT} />
    </group>
  );
}

function TargetBox({ designSpec, visible }: { designSpec: DesignSpec | null; visible: boolean }) {
  if (!visible || !designSpec) return null;
  const h = designSpec.height / UU_PER_UNIT;
  const w = designSpec.width / UU_PER_UNIT;
  const d = designSpec.depth / UU_PER_UNIT;

  return (
    <mesh position={[0, h / 2, 0]}>
      <boxGeometry args={[w, h, d]} />
      <meshBasicMaterial color="#6c63ff" wireframe opacity={0.3} transparent />
    </mesh>
  );
}

function CollisionOverlay({ url, visible }: { url: string | null; visible: boolean }) {
  if (!visible || !url) return null;
  const { scene } = useGLTF(url);
  const cloned = useMemo(() => scene.clone(true), [scene]);

  useEffect(() => {
    cloned.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = new THREE.MeshBasicMaterial({
          color: '#00e676',
          wireframe: true,
          transparent: true,
          opacity: 0.4,
        });
      }
    });
  }, [cloned]);

  return <primitive object={cloned} />;
}

function AutoRotate({ enabled }: { enabled: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_s, delta) => {
    if (enabled && ref.current) ref.current.rotation.y += delta * 0.3;
  });
  return <group ref={ref} />;
}

/* ── Main Node ──────────────────────────────────────────────────── */

function UE3DViewerNodeInner({ id, data, selected }: Props) {
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
  const [autoRotate, setAutoRotate] = useState(false);
  const [showDimGuide, setShowDimGuide] = useState(true);
  const [showCollision, setShowCollision] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [paintMode, setPaintMode] = useState(false);

  const [localGlbUrl, setLocalGlbUrl] = useState<string | null>(null);
  const [collisionGlbUrl, setCollisionGlbUrl] = useState<string | null>(null);
  const [loadingModel, setLoadingModel] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [scalingStatus, setScalingStatus] = useState<string | null>(null);
  const [collisionStatus, setCollisionStatus] = useState<string | null>(null);

  const [selectedFaces, setSelectedFaces] = useState<Set<number>>(new Set());
  const [surfaceTargetH, setSurfaceTargetH] = useState(100);
  const [modelBBox, setModelBBox] = useState<THREE.Box3 | null>(null);
  const [modelSize, setModelSize] = useState<THREE.Vector3 | null>(null);

  const [ue5Sending, setUe5Sending] = useState(false);
  const [ue5Status, setUe5Status] = useState<string | null>(null);
  const [ue5Error, setUe5Error] = useState<string | null>(null);
  const [exportName, setExportName] = useState((data.exportName as string) ?? 'model');

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  /* ── Read upstream edges ── */
  const edgesRef = useRef<Array<{ source: string; target: string }>>([]);
  useStore(useCallback(
    (state: { edges: Array<{ source: string; target: string }> }) => {
      edgesRef.current = state.edges;
      return state.edges.length;
    },
    [],
  ));

  /* ── Upstream model results ── */
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

  /* ── Upstream designSpec ── */
  const designSpecSelector = useCallback(
    (state: {
      nodes: Array<{ id: string; data: Record<string, unknown> }>;
      edges: Array<{ source: string; target: string }>;
    }) => {
      // BFS through upstream nodes to find one with designSpec
      const visited = new Set<string>();
      const queue: string[] = [];
      for (const e of state.edges) {
        if (e.target === id) queue.push(e.source);
      }
      while (queue.length) {
        const sid = queue.shift()!;
        if (visited.has(sid)) continue;
        visited.add(sid);
        const peer = state.nodes.find((n) => n.id === sid);
        const d = peer?.data as Record<string, unknown> | undefined;
        if (d?.designSpec) return JSON.stringify(d.designSpec);
        for (const e of state.edges) {
          if (e.target === sid) queue.push(e.source);
        }
      }
      return '';
    },
    [id],
  );
  const designSpecJson = useStore(designSpecSelector);
  let designSpec: DesignSpec | null = null;
  if (designSpecJson) {
    try { designSpec = JSON.parse(designSpecJson); } catch { /* corrupt data */ }
  }

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
          thumbnailUrl: meshy.thumbnail_url ?? null,
          textureUrls: tex ? { base_color: tex.base_color, metallic: tex.metallic, normal: tex.normal, roughness: tex.roughness } : undefined,
        });
      }

      const hitem = d.hitem3dResult as Hitem3DTaskResult | undefined;
      if (hitem?.state === 'success' && hitem.url) {
        const ext = hitem.url.split('.').pop()?.split('?')[0]?.toLowerCase() ?? '';
        const isGlb = ext === 'glb' || hitem.url.includes('.glb');
        results.push({
          source: 'hitem3d',
          id: hitem.task_id,
          glbUrl: isGlb ? hitem.url : null,
          thumbnailUrl: hitem.cover_url ?? null,
        });
      }
    }
    return results;
  }, [id, getNode, resultSig]);

  const [currentIdx, setCurrentIdx] = useState(0);
  const current = allResults[currentIdx] ?? allResults[0] ?? null;
  const remoteGlbUrl = current?.glbUrl ?? null;

  /* ── Load model ── */
  useEffect(() => {
    if (!remoteGlbUrl) {
      setLocalGlbUrl(null);
      setLoadError(null);
      setCollisionGlbUrl(null);
      return;
    }

    let cancelled = false;
    setLoadingModel(true);
    setLoadError(null);
    setLocalGlbUrl(null);
    setCollisionGlbUrl(null);

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

  /* ── Blender scaling ── */
  const handleBlenderScale = useCallback(async () => {
    if (!localGlbUrl || !designSpec) return;
    setScalingStatus('Scaling via Blender...');
    try {
      const resp = await fetch(localGlbUrl);
      const ab = await resp.arrayBuffer();
      const b64 = arrayBufferToBase64(ab);
      const result = await callBlender('scale', {
        glb: b64,
        targetHeight: designSpec.height,
        targetWidth: designSpec.width,
        targetDepth: designSpec.depth,
      });
      const newUrl = base64ToBlob(result.glb);
      if (mountedRef.current) {
        setLocalGlbUrl(newUrl);
        setScalingStatus('Scaled to spec');
        setTimeout(() => { if (mountedRef.current) setScalingStatus(null); }, 3000);
      }
    } catch (e) {
      if (mountedRef.current) setScalingStatus(`Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, [localGlbUrl, designSpec]);

  /* ── Blender collision ── */
  const handleGenCollision = useCallback(async () => {
    if (!localGlbUrl) return;
    setCollisionStatus('Generating collision...');
    try {
      const resp = await fetch(localGlbUrl);
      const ab = await resp.arrayBuffer();
      const b64 = arrayBufferToBase64(ab);
      const result = await callBlender('collision', { glb: b64 });
      const url = base64ToBlob(result.glb);
      if (mountedRef.current) {
        setCollisionGlbUrl(url);
        setShowCollision(true);
        setCollisionStatus('Collision ready');
        setTimeout(() => { if (mountedRef.current) setCollisionStatus(null); }, 3000);
      }
    } catch (e) {
      if (mountedRef.current) setCollisionStatus(`Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, [localGlbUrl]);

  /* ── Face paint ── */
  const handleFaceClick = useCallback((idx: number) => {
    setSelectedFaces((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }, []);

  const handleApplyConstraint = useCallback(async () => {
    if (!localGlbUrl || selectedFaces.size === 0) return;
    setScalingStatus('Applying surface constraint...');
    try {
      const resp = await fetch(localGlbUrl);
      const ab = await resp.arrayBuffer();
      const b64 = arrayBufferToBase64(ab);
      const result = await callBlender('scale-surface', {
        glb: b64,
        faceIndices: Array.from(selectedFaces),
        targetHeight: surfaceTargetH,
      });
      const url = base64ToBlob(result.glb);
      if (mountedRef.current) {
        setLocalGlbUrl(url);
        setSelectedFaces(new Set());
        setScalingStatus('Surface adjusted');
        setTimeout(() => { if (mountedRef.current) setScalingStatus(null); }, 3000);
      }
    } catch (e) {
      if (mountedRef.current) setScalingStatus(`Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, [localGlbUrl, selectedFaces, surfaceTargetH]);

  const onBBoxComputed = useCallback((box: THREE.Box3, size: THREE.Vector3) => {
    setModelBBox(box);
    setModelSize(size);
  }, []);

  useEffect(() => {
    persistData({ exportName });
  }, [exportName, persistData]);

  const handleSendToUE5 = useCallback(async () => {
    if (!localGlbUrl || ue5Sending) return;

    const ue5Path = getGlobalSettings().ue5ProjectPath;
    if (!ue5Path) {
      setUe5Error('Set UE5 Project Path in Settings (top-left gear icon).');
      return;
    }

    setUe5Sending(true);
    setUe5Error(null);
    setUe5Status('Staging model + textures...');

    try {
      const resp = await fetch(localGlbUrl);
      const ab = await resp.arrayBuffer();
      const bytes = new Uint8Array(ab);
      const CHUNK = 0x8000;
      const parts: string[] = [];
      for (let i = 0; i < bytes.length; i += CHUNK) {
        parts.push(String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK) as unknown as number[]));
      }
      const b64 = btoa(parts.join(''));

      const name = exportName.trim() || 'model';
      const result = await sendToUE5({
        glbBase64: b64,
        assetName: name,
        projectPath: ue5Path,
        destFolder: '/Game/OKDO',
        textureUrls: current?.textureUrls,
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
  }, [localGlbUrl, ue5Sending, exportName, current]);

  /* ── Export GLB ── */
  const handleExportGlb = useCallback(async () => {
    if (!localGlbUrl) return;
    try {
      const resp = await fetch(localGlbUrl);
      const blob = await resp.blob();
      const name = (exportName.trim() || 'model') + '.glb';
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      console.error('[UE3DViewer] GLB export failed:', e);
    }
  }, [localGlbUrl, exportName]);

  const hasModels = allResults.length > 0;
  const scaledDims = modelSize && designSpec
    ? {
        h: Math.round(designSpec.height),
        w: Math.round((modelSize.x / (modelSize.y || 1)) * designSpec.height),
        d: Math.round((modelSize.z / (modelSize.y || 1)) * designSpec.height),
      }
    : null;

  const blenderAvailable = !!getGlobalSettings().blenderPath;

  return (
    <div
      className={`threed-node threed-viewer-node ${selected ? 'selected' : ''}`}
      style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}
    >
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />

      <div className="threed-node-header" style={{ background: 'linear-gradient(135deg, #ff3d00, #ff6e40)' }}>
        <span>UE5 3D Viewer</span>
        <span style={{ fontSize: 9, opacity: 0.8 }}>
          {designSpec ? `${designSpec.height}×${designSpec.width}×${designSpec.depth} UU` : 'No spec'}
        </span>
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
            <div className="threed-viewer-canvas nodrag nowheel" style={{ cursor: paintMode ? 'crosshair' : undefined }}>
              <Canvas
                camera={{ position: [0, 2, 4], fov: 45 }}
                style={{ width: '100%', height: '100%' }}
                gl={{ preserveDrawingBuffer: true }}
              >
                <ambientLight intensity={0.5} />
                <directionalLight position={[5, 5, 5]} intensity={1} />
                <Suspense fallback={null}>
                  {showMaterials && <Environment preset="studio" />}
                  <ModelScene
                    url={localGlbUrl}
                    wireframe={wireframe}
                    showNormals={showNormals}
                    designSpec={designSpec}
                    showDimGuide={showDimGuide}
                    onBBoxComputed={onBBoxComputed}
                    selectedFaces={selectedFaces}
                    onFaceClick={handleFaceClick}
                    paintMode={paintMode}
                  />
                  <DimensionGrid designSpec={designSpec} showGrid={showGrid} modelSize={modelSize} />
                  <TargetBox designSpec={designSpec} visible={showDimGuide} />
                </Suspense>
                <Suspense fallback={null}>
                  <CollisionOverlay url={collisionGlbUrl} visible={showCollision} />
                </Suspense>
                <AutoRotate enabled={autoRotate} />
                <OrbitControls makeDefault enablePan enableZoom enableRotate />
                <GizmoHelper alignment="bottom-right" margin={[60, 60]}>
                  <GizmoViewport labelColor="white" axisHeadScale={0.8} />
                </GizmoHelper>
              </Canvas>

              {/* Dimension labels overlay */}
              {showDimGuide && scaledDims && (
                <div style={{
                  position: 'absolute', top: 8, left: 8,
                  background: 'rgba(0,0,0,0.7)', borderRadius: 4, padding: '4px 8px',
                  fontSize: 10, color: '#aaa', fontFamily: 'monospace', lineHeight: 1.6,
                }}>
                  <div>H: <span style={{ color: '#6c63ff' }}>{scaledDims.h} UU</span></div>
                  <div>W: <span style={{ color: '#4db6ac' }}>{scaledDims.w} UU</span></div>
                  <div>D: <span style={{ color: '#ff6e40' }}>{scaledDims.d} UU</span></div>
                </div>
              )}
            </div>
          </ViewerErrorBoundary>
        ) : (
          !loadingModel && !loadError && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1,
              background: '#0d0d1a', color: '#555', fontSize: 13,
            }}>
              {hasModels ? 'No GLB URL available' : 'Connect a 3D gen node'}
            </div>
          )
        )}

        {/* ── Edit Model Button ── */}
        {localGlbUrl && (
          <div style={{ padding: '6px 10px', borderTop: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
            <button
              className="nodrag"
              onClick={(e) => { e.stopPropagation(); requestOpenModelEditor(id); }}
              style={{
                width: '100%', height: 36, fontSize: 13, fontWeight: 700,
                background: 'linear-gradient(135deg, #ff3d00, #ff6e40)',
                border: 'none', borderRadius: 6, color: '#fff',
                cursor: 'pointer', letterSpacing: 0.5,
                boxShadow: '0 2px 8px rgba(255, 61, 0, 0.3)',
              }}
            >
              Edit Model
            </button>
          </div>
        )}

        {/* ── Toolbar ── */}
        <div className="threed-viewer-toolbar" style={{ padding: '6px 10px', borderTop: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
          <button className={`threed-btn nodrag ${wireframe ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); setWireframe(!wireframe); setShowNormals(false); }}>Wire</button>
          <button className={`threed-btn nodrag ${showNormals ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); setShowNormals(!showNormals); }}>Norm</button>
          <button className={`threed-btn nodrag ${showMaterials ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); setShowMaterials(!showMaterials); }}>Mat</button>
          <button className={`threed-btn nodrag ${autoRotate ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); setAutoRotate(!autoRotate); }}>Rot</button>
          <div className="threed-separator" />
          <button className={`threed-btn nodrag ${showDimGuide ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); setShowDimGuide(!showDimGuide); }}>Dims</button>
          <button className={`threed-btn nodrag ${showGrid ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); setShowGrid(!showGrid); }}>Grid</button>
          <button className={`threed-btn nodrag ${showCollision ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); setShowCollision(!showCollision); }}>Col</button>
          <button className={`threed-btn nodrag ${paintMode ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); setPaintMode(!paintMode); }}>Paint</button>
          <div className="threed-separator" />
          <input
            className="threed-input nodrag"
            placeholder="asset name"
            value={exportName}
            onChange={(e) => setExportName(e.target.value)}
            style={{ flex: '0 1 90px', fontSize: 10, padding: '3px 6px', minWidth: 0 }}
          />
          <button
            className="threed-btn primary nodrag"
            disabled={!localGlbUrl || ue5Sending}
            title={!localGlbUrl ? 'Load a model first' : 'Send current model to UE5'}
            onClick={(e) => { e.stopPropagation(); handleSendToUE5(); }}
          >
            {ue5Sending ? '...' : '→ UE5'}
          </button>
          <button
            className="threed-btn nodrag"
            disabled={!localGlbUrl}
            title={!localGlbUrl ? 'Load a model first' : 'Export model as .glb file'}
            onClick={(e) => { e.stopPropagation(); handleExportGlb(); }}
            style={localGlbUrl ? { background: '#1b5e20', color: '#a5d6a7' } : undefined}
          >
            Export GLB
          </button>

          {allResults.length > 1 && (
            <>
              <div className="threed-separator" />
              <button className="threed-btn nodrag" onClick={(e) => { e.stopPropagation(); setCurrentIdx((i) => Math.max(0, i - 1)); }} disabled={currentIdx === 0}>&#9664;</button>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{currentIdx + 1}/{allResults.length}</span>
              <button className="threed-btn nodrag" onClick={(e) => { e.stopPropagation(); setCurrentIdx((i) => Math.min(allResults.length - 1, i + 1)); }} disabled={currentIdx >= allResults.length - 1}>&#9654;</button>
            </>
          )}
        </div>

        {/* ── Blender tools row ── */}
        {localGlbUrl && (
          <div className="threed-viewer-toolbar" style={{ padding: '4px 10px', borderTop: '1px solid var(--border)', background: 'var(--bg-surface)', gap: 4 }}>
            <button
              className="threed-btn primary nodrag"
              disabled={!blenderAvailable || !designSpec}
              title={!blenderAvailable ? 'Set Blender path in Settings' : !designSpec ? 'No Design Spec connected' : 'Scale model with Blender'}
              onClick={(e) => { e.stopPropagation(); handleBlenderScale(); }}
            >
              Blender Scale
            </button>
            <button
              className="threed-btn primary nodrag"
              disabled={!blenderAvailable}
              title={!blenderAvailable ? 'Set Blender path in Settings' : 'Generate UE5 collision mesh'}
              onClick={(e) => { e.stopPropagation(); handleGenCollision(); }}
            >
              Gen Collision
            </button>
            {paintMode && selectedFaces.size > 0 && (
              <>
                <div className="threed-separator" />
                <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{selectedFaces.size} faces</span>
                <input
                  type="number"
                  className="threed-input nodrag"
                  value={surfaceTargetH}
                  onChange={(e) => setSurfaceTargetH(Math.max(1, Number(e.target.value)))}
                  style={{ width: 60 }}
                  min={1}
                />
                <span style={{ fontSize: 8, color: 'var(--text-muted)' }}>UU</span>
                <button
                  className="threed-btn primary nodrag"
                  disabled={!blenderAvailable}
                  onClick={(e) => { e.stopPropagation(); handleApplyConstraint(); }}
                >
                  Apply
                </button>
                <button className="threed-btn nodrag" onClick={(e) => { e.stopPropagation(); setSelectedFaces(new Set()); }}>Clear</button>
              </>
            )}
          </div>
        )}

        {/* Status messages */}
        {scalingStatus && <div className="threed-status" style={{ padding: '2px 10px', fontSize: 9 }}>{scalingStatus}</div>}
        {collisionStatus && <div className="threed-status" style={{ padding: '2px 10px', fontSize: 9 }}>{collisionStatus}</div>}
        {ue5Status && <div className="threed-success" style={{ padding: '2px 10px', fontSize: 9 }}>{ue5Status}</div>}
        {ue5Error && <div className="threed-error" style={{ margin: '0 10px 4px', fontSize: 10 }}>{ue5Error}</div>}
      </div>
    </div>
  );
}

const UE3DViewerNode = memo(UE3DViewerNodeInner);
export default UE3DViewerNode;
