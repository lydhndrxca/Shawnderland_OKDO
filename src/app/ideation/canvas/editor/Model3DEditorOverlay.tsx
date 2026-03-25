"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useReactFlow, useStore } from '@xyflow/react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, useGLTF, Center, GizmoHelper, GizmoViewport } from '@react-three/drei';
import * as THREE from 'three';
import { Model3DEditorProvider, useModel3DEditor } from './model3d/Model3DEditorContext';
import EditorToolbar from './model3d/EditorToolbar';
import TransformGizmo from './model3d/TransformGizmo';
import { PivotIndicator, PivotSnapHandler } from './model3d/PivotTool';
import FFDLattice from './model3d/FFDLattice';
import { PropertiesPanel, StatusBar } from './model3d/CoordinateDisplay';
import ReferenceBlocks from './model3d/ReferenceBlocks';
import HistoryPanel from './model3d/HistoryPanel';
import type { MeshyTaskResult } from '@/lib/ideation/engine/meshyApi';
import type { Hitem3DTaskResult } from '@/lib/ideation/engine/hitem3dApi';
import { getGlobalSettings } from '@/lib/globalSettings';
import './Model3DEditorOverlay.css';

interface OverlayProps {
  editorNodeId: string;
  onClose: () => void;
}

/* ── Blob cache + proxy fetch (shared with UE3DViewerNode) ── */

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
  if (!res.ok) throw new Error(`Model download failed (${res.status})`);
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  blobCache.set(remoteUrl, blobUrl);
  return blobUrl;
}

/* ── Camera Capture — syncs R3F camera to context ref ── */

function CameraCapture() {
  const { camera } = useThree();
  const { state } = useModel3DEditor();
  useEffect(() => {
    (state.cameraRef as React.MutableRefObject<THREE.Camera | null>).current = camera;
  }, [camera, state.cameraRef]);
  return null;
}

/* ── Model Scene (loads GLB) ── */

function EditorModelScene({ url }: { url: string }) {
  const { state, actions } = useModel3DEditor();
  const { scene } = useGLTF(url);
  const clonedScene = useMemo(() => scene.clone(true), [scene]);
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (groupRef.current) {
      (state.modelRef as React.MutableRefObject<THREE.Group | null>).current = groupRef.current;
    }
  }, [state.modelRef]);

  useEffect(() => {
    if (!groupRef.current) return;
    const box = new THREE.Box3().setFromObject(groupRef.current);
    const size = new THREE.Vector3();
    box.getSize(size);
    actions.setModelBBox(box, size);
  }, [clonedScene, actions]);

  useEffect(() => {
    clonedScene.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      if (state.showNormals) {
        child.material = new THREE.MeshNormalMaterial({ wireframe: state.wireframe });
      } else {
        const setWF = (m: THREE.Material) => {
          if ('wireframe' in m) (m as THREE.MeshStandardMaterial).wireframe = state.wireframe;
        };
        if (Array.isArray(child.material)) child.material.forEach(setWF);
        else setWF(child.material);
      }
    });
  }, [clonedScene, state.wireframe, state.showNormals]);

  useEffect(() => {
    if (!groupRef.current) return;
    groupRef.current.position.copy(state.position);
    groupRef.current.rotation.copy(state.rotation);
    groupRef.current.scale.copy(state.scale);
  }, [state.position, state.rotation, state.scale]);

  return (
    <group ref={groupRef}>
      <Center disableY disableZ={false}>
        <primitive object={clonedScene} />
      </Center>
    </group>
  );
}

/* ── Keyboard Shortcuts ── */

