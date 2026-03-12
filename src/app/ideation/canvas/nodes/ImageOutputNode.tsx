"use client";

import { memo, useCallback, useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Handle, Position, useReactFlow, useEdges, useNodes } from '@xyflow/react';
import { IMAGE_MODELS, ASPECT_RATIOS, type ModelOption } from './modelCatalog';
import { recordUsage, recordImagenUsage } from '@/lib/ideation/engine/provider/costTracker';
import { logGeneration, buildLineageContext, type SessionSnapshot } from '@/lib/ideation/engine/generationLog';
import { proxyGenerate } from '@/lib/ideation/engine/aiProxy';
import { ImageContextMenu } from '@/components/ImageContextMenu';
import './ImageOutputNode.css';

interface ImageOutputNodeProps {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

function extractUpstreamContext(nodeId: string, allNodes: ReturnType<typeof useNodes>, allEdges: ReturnType<typeof useEdges>): string {
  const incomingEdges = allEdges.filter((e) => e.target === nodeId);
  const contexts: string[] = [];
  for (const edge of incomingEdges) {
    const sourceNode = allNodes.find((n) => n.id === edge.source);
    if (!sourceNode) continue;
    const d = sourceNode.data as Record<string, unknown>;

    if (d.extractedText && typeof d.extractedText === 'string') contexts.push(d.extractedText);
    if (d.documentContent && typeof d.documentContent === 'string') contexts.push(d.documentContent);
    if (d.characterDescription && typeof d.characterDescription === 'string') contexts.push(d.characterDescription);
    if (d.weaponDescription && typeof d.weaponDescription === 'string') contexts.push(d.weaponDescription);
    if (d.nodeText && typeof d.nodeText === 'string') contexts.push(d.nodeText);
    if (d.nodeNotes && typeof d.nodeNotes === 'string') contexts.push(d.nodeNotes);

    if (d.outputData && typeof d.outputData === 'object') {
      const od = d.outputData as Record<string, unknown>;
      if (od.title) contexts.push(`Title: ${od.title}`);
      if (od.differentiator) contexts.push(`Differentiator: ${od.differentiator}`);
      if (od.next3Actions) contexts.push(`Next actions: ${od.next3Actions}`);
      if (od.seedSummary) contexts.push(`Summary: ${od.seedSummary}`);
      if (od.candidates && Array.isArray(od.candidates)) {
        contexts.push(`Ideas: ${(od.candidates as Array<{ hook?: string }>).slice(0, 3).map((c) => c.hook || '').join(', ')}`);
      }
    }
    if (d.seedText && typeof d.seedText === 'string') contexts.push(d.seedText);
    if (d.text && typeof d.text === 'string' && !contexts.length) contexts.push(d.text);
    if (d.prefillSeed && typeof d.prefillSeed === 'string') contexts.push(d.prefillSeed);
  }
  return contexts.join('\n');
}

function ImageOutputNodeInner({ id, selected }: ImageOutputNodeProps) {
  const { setNodes } = useReactFlow();
  const allNodes = useNodes();
  const allEdges = useEdges();
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [model, setModelLocal] = useState<ModelOption>(IMAGE_MODELS[0]);

  const setModel = useCallback((m: ModelOption) => {
    setModelLocal(m);
    setNodes((nds) =>
      nds.map((n) =>
        n.id === id
          ? { ...n, data: { ...n.data, selectedModelId: m.id, selectedModelEndpoint: m.endpoint } }
          : n,
      ),
    );
  }, [id, setNodes]);
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [count, setCount] = useState(1);
  const [prompt, setPrompt] = useState('');
  const [images, setImages] = useState<Array<{ base64: string; mimeType: string }>>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewIdx, setViewIdx] = useState(0);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const upstreamContext = useMemo(() => extractUpstreamContext(id, allNodes, allEdges), [id, allNodes, allEdges]);
  const hasUpstream = upstreamContext.trim().length > 0;

  const buildEffectivePrompt = useCallback((): string => {
    const parts: string[] = [];
    if (hasUpstream) parts.push(`Context from connected nodes:\n${upstreamContext}`);
    if (prompt.trim()) parts.push(prompt.trim());
    return parts.join('\n\n');
  }, [hasUpstream, upstreamContext, prompt]);

  const canGenerate = prompt.trim().length > 0 || hasUpstream;

