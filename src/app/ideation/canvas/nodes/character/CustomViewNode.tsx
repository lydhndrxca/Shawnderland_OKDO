"use client";

import { memo, useState, useCallback, useRef } from 'react';
import { Handle, Position, NodeResizer, useReactFlow } from '@xyflow/react';
import {
  generateWithNanoBanana,
  generateWithGeminiRef,
  type GeneratedImage,
} from '@/lib/ideation/engine/conceptlab/imageGenApi';
import { ImageContextMenu } from '@/components/ImageContextMenu';
import { NODE_TOOLTIPS } from './nodeTooltips';
import './CharacterNodes.css';

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

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

function CustomViewNodeInner({ id, data, selected }: Props) {
  const { getNode, getEdges, setNodes } = useReactFlow();
  const [viewPrompt, setViewPrompt] = useState((data?.viewPrompt as string) ?? '');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [imgRes, setImgRes] = useState<{ w: number; h: number } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<GeneratedImage | null>(
    (data?.generatedImage as GeneratedImage) ?? null,
  );
  const isPanning = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const fileRef = useRef<HTMLInputElement>(null);

  const sourceImage = getUpstreamImage(id, getNode, getEdges);

  const handleGenerate = useCallback(async () => {
    if (!viewPrompt.trim()) return;
    setGenerating(true);
    setError(null);
    try {
      let result: GeneratedImage[];
      if (sourceImage) {
        const prompt = `Create a custom view of this character as described:\n${viewPrompt.trim()}\n\nPreserve the exact character design, clothing, and details.`;
        result = await generateWithGeminiRef(prompt, sourceImage);
      } else {
        result = await generateWithNanoBanana(viewPrompt.trim(), '9:16', 1);
      }
      if (result[0]) {
        setResultImage(result[0]);
        setNodes((nds) =>
          nds.map((n) =>
            n.id === id ? { ...n, data: { ...n.data, generatedImage: result[0] } } : n,
          ),
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  }, [viewPrompt, sourceImage, id, setNodes]);

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

  const handleOpenImage = useCallback(() => fileRef.current?.click(), []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        const img: GeneratedImage = { base64, mimeType: file.type || 'image/png' };
        setResultImage(img);
        setNodes((nds) =>
          nds.map((n) =>
            n.id === id ? { ...n, data: { ...n.data, generatedImage: img } } : n,
          ),
        );
      };
      reader.readAsDataURL(file);
    },
    [id, setNodes],
  );

  const handleResize = useCallback(
    (_: unknown, params: { width: number; height: number }) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id ? { ...n, style: { ...n.style, width: params.width, height: params.height } } : n,
        ),
      );
    },
    [id, setNodes],
  );

  return (
    <div className={`char-node char-viewer-node ${selected ? 'selected' : ''} ${generating ? 'char-node-processing' : ''}`}
      style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }} title={NODE_TOOLTIPS.charCustomView}>
      <NodeResizer isVisible={!!selected} minWidth={300} minHeight={300} onResize={handleResize} />
      <div className="char-node-header" style={{ background: '#7e57c2' }}>
        Custom View
      </div>
      <div style={{ padding: '6px 10px', display: 'flex', gap: 4 }}>
        <textarea
          className="char-textarea nodrag nowheel"
          value={viewPrompt}
          onChange={(e) => {
            setViewPrompt(e.target.value);
            setNodes((nds) =>
              nds.map((n) =>
                n.id === id ? { ...n, data: { ...n.data, viewPrompt: e.target.value } } : n,
              ),
            );
          }}
          placeholder="Describe the view angle, pose, or framing..."
          rows={2}
          style={{ flex: 1, minHeight: 36 }}
        />
        <button
          type="button"
          className="char-btn primary nodrag"
          onClick={handleGenerate}
          disabled={generating || !viewPrompt.trim()}
          style={{ alignSelf: 'flex-end' }}
        >
          {generating ? '...' : 'Generate'}
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
        {resultImage ? (
          <>
            <ImageContextMenu image={resultImage} alt="custom view" onResetView={handleResetView}>
              <img
                src={`data:${resultImage.mimeType};base64,${resultImage.base64}`}
                alt="Custom view"
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
          <span className="char-viewer-empty">
            {generating ? 'Generating...' : 'Describe a view and click Generate'}
          </span>
        )}
      </div>
      {error && <div className="char-error" style={{ margin: '0 10px 6px' }}>{error}</div>}
      <div className="char-viewer-toolbar">
        <button type="button" className="char-btn nodrag" onClick={handleOpenImage}>Open IMG</button>
        <button type="button" className="char-btn nodrag" onClick={async () => {
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
                  const img: GeneratedImage = { base64: parts[1], mimeType: mime };
                  setResultImage(img);
                  setNodes((nds) => nds.map((n) =>
                    n.id === id ? { ...n, data: { ...n.data, generatedImage: img } } : n,
                  ));
                };
                reader.readAsDataURL(blob);
              }
            }
          } catch { /* clipboard may be unavailable */ }
        }}>Paste IMG</button>
        {resultImage && (
          <button type="button" className="char-btn nodrag" onClick={async () => {
            try {
              const resp = await fetch(`data:${resultImage.mimeType};base64,${resultImage.base64}`);
              const blob = await resp.blob();
              await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
            } catch { /* clipboard may be unavailable */ }
          }}>Copy IMG</button>
        )}
        <button type="button" className="char-btn nodrag" onClick={handleResetView}>Reset</button>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
        <span className="char-viewer-zoom-info">{Math.round(zoom * 100)}%</span>
      </div>
      <Handle type="target" position={Position.Left} id="input" className="char-handle" style={{ top: '50%' }} />
      <Handle type="source" position={Position.Right} id="output" className="char-handle" style={{ top: '50%' }} />
    </div>
  );
}

export default memo(CustomViewNodeInner);
