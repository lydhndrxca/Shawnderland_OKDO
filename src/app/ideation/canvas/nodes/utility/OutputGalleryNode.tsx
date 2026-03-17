"use client";

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Handle, Position, useReactFlow, useStore } from '@xyflow/react';
import type { GeneratedImage } from '@/lib/ideation/engine/conceptlab/imageGenApi';
import './UtilityNodes.css';

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

function dataUrlToBlob(base64: string, mimeType: string): Blob {
  const bytes = atob(base64);
  const buf = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) buf[i] = bytes.charCodeAt(i);
  return new Blob([buf], { type: mimeType });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function copyImageToClipboard(img: GeneratedImage) {
  const blob = dataUrlToBlob(img.base64, 'image/png');
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
}

function OutputGalleryNodeInner({ id, data, selected }: Props) {
  const { setNodes } = useReactFlow();
  const [images, setImages] = useState<GeneratedImage[]>(
    (data._galleryImages as GeneratedImage[]) ?? [],
  );
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; idx: number } | null>(null);

  // Sync upstream output images into the gallery
  const upstreamSelector = useCallback(
    (state: {
      nodes: Array<{ id: string; data: Record<string, unknown> }>;
      edges: Array<{ source: string; target: string }>;
    }): GeneratedImage[] => {
      const imgs: GeneratedImage[] = [];
      for (const e of state.edges) {
        if (e.target !== id) continue;
        const peer = state.nodes.find((n) => n.id === e.source);
        if (!peer?.data) continue;
        const d = peer.data as Record<string, unknown>;
        const output = d._outputImages as GeneratedImage[] | undefined;
        if (output?.length) { imgs.push(...output); continue; }
        const bulk = d._bulkImages as GeneratedImage[] | undefined;
        if (bulk?.length) { imgs.push(...bulk); continue; }
        const single = d.generatedImage as GeneratedImage | undefined;
        if (single?.base64) imgs.push(single);
      }
      return imgs;
    },
    [id],
  );

  const upstreamImagesRef = useRef<GeneratedImage[]>([]);
  const upstreamImagesFull = useStore(upstreamSelector);

  useEffect(() => {
    const sig1 = upstreamImagesFull.map((i) => i.base64.slice(0, 32)).join(',');
    const sig2 = upstreamImagesRef.current.map((i) => i.base64.slice(0, 32)).join(',');
    if (sig1 !== sig2 && upstreamImagesFull.length > 0) {
      upstreamImagesRef.current = upstreamImagesFull;
      setImages(upstreamImagesFull);
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, _galleryImages: upstreamImagesFull } } : n,
        ),
      );
    }
  }, [upstreamImagesFull, id, setNodes]);

  // Also load from data when component mounts
  useEffect(() => {
    const stored = (data._galleryImages as GeneratedImage[]) ?? [];
    if (stored.length > 0 && images.length === 0) setImages(stored);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleSelect = useCallback((idx: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setImages([]);
    setSelectedIndices(new Set());
    setNodes((nds) =>
      nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, _galleryImages: [] } } : n)),
    );
  }, [id, setNodes]);

  const exportImages = useCallback((imgs: GeneratedImage[]) => {
    imgs.forEach((img, i) => {
      const ext = img.mimeType.includes('png') ? 'png' : 'jpg';
      const blob = dataUrlToBlob(img.base64, img.mimeType);
      downloadBlob(blob, `output-${i + 1}.${ext}`);
    });
  }, []);

  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  const copyImages = useCallback(async (imgs: GeneratedImage[]) => {
    if (imgs.length === 0) return;
    await copyImageToClipboard(imgs[0]);
    if (imgs.length === 1) {
      setCopyStatus('Copied to clipboard');
    } else {
      setCopyStatus(`Copied 1 of ${imgs.length} to clipboard (browser limit)`);
      imgs.slice(1).forEach((img, i) => {
        const ext = img.mimeType.includes('png') ? 'png' : 'jpg';
        downloadBlob(dataUrlToBlob(img.base64, img.mimeType), `output-${i + 2}.${ext}`);
      });
      setCopyStatus(`Copied 1 to clipboard, downloaded ${imgs.length - 1} more`);
    }
    setTimeout(() => setCopyStatus(null), 3000);
  }, []);

  const exportAll = useCallback(() => exportImages(images), [images, exportImages]);
  const exportSelected = useCallback(
    () => exportImages(images.filter((_, i) => selectedIndices.has(i))),
    [images, selectedIndices, exportImages],
  );
  const copyAll = useCallback(() => copyImages(images), [images, copyImages]);
  const copySelected = useCallback(
    () => copyImages(images.filter((_, i) => selectedIndices.has(i))),
    [images, selectedIndices, copyImages],
  );

  const handleContextMenu = useCallback((e: React.MouseEvent, idx: number) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, idx });
  }, []);

  const handleCtxAction = useCallback(
    async (action: string) => {
      if (contextMenu === null) return;
      const img = images[contextMenu.idx];
      if (!img) return;
      setContextMenu(null);

      switch (action) {
        case 'copy':
          await copyImageToClipboard(img);
          break;
        case 'savePng': {
          const blob = dataUrlToBlob(img.base64, 'image/png');
          downloadBlob(blob, `output-${contextMenu.idx + 1}.png`);
          break;
        }
        case 'saveJpg': {
          const blob = dataUrlToBlob(img.base64, 'image/jpeg');
          downloadBlob(blob, `output-${contextMenu.idx + 1}.jpg`);
          break;
        }
      }
    },
    [contextMenu, images],
  );

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [contextMenu]);

  return (
    <div className={`util-node ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Left} id="input" />

      <div className="util-node-header" style={{ background: '#00bfa5' }}>
        <span>Output Gallery</span>
        <span style={{ fontSize: 10, fontWeight: 400, opacity: 0.7 }}>
          {images.length} image{images.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="util-node-body" style={{ gap: 6 }}>
        {/* Toolbar */}
        {images.length > 0 && (
          <div className="util-toolbar nodrag nopan" onPointerDown={(e) => e.stopPropagation()}>
            <button type="button" className="util-btn" onClick={exportAll}>Export All</button>
            <button type="button" className="util-btn" onClick={exportSelected} disabled={selectedIndices.size === 0}>
              Export Sel.
            </button>
            <button type="button" className="util-btn" onClick={copyAll}>Copy All</button>
            <button type="button" className="util-btn" onClick={copySelected} disabled={selectedIndices.size === 0}>
              Copy Sel.
            </button>
            <button type="button" className="util-btn danger" onClick={clearAll}>Clear</button>
          </div>
        )}

        {copyStatus && <div className="util-status">{copyStatus}</div>}

        {/* Gallery grid */}
        {images.length > 0 ? (
          <div className="util-gallery-grid nodrag nopan" onPointerDown={(e) => e.stopPropagation()}>
            {images.map((img, i) => (
              <div
                key={i}
                className={`util-gallery-item ${selectedIndices.has(i) ? 'gallery-selected' : ''}`}
                onClick={(e) => { e.stopPropagation(); toggleSelect(i); }}
                onDoubleClick={(e) => { e.stopPropagation(); setExpandedIdx(i); }}
                onContextMenu={(e) => handleContextMenu(e, i)}
              >
                <img
                  src={`data:${img.mimeType};base64,${img.base64}`}
                  alt={`output-${i}`}
                  draggable={false}
                />
                <div className="util-gallery-checkbox">
                  {selectedIndices.has(i) ? '✓' : ''}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="util-hint" style={{ padding: '20px 0' }}>
            Processed images will appear here
          </div>
        )}

        {/* Context menu */}
        {contextMenu && createPortal(
          <div
            style={{
              position: 'fixed', left: contextMenu.x, top: contextMenu.y, zIndex: 99999,
              background: '#1e1e2e', border: '1px solid #444', borderRadius: 6,
              padding: 4, minWidth: 140, boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            }}
          >
            {[
              { id: 'copy', label: 'Copy to Clipboard' },
              { id: 'savePng', label: 'Save as PNG' },
              { id: 'saveJpg', label: 'Save as JPEG' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => handleCtxAction(item.id)}
                style={{
                  display: 'block', width: '100%', padding: '6px 10px', textAlign: 'left',
                  background: 'transparent', border: 'none', color: '#eee', fontSize: 12,
                  cursor: 'pointer', borderRadius: 4,
                }}
                onMouseEnter={(e) => { (e.target as HTMLElement).style.background = 'rgba(255,255,255,0.08)'; }}
                onMouseLeave={(e) => { (e.target as HTMLElement).style.background = 'transparent'; }}
              >
                {item.label}
              </button>
            ))}
          </div>,
          document.body,
        )}

        {/* Full-size overlay */}
        {expandedIdx !== null && images[expandedIdx] && createPortal(
          <div
            className="util-overlay"
            onClick={() => setExpandedIdx(null)}
          >
            <img
              className="util-overlay-img"
              src={`data:${images[expandedIdx].mimeType};base64,${images[expandedIdx].base64}`}
              alt="expanded"
              onClick={(e) => e.stopPropagation()}
              draggable={false}
            />
            <button className="util-overlay-close" onClick={() => setExpandedIdx(null)}>×</button>
          </div>,
          document.body,
        )}
      </div>
    </div>
  );
}

const OutputGalleryNode = memo(OutputGalleryNodeInner);
export default OutputGalleryNode;