function KeyboardHandler() {
  const { state, actions, onClose } = useModel3DEditor();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;

      const ctrl = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      if (ctrl && key === 'z' && !e.shiftKey) {
        e.preventDefault();
        actions.undo();
        return;
      }
      if ((ctrl && key === 'z' && e.shiftKey) || (ctrl && key === 'y')) {
        e.preventDefault();
        actions.redo();
        return;
      }

      if (ctrl && key === 'c' && state.selectedBlockId) {
        e.preventDefault();
        actions.copySelectedBlock();
        return;
      }
      if (ctrl && key === 'v') {
        e.preventDefault();
        actions.pasteBlock();
        return;
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && state.selectedBlockId) {
        e.preventDefault();
        actions.pushUndo('Delete ref block');
        actions.removeRefBlock(state.selectedBlockId);
        return;
      }
      if (ctrl && key === 'd' && state.selectedBlockId) {
        e.preventDefault();
        actions.pushUndo('Duplicate ref block');
        actions.duplicateRefBlock(state.selectedBlockId);
        return;
      }

      switch (key) {
        case 'q': actions.setActiveTool('select'); break;
        case 'w': actions.setActiveTool('move'); break;
        case 'e': actions.setActiveTool('rotate'); break;
        case 'r': actions.setActiveTool('scale'); break;
        case 'f': actions.setFFDEnabled(!state.ffd.enabled); break;
        case 'b': actions.snapPivotToBottom(); break;
        case 'c': actions.centerToOrigin(); break;
        case 'g': actions.setGridSnap({ enabled: !state.gridSnap.enabled }); break;
        case 'h': actions.setShowHistory(!state.showHistory); break;
        case 'escape':
          if (state.showHistory) actions.setShowHistory(false);
          else if (state.selectedBlockId) actions.setSelectedBlock(null);
          else if (state.ffd.selectedPointIndices.length > 0) actions.setFFDSelectedPoints([]);
          else if (state.pivotSnapMode) actions.setPivotSnapMode(false);
          else onClose();
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [state, actions, onClose]);

  return null;
}

/* ── Dynamic Grid ── */

function DynamicGrid() {
  const { state } = useModel3DEditor();

  const gridSize = 20;
  const snap = state.gridSnap;
  const divisions = snap.enabled
    ? Math.max(1, Math.round(gridSize / (snap.value / 100)))
    : 20;

  return (
    <gridHelper
      args={[gridSize, divisions, snap.enabled ? '#4db6ac' : '#333', snap.enabled ? '#1a3330' : '#1a1a2e']}
    />
  );
}

/* ── Options Bar Snap Info ── */

function SnapInfo() {
  const { state } = useModel3DEditor();
  const parts: string[] = [];
  if (state.gridSnap.enabled) parts.push(`Grid: ${state.gridSnap.value} UU`);
  if (state.rotateSnap.enabled) parts.push(`Rot: ${state.rotateSnap.value}\u00B0`);
  if (state.scaleSnap.enabled) parts.push(`Scale: ${state.scaleSnap.value} UU`);
  if (parts.length === 0) return null;
  return <span className="m3d-opt-snap-info">{parts.join(' | ')}</span>;
}

/* ── FFD Orbit Guard — disables OrbitControls while Shift is held in FFD mode ── */

function FFDOrbitGuard() {
  const { state } = useModel3DEditor();
  const controls = useThree((s) => s.controls) as any;

  useEffect(() => {
    if (!state.ffd.enabled || !controls) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') controls.enabled = false;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') controls.enabled = true;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      controls.enabled = true;
    };
  }, [state.ffd.enabled, controls]);

  return null;
}

/* ── FFD Box Selection Overlay ── */

