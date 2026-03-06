"use client";

import { memo, useState, useCallback, useEffect, useRef } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { ImageContextMenu } from '@/components/ImageContextMenu';
import type { GeneratedImage } from '@/lib/ideation/engine/conceptlab/imageGenApi';
import './CharacterNodes.css';

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

type TabKey = 'main' | 'front' | 'back' | 'side' | 'refA' | 'refB' | 'refC';

const TABS: { key: TabKey; label: string; handle: string }[] = [
  { key: 'main', label: 'Main Stage', handle: 'main-in' },
  { key: 'front', label: 'Front', handle: 'front-in' },
  { key: 'back', label: 'Back', handle: 'back-in' },
  { key: 'side', label: 'Side', handle: 'side-in' },
  { key: 'refA', label: 'Ref A', handle: 'ref-a' },
  { key: 'refB', label: 'Ref B', handle: 'ref-b' },
  { key: 'refC', label: 'Ref C', handle: 'ref-c' },
];

function getImageFromHandle(
  nodeId: string,
  handleId: string,
  getNode: ReturnType<typeof useReactFlow>['getNode'],
  getEdges: ReturnType<typeof useReactFlow>['getEdges'],
): GeneratedImage | null {
  const edges = getEdges();
  const edge = edges.find((e) => e.target === nodeId && e.targetHandle === handleId);
  if (!edge) return null;
  const src = getNode(edge.source);
  if (!src?.data) return null;
  const d = src.data as Record<string, unknown>;

  if (handleId === 'main-in') {
    const img = d.generatedImage as GeneratedImage | undefined;
    if (img?.base64) return img;
  }

  const viewKey = handleId.replace('-in', '');
  const viewImg = d[`view_${viewKey}`] as GeneratedImage | undefined;
  if (viewImg?.base64) return viewImg;

  const img = d.generatedImage as GeneratedImage | undefined;
  if (img?.base64) return img;
  const b64 = d.imageBase64 as string | undefined;
  if (b64) return { base64: b64, mimeType: (d.mimeType as string) || 'image/png' };
  return null;
}

function MainStageViewerNodeInner({ id, data, selected }: Props) {
  const { getNode, getEdges, setNodes } = useReactFlow();
  const [activeTab, setActiveTab] = useState<TabKey>('main');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [tabImages, setTabImages] = useState<Partial<Record<TabKey, GeneratedImage>>>(() =>
    (data?.tabImages as Partial<Record<TabKey, GeneratedImage>>) ?? {},
  );
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const updates: Partial<Record<TabKey, GeneratedImage>> = {};
    for (const tab of TABS) {
      const img = getImageFromHandle(id, tab.handle, getNode, getEdges);
      if (img) updates[tab.key] = img;
    }
    if (Object.keys(updates).length) {
      setTabImages((prev) => {
        const next = { ...prev, ...updates };
        setNodes((nds) =>
          nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, tabImages: next } } : n)),
        );
        return next;
      });
    }
  }, [id, getNode, getEdges, setNodes]);

  const currentImage = (() => {
    const fromHandle = getImageFromHandle(
      id,
      TABS.find((t) => t.key === activeTab)!.handle,
      getNode,
      getEdges,
    );
    return fromHandle ?? tabImages[activeTab] ?? null;
  })();

  const handleResetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.stopPropagation();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((z) => Math.max(0.25, Math.min(5, z + delta)));
  }, []);

  const handleOpenImage = useCallback(() => {
    fileRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        const img: GeneratedImage = { base64, mimeType: file.type || 'image/png' };
        setTabImages((prev) => {
          const next = { ...prev, [activeTab]: img };
          setNodes((nds) =>
            nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, tabImages: next } } : n)),
          );
          return next;
        });
      };
      reader.readAsDataURL(file);
    },
    [id, activeTab, setNodes],
  );

  const imageCount = Object.values(tabImages).filter(Boolean).length;

  return (
    <div className={`char-node char-viewer-node ${selected ? 'selected' : ''}`}>
      <div className="char-node-header" style={{ background: '#00bfa5' }}>
        Main Stage Viewer
      </div>
      <div className="char-viewer-tabs">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            className={`char-viewer-tab nodrag ${activeTab === key ? 'active' : ''} ${tabImages[key] ? 'has-image' : ''}`}
            onClick={() => { setActiveTab(key); handleResetView(); }}
          >
            {label}
          </button>
        ))}
      </div>
      <div
        ref={canvasRef}
        className="char-viewer-canvas nodrag nowheel"
        onWheel={handleWheel}
        onDoubleClick={handleResetView}
        style={{ height: zoom > 1 ? 480 : 340 }}
      >
        {currentImage ? (
          <ImageContextMenu image={currentImage} alt={`viewer-${activeTab}`}>
            <img
              src={`data:${currentImage.mimeType};base64,${currentImage.base64}`}
              alt={activeTab}
              style={{
                transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
                transition: 'transform 0.15s',
              }}
            />
          </ImageContextMenu>
        ) : (
          <span className="char-viewer-empty">No image loaded</span>
        )}
      </div>
      <div className="char-viewer-toolbar">
        <button className="char-btn nodrag" onClick={handleOpenImage}>Open Image</button>
        <button className="char-btn nodrag" onClick={handleResetView}>Reset View</button>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
        <span className="char-viewer-zoom-info">{Math.round(zoom * 100)}% &middot; {imageCount} images</span>
      </div>

      <Handle type="target" position={Position.Left} id="main-in" className="char-handle" style={{ top: '10%' }} />
      <Handle type="target" position={Position.Left} id="front-in" className="char-handle" style={{ top: '25%' }} />
      <Handle type="target" position={Position.Left} id="back-in" className="char-handle" style={{ top: '40%' }} />
      <Handle type="target" position={Position.Left} id="side-in" className="char-handle" style={{ top: '55%' }} />
      <Handle type="target" position={Position.Left} id="ref-a" className="char-handle" style={{ top: '70%' }} />
      <Handle type="target" position={Position.Left} id="ref-b" className="char-handle" style={{ top: '80%' }} />
      <Handle type="target" position={Position.Left} id="ref-c" className="char-handle" style={{ top: '90%' }} />
    </div>
  );
}

export default memo(MainStageViewerNodeInner);
