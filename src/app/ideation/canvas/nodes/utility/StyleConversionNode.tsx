"use client";

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Handle, Position, useReactFlow, useStore } from '@xyflow/react';
import {
  generateWithGeminiRef,
  type GeneratedImage,
} from '@/lib/ideation/engine/conceptlab/imageGenApi';
import { registerRequest, unregisterRequest } from '@/lib/activeRequests';
import './UtilityNodes.css';

interface StylePreset {
  name: string;
  styleImages: GeneratedImage[];
  styleText: string;
  mode: 'rerender' | 'isolate';
  isolateTarget: string;
  customDimensions: boolean;
  width: number;
  height: number;
  timestamp: number;
}

const LS_KEY = 'okdo-style-presets';

function loadPresets(): StylePreset[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function savePresets(presets: StylePreset[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(presets)); } catch { /* noop */ }
}

function getDefaultPreset(): string | null {
  try { return localStorage.getItem(LS_KEY + '-default'); } catch { return null; }
}

function setDefaultPreset(name: string) {
  try { localStorage.setItem(LS_KEY + '-default', name); } catch { /* noop */ }
}

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

function gatherUpstreamImages(
  nodeId: string,
  getNode: (id: string) => { id: string; data: Record<string, unknown> } | undefined,
  edges: Array<{ source: string; target: string }>,
): GeneratedImage[] {
  const imgs: GeneratedImage[] = [];
  for (const e of edges) {
    if (e.target !== nodeId) continue;
    const peer = getNode(e.source);
    if (!peer?.data) continue;
    const d = peer.data as Record<string, unknown>;
    const bulk = d._bulkImages as GeneratedImage[] | undefined;
    if (bulk?.length) { imgs.push(...bulk); continue; }
    const single = d.generatedImage as GeneratedImage | undefined;
    if (single?.base64) imgs.push(single);
  }
  return imgs;
}