function FFDBoxSelectOverlay() {
  const { state, actions } = useModel3DEditor();
  const [box, setBox] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const draggingRef = useRef(false);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const lastBoxRef = useRef<{ x1: number; y1: number; x2: number; y2: number } | null>(null);

  useEffect(() => {
    if (!state.ffd.enabled) return;

    const canvasEl = state.canvasRef.current;
    if (!canvasEl) return;

    const getRelPos = (e: PointerEvent) => {
      const rect = canvasEl.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const onDown = (e: PointerEvent) => {
      if (!e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      const pos = getRelPos(e);
      startRef.current = pos;
      const b = { x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y };
      lastBoxRef.current = b;
      setBox(b);
      draggingRef.current = true;
    };

    const onMove = (e: PointerEvent) => {
      if (!draggingRef.current || !startRef.current) return;
      e.preventDefault();
      const pos = getRelPos(e);
      const b = { x1: startRef.current.x, y1: startRef.current.y, x2: pos.x, y2: pos.y };
      lastBoxRef.current = b;
      setBox(b);
    };

    const onUp = () => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      startRef.current = null;

      const currentBox = lastBoxRef.current;
      lastBoxRef.current = null;
      setBox(null);

      if (!currentBox) return;
      const camera = state.cameraRef.current;
      if (!camera || !canvasEl || state.ffd.latticePoints.length === 0) return;

      const rect = canvasEl.getBoundingClientRect();
      const minX = Math.min(currentBox.x1, currentBox.x2);
      const maxX = Math.max(currentBox.x1, currentBox.x2);
      const minY = Math.min(currentBox.y1, currentBox.y2);
      const maxY = Math.max(currentBox.y1, currentBox.y2);

      if (maxX - minX < 5 && maxY - minY < 5) return;

      const selected: number[] = [];
      const projected = new THREE.Vector3();

      state.ffd.latticePoints.forEach((pt, idx) => {
        projected.copy(pt).project(camera);
        const sx = ((projected.x + 1) / 2) * rect.width;
        const sy = ((1 - projected.y) / 2) * rect.height;
        if (sx >= minX && sx <= maxX && sy >= minY && sy <= maxY) {
          selected.push(idx);
        }
      });

      if (selected.length > 0) actions.setFFDSelectedPoints(selected);
    };

    canvasEl.addEventListener('pointerdown', onDown, { capture: true });
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      canvasEl.removeEventListener('pointerdown', onDown, { capture: true });
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [state.ffd.enabled, state.ffd.latticePoints, state.cameraRef, state.canvasRef, actions]);

  if (!state.ffd.enabled || !box) return null;

  const style = {
    left: Math.min(box.x1, box.x2),
    top: Math.min(box.y1, box.y2),
    width: Math.abs(box.x2 - box.x1),
    height: Math.abs(box.y2 - box.y1),
  };

  if (style.width < 3 && style.height < 3) return null;

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 4, pointerEvents: 'none' }}>
      <div className="m3d-box-select" style={style} />
    </div>
  );
}

/* ── Overlay Shell ── */

function EditorShell({ onClose }: { onClose: () => void }) {
  const { state, actions } = useModel3DEditor();

  const handleBackdropClick = useCallback(() => onClose(), [onClose]);

  return (
    <div className="m3d-backdrop" onClick={handleBackdropClick}>
      <div className="m3d-panel" onClick={(e) => e.stopPropagation()}>
        {/* Menu bar */}
        <div className="m3d-menubar">
          <span className="m3d-menubar-title">3D Model Editor</span>
          <span className="m3d-menubar-spacer" />
          <button
            className={`m3d-opt-toggle ${state.showHistory ? 'active' : ''}`}
            onClick={() => actions.setShowHistory(!state.showHistory)}
            title="Toggle History (H)"
            style={{ fontSize: 11, padding: '2px 10px' }}
          >
            History
          </button>
          <button className="m3d-menubar-close" onClick={onClose} title="Close Editor (Esc)">
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="m3d-body">
          <EditorToolbar />

          <div className="m3d-viewport">
            {/* Options bar */}
            <div className="m3d-optionsbar">
              <span className="m3d-opt-label">{state.activeTool.toUpperCase()}</span>
              <span className="m3d-opt-divider" />
              <SnapInfo />
              {state.pivotSnapMode && (
                <>
                  <span className="m3d-opt-divider" />
                  <span style={{ fontSize: 12, color: '#ffeb3b' }}>Click model to set pivot</span>
                </>
              )}
              {state.ffd.enabled && (
                <>
                  <span className="m3d-opt-divider" />
                  <span style={{ fontSize: 12, color: '#ff6e40' }}>
                    FFD Active ({state.ffd.divisions.x}&times;{state.ffd.divisions.y}&times;{state.ffd.divisions.z})
                  </span>
                </>
              )}
            </div>

            {/* 3D Canvas */}
            <div
              className="m3d-canvas-area"
              ref={(el) => { (state.canvasRef as React.MutableRefObject<HTMLDivElement | null>).current = el; }}
              onContextMenu={(e) => e.preventDefault()}
            >
              {state.glbUrl ? (
                <>
                  <Canvas
                    camera={{ position: [0, 2, 5], fov: 45 }}
                    style={{ width: '100%', height: '100%' }}
                    gl={{ preserveDrawingBuffer: true }}
                    onContextMenu={(e) => e.preventDefault()}
                  >
                    <CameraCapture />
                    <ambientLight intensity={0.5} />
                    <directionalLight position={[5, 5, 5]} intensity={1} />
                    <Suspense fallback={null}>
                      <Environment preset="studio" />
                      <EditorModelScene url={state.glbUrl} />
                    </Suspense>
                    <TransformGizmo />
                    <PivotIndicator />
                    <PivotSnapHandler />
                    <FFDLattice />
                    <FFDOrbitGuard />
                    <ReferenceBlocks />
                    <OrbitControls
                      makeDefault
                      enablePan
                      enableZoom
                      enableRotate
                      mouseButtons={{
                        LEFT: THREE.MOUSE.ROTATE,
                        MIDDLE: THREE.MOUSE.PAN,
                        RIGHT: THREE.MOUSE.PAN,
                      }}
                    />
                    <GizmoHelper alignment="bottom-right" margin={[60, 60]}>
                      <GizmoViewport labelColor="white" axisHeadScale={0.8} />
                    </GizmoHelper>
                    <DynamicGrid />
                  </Canvas>
                  <FFDBoxSelectOverlay />
                  {state.ffd.enabled && (
                    <div className="m3d-ffd-hint">
                      Hold Shift + drag to select FFD points
                    </div>
                  )}
                </>
              ) : (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '100%', height: '100%', color: '#555', fontSize: 14,
                }}>
                  No model loaded
                </div>
              )}
              {state.showHistory && <HistoryPanel />}
            </div>
          </div>

          <PropertiesPanel />
        </div>

        <StatusBar />
        <KeyboardHandler />
      </div>
    </div>
  );
}

