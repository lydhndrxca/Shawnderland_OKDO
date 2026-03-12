"use client";

import { memo, useCallback, useState } from 'react';
import { Handle, Position, useReactFlow, useHandleConnections } from '@xyflow/react';
import {
  ALL_IMAGE_MODELS_SORTED,
  ASPECT_RATIOS,
  type ModelOption,
} from '@/app/ideation/canvas/nodes/modelCatalog';
import { proxyGenerate } from '@/lib/ideation/engine/aiProxy';
import { getConfiguredResolution } from '@/lib/ideation/engine/conceptlab/imageGenApi';
import { ImageContextMenu } from '@/components/ImageContextMenu';

interface ImageGenNodeProps {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

interface GeneratedImg {
  base64: string;
  mimeType: string;
}

function ImageGenNodeInner({ id, selected }: ImageGenNodeProps) {
  const { getNode, setNodes } = useReactFlow();
  const promptConns = useHandleConnections({ type: 'target', id: 'prompt-in' });
  const refConns = useHandleConnections({ type: 'target', id: 'ref-in' });

  const [model, setModel] = useState<ModelOption>(ALL_IMAGE_MODELS_SORTED[0]);
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [count, setCount] = useState(1);
  const [localPrompt, setLocalPrompt] = useState('');
  const [images, setImages] = useState<GeneratedImg[]>([]);
  const [viewIdx, setViewIdx] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getPromptText = useCallback((): string => {
    if (localPrompt.trim()) return localPrompt.trim();
    for (const conn of promptConns) {
      const src = getNode(conn.source);
      if (src) {
        const text = (src.data as Record<string, unknown>)?.promptText as string | undefined;
        if (text?.trim()) return text.trim();
      }
    }
    return '';
  }, [localPrompt, promptConns, getNode]);

  const getRefImage = useCallback((): { base64: string; mimeType: string } | null => {
    for (const conn of refConns) {
      const src = getNode(conn.source);
      if (src) {
        const d = src.data as Record<string, unknown>;
        const b64 = d?.imageBase64 as string | undefined;
        const mime = d?.mimeType as string | undefined;
        if (b64) return { base64: b64, mimeType: mime ?? 'image/png' };
        const genImg = d?.generatedImage as GeneratedImg | undefined;
        if (genImg) return genImg;
      }
    }
    return null;
  }, [refConns, getNode]);

  const handleGenerate = useCallback(async () => {
    const prompt = getPromptText();
    if (!prompt) { setError('Enter a prompt or connect a Prompt node.'); return; }

    setGenerating(true);
    setError(null);

    try {
      const refImage = getRefImage();
      const isImagen = model.endpoint === 'imagen';
      const isGeminiRef = !isImagen && refImage;

      if (isImagen) {
        const json = await proxyGenerate(model.modelId, 'predict', {
          instances: [{ prompt }],
          parameters: { sampleCount: count, aspectRatio },
        }, 180_000) as { predictions?: Array<{ bytesBase64Encoded: string; mimeType?: string }> };

        const preds = json?.predictions;
        if (!preds?.length) throw new Error('No images returned');
        const newImgs: GeneratedImg[] = preds.map((p) => ({
          base64: p.bytesBase64Encoded,
          mimeType: p.mimeType || 'image/png',
        }));
        setImages(newImgs);
        setViewIdx(0);
        setNodes((nds) =>
          nds.map((n) =>
            n.id === id ? { ...n, data: { ...n.data, generatedImage: newImgs[0] } } : n,
          ),
        );
      } else if (isGeminiRef) {
        const parts: Array<Record<string, unknown>> = [];
        parts.push({ inlineData: { mimeType: refImage!.mimeType, data: refImage!.base64 } });
        parts.push({ text: prompt });
        const nb2CapRef = model.modelId === 'gemini-3.1-flash-image-preview' || model.modelId === 'gemini-3-pro-image-preview';
        const resRef = getConfiguredResolution();
        const imgCfgRef = nb2CapRef && resRef !== '1K' ? { imageSize: resRef } : undefined;
        const json = await proxyGenerate(model.modelId, 'generateContent', {
          contents: [{ parts }],
          generationConfig: {
            responseModalities: ['TEXT', 'IMAGE'],
            temperature: 0.8,
            ...(imgCfgRef && { imageConfig: imgCfgRef }),
          },
        }) as { candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { mimeType: string; data: string } }> } }> };

        const resParts = json?.candidates?.[0]?.content?.parts ?? [];
        const imgParts = resParts.filter((p) => p.inlineData);
        if (!imgParts.length) throw new Error('No image returned from Gemini');
        const newImgs: GeneratedImg[] = imgParts.map((p) => ({
          base64: p.inlineData!.data,
          mimeType: p.inlineData!.mimeType,
        }));
        setImages(newImgs);
        setViewIdx(0);
        setNodes((nds) =>
          nds.map((n) =>
            n.id === id ? { ...n, data: { ...n.data, generatedImage: newImgs[0] } } : n,
          ),
        );
      } else {
        const modelId = model.modelId.includes('gemini')
          ? model.modelId
          : 'gemini-3.1-flash-image-preview';
        const nb2CapGen = modelId === 'gemini-3.1-flash-image-preview' || modelId === 'gemini-3-pro-image-preview';
        const resGen = getConfiguredResolution();
        const imgCfgGen = nb2CapGen && resGen !== '1K' ? { imageSize: resGen } : undefined;
        const json = await proxyGenerate(modelId, 'generateContent', {
          contents: [{ parts: [{ text: `Generate an image: ${prompt}. Aspect ratio: ${aspectRatio}.` }] }],
          generationConfig: {
            responseModalities: ['TEXT', 'IMAGE'],
            ...(imgCfgGen && { imageConfig: imgCfgGen }),
          },
        }) as { candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { mimeType: string; data: string } }> } }> };

        const resParts = json?.candidates?.[0]?.content?.parts ?? [];
        const imgParts = resParts.filter((p) => p.inlineData);
        if (!imgParts.length) throw new Error('No image returned from Gemini');
        const newImgs: GeneratedImg[] = imgParts.map((p) => ({
          base64: p.inlineData!.data,
          mimeType: p.inlineData!.mimeType,
        }));
        setImages(newImgs);
        setViewIdx(0);
        setNodes((nds) =>
          nds.map((n) =>
            n.id === id ? { ...n, data: { ...n.data, generatedImage: newImgs[0] } } : n,
          ),
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  }, [getPromptText, getRefImage, model, count, aspectRatio, id, setNodes]);

  const hasRef = getRefImage() !== null;
  const currentImg = images[viewIdx] ?? null;

  return (
    <div className={`gs-image-gen-node ${selected ? 'selected' : ''}`}>
      <div className="gs-node-header gs-image-header">
        <span className="gs-node-title">Image Gen</span>
        {hasRef && <span className="gs-ref-badge">REF</span>}
      </div>
      <div className="gs-node-tldr">Text-to-image with any Google AI model</div>
      <div className="gs-node-body">
        <div className="gs-field">
          <label className="gs-field-label">Model</label>
          <select
            className="gs-select nodrag"
            value={model.id}
            onChange={(e) => {
              const m = ALL_IMAGE_MODELS_SORTED.find((x) => x.id === e.target.value);
              if (m) setModel(m);
            }}
          >
            {ALL_IMAGE_MODELS_SORTED.map((m) => (
              <option key={m.id} value={m.id} title={m.description}>
                {m.label}
              </option>
            ))}
          </select>
          <div className="gs-model-tags">{model.tags.join(' · ')}</div>
        </div>

        <div className="gs-field-row">
          <div className="gs-field">
            <label className="gs-field-label">Aspect</label>
            <select
              className="gs-select nodrag"
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value)}
            >
              {ASPECT_RATIOS.map((ar) => (
                <option key={ar.value} value={ar.value}>{ar.label}</option>
              ))}
            </select>
          </div>
          {model.endpoint === 'imagen' && (
            <div className="gs-field gs-field-sm">
              <label className="gs-field-label">Count</label>
              <input
                type="number"
                className="gs-input nodrag nowheel"
                min={1}
                max={4}
                value={count}
                onChange={(e) =>
                  setCount(Math.max(1, Math.min(4, parseInt(e.target.value) || 1)))
                }
              />
            </div>
          )}
        </div>

        <textarea
          className="gs-prompt-inline nodrag nowheel"
          value={localPrompt}
          onChange={(e) => setLocalPrompt(e.target.value)}
          placeholder={promptConns.length ? 'Override prompt (or use connected)...' : 'Describe the image...'}
          rows={2}
        />

        <button
          className="gs-generate-btn nodrag"
          onClick={(e) => { e.stopPropagation(); handleGenerate(); }}
          disabled={generating}
        >
          {generating ? 'Generating...' : 'Generate'}
        </button>

        {error && <div className="gs-error">{error}</div>}

        {currentImg && (
          <div className="gs-gallery">
            <ImageContextMenu image={currentImg} alt="generated-image">
              <img
                src={`data:${currentImg.mimeType};base64,${currentImg.base64}`}
                alt="Generated"
                className="gs-preview-img"
              />
            </ImageContextMenu>
            {images.length > 1 && (
              <div className="gs-nav">
                <button
                  className="gs-nav-btn nodrag"
                  onClick={(e) => {
                    e.stopPropagation();
                    setViewIdx((i) => (i - 1 + images.length) % images.length);
                  }}
                >
                  &lt;
                </button>
                <span>{viewIdx + 1}/{images.length}</span>
                <button
                  className="gs-nav-btn nodrag"
                  onClick={(e) => {
                    e.stopPropagation();
                    setViewIdx((i) => (i + 1) % images.length);
                  }}
                >
                  &gt;
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <Handle type="target" position={Position.Left} id="prompt-in" style={{ background: '#64b5f6', top: '35%' }} />
      <Handle type="target" position={Position.Left} id="ref-in" style={{ background: '#4dd0e1', top: '65%' }} />
      <Handle type="source" position={Position.Right} id="image-out" style={{ background: '#f06292' }} />
    </div>
  );
}

export default memo(ImageGenNodeInner);