function StyleConversionNodeInner({ id, data, selected }: Props) {
  const { getNode, setNodes, getEdges } = useReactFlow();
  const fileRef = useRef<HTMLInputElement>(null);

  const [styleImages, setStyleImages] = useState<GeneratedImage[]>(
    (data._styleImages as GeneratedImage[]) ?? [],
  );
  const [styleText, setStyleText] = useState((data._styleText as string) ?? '');
  const [mode, setMode] = useState<'rerender' | 'isolate'>(
    (data._styleMode as 'rerender' | 'isolate') ?? 'rerender',
  );
  const [isolateTarget, setIsolateTarget] = useState((data._isolateTarget as string) ?? '');
  const [customDimensions, setCustomDimensions] = useState((data._customDims as boolean) ?? false);
  const [width, setWidth] = useState((data._dimW as number) ?? 1024);
  const [height, setHeight] = useState((data._dimH as number) ?? 1024);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [presets, setPresets] = useState<StylePreset[]>(() => loadPresets());
  const [showPresets, setShowPresets] = useState(false);
  const [presetName, setPresetName] = useState('');

  const mountedRef = useRef(true);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; clearInterval(timerRef.current); }; }, []);

  const persist = useCallback(
    (updates: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...updates } } : n)),
      );
    },
    [id, setNodes],
  );

  useEffect(() => {
    persist({
      _styleImages: styleImages, _styleText: styleText, _styleMode: mode,
      _isolateTarget: isolateTarget, _customDims: customDimensions,
      _dimW: width, _dimH: height,
    });
  }, [styleImages, styleText, mode, isolateTarget, customDimensions, width, height]); // eslint-disable-line react-hooks/exhaustive-deps

  const inputCountSelector = useCallback(
    (state: {
      nodes: Array<{ id: string; data: Record<string, unknown> }>;
      edges: Array<{ source: string; target: string }>;
    }) => {
      let count = 0;
      for (const e of state.edges) {
        if (e.target !== id) continue;
        const peer = state.nodes.find((n) => n.id === e.source);
        if (!peer?.data) continue;
        const bulk = peer.data._bulkImages as GeneratedImage[] | undefined;
        if (bulk?.length) { count += bulk.length; continue; }
        const single = peer.data.generatedImage as GeneratedImage | undefined;
        if (single?.base64) count++;
      }
      return count;
    },
    [id],
  );
  const inputCount = useStore(inputCountSelector);

  const handleOpenFiles = useCallback(() => { fileRef.current?.click(); }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      const pending: GeneratedImage[] = [];
      let loaded = 0;
      const total = files.length;
      for (let i = 0; i < total; i++) {
        const file = files[i];
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          if (base64) pending.push({ base64, mimeType: file.type || 'image/png' });
          loaded++;
          if (loaded === total) setStyleImages((prev) => [...prev, ...pending]);
        };
        reader.readAsDataURL(file);
      }
      e.target.value = '';
    },
    [],
  );

  const handlePasteStyle = useCallback(async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find((t) => t.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = reader.result as string;
            const parts = dataUrl.split(',');
            const mime = parts[0].match(/:(.*?);/)?.[1] ?? 'image/png';
            setStyleImages((prev) => [...prev, { base64: parts[1], mimeType: mime }]);
          };
          reader.readAsDataURL(blob);
          return;
        }
      }
    } catch { /* clipboard not available */ }
  }, []);

  const removeStyleImage = useCallback((idx: number) => {
    setStyleImages((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleSavePreset = useCallback(() => {
    if (!presetName.trim()) return;
    const preset: StylePreset = {
      name: presetName.trim(),
      styleImages, styleText, mode, isolateTarget,
      customDimensions, width, height,
      timestamp: Date.now(),
    };
    const updated = [preset, ...presets.filter((p) => p.name !== preset.name)];
    setPresets(updated);
    savePresets(updated);
    setPresetName('');
  }, [presetName, styleImages, styleText, mode, isolateTarget, customDimensions, width, height, presets]);

  const handleLoadPreset = useCallback((preset: StylePreset) => {
    setStyleImages(preset.styleImages);
    setStyleText(preset.styleText);
    setMode(preset.mode);
    setIsolateTarget(preset.isolateTarget);
    setCustomDimensions(preset.customDimensions);
    setWidth(preset.width);
    setHeight(preset.height);
    setShowPresets(false);
  }, []);

  const handleDeletePreset = useCallback((name: string) => {
    const updated = presets.filter((p) => p.name !== name);
    setPresets(updated);
    savePresets(updated);
  }, [presets]);

  const buildPromptAndRefs = useCallback(
    (inputImage: GeneratedImage): { prompt: string; refs: GeneratedImage[] } => {
      let prompt: string;
      let refs: GeneratedImage[];
      const totalImages = 1 + styleImages.length;
      const styleLabel = styleImages.length === 1
        ? 'IMAGE 2 is the STYLE REFERENCE'
        : `IMAGES 2–${totalImages} are STYLE REFERENCES`;
      const styleShort = styleImages.length === 1
        ? 'IMAGE 2'
        : `IMAGES 2–${totalImages}`;

      if (mode === 'rerender') {
        if (styleImages.length > 0) {
          refs = [inputImage, ...styleImages];
          prompt = `You are given ${totalImages} images.

IMAGE 1 (the first image) is the SOURCE — the image to be recreated.
${styleLabel} — use ONLY for determining the visual rendering style.

Your task: Recreate IMAGE 1 exactly, but rendered in the art style / visual style shown in ${styleShort}.

CRITICAL RULES:
- The OUTPUT must depict the EXACT same scene, subject(s), pose, composition, background, and framing as IMAGE 1.
- Do NOT borrow any content, scene, environment, characters, or objects from the style reference(s).
- The style reference(s) are ONLY for extracting rendering technique, color palette, shading, line work, texture treatment, and level of detail — then apply that style to IMAGE 1's content.
- Think of it like a filter: same photo, different artistic rendering.${styleText.trim() ? `\nAdditional style guidance: ${styleText.trim()}` : ''}`;
        } else {
          refs = [inputImage];
          prompt = `Recreate this exact image — same subject, pose, composition, background, and framing — but rendered in the following art style: ${styleText.trim()}.
Do NOT change the scene content. Only change the visual rendering style.`;
        }
      } else {
        const target = isolateTarget.trim() || 'the main subject';
        if (styleImages.length > 0) {
          refs = [inputImage, ...styleImages];
          prompt = `You are given ${totalImages} images.

IMAGE 1 (the first image) is the SOURCE.
${styleLabel}.

Your task: Isolate "${target}" from IMAGE 1 and make it the hero/main focus of the output.
Render the result in the visual style shown in ${styleShort}.

CRITICAL: Do NOT place the subject into any environment from the style reference(s). Only use them for art style, color palette, shading, and rendering technique.${styleText.trim() ? `\nAdditional style guidance: ${styleText.trim()}` : ''}`;
        } else {
          refs = [inputImage];
          prompt = `Isolate "${target}" from this image and make it the hero/main focus of the output.${styleText.trim() ? `\nRender in this art style: ${styleText.trim()}` : ''}`;
        }
      }

      if (customDimensions) {
        prompt += `\n\nOutput dimensions: approximately ${width}x${height} pixels.`;
      }

      return { prompt, refs };
    },
    [mode, styleImages, styleText, isolateTarget, customDimensions, width, height],
  );

  const handleProcess = useCallback(async () => {
    if (busy) return;
    if (styleImages.length === 0 && !styleText.trim()) {
      setError('Add style images or enter a style description');
      return;
    }

    const edges = getEdges();
    const inputImages = gatherUpstreamImages(id, getNode as (id: string) => { id: string; data: Record<string, unknown> } | undefined, edges);

    if (inputImages.length === 0) {
      setError('No input images connected');
      return;
    }

    setBusy(true);
    setError(null);
    setElapsed(0);
    const t0 = Date.now();
    timerRef.current = setInterval(() => {
      if (mountedRef.current) setElapsed(Math.floor((Date.now() - t0) / 1000));
    }, 500);

    const controller = registerRequest();

    try {
      let done = 0;
      setStatus(`Converting 0/${inputImages.length}…`);

      const settled = await Promise.allSettled(
        inputImages.map((img) => {
          const { prompt, refs } = buildPromptAndRefs(img);
          return generateWithGeminiRef(prompt, refs).then((result) => {
            done++;
            if (mountedRef.current) setStatus(`Converted ${done}/${inputImages.length}…`);
            return result[0];
          });
        }),
      );

      if (!mountedRef.current || controller.signal.aborted) return;

      const results: GeneratedImage[] = [];
      const errors: string[] = [];
      for (const r of settled) {
        if (r.status === 'fulfilled' && r.value) results.push(r.value);
        else if (r.status === 'rejected') errors.push(r.reason instanceof Error ? r.reason.message : String(r.reason));
      }

      const secs = ((Date.now() - t0) / 1000).toFixed(1);
      if (results.length === 0) {
        setError(`All ${inputImages.length} conversion(s) failed: ${errors[0] ?? 'unknown error'}`);
        setStatus(null);
        return;
      }

      const partial = errors.length > 0 ? ` (${errors.length} failed)` : '';
      setStatus(`Done — ${results.length} image${results.length !== 1 ? 's' : ''} converted in ${secs}s${partial}`);

      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== id) return n;
          return { ...n, data: { ...n.data, _outputImages: results } };
        }),
      );

      setTimeout(() => { if (mountedRef.current) setStatus(null); }, 4000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.toLowerCase().includes('cancel') && !msg.toLowerCase().includes('abort')) {
        setError(msg);
      }
      setStatus(null);
    } finally {
      clearInterval(timerRef.current);
      unregisterRequest(controller);
      setBusy(false);
      setElapsed(0);
    }
  }, [busy, styleImages, styleText, id, getNode, getEdges, setNodes, buildPromptAndRefs]);

  const hasStyle = styleImages.length > 0 || styleText.trim().length > 0;
  const defaultPresetName = getDefaultPreset();

  return (
    <div className={`util-node ${selected ? 'selected' : ''} ${busy ? 'util-node-processing' : ''}`}>
      <Handle type="target" position={Position.Left} id="input" />
      <Handle type="source" position={Position.Right} id="output" />

      <div className="util-node-header" style={{ background: '#7b1fa2' }}>
        Style Conversion
      </div>

      <div className="util-node-body">
        {/* Mode selector */}
        <div className="util-mode-tabs">
          <button
            type="button"
            className={`util-mode-tab nodrag nopan ${mode === 'rerender' ? 'active' : ''}`}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); setMode('rerender'); }}
          >
            Re-render
          </button>
          <button
            type="button"
            className={`util-mode-tab nodrag nopan ${mode === 'isolate' ? 'active' : ''}`}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); setMode('isolate'); }}
          >
            Isolate
          </button>
        </div>

        {mode === 'isolate' && (
          <input
            type="text"
            value={isolateTarget}
            onChange={(e) => setIsolateTarget(e.target.value)}
            placeholder="What to isolate (e.g. 'the dragon', 'red sword')…"
            className="nodrag nopan"
            onPointerDown={(e) => e.stopPropagation()}
            style={{
              width: '100%', fontSize: 11, padding: '6px 8px',
              background: '#1e1e2e', color: '#eee', border: '1px solid #444',
              borderRadius: 4, fontFamily: 'inherit',
            }}
          />
        )}

        {/* Style reference images */}
        <div>
          <label style={{ fontSize: 10, color: '#aaa', display: 'block', marginBottom: 3 }}>Style References</label>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              type="button"
              className="util-btn nodrag nopan"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); handleOpenFiles(); }}
              style={{ flex: 1 }}
            >
              Open
            </button>
            <button
              type="button"
              className="util-btn nodrag nopan"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); handlePasteStyle(); }}
              style={{ flex: 1 }}
            >
              Paste
            </button>
          </div>
        </div>

        {styleImages.length > 0 && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {styleImages.map((img, i) => (
              <div key={i} className="util-thumb-item" style={{ width: 52, height: 52 }}>
                <img src={`data:${img.mimeType};base64,${img.base64}`} alt={`style-${i}`} draggable={false} />
                <button className="util-thumb-remove" onClick={(e) => { e.stopPropagation(); removeStyleImage(i); }}>×</button>
              </div>
            ))}
          </div>
        )}

        <textarea
          value={styleText}
          onChange={(e) => setStyleText(e.target.value)}
          placeholder="Style description (optional if images provided)…"
          rows={2}
          className="nodrag nopan"
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            width: '100%', fontSize: 11, padding: 6,
            background: '#1e1e2e', color: '#eee', border: '1px solid #444',
            borderRadius: 4, resize: 'vertical', fontFamily: 'inherit',
          }}
        />

        {/* Dimension options */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: '#aaa', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={customDimensions}
              onChange={(e) => setCustomDimensions(e.target.checked)}
              className="nodrag nopan"
              onPointerDown={(e) => e.stopPropagation()}
            />
            Custom dimensions
          </label>
          {customDimensions && (
            <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
              <input
                type="number"
                value={width}
                onChange={(e) => setWidth(Number(e.target.value))}
                className="nodrag nopan"
                onPointerDown={(e) => e.stopPropagation()}
                style={{ flex: 1, fontSize: 11, padding: '4px 6px', background: '#1e1e2e', color: '#eee', border: '1px solid #444', borderRadius: 4 }}
                placeholder="Width"
              />
              <span style={{ color: '#666', alignSelf: 'center' }}>×</span>
              <input
                type="number"
                value={height}
                onChange={(e) => setHeight(Number(e.target.value))}
                className="nodrag nopan"
                onPointerDown={(e) => e.stopPropagation()}
                style={{ flex: 1, fontSize: 11, padding: '4px 6px', background: '#1e1e2e', color: '#eee', border: '1px solid #444', borderRadius: 4 }}
                placeholder="Height"
              />
            </div>
          )}
        </div>

        {/* Presets */}
        <div style={{ display: 'flex', gap: 4 }}>
          <input
            type="text"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            placeholder="Preset name…"
            className="nodrag nopan"
            onPointerDown={(e) => e.stopPropagation()}
            style={{
              flex: 1, fontSize: 10, padding: '4px 6px',
              background: '#1e1e2e', color: '#eee', border: '1px solid #444', borderRadius: 4,
            }}
          />
          <button
            type="button"
            className="util-btn nodrag nopan"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); handleSavePreset(); }}
            disabled={!presetName.trim()}
            style={{ fontSize: 10, padding: '4px 8px' }}
          >
            Save
          </button>
          <button
            type="button"
            className="util-btn nodrag nopan"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); setShowPresets((v) => !v); }}
            style={{ fontSize: 10, padding: '4px 8px' }}
          >
            Load
          </button>
        </div>

        {showPresets && presets.length > 0 && (
          <div className="util-preset-list nodrag nopan" onPointerDown={(e) => e.stopPropagation()}>
            {presets
              .sort((a, b) => b.timestamp - a.timestamp)
              .map((p) => (
                <div
                  key={p.name}
                  className="util-preset-item"
                  onClick={() => handleLoadPreset(p)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setDefaultPreset(p.name);
                    setPresets([...presets]); // trigger re-render
                  }}
                >
                  <span style={{ flex: 1 }}>{p.name}</span>
                  {p.name === defaultPresetName && (
                    <span style={{ fontSize: 9, color: '#888' }}>default</span>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeletePreset(p.name); }}
                    style={{
                      background: 'none', border: 'none', color: '#ef5350',
                      fontSize: 12, cursor: 'pointer', padding: '0 2px',
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
          </div>
        )}

        {showPresets && presets.length === 0 && (
          <div className="util-hint">No saved presets</div>
        )}

        {/* Process button */}
        <button
          type="button"
          className="util-btn primary nodrag nopan"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); handleProcess(); }}
          disabled={busy || !hasStyle || inputCount === 0}
          style={{
            width: '100%', padding: '8px 0', fontSize: 12, fontWeight: 700,
            background: hasStyle && !busy && inputCount > 0 ? '#7b1fa2' : undefined,
          }}
        >
          {busy ? `Converting… ${elapsed}s` : `Convert ${inputCount} Image${inputCount !== 1 ? 's' : ''}`}
        </button>

        {status && <div className="util-status">{status}</div>}
        {error && <div className="util-error">{error}</div>}

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
}

const StyleConversionNode = memo(StyleConversionNodeInner);
export default StyleConversionNode;
