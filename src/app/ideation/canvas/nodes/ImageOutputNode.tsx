"use client";

import { memo, useCallback, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { IMAGE_MODELS, ASPECT_RATIOS, type ModelOption } from './modelCatalog';
import { recordUsage, recordImagenUsage } from '@/lib/ideation/engine/provider/costTracker';
import { logGeneration, buildLineageContext, type SessionSnapshot } from '@/lib/ideation/engine/generationLog';
import './ImageOutputNode.css';

interface ImageOutputNodeProps {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

const IMAGEN_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
const GEMINI_IMAGE_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';

function ImageOutputNodeInner({ selected }: ImageOutputNodeProps) {
  const [model, setModel] = useState<ModelOption>(IMAGE_MODELS[0]);
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [count, setCount] = useState(1);
  const [prompt, setPrompt] = useState('');
  const [images, setImages] = useState<Array<{ base64: string; mimeType: string }>>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [viewIdx, setViewIdx] = useState(0);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setError(null);

    try {
      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      if (!apiKey) throw new Error('No NEXT_PUBLIC_GEMINI_API_KEY set in .env.local');

      if (model.endpoint === 'imagen') {
        const url = `${IMAGEN_ENDPOINT}/${model.modelId}:predict?key=${apiKey}`;
        const body = {
          instances: [{ prompt: prompt.trim() }],
          parameters: {
            sampleCount: count,
            aspectRatio,
          },
        };

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Imagen API error ${res.status}: ${errText.slice(0, 300)}`);
        }

        const json = await res.json();
        const predictions = json?.predictions;
        if (!predictions?.length) throw new Error('No images returned from Imagen');

        const newImages = predictions.map((p: { bytesBase64Encoded: string; mimeType?: string }) => ({
          base64: p.bytesBase64Encoded,
          mimeType: p.mimeType || 'image/png',
        }));
        recordImagenUsage(model.modelId, newImages.length);
        const w = window as unknown as Record<string, unknown>;
        const sid = (w.__sessionId as string) ?? 'unknown';
        const snap = w.__sessionSnapshot as SessionSnapshot | undefined;
        logGeneration({ sessionId: sid, category: 'image', source: 'ImageOutputNode', model: model.modelId, prompt: prompt.trim(), output: { imageCount: newImages.length, aspectRatio, mimeTypes: newImages.map((img: { mimeType: string }) => img.mimeType) }, lineage: snap ? buildLineageContext(snap) : undefined });

        setImages(newImages);
        setViewIdx(0);
      } else {
        const url = `${GEMINI_IMAGE_ENDPOINT}?key=${apiKey}`;
        const body = {
          contents: [{ parts: [{ text: `Generate an image: ${prompt.trim()}. Aspect ratio: ${aspectRatio}.` }] }],
          generationConfig: {
            responseModalities: ['TEXT', 'IMAGE'],
          },
        };

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Gemini image API error ${res.status}: ${errText.slice(0, 300)}`);
        }

        const json = await res.json();
        if (json?.usageMetadata) recordUsage(json.usageMetadata, 'gemini-2.0-flash-exp');
        const parts = json?.candidates?.[0]?.content?.parts ?? [];
        const imageParts = parts.filter((p: { inlineData?: { mimeType: string; data: string } }) => p.inlineData);

        if (imageParts.length === 0) throw new Error('No image returned from Gemini. The model may have returned text only.');

        const newImages = imageParts.map((p: { inlineData: { mimeType: string; data: string } }) => ({
          base64: p.inlineData.data,
          mimeType: p.inlineData.mimeType,
        }));
        const w2 = window as unknown as Record<string, unknown>;
        const sid2 = (w2.__sessionId as string) ?? 'unknown';
        const snap2 = w2.__sessionSnapshot as SessionSnapshot | undefined;
        logGeneration({ sessionId: sid2, category: 'image', source: 'ImageOutputNode', model: 'gemini-2.0-flash-exp', prompt: prompt.trim(), output: { imageCount: newImages.length, aspectRatio, mimeTypes: newImages.map((img: { mimeType: string }) => img.mimeType) }, lineage: snap2 ? buildLineageContext(snap2) : undefined });

        setImages(newImages);
        setViewIdx(0);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  }, [prompt, model, count, aspectRatio]);

  return (
    <div
      className={`image-output-node ${selected ? 'selected' : ''} ${expanded ? 'expanded' : ''}`}
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

        <button
          className="image-output-generate nodrag"
          onClick={(e) => { e.stopPropagation(); handleGenerate(); }}
          disabled={generating || !prompt.trim()}
          style={{ borderColor: '#f06292', color: generating ? 'var(--text-muted)' : '#f06292' }}
        >
          {generating ? 'Generating...' : 'Generate Image'}
        </button>

        {error && <div className="image-output-error">{error}</div>}

        {images.length > 0 && (
          <div className="image-output-gallery" onClick={() => setExpanded(!expanded)}>
            <img
              src={`data:${images[viewIdx].mimeType};base64,${images[viewIdx].base64}`}
              alt={`Generated image ${viewIdx + 1}`}
              className="image-output-preview"
            />
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
    </div>
  );
}

export default memo(ImageOutputNodeInner);