  const persistImages = useCallback((newImages: Array<{ base64: string; mimeType: string }>) => {
    setImages(newImages);
    setViewIdx(0);
    if (newImages.length > 0) {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id
            ? { ...n, data: { ...n.data, generatedImage: newImages[0], imageBase64: newImages[0].base64, mimeType: newImages[0].mimeType } }
            : n,
        ),
      );
    }
  }, [id, setNodes]);

  const handleGenerate = useCallback(async () => {
    const effectivePrompt = buildEffectivePrompt();
    if (!effectivePrompt.trim()) return;
    setGenerating(true);
    setError(null);

    try {
      if (model.endpoint === 'imagen') {
        const json = await proxyGenerate(model.modelId, 'predict', {
          instances: [{ prompt: effectivePrompt }],
          parameters: { sampleCount: count, aspectRatio },
        }, 180_000) as { predictions?: Array<{ bytesBase64Encoded: string; mimeType?: string }> };

        if (!mountedRef.current) return;

        const predictions = json?.predictions;
        if (!predictions?.length) throw new Error('No images returned from Imagen');

        const newImages = predictions.map((p) => ({
          base64: p.bytesBase64Encoded,
          mimeType: p.mimeType || 'image/png',
        }));
        recordImagenUsage(model.modelId, newImages.length);
        const w = window as unknown as Record<string, unknown>;
        const sid = (w.__sessionId as string) ?? 'unknown';
        const snap = w.__sessionSnapshot as SessionSnapshot | undefined;
        logGeneration({ sessionId: sid, category: 'image', source: 'ImageOutputNode', model: model.modelId, prompt: effectivePrompt, output: { imageCount: newImages.length, aspectRatio, mimeTypes: newImages.map((img: { mimeType: string }) => img.mimeType) }, lineage: snap ? buildLineageContext(snap) : undefined });

        persistImages(newImages);
      } else {
        const json = await proxyGenerate('gemini-2.0-flash-exp', 'generateContent', {
          contents: [{ parts: [{ text: `Generate an image: ${effectivePrompt}. Aspect ratio: ${aspectRatio}.` }] }],
          generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
        }) as { usageMetadata?: object; candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { mimeType: string; data: string } }> } }> };

        if (!mountedRef.current) return;

        if (json?.usageMetadata) recordUsage(json.usageMetadata as { promptTokenCount?: number; candidatesTokenCount?: number }, 'gemini-2.0-flash-exp');
        const parts = json?.candidates?.[0]?.content?.parts ?? [];
        const imageParts = parts.filter((p) => p.inlineData);

        if (imageParts.length === 0) throw new Error('No image returned from Gemini. The model may have returned text only.');

        const newImages = imageParts.map((p) => ({
          base64: p.inlineData!.data,
          mimeType: p.inlineData!.mimeType,
        }));
        const w2 = window as unknown as Record<string, unknown>;
        const sid2 = (w2.__sessionId as string) ?? 'unknown';
        const snap2 = w2.__sessionSnapshot as SessionSnapshot | undefined;
        logGeneration({ sessionId: sid2, category: 'image', source: 'ImageOutputNode', model: 'gemini-2.0-flash-exp', prompt: effectivePrompt, output: { imageCount: newImages.length, aspectRatio, mimeTypes: newImages.map((img: { mimeType: string }) => img.mimeType) }, lineage: snap2 ? buildLineageContext(snap2) : undefined });

        persistImages(newImages);
      }
    } catch (e) {
      if (mountedRef.current) setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (mountedRef.current) setGenerating(false);
    }
  }, [buildEffectivePrompt, model, count, aspectRatio, persistImages]);

  return (
    <div
      className={`image-output-node ${selected ? 'selected' : ''}`}
      title="Generate images from your idea using Gemini models"
    >
      <div className="image-output-header">
        <span className="image-output-label">Image Output</span>
        {images.length > 0 && (
          <span className="image-output-count">{images.length} img</span>
        )}
      </div>

      <div className="image-output-body">
        <div className="image-output-model-select">
          <label className="image-output-field-label">Model</label>
          <select
            className="image-output-select nodrag"
            value={model.id}
            onChange={(e) => {
              const m = IMAGE_MODELS.find((im) => im.id === e.target.value);
              if (m) setModel(m);
            }}
          >
            {IMAGE_MODELS.map((m) => (
              <option key={m.id} value={m.id} title={`${m.description}\n\n${m.comparison}`}>
                {m.label}
              </option>
            ))}
          </select>
          <div className="image-output-model-hint" title={`${model.description}\n\n${model.comparison}`}>
            {model.tags.join(' · ')}
          </div>
        </div>

        <div className="image-output-controls">
          <div className="image-output-field">
            <label className="image-output-field-label">Aspect</label>
            <select
              className="image-output-select nodrag"
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value)}
            >
              {ASPECT_RATIOS.map((ar) => (
                <option key={ar.value} value={ar.value}>{ar.label}</option>
              ))}
            </select>
          </div>
          {model.endpoint === 'imagen' && (
            <div className="image-output-field">
              <label className="image-output-field-label">Count</label>
              <input
                type="number"
                className="image-output-count-input nodrag nowheel"
                min={1}
                max={4}
                value={count}
                onChange={(e) => setCount(Math.max(1, Math.min(4, parseInt(e.target.value) || 1)))}
              />
            </div>
          )}
        </div>

        <textarea
          className="image-output-prompt nodrag nowheel"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe the image to generate..."
          rows={2}
        />

        {hasUpstream && (
          <div className="image-output-upstream-hint">
            Connected upstream data will be used as context
          </div>
        )}

        <button
          className="image-output-generate nodrag"
          onClick={(e) => { e.stopPropagation(); handleGenerate(); }}
          disabled={generating || !canGenerate}
          style={{ borderColor: '#f06292', color: generating ? 'var(--text-muted)' : '#f06292' }}
        >
          {generating ? 'Generating...' : 'Generate Image'}
        </button>

        {error && <div className="image-output-error">{error}</div>}

        {images.length > 0 && (
          <div className="image-output-gallery">
            <ImageContextMenu image={images[viewIdx]} alt={`generated-image-${viewIdx + 1}`}>
              <img
                src={`data:${images[viewIdx].mimeType};base64,${images[viewIdx].base64}`}
                alt={`Generated image ${viewIdx + 1}`}
                className="image-output-preview nodrag"
                onClick={(e) => { e.stopPropagation(); setShowFullPreview(true); }}
                style={{ cursor: 'pointer' }}
              />
            </ImageContextMenu>
            {images.length > 1 && (
              <div className="image-output-nav">
                <button
                  className="image-output-nav-btn nodrag"
                  onClick={(e) => { e.stopPropagation(); setViewIdx((i) => (i - 1 + images.length) % images.length); }}
                >
                  &lt;
                </button>
                <span>{viewIdx + 1}/{images.length}</span>
                <button
                  className="image-output-nav-btn nodrag"
                  onClick={(e) => { e.stopPropagation(); setViewIdx((i) => (i + 1) % images.length); }}
                >
                  &gt;
                </button>
              </div>
            )}
          </div>
        )}

        {showFullPreview && images.length > 0 && createPortal(
          <div className="fullscreen-preview-overlay" onClick={() => setShowFullPreview(false)}>
            <button
              type="button"
              className="fullscreen-preview-close"
              onClick={() => setShowFullPreview(false)}
            >
              &times;
            </button>
            <img
              src={`data:${images[viewIdx].mimeType};base64,${images[viewIdx].base64}`}
              alt="Full preview"
              className="fullscreen-preview-img"
              onClick={(e) => e.stopPropagation()}
            />
            {images.length > 1 && (
              <div className="fullscreen-preview-nav" onClick={(e) => e.stopPropagation()}>
                <button
                  className="fullscreen-preview-nav-btn"
                  onClick={() => setViewIdx((i) => (i - 1 + images.length) % images.length)}
                >
                  &lt;
                </button>
                <span>{viewIdx + 1}/{images.length}</span>
                <button
                  className="fullscreen-preview-nav-btn"
                  onClick={() => setViewIdx((i) => (i + 1) % images.length)}
                >
                  &gt;
                </button>
              </div>
            )}
          </div>,
          document.body,
        )}
      </div>

      <Handle
        type="target"
        position={Position.Left}
        id="idea"
        className="image-output-handle"
        style={{ background: '#f06292' }}
      />
      <Handle
        type="target"
        position={Position.Top}
        id="count"
        className="image-output-handle count-target"
        style={{ background: '#78909c' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="image-output-handle"
        style={{ background: '#f06292' }}
      />
    </div>
  );
}

export default memo(ImageOutputNodeInner);
