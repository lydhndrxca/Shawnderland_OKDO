"use client";

import { memo, useCallback, useRef, useState, useEffect } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import type { GeneratedImage, TextModelId } from '@/lib/ideation/engine/conceptlab/imageGenApi';
import { generateText } from '@/lib/ideation/engine/conceptlab/imageGenApi';
import TextModelSelector from '@/components/TextModelSelector';
import '../character/CharacterNodes.css';
import './PropLabNodes.css';

type StyleMode = 'images' | 'text' | 'both';

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

function PropStyleNodeInner({ id, data, selected }: Props) {
  const { setNodes } = useReactFlow();
  const [styleText, setStyleText] = useState((data?.styleText as string) ?? '');
  const [styleMode, setStyleMode] = useState<StyleMode>((data?.styleMode as StyleMode) ?? 'images');
  const [images, setImages] = useState<GeneratedImage[]>(
    (data?.styleImages as GeneratedImage[]) ?? [],
  );
  const [collapsed, setCollapsed] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [processing, setProcessing] = useState(false);
  const [processError, setProcessError] = useState<string | null>(null);
  const [textModel, setTextModel] = useState<TextModelId>((data?.textModel as TextModelId) ?? 'fast');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const restoredImages = (data?.styleImages as GeneratedImage[]) ?? [];
    const restoredText = (data?.styleText as string) ?? '';
    const restoredMode = (data?.styleMode as StyleMode) ?? 'images';
    if (restoredImages.length !== images.length ||
        (restoredImages.length > 0 && restoredImages[0]?.base64?.slice(0, 40) !== images[0]?.base64?.slice(0, 40))) {
      setImages(restoredImages);
    }
    if (restoredText !== styleText) setStyleText(restoredText);
    if (restoredMode !== styleMode) setStyleMode(restoredMode);
  }, [data?.styleImages, data?.styleText, data?.styleMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const persist = useCallback(
    (updates: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...updates } } : n)),
      );
    },
    [id, setNodes],
  );

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
          if (loaded === total) setImages((prev) => [...prev, ...pending]);
        };
        reader.readAsDataURL(file);
      }
      e.target.value = '';
    },
    [],
  );

  const handlePaste = useCallback(async () => {
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
            setImages((prev) => [...prev, { base64: parts[1], mimeType: mime }]);
          };
          reader.readAsDataURL(blob);
          return;
        }
      }
    } catch { /* clipboard not available */ }
  }, []);

  const removeImage = useCallback(
    (idx: number) => {
      setImages((prev) => prev.filter((_, i) => i !== idx));
      if (expandedIdx === idx) setExpandedIdx(null);
    },
    [expandedIdx],
  );

  const imagesInitRef = useRef(true);
  useEffect(() => {
    if (imagesInitRef.current) { imagesInitRef.current = false; return; }
    persist({ styleImages: images });
  }, [images]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleProcessStyle = useCallback(async () => {
    if (images.length === 0 || processing) return;
    setProcessing(true);
    setProcessError(null);
    try {
      const prompt = `You are a visual style analyst specializing in 3D game art and prop design. Study the provided reference image(s) and produce a detailed style description for recreating this visual style in prop renders.

Analyze: rendering technique, material treatment, color palette, lighting approach, texture quality, edge treatment, and overall mood.

Write a single cohesive paragraph (150-250 words) as a style directive. Be precise and technical. Start directly with the description.`;

      const result = await generateText(prompt, images, textModel);
      setStyleText(result.trim());
      persist({ styleText: result.trim() });
    } catch (e) {
      setProcessError(e instanceof Error ? e.message : String(e));
    } finally {
      setProcessing(false);
    }
  }, [images, processing, persist, textModel]);

  return (
    <div className={`style-glass-node ${selected ? 'selected' : ''}`}>
      <div className="style-glass-header" style={{ cursor: 'pointer' }} onClick={() => setCollapsed((c) => !c)}>
        <span className="style-glass-title">Prop Style</span>
        <span className="style-glass-count">{images.length} img{images.length !== 1 ? 's' : ''}</span>
        <span onClick={(e) => e.stopPropagation()} style={{ marginLeft: 'auto' }}>
          <TextModelSelector value={textModel} onChange={(m) => { setTextModel(m); persist({ textModel: m }); }} disabled={processing} />
        </span>
        <span style={{ fontSize: 10, opacity: 0.7, marginLeft: 4 }}>
          {collapsed ? '\u25BC' : '\u25B2'}
        </span>
      </div>

      {expandedIdx !== null && images[expandedIdx] && (
        <div className="style-popup-overlay nodrag" onClick={(e) => e.stopPropagation()}>
          <div className="style-popup-window">
            <button type="button" className="style-popup-close nodrag" onClick={() => setExpandedIdx(null)}>&times;</button>
            <img src={`data:${images[expandedIdx].mimeType};base64,${images[expandedIdx].base64}`} alt="Preview" draggable={false} />
          </div>
        </div>
      )}

      {!collapsed && (
        <div className="style-glass-body">
          <div className="style-glass-grid-area nodrag nowheel">
            {images.length === 0 && <div className="style-glass-empty">No images yet</div>}
            {images.map((img, idx) => (
              <div key={idx} className="style-glass-thumb" onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}>
                <img src={`data:${img.mimeType};base64,${img.base64}`} alt={`Ref ${idx + 1}`} draggable={false} />
                <button type="button" className="style-glass-remove nodrag" onClick={(e) => { e.stopPropagation(); removeImage(idx); }}>&times;</button>
              </div>
            ))}
          </div>

          <div className="style-glass-footer">
            <div className="style-glass-actions">
              <button type="button" className="style-glass-btn nodrag" onClick={() => fileRef.current?.click()}>Open Image</button>
              <button type="button" className="style-glass-btn nodrag" onClick={handlePaste}>Paste Image</button>
            </div>

            <div className="style-glass-mode-row nodrag" style={{ display: 'flex', gap: 2, marginTop: 4 }}>
              {(['images', 'text', 'both'] as StyleMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`style-glass-mode-btn nodrag${styleMode === m ? ' active' : ''}`}
                  onClick={() => { setStyleMode(m); persist({ styleMode: m }); }}
                >
                  {m === 'images' ? 'Images Only' : m === 'text' ? 'Text Only' : 'Images + Text'}
                </button>
              ))}
            </div>

            <textarea
              className="style-glass-textarea nodrag nowheel"
              value={styleText}
              onChange={(e) => { setStyleText(e.target.value); persist({ styleText: e.target.value }); }}
              placeholder="Style description — type or generate from images..."
              rows={4}
              style={{ minHeight: 60, resize: 'vertical', marginTop: 4 }}
            />

            <button
              type="button"
              className="style-glass-btn style-glass-btn-process nodrag"
              onClick={handleProcessStyle}
              disabled={images.length === 0 || processing}
              style={{ width: '100%', marginTop: 4 }}
            >
              {processing ? 'Processing\u2026' : 'Process Images to Text'}
            </button>
            {processError && <div className="char-error" style={{ fontSize: 10, margin: '4px 0' }}>{processError}</div>}
          </div>

          <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleFileChange} />
        </div>
      )}

      <Handle type="target" position={Position.Left} id="input" className="char-handle" style={{ top: '50%' }} />
      <Handle type="source" position={Position.Right} id="output" className="char-handle" style={{ top: '50%' }} />
    </div>
  );
}

export default memo(PropStyleNodeInner);
