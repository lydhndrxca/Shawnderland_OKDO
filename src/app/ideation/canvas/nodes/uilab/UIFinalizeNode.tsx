"use client";

import { memo, useCallback, useState, useRef, useEffect, useMemo } from 'react';
import { Handle, Position, useReactFlow, useStore } from '@xyflow/react';
import type { GeneratedImage } from '@/lib/ideation/engine/conceptlab/imageGenApi';
import '../character/CharacterNodes.css';
import './UILabNodes.css';

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

type FinalizeMode = 'chroma' | 'bw-threshold';

/* ── Client-side chroma keying (ported from Python PIL utils.py) ── */

function snapGreen(r: number, g: number, b: number, tolerance: number): boolean {
  return g > 200 && r < tolerance && b < tolerance;
}

function chromaKeyToAlpha(imageData: ImageData, tolerance = 80): ImageData {
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    if (snapGreen(d[i], d[i + 1], d[i + 2], tolerance)) {
      d[i + 3] = 0;
    }
  }
  return imageData;
}

function fixGreenLeaks(imageData: ImageData): ImageData {
  const w = imageData.width;
  const h = imageData.height;
  const d = imageData.data;
  const visited = new Uint8Array(w * h);
  const queue: number[] = [];

  const idx = (x: number, y: number) => y * w + x;
  const isGreenish = (i: number) => d[i + 1] > 180 && d[i] < 100 && d[i + 2] < 100;

  for (let x = 0; x < w; x++) {
    if (isGreenish(idx(x, 0) * 4)) queue.push(idx(x, 0));
    if (isGreenish(idx(x, h - 1) * 4)) queue.push(idx(x, h - 1));
  }
  for (let y = 0; y < h; y++) {
    if (isGreenish(idx(0, y) * 4)) queue.push(idx(0, y));
    if (isGreenish(idx(w - 1, y) * 4)) queue.push(idx(w - 1, y));
  }

  while (queue.length > 0) {
    const p = queue.pop()!;
    if (visited[p]) continue;
    visited[p] = 1;
    const pi = p * 4;
    if (!isGreenish(pi)) continue;
    d[pi + 3] = 0;
    const x = p % w;
    const y = Math.floor(p / w);
    if (x > 0) queue.push(idx(x - 1, y));
    if (x < w - 1) queue.push(idx(x + 1, y));
    if (y > 0) queue.push(idx(x, y - 1));
    if (y < h - 1) queue.push(idx(x, y + 1));
  }
  return imageData;
}

function shrinkAlphaBorder(imageData: ImageData, px = 1): ImageData {
  const w = imageData.width;
  const h = imageData.height;
  const d = imageData.data;
  const toErase: number[] = [];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (d[i + 3] === 0) continue;
      let nearTransparent = false;
      for (let dy = -px; dy <= px && !nearTransparent; dy++) {
        for (let dx = -px; dx <= px && !nearTransparent; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
          const ni = (ny * w + nx) * 4;
          if (d[ni + 3] === 0) nearTransparent = true;
        }
      }
      if (nearTransparent) toErase.push(i);
    }
  }

  for (const i of toErase) d[i + 3] = 0;
  return imageData;
}

function bwThreshold(imageData: ImageData, threshold = 128): ImageData {
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const val = gray < threshold ? 0 : 255;
    d[i] = val;
    d[i + 1] = val;
    d[i + 2] = val;
    d[i + 3] = 255;
  }
  return imageData;
}

async function base64ToImageData(base64: string, mimeType: string): Promise<{ imageData: ImageData; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas context unavailable')); return; }
      ctx.drawImage(img, 0, 0);
      resolve({ imageData: ctx.getImageData(0, 0, img.width, img.height), width: img.width, height: img.height });
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = `data:${mimeType};base64,${base64}`;
  });
}

function imageDataToBase64(imageData: ImageData, width: number, height: number): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png').split(',')[1];
}

