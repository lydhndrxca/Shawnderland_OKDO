"use client";

import { memo, useCallback, useState, useRef } from 'react';
import { Handle, Position, NodeResizer, useReactFlow, useStore } from '@xyflow/react';
import { ImageContextMenu } from '@/components/ImageContextMenu';
import type { GeneratedImage } from '@/lib/ideation/engine/conceptlab/imageGenApi';
import './CharacterNodes.css';

const SOURCE_COLORS: Record<string, string> = {
  charMainViewer: '#00bfa5',
  charViewer: '#00bfa5',
  charImageViewer: '#00bfa5',
  charFrontViewer: '#42a5f5',
  charBackViewer: '#ab47bc',
  charSideViewer: '#ff7043',
  charCustomView: '#7e57c2',
};

const SOURCE_LABELS: Record<string, string> = {
  charMainViewer: 'Main Stage',
  charViewer: 'Main Stage',
  charImageViewer: 'Main Stage',
  charFrontViewer: 'Front View',
  charBackViewer: 'Back View',
  charSideViewer: 'Side View',
  charCustomView: 'Custom View',
};

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

function DetachedViewerNodeInner({ id, data, selected }: Props) {
  const { getNode, getEdges, setNodes } = useReactFlow();

  // Reactively watch the connected source node's image
  const sourceSigSelector = useCallback(
    (state: {
      nodes: Array<{ id: string; type?: string; data: Record<string, unknown> }>;
      edges: Array<{ source: string; target: string }>;
    }) => {
      for (const e of state.edges) {
        const peerId = e.target === id ? e.source : e.source === id ? e.target : null;
        if (!peerId) continue;
        const peer = state.nodes.find((n) => n.id === peerId);
        if (!peer?.data) continue;
        const img = peer.data.generatedImage as { base64: string } | undefined;
        if (img?.base64) return `${peerId}:${peer.type ?? ''}:${img.base64.slice(0, 80)}`;
      }
      return '';
    },
    [id],
  );
  const sourceSig = useStore(sourceSigSelector);

  // Derive actual source data
  const sourceInfo = (() => {
    const edges = getEdges();
    for (const e of edges) {
      const peerId = e.target === id ? e.source : e.source === id ? e.target : null;
      if (!peerId) continue;
      const peer = getNode(peerId);
      if (!peer?.data) continue;
      const d = peer.data as Record<string, unknown>;
      const img = d.generatedImage as GeneratedImage | undefined;
      const customLabel = d.customLabel as string | undefined;
      const label = customLabel || SOURCE_LABELS[peer.type ?? ''] || (d.viewKey as string) || 'Image';
      const color = SOURCE_COLORS[peer.type ?? ''] || '#666';
      return { image: img ?? null, label, color };
    }
    return { image: null, label: (data.sourceLabel as string) || 'Detached View', color: (data.sourceColor as string) || '#666' };
  })();

  void sourceSig;

  const { image, label, color } = sourceInfo;

  // Zoom/pan
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.stopPropagation();
    const factor = e.deltaY > 0 ? 1 / 1.12 : 1.12;
    setZoom((z) => Math.max(0.1, Math.min(20, z * factor)));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      e.preventDefault();
      isPanning.current = true;
      lastMouse.current = { x: e.clientX, y: e.clientY };
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning.current) {
      const dx = e.clientX - lastMouse.current.x;
      const dy = e.clientY - lastMouse.current.y;
      lastMouse.current = { x: e.clientX, y: e.clientY };
      setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
    }
  }, []);

  const handleMouseUp = useCallback(() => { isPanning.current = false; }, []);
  const handleResetView = useCallback(() => { setZoom(1); setPan({ x: 0, y: 0 }); }, []);

  const handlePasteImage = useCallback((img: GeneratedImage) => {
    const edges = getEdges();
    for (const e of edges) {
      const peerId = e.target === id ? e.source : e.source === id ? e.target : null;
      if (!peerId) continue;
      const peer = getNode(peerId);
      if (peer?.data) {
        setNodes((nds) =>
          nds.map((n) => n.id === peerId ? { ...n, data: { ...n.data, generatedImage: img } } : n),
        );
        return;
      }
    }
  }, [id, getNode, getEdges, setNodes]);

  const [imgRes, setImgRes] = useState<{ w: number; h: number } | null>(null);

  const handleResize = useCallback((_: unknown, params: { width: number; height: number }) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === id ? { ...n, style: { ...n.style, width: params.width, height: params.height } } : n,
      ),
    );
  }, [id, setNodes]);

  return (
    <div
      className={`char-node ${selected ? 'selected' : ''}`}
      style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}
    >
      <NodeResizer
        isVisible={!!selected}
        minWidth={120}
        minHeight={100}
        onResize={handleResize}
      />

      <Handle type="target" position={Position.Left} id="input" className="char-handle" style={{ top: '50%' }} />
      <Handle type="source" position={Position.Right} id="output" className="char-handle" style={{ top: '50%' }} />

      <div className="char-node-header" style={{ background: color, padding: '3px 10px', fontSize: 10 }}>
        <span>{label}</span>
        <span style={{ marginLeft: 'auto', fontSize: 9, opacity: 0.7 }}>detached</span>
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
        {image ? (
          <>
            <ImageContextMenu
              image={image}
              alt={label}
              onPasteImage={handlePasteImage}
              onResetView={handleResetView}
            >
              <img
                key={image.base64.slice(-40)}
                src={`data:${image.mimeType};base64,${image.base64}`}
                alt={label}
                draggable={false}
                onLoad={(e) => {
                  const el = e.currentTarget;
                  setImgRes({ w: el.naturalWidth, h: el.naturalHeight });
                }}
                style={{
                  transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
                  transition: isPanning.current ? 'none' : 'transform 0.1s',
                }}
              />
            </ImageContextMenu>
            {imgRes && <span className="char-viewer-res">{imgRes.w}&times;{imgRes.h}</span>}
          </>
        ) : (
          <span className="char-viewer-empty">
            No image<br />Connect to a viewer node
          </span>
        )}
      </div>
    </div>
  );
}

const DetachedViewerNode = memo(DetachedViewerNodeInner);
export default DetachedViewerNode;