/* ── Main Export: resolves GLB URL from node data ── */

export default function Model3DEditorOverlay({ editorNodeId, onClose }: OverlayProps) {
  const { getNode } = useReactFlow();
  const [glbUrl, setGlbUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const edgesSelector = useCallback(
    (state: { edges: Array<{ source: string; target: string }> }) =>
      state.edges.filter((e) => e.target === editorNodeId).map((e) => e.source),
    [editorNodeId],
  );
  const upstreamIds = useStore(edgesSelector);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const selfNode = getNode(editorNodeId);
    const selfData = selfNode?.data as Record<string, unknown> | undefined;
    const localUrl = selfData?._editorGlbUrl as string | undefined;
    if (localUrl) {
      setGlbUrl(localUrl);
      setLoading(false);
      return;
    }

    let remoteUrl: string | null = null;
    for (const srcId of upstreamIds) {
      const src = getNode(srcId);
      if (!src?.data) continue;
      const d = src.data as Record<string, unknown>;

      const meshy = d.meshyResult as MeshyTaskResult | undefined;
      if (meshy?.status === 'SUCCEEDED' && meshy.model_urls?.glb) {
        remoteUrl = meshy.model_urls.glb;
        break;
      }

      const hitem = d.hitem3dResult as Hitem3DTaskResult | undefined;
      if (hitem?.status === 'success' && hitem.url) {
        const ext = hitem.url.split('.').pop()?.split('?')[0]?.toLowerCase() ?? '';
        if (ext === 'glb' || hitem.url.includes('.glb')) {
          remoteUrl = hitem.url;
          break;
        }
      }
    }

    if (!remoteUrl) {
      setGlbUrl(null);
      setLoading(false);
      return;
    }

    fetchGlbViaProxy(remoteUrl)
      .then((url) => { if (!cancelled) { setGlbUrl(url); setLoading(false); } })
      .catch(() => { if (!cancelled) { setGlbUrl(null); setLoading(false); } });

    return () => { cancelled = true; };
  }, [editorNodeId, upstreamIds, getNode]);

  if (loading) {
    return (
      <div className="m3d-backdrop">
        <div style={{ color: '#ff6e40', fontSize: 16 }}>Loading 3D model...</div>
      </div>
    );
  }

  return (
    <Model3DEditorProvider glbUrl={glbUrl} onClose={onClose}>
      <EditorShell onClose={onClose} />
    </Model3DEditorProvider>
  );
}
