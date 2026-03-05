"use client";

import { memo, useState, useCallback, useEffect } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { ImageContextMenu } from '@/components/ImageContextMenu';
import type { GeneratedImage } from '@/lib/ideation/engine/conceptlab/imageGenApi';
import './ConceptLabNodes.css';

interface MultiViewerNodeProps {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

type TabKey = 'main' | 'front' | 'back' | 'side' | 'refA' | 'refB' | 'refC';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'main', label: 'Main' },
  { key: 'front', label: 'Front' },
  { key: 'back', label: 'Back' },
  { key: 'side', label: 'Side' },
  { key: 'refA', label: 'Ref A' },
  { key: 'refB', label: 'Ref B' },
  { key: 'refC', label: 'Ref C' },
];

function getImageFromHandle(
  nodeId: string,
  handleId: string,
  getNode: (id: string) => { data?: Record<string, unknown> } | undefined,
  getEdges: () => { source: string; target: string; targetHandle?: string | null }[],
): GeneratedImage | null {
  const edges = getEdges();
  const edge = edges.find((e) => e.target === nodeId && e.targetHandle === handleId);
  if (!edge) return null;
  const src = getNode(edge.source);
  if (!src?.data) return null;
  const img = src.data.generatedImage as GeneratedImage | undefined;
  if (img?.base64) return img;
  const b64 = src.data.imageBase64 as string | undefined;
  if (b64) return { base64: b64, mimeType: (src.data.mimeType as string) || 'image/png' };
  return null;
}

function downloadImage(img: GeneratedImage, name: string) {
  const bytes = atob(img.base64);
  const buf = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) buf[i] = bytes.charCodeAt(i);
  const blob = new Blob([buf], { type: img.mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function MultiViewerNodeInner({ id, data, selected }: MultiViewerNodeProps) {
  const { getNode, getEdges, setNodes } = useReactFlow();
  const [activeTab, setActiveTab] = useState<TabKey>('main');
  const [zoom, setZoom] = useState(false);
  const [tabImages, setTabImages] = useState<Partial<Record<TabKey, GeneratedImage>>>(() => {
    const stored = data?.tabImages as Partial<Record<TabKey, GeneratedImage>> | undefined;
    return stored ?? {};
  });

  const mainImg = getImageFromHandle(id, 'image-in', getNode, getEdges);
  const refAImg = getImageFromHandle(id, 'ref-a', getNode, getEdges);
  const refBImg = getImageFromHandle(id, 'ref-b', getNode, getEdges);
  const refCImg = getImageFromHandle(id, 'ref-c', getNode, getEdges);

  useEffect(() => {
    const updates: Partial<Record<TabKey, GeneratedImage>> = {};
    if (mainImg) updates.main = mainImg;
    if (refAImg) updates.refA = refAImg;
    if (refBImg) updates.refB = refBImg;
    if (refCImg) updates.refC = refCImg;
    if (Object.keys(updates).length) {
      setTabImages((prev) => {
        const next = { ...prev, ...updates };
        setNodes((nds) =>
          nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, tabImages: next } } : n)),
        );
        return next;
      });
    }
  }, [mainImg, refAImg, refBImg, refCImg, id, setNodes]);

  const getCurrentImage = useCallback((): GeneratedImage | null => {
    if (activeTab === 'main') return mainImg ?? tabImages.main ?? null;
    if (activeTab === 'refA') return refAImg ?? tabImages.refA ?? null;
    if (activeTab === 'refB') return refBImg ?? tabImages.refB ?? null;
    if (activeTab === 'refC') return refCImg ?? tabImages.refC ?? null;
    return tabImages[activeTab] ?? null;
  }, [activeTab, mainImg, refAImg, refBImg, refCImg, tabImages]);

  const currentImage = getCurrentImage();

  const handleSaveCurrent = useCallback(() => {
    if (!currentImage) return;
    downloadImage(currentImage, `viewer-${activeTab}`);
  }, [currentImage, activeTab]);

  const handleCanvasDoubleClick = useCallback(() => {
    if (currentImage) setZoom((z) => !z);
  }, [currentImage]);

  const imageCount = [
    mainImg || tabImages.main,
    refAImg || tabImages.refA,
    refBImg || tabImages.refB,
    refCImg || tabImages.refC,
    tabImages.front,
    tabImages.back,
    tabImages.side,
  ].filter(Boolean).length;

  return (
    <div className={`cl-node cl-viewer-node ${selected ? 'selected' : ''}`}>
      <div className="cl-node-header" style={{ background: '#00bfa5' }}>
        Image Viewer
      </div>
      <div className="cl-viewer-tabs">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            className={`cl-viewer-tab nodrag ${activeTab === key ? 'active' : ''}`}
            onClick={() => setActiveTab(key)}
          >
            {label}
          </button>
        ))}
      </div>
      <div
        className="cl-viewer-canvas nodrag"
        onDoubleClick={handleCanvasDoubleClick}
        style={{ height: zoom ? 480 : 300 }}
      >
        {currentImage ? (
          <ImageContextMenu image={currentImage} alt={`viewer-${activeTab}`}>
            <img
              src={`data:${currentImage.mimeType};base64,${currentImage.base64}`}
              alt={activeTab}
              style={zoom ? { maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' } : undefined}
            />
          </ImageContextMenu>
        ) : (
          <span className="cl-viewer-empty">No image loaded</span>
        )}
      </div>
      <div className="cl-viewer-actions">
        <button className="cl-btn nodrag" onClick={handleSaveCurrent} disabled={!currentImage}>
          Save Current
        </button>
        <span className="cl-field-label" style={{ alignSelf: 'center' }}>
          {imageCount} image{imageCount !== 1 ? 's' : ''}
        </span>
      </div>

      <Handle type="target" position={Position.Left} id="image-in" className="cl-handle" style={{ top: '20%' }} />
      <Handle type="target" position={Position.Left} id="ref-a" className="cl-handle" style={{ top: '35%' }} />
      <Handle type="target" position={Position.Left} id="ref-b" className="cl-handle" style={{ top: '50%' }} />
      <Handle type="target" position={Position.Left} id="ref-c" className="cl-handle" style={{ top: '65%' }} />
    </div>
  );
}

export default memo(MultiViewerNodeInner);
