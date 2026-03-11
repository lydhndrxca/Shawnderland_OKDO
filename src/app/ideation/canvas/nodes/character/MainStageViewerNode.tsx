"use client";

import { memo, useState, useCallback, useEffect, useRef } from 'react';
import { Handle, Position, NodeResizer, useReactFlow } from '@xyflow/react';
import { ImageContextMenu } from '@/components/ImageContextMenu';
import {
  generateText,
  restoreImageQuality,
} from '@/lib/ideation/engine/conceptlab/imageGenApi';
import type { GeneratedImage } from '@/lib/ideation/engine/conceptlab/imageGenApi';
import { NODE_TOOLTIPS } from './nodeTooltips';
import './CharacterNodes.css';

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

const DETECT_PROMPT =
  'Analyze this image for quality degradation. Look for:\n' +
  '- Compression artifacts (blockiness, JPEG ringing, banding)\n' +
  '- Blur or softness (loss of fine detail, smeared textures)\n' +
  '- Noise or grain (random speckles, color noise)\n' +
  '- Resolution loss (pixelation, upscale artifacts)\n' +
  '- Color degradation (shifted hues, washed-out areas, posterization)\n' +
  '- Accumulated AI generation artifacts (warped details, melted features, inconsistent textures)\n\n' +
  'Respond with ONLY a JSON object (no markdown, no backticks):\n' +
  '{ "degraded": true/false, "confidence": 0.0-1.0, "issues": "brief description" }\n\n' +
  'Set "degraded" to true ONLY if the image has noticeable quality problems that would benefit from restoration. ' +
  'Minor imperfections in an otherwise clean image should be false. ' +
  'Be strict — only flag genuinely degraded images.';

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
    const img = d.generatedImage as GeneratedImage | undefined;
    if (img?.base64) return img;
    const b64 = d.imageBase64 as string | undefined;
    if (b64) return { base64: b64, mimeType: (d.mimeType as string) || 'image/png' };
  }
  return null;
}