function UIFinalizeNodeInner({ id, data, selected }: Props) {
  const { getNode, getEdges, setNodes } = useReactFlow();
  const [mode, setMode] = useState<FinalizeMode>((data?.finalizeMode as FinalizeMode) ?? 'chroma');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<GeneratedImage | null>((data?.resultImage as GeneratedImage) ?? null);
  const [undoStack, setUndoStack] = useState<GeneratedImage[]>((data?.undoStack as GeneratedImage[]) ?? []);
  const [showPreview, setShowPreview] = useState(false);

  const upstreamSigSelector = useCallback(
    (state: { edges: Array<{ source: string; target: string }>; nodes: Array<{ id: string; data: Record<string, unknown> }> }) => {
      const incoming = state.edges.filter((e) => e.target === id);
      for (const e of incoming) {
        const src = state.nodes.find((n) => n.id === e.source);
        if (!src?.data) continue;
        const img = (src.data as Record<string, unknown>).generatedImage as GeneratedImage | undefined;
        if (img?.base64) return img.base64.slice(0, 120);
      }
      return null;
    },
    [id],
  );
  const upstreamSig = useStore(upstreamSigSelector);

  const sourceImage = useMemo<GeneratedImage | null>(() => {
    if (!upstreamSig) return null;
    const edges = getEdges();
    const incoming = edges.filter((e) => e.target === id);
    for (const e of incoming) {
      const src = getNode(e.source);
      if (!src?.data) continue;
      const d = src.data as Record<string, unknown>;
      const img = d.generatedImage as GeneratedImage | undefined;
      if (img?.base64) return img;
      if (d.imageBase64) return { base64: d.imageBase64 as string, mimeType: (d.mimeType as string) || 'image/png' };
    }
    return null;
  }, [upstreamSig, getNode, getEdges, id]);

  const persist = useCallback((updates: Record<string, unknown>) => {
    setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, ...updates } } : n));
  }, [id, setNodes]);

  const handleFinalize = useCallback(async () => {
    const img = resultImage ?? sourceImage;
    if (!img) { setError('No source image — connect a viewer.'); return; }
    setProcessing(true);
    setError(null);
    try {
      const { imageData, width, height } = await base64ToImageData(img.base64, img.mimeType);

      let processed: ImageData;
      if (mode === 'bw-threshold') {
        processed = bwThreshold(imageData);
      } else {
        fixGreenLeaks(imageData);
        processed = chromaKeyToAlpha(imageData);
      }

      const b64 = imageDataToBase64(processed, width, height);
      const result: GeneratedImage = { base64: b64, mimeType: 'image/png' };
      setUndoStack((prev) => {
        const next = [...prev, img];
        persist({ undoStack: next });
        return next;
      });
      setResultImage(result);
      persist({ resultImage: result, generatedImage: result });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setProcessing(false);
    }
  }, [sourceImage, resultImage, mode, persist]);

  const handleShrink = useCallback(async () => {
    if (!resultImage) return;
    setProcessing(true);
    setError(null);
    try {
      const { imageData, width, height } = await base64ToImageData(resultImage.base64, resultImage.mimeType);
      shrinkAlphaBorder(imageData);
      const b64 = imageDataToBase64(imageData, width, height);
      const result: GeneratedImage = { base64: b64, mimeType: 'image/png' };
      setUndoStack((prev) => {
        const next = [...prev, resultImage];
        persist({ undoStack: next });
        return next;
      });
      setResultImage(result);
      persist({ resultImage: result, generatedImage: result });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setProcessing(false);
    }
  }, [resultImage, persist]);

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack((s) => {
      const next = s.slice(0, -1);
      persist({ undoStack: next });
      return next;
    });
    setResultImage(prev);
    persist({ resultImage: prev, generatedImage: prev });
  }, [undoStack, persist]);

  const handleCopy = useCallback(async () => {
    if (!resultImage) return;
    try {
      const dataUrl = `data:${resultImage.mimeType};base64,${resultImage.base64}`;
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
    } catch { /* clipboard write failed */ }
  }, [resultImage]);

  const displayImage = resultImage ?? sourceImage;

  return (
    <div className={`char-node ${selected ? 'selected' : ''}`}>
      <div className="char-node-header" style={{ background: '#00695c' }}>
        <span>Finalize (Chroma Key)</span>
      </div>
      <div className="char-node-body" style={{ gap: 6 }}>
        {/* Mode selector */}
        <div style={{ display: 'flex', gap: 4 }}>
          <button
            type="button"
            className={`char-btn nodrag${mode === 'chroma' ? ' primary' : ''}`}
            onClick={() => { setMode('chroma'); persist({ finalizeMode: 'chroma' }); }}
            style={{ flex: 1, fontSize: 10 }}
          >
            Chroma Green
          </button>
          <button
            type="button"
            className={`char-btn nodrag${mode === 'bw-threshold' ? ' primary' : ''}`}
            onClick={() => { setMode('bw-threshold'); persist({ finalizeMode: 'bw-threshold' }); }}
            style={{ flex: 1, fontSize: 10 }}
          >
            B&W Threshold
          </button>
        </div>

        {/* Preview */}
        {displayImage && (
          <div
            className="uilab-chroma-preview nodrag"
            style={{ width: '100%', height: 180, cursor: 'pointer' }}
            onClick={() => setShowPreview(true)}
          >
            <img
              src={`data:${displayImage.mimeType};base64,${displayImage.base64}`}
              alt="Finalized"
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
            />
          </div>
        )}

        {!displayImage && (
          <div style={{ textAlign: 'center', color: '#666', fontSize: 11, padding: '20px 0' }}>
            Connect a viewer node
          </div>
        )}

        {/* Full preview overlay */}
        {showPreview && displayImage && (
          <div className="style-popup-overlay nodrag" onClick={(e) => e.stopPropagation()}>
            <div className="style-popup-window" style={{ maxWidth: 520, maxHeight: 620 }}>
              <button type="button" className="style-popup-close nodrag" onClick={() => setShowPreview(false)}>&times;</button>
              <div className="uilab-chroma-preview" style={{ padding: 8 }}>
                <img src={`data:${displayImage.mimeType};base64,${displayImage.base64}`} alt="Preview" style={{ maxWidth: 500, maxHeight: 580, objectFit: 'contain' }} />
              </div>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <button
          type="button"
          className="char-btn primary nodrag"
          onClick={handleFinalize}
          disabled={processing || (!sourceImage && !resultImage)}
          style={{ width: '100%' }}
        >
          {processing ? 'Processing\u2026' : mode === 'chroma' ? 'Remove Green Background' : 'Apply B&W Threshold'}
        </button>

        {resultImage && (
          <div style={{ display: 'flex', gap: 4 }}>
            <button type="button" className="char-btn nodrag" onClick={handleShrink} disabled={processing} style={{ flex: 1, fontSize: 10 }}>
              Shrink Border (1px)
            </button>
            <button type="button" className="char-btn nodrag" onClick={handleUndo} disabled={undoStack.length === 0 || processing} style={{ flex: 1, fontSize: 10 }}>
              Undo ({undoStack.length})
            </button>
          </div>
        )}

        {resultImage && (
          <button type="button" className="char-btn nodrag" onClick={handleCopy} style={{ width: '100%', fontSize: 10 }}>
            Copy to Clipboard
          </button>
        )}

        {error && <div className="char-error">{error}</div>}
      </div>

      <Handle type="target" position={Position.Left} id="image-in" className="char-handle" style={{ top: '50%' }} />
      <Handle type="source" position={Position.Right} id="output" className="char-handle" style={{ top: '50%' }} />
    </div>
  );
}

export default memo(UIFinalizeNodeInner);
