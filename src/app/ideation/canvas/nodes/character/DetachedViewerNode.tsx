"use client";

import { memo, useCallback, useState } from 'react';
import { NodeResizer, useReactFlow, useStore } from '@xyflow/react';
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
  const { setNodes } = useReactFlow();
  const sourceNodeId = data.sourceNodeId as string | undefined;

  const sourceImgSelector = useCallback(
    (state: { nodes: Array<{ id: string; type?: string; data: Record<string, unknown> }> }) => {
      if (!sourceNodeId) return null;
      const src = state.nodes.find((n) => n.id === sourceNodeId);
      if (!src?.data) return null;
      const img = src.data.generatedImage as { base64: string } | undefined;
      return img?.base64 ? `${src.type ?? ''}:${img.base64.slice(0, 80)}` : null;
    },
    [sourceNodeId],
  );
  const sourceSig = useStore(sourceImgSelector);

  const sourceInfo = (() => {
    if (!sourceNodeId || !sourceSig) {
      return {
        image: null,
        label: (data.sourceLabel as string) || 'Detached View',
        color: (data.sourceColor as string) || '#666',
      };
    }
    void sourceSig;
    return {
      image: null as GeneratedImage | null,
      label: (data.sourceLabel as string) || 'Detached View',
      color: (data.sourceColor as string) || '#666',
    };
  })();

  // Directly read from store for the actual image (reactive via sourceSig)
  const sourceImgDataSelector = useCallback(
    (state: { nodes: Array<{ id: string; type?: string; data: Record<string, unknown> }> }) => {
      if (!sourceNodeId) return null;
      const src = state.nodes.find((n) => n.id === sourceNodeId);
      if (!src?.data) return null;
      return (src.data.generatedImage as GeneratedImage) ?? null;
    },
    [sourceNodeId],
  );
  const sourceImage: GeneratedImage | null = useStore(sourceImgDataSelector) ?? null;
  const sourceTypeSelector = useCallback(
    (state: { nodes: Array<{ id: string; type?: string }> }) => {
      if (!sourceNodeId) return '';
      return state.nodes.find((n) => n.id === sourceNodeId)?.type ?? '';
    },
    [sourceNodeId],
  );
  const sourceType = useStore(sourceTypeSelector);

  const label = (data.sourceLabel as string) || SOURCE_LABELS[sourceType] || 'Detached View';
  const color = (data.sourceColor as string) || SOURCE_COLORS[sourceType] || '#666';
  const image = sourceImage;

  void sourceInfo;

  const handlePasteImage = useCallback((img: GeneratedImage) => {
    if (!sourceNodeId) return;
    setNodes((nds) =>
      nds.map((n) => n.id === sourceNodeId ? { ...n, data: { ...n.data, generatedImage: img } } : n),
    );
  }, [sourceNodeId, setNodes]);

  const [imgRes, setImgRes] = useState<{ w: number; h: number } | null>(null);

  const handleResize = useCallback((_: unknown, params: { width: number; height: number }) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === id ? { ...n, style: { ...n.style, width: params.width, height: params.height } } : n,
      ),
    );
  }, [id, setNodes]);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      borderRadius: 6,
      overflow: 'hidden',
      background: '#111124',
      border: `1px solid ${color}44`,
      boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
    }}>
      <NodeResizer
        isVisible={!!selected}
        minWidth={100}
        minHeight={80}
        onResize={handleResize}
      />

      {/* Thin colored header */}
      <div style={{
        background: color,
        padding: '2px 8px',
        fontSize: 10,
        fontWeight: 600,
        color: '#000',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        flexShrink: 0,
      }}>
        <span>{label}</span>
        {imgRes && (
          <span style={{ marginLeft: 'auto', fontSize: 8, opacity: 0.7 }}>
            {imgRes.w}&times;{imgRes.h}
          </span>
        )}
      </div>

      {/* Image fills remaining space */}
      <div className="nodrag" style={{
        flex: 1,
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0a1a',
      }}>
        {image ? (
          <ImageContextMenu
            image={image}
            alt={label}
            onPasteImage={handlePasteImage}
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
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                display: 'block',
              }}
            />
          </ImageContextMenu>
        ) : (
          <span style={{ fontSize: 10, color: '#555', textAlign: 'center', padding: 8 }}>
            {sourceNodeId ? 'No image yet' : 'No source'}
          </span>
        )}
      </div>
    </div>
  );
}

const DetachedViewerNode = memo(DetachedViewerNodeInner);
export default DetachedViewerNode;
