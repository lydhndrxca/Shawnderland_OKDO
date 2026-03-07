"use client";

import { memo, useState, useCallback, useEffect, useRef } from 'react';
import { Handle, Position, NodeResizer, useReactFlow } from '@xyflow/react';
import { ImageContextMenu } from '@/components/ImageContextMenu';
import type { GeneratedImage } from '@/lib/ideation/engine/conceptlab/imageGenApi';
import './CharacterNodes.css';

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

type ViewKey = 'main' | 'front' | 'back' | 'side';

const VIEW_CONFIG: Record<ViewKey, { label: string; color: string; compactW: number; compactH: number }> = {
  main:  { label: 'Main Stage',  color: '#00bfa5', compactW: 180, compactH: 240 },
  front: { label: 'Front View',  color: '#42a5f5', compactW: 150, compactH: 200 },
  back:  { label: 'Back View',   color: '#ab47bc', compactW: 150, compactH: 200 },
  side:  { label: 'Side View',   color: '#ff7043', compactW: 150, compactH: 200 },
};

function getUpstreamImage(
  nodeId: string,
  getNode: ReturnType<typeof useReactFlow>['getNode'],
  getEdges: ReturnType<typeof useReactFlow>['getEdges'],
): GeneratedImage | null {
  const edges = getEdges();
  const incoming = edges.filter((e) => e.target === nodeId);
  for (const e of incoming) {
    const src = getNode(e.source);
    if (!src?.data) continue;
    const d = src.data as Record<string, unknown>;

    if (src.type === 'charGate') {
      if (!(d.enabled as boolean ?? true)) return null;
      const gateEdges = getEdges().filter((ge) => ge.target === src.id);
      for (const ge of gateEdges) {
        const gSrc = getNode(ge.source);
        if (!gSrc?.data) continue;
        const gd = gSrc.data as Record<string, unknown>;
        const img = gd.generatedImage as GeneratedImage | undefined;
        if (img?.base64) return img;
        if (gd.imageBase64) return { base64: gd.imageBase64 as string, mimeType: (gd.mimeType as string) || 'image/png' };
      }
      continue;
    }

    const img = d.generatedImage as GeneratedImage | undefined;
    if (img?.base64) return img;
    if (d.imageBase64) return { base64: d.imageBase64 as string, mimeType: (d.mimeType as string) || 'image/png' };
  }
  return null;
}

function CharViewNodeInner({ id, data, selected }: Props) {
  const viewKey = (data?.viewKey as ViewKey) || 'main';
  const cfg = VIEW_CONFIG[viewKey] ?? VIEW_CONFIG.main;

  const { getNode, getEdges, setNodes } = useReactFlow();
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [compact, setCompact] = useState(false);
  const [localImage, setLocalImage] = useState<GeneratedImage | null>(
    (data?.localImage as GeneratedImage) ?? null,
  );
  const isPanning = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const fileRef = useRef<HTMLInputElement>(null);

  const upstreamImage = getUpstreamImage(id, getNode, getEdges);
  const displayImage = upstreamImage ?? localImage;

  useEffect(() => {
    if (upstreamImage && upstreamImage.base64 !== (data?.generatedImage as GeneratedImage)?.base64) {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, generatedImage: upstreamImage } } : n,
        ),
      );
    }
  }, [upstreamImage, id, data?.generatedImage, setNodes]);

  const handleResetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.stopPropagation();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((z) => Math.max(0.1, Math.min(10, z + delta)));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1) {
      e.preventDefault();
      isPanning.current = true;
      lastMouse.current = { x: e.clientX, y: e.clientY };
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning.current) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
  }, []);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (e.button === 1) isPanning.current = false;
  }, []);

  const handlePasteImage = useCallback(
    (img: GeneratedImage) => {
      setLocalImage(img);
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id
            ? { ...n, data: { ...n.data, localImage: img, generatedImage: img } }
            : n,
        ),
      );
    },
    [id, setNodes],
  );

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
        handlePasteImage(img);
      };
      reader.readAsDataURL(file);
    },
    [handlePasteImage],
  );

  const handleResize = useCallback(
    (_: unknown, params: { width: number; height: number }) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id
            ? { ...n, style: { ...n.style, width: params.width, height: params.height } }
            : n,
        ),
      );
    },
    [id, setNodes],
  );

  const toggleCompact = useCallback(() => {
    const goingCompact = !compact;
    setCompact(goingCompact);
    const w = goingCompact ? cfg.compactW : (viewKey === 'main' ? 600 : 300);
    const h = goingCompact ? cfg.compactH : (viewKey === 'main' ? 700 : 400);
    setNodes((nds) =>
      nds.map((n) =>
        n.id === id ? { ...n, style: { ...n.style, width: w, height: h } } : n,
      ),
    );
  }, [compact, cfg, viewKey, id, setNodes]);

  return (
    <div
      className={`char-node char-viewer-node ${selected ? 'selected' : ''} ${compact ? 'char-view-compact' : 'char-view-expanded'}`}
      style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}
    >
      <NodeResizer
        isVisible={!!selected}
        minWidth={compact ? 100 : 200}
        minHeight={compact ? 100 : 200}
        onResize={handleResize}
      />
      <div className="char-node-header" style={{ background: cfg.color }}>
        <span>{cfg.label}</span>
        <button className="char-view-toggle nodrag" onClick={toggleCompact} title={compact ? 'Expand' : 'Shrink'}>
          {compact ? '\u2922' : '\u2921'}
        </button>
      </div>

      <div
        className="char-viewer-canvas nodrag nowheel"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { isPanning.current = false; }}
        onDoubleClick={handleResetView}
        style={{ flex: 1, overflow: 'hidden', cursor: isPanning.current ? 'grabbing' : 'default' }}
      >
        {displayImage ? (
          <ImageContextMenu
            image={displayImage}
            alt={cfg.label}
            onPasteImage={handlePasteImage}
            onResetView={handleResetView}
          >
            <img
              src={`data:${displayImage.mimeType};base64,${displayImage.base64}`}
              alt={cfg.label}
              style={{
                transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
                transition: isPanning.current ? 'none' : 'transform 0.1s',
              }}
            />
          </ImageContextMenu>
        ) : (
          <span className="char-viewer-empty">
            No image loaded<br />Connect a source or open a file
          </span>
        )}
      </div>

      {!compact && (
        <div className="char-viewer-toolbar">
          <button className="char-btn nodrag" onClick={handleOpenImage}>Open</button>
          <button className="char-btn nodrag" onClick={handleResetView}>Reset View</button>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
          <span className="char-viewer-zoom-info">{Math.round(zoom * 100)}%</span>
        </div>
      )}

      <Handle type="target" position={Position.Left} id="input" className="char-handle" style={{ top: '50%' }} />
      <Handle type="source" position={Position.Right} id="output" className="char-handle" style={{ top: '50%' }} />
    </div>
  );
}

export default memo(CharViewNodeInner);