function MainStageViewerNodeInner({ id, data, selected }: Props) {
  const { getNode, getEdges, setNodes } = useReactFlow();
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [imgRes, setImgRes] = useState<{ w: number; h: number } | null>(null);
  const [localImage, setLocalImage] = useState<GeneratedImage | null>(
    (data?.localImage as GeneratedImage) ?? null,
  );
  const [autoFidelity, setAutoFidelity] = useState<boolean>(
    (data?.autoFidelity as boolean) ?? false,
  );
  const [fidelityStatus, setFidelityStatus] = useState<string | null>(null);
  const isPanning = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const fileRef = useRef<HTMLInputElement>(null);
  const label = (data?.viewerLabel as string) || 'Image Viewer';

  const lastRestoredKeyRef = useRef<string | null>(null);
  const fidelityRunningRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    const restored = (data?.localImage as GeneratedImage) ?? null;
    if (restored?.base64 && restored.base64.slice(0, 40) !== localImage?.base64?.slice(0, 40)) {
      setLocalImage(restored);
    } else if (!restored && localImage) {
      setLocalImage(null);
    }
  }, [data?.localImage]); // eslint-disable-line react-hooks/exhaustive-deps

  const upstreamImage = getUpstreamImage(id, getNode, getEdges);
  const pushedImage = (data?.generatedImage as GeneratedImage | undefined) ?? null;
  const displayImage = upstreamImage ?? pushedImage ?? localImage;

  useEffect(() => {
    if (upstreamImage && upstreamImage.base64 !== (data?.generatedImage as GeneratedImage)?.base64) {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, generatedImage: upstreamImage } } : n,
        ),
      );
    }
  }, [upstreamImage, id, data?.generatedImage, setNodes]);

  const toggleAutoFidelity = useCallback(() => {
    const next = !autoFidelity;
    setAutoFidelity(next);
    setNodes((nds) =>
      nds.map((n) => n.id === id ? { ...n, data: { ...n.data, autoFidelity: next } } : n),
    );
    if (!next) setFidelityStatus(null);
  }, [autoFidelity, id, setNodes]);

  const runFidelityCheck = useCallback(async (image: GeneratedImage) => {
    if (fidelityRunningRef.current) return;
    const imageKey = image.base64.slice(0, 64);

    if (lastRestoredKeyRef.current === imageKey) return;

    fidelityRunningRef.current = true;
    setFidelityStatus('Checking quality…');

    try {
      const raw = await generateText(DETECT_PROMPT, image);
      if (!mountedRef.current) return;

      let result: { degraded: boolean; confidence: number; issues: string };
      try {
        const jsonStr = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
        result = JSON.parse(jsonStr);
      } catch {
        const match = raw.match(/\{[\s\S]*\}/);
        if (match) {
          result = JSON.parse(match[0]);
        } else {
          console.warn('[AutoFidelity] Could not parse detection response:', raw.slice(0, 200));
          setFidelityStatus(null);
          return;
        }
      }

      if (!result.degraded || result.confidence < 0.6) {
        setFidelityStatus('Quality OK ✓');
        setTimeout(() => { if (mountedRef.current) setFidelityStatus(null); }, 3000);
        return;
      }

      setFidelityStatus(`Artifacts detected (${Math.round(result.confidence * 100)}%) — restoring…`);

      const { image: restored } = await restoreImageQuality(image, {
        imageWidth: imgRes?.w,
        imageHeight: imgRes?.h,
        onStatus: (msg) => { if (mountedRef.current) setFidelityStatus(msg); },
      });
      if (!mountedRef.current) return;

      lastRestoredKeyRef.current = restored.base64.slice(0, 64);

      setNodes((nds) =>
        nds.map((n) =>
          n.id === id
            ? { ...n, data: { ...n.data, generatedImage: restored } }
            : n,
        ),
      );

      setFidelityStatus('Auto-restored ✓');
      setTimeout(() => { if (mountedRef.current) setFidelityStatus(null); }, 4000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.toLowerCase().includes('cancel') && !msg.toLowerCase().includes('abort')) {
        console.error('[AutoFidelity]', e);
        setFidelityStatus(`Error: ${msg.slice(0, 60)}`);
        setTimeout(() => { if (mountedRef.current) setFidelityStatus(null); }, 5000);
      }
    } finally {
      fidelityRunningRef.current = false;
    }
  }, [id, setNodes, imgRes]);

  const prevImageKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!autoFidelity || !displayImage) return;
    const key = displayImage.base64.slice(0, 64);
    if (key === prevImageKeyRef.current) return;
    if (key === lastRestoredKeyRef.current) return;
    prevImageKeyRef.current = key;

    const timer = setTimeout(() => { runFidelityCheck(displayImage); }, 1200);
    return () => clearTimeout(timer);
  }, [autoFidelity, displayImage, runFidelityCheck]);

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

  const isFidelityBusy = fidelityRunningRef.current;

  return (
    <div className={`char-node char-viewer-node ${selected ? 'selected' : ''} ${(data?.generating as boolean) || isFidelityBusy ? 'char-node-processing' : ''}`} style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }} title={NODE_TOOLTIPS.charMainViewer}>
      <NodeResizer
        isVisible={!!selected}
        minWidth={300}
        minHeight={300}
        onResize={handleResize}
      />
      <div className="char-node-header" style={{ background: '#00bfa5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>{label}</span>
        <button
          type="button"
          className="nodrag"
          onClick={toggleAutoFidelity}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '2px 8px',
            fontSize: 9,
            fontWeight: 700,
            borderRadius: 4,
            cursor: 'pointer',
            border: autoFidelity ? '1px solid rgba(0,0,0,0.2)' : '1px solid rgba(0,0,0,0.1)',
            background: autoFidelity ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.1)',
            color: '#0f0f1a',
            textTransform: 'uppercase',
            letterSpacing: '0.3px',
            transition: 'all 0.2s',
          }}
        >
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: autoFidelity ? '#69f0ae' : 'rgba(0,0,0,0.3)',
            transition: 'background 0.2s',
          }} />
          Auto-Fidelity
        </button>
      </div>

      {fidelityStatus && (
        <div style={{
          padding: '3px 12px',
          fontSize: 9,
          fontWeight: 600,
          background: fidelityStatus.includes('regenerat') || fidelityStatus.includes('Analyz') || fidelityStatus.includes('Regenerat') || fidelityStatus.includes('Upscal')
            ? 'rgba(255, 111, 0, 0.15)'
            : fidelityStatus.includes('✓')
              ? 'rgba(105, 240, 174, 0.1)'
              : fidelityStatus.includes('Error')
                ? 'rgba(244, 67, 54, 0.1)'
                : 'rgba(255,255,255,0.04)',
          color: fidelityStatus.includes('regenerat') || fidelityStatus.includes('Analyz') || fidelityStatus.includes('Regenerat') || fidelityStatus.includes('Upscal')
            ? '#ff9800'
            : fidelityStatus.includes('✓')
              ? '#69f0ae'
              : fidelityStatus.includes('Error')
                ? '#f44336'
                : 'var(--text-muted)',
          borderBottom: '1px solid rgba(255,255,255,0.04)',
          textAlign: 'center',
        }}>
          {fidelityStatus}
        </div>
      )}

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
          <>
            <ImageContextMenu
              image={displayImage}
              alt={label}
              onPasteImage={handlePasteImage}
              onResetView={handleResetView}
            >
              <img
                src={`data:${displayImage.mimeType};base64,${displayImage.base64}`}
                alt={label}
                onLoad={(e) => {
                  const img = e.currentTarget;
                  setImgRes({ w: img.naturalWidth, h: img.naturalHeight });
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
          <span className="char-viewer-empty">No image loaded<br />Connect a source or open a file</span>
        )}
      </div>
      <div className="char-viewer-toolbar">
        <button type="button" className="char-btn nodrag" onClick={handleOpenImage}>Open</button>
        <button type="button" className="char-btn nodrag" onClick={handleResetView}>Reset View</button>
        <button
          type="button"
          className="char-btn nodrag"
          onClick={async () => {
            try {
              const items = await navigator.clipboard.read();
              for (const item of items) {
                const imgType = item.types.find((t) => t.startsWith('image/'));
                if (imgType) {
                  const blob = await item.getType(imgType);
                  const reader = new FileReader();
                  reader.onload = () => {
                    const url = reader.result as string;
                    const parts = url.split(',');
                    const mime = parts[0].match(/:(.*?);/)?.[1] ?? 'image/png';
                    handlePasteImage({ base64: parts[1], mimeType: mime });
                  };
                  reader.readAsDataURL(blob);
                }
              }
            } catch { /* clipboard may be unavailable */ }
          }}
        >
          Paste
        </button>
        {displayImage && (
          <button
            type="button"
            className="char-btn nodrag"
            onClick={async () => {
              try {
                const resp = await fetch(`data:${displayImage.mimeType};base64,${displayImage.base64}`);
                const blob = await resp.blob();
                await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
              } catch { /* clipboard may be unavailable */ }
            }}
          >
            Copy
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
        <span className="char-viewer-zoom-info">{Math.round(zoom * 100)}%</span>
      </div>

      <Handle type="target" position={Position.Left} id="input" className="char-handle" style={{ top: '50%' }} />
      <Handle type="source" position={Position.Right} id="output" className="char-handle" style={{ top: '50%' }} />
    </div>
  );
}

export default memo(MainStageViewerNodeInner);
