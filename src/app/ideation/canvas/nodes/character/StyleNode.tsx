"use client";

import { memo, useCallback, useRef, useState, useEffect } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import type { GeneratedImage, TextModelId } from '@/lib/ideation/engine/conceptlab/imageGenApi';
import { generateText } from '@/lib/ideation/engine/conceptlab/imageGenApi';
import TextModelSelector from '@/components/TextModelSelector';
import { saveStyle, listStyles, deleteStyle, type SavedStyle } from '@/lib/styleStore';
import { NODE_TOOLTIPS } from './nodeTooltips';
import './CharacterNodes.css';

type StyleMode = 'images' | 'text' | 'both';

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

function StyleNodeInner({ id, data, selected }: Props) {
  const { setNodes } = useReactFlow();
  const [styleName, setStyleName] = useState((data?.styleLabel as string) ?? '');
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

  const [activeStyleId, setActiveStyleId] = useState<string | null>(
    (data?.activeStyleId as string) ?? null,
  );

  useEffect(() => {
    const restoredImages = (data?.styleImages as GeneratedImage[]) ?? [];
    const restoredName = (data?.styleLabel as string) ?? '';
    const restoredText = (data?.styleText as string) ?? '';
    const restoredActiveId = (data?.activeStyleId as string) ?? null;
    const restoredMode = (data?.styleMode as StyleMode) ?? 'images';
    if (restoredImages.length !== images.length ||
        (restoredImages.length > 0 && restoredImages[0]?.base64?.slice(0, 40) !== images[0]?.base64?.slice(0, 40))) {
      setImages(restoredImages);
    }
    if (restoredName !== styleName) setStyleName(restoredName);
    if (restoredText !== styleText) setStyleText(restoredText);
    if (restoredActiveId !== activeStyleId) setActiveStyleId(restoredActiveId);
    if (restoredMode !== styleMode) setStyleMode(restoredMode);
  }, [data?.styleImages, data?.styleLabel, data?.styleText, data?.activeStyleId, data?.styleMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load dropdown state
  const [showLoadMenu, setShowLoadMenu] = useState(false);
  const [savedStyles, setSavedStyles] = useState<SavedStyle[]>([]);
  const [loadingStyles, setLoadingStyles] = useState(false);

  // Save-as dialog
  const [showSaveAs, setShowSaveAs] = useState(false);
  const [saveAsName, setSaveAsName] = useState('');

  const fileRef = useRef<HTMLInputElement>(null);

  const persist = useCallback(
    (updates: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...updates } } : n)),
      );
    },
    [id, setNodes],
  );

  const handleOpenFiles = useCallback(() => {
    fileRef.current?.click();
  }, []);

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
          if (base64) {
            pending.push({ base64, mimeType: file.type || 'image/png' });
          }
          loaded++;
          if (loaded === total) {
            setImages((prev) => [...prev, ...pending]);
          }
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
            const img: GeneratedImage = { base64: parts[1], mimeType: mime };
            setImages((prev) => [...prev, img]);
          };
          reader.readAsDataURL(blob);
          return;
        }
      }
    } catch {
      /* clipboard not available */
    }
  }, []);

  const removeImage = useCallback(
    (idx: number) => {
      setImages((prev) => prev.filter((_, i) => i !== idx));
      if (expandedIdx === idx) setExpandedIdx(null);
    },
    [expandedIdx],
  );

  // ── Save: overwrite the current style (or prompt Save As if none) ──
  const handleSave = useCallback(async () => {
    if (!activeStyleId) {
      setShowSaveAs(true);
      setSaveAsName(styleName.trim() || '');
      return;
    }
    const now = new Date().toISOString();
    const style: SavedStyle = {
      id: activeStyleId,
      name: styleName.trim() || 'Untitled Style',
      styleText,
      images: images.map((img) => ({ base64: img.base64, mimeType: img.mimeType })),
      createdAt: now,
      updatedAt: now,
    };
    await saveStyle(style);
    window.dispatchEvent(new Event('shawnderland-styles-changed'));
  }, [activeStyleId, styleName, styleText, images]);

  // ── Save As: create a new style with a given name ──
  const handleSaveAs = useCallback(async () => {
    const name = saveAsName.trim() || 'Untitled Style';
    const now = new Date().toISOString();
    const newId = `style-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const style: SavedStyle = {
      id: newId,
      name,
      styleText,
      images: images.map((img) => ({ base64: img.base64, mimeType: img.mimeType })),
      createdAt: now,
      updatedAt: now,
    };
    await saveStyle(style);
    setActiveStyleId(newId);
    setStyleName(name);
    persist({ activeStyleId: newId, styleLabel: name });
    setShowSaveAs(false);
    setSaveAsName('');
    window.dispatchEvent(new Event('shawnderland-styles-changed'));
  }, [saveAsName, styleText, images, persist]);

  // ── Load: fetch list and show dropdown ──
  const handleToggleLoad = useCallback(async () => {
    if (showLoadMenu) {
      setShowLoadMenu(false);
      return;
    }
    setLoadingStyles(true);
    const styles = await listStyles();
    setSavedStyles(styles);
    setLoadingStyles(false);
    setShowLoadMenu(true);
  }, [showLoadMenu]);

  const handleLoadStyle = useCallback(
    (s: SavedStyle) => {
      setStyleText(s.styleText);
      setStyleName(s.name);
      setImages(s.images.map((img) => ({ base64: img.base64, mimeType: img.mimeType })));
      setActiveStyleId(s.id);
      persist({ styleText: s.styleText, styleLabel: s.name, activeStyleId: s.id });
      setShowLoadMenu(false);
    },
    [persist],
  );

  const handleDeleteSavedStyle = useCallback(async (styleId: string) => {
    await deleteStyle(styleId);
    setSavedStyles((prev) => prev.filter((s) => s.id !== styleId));
    window.dispatchEvent(new Event('shawnderland-styles-changed'));
  }, []);

  const initialNameRef = useRef(styleName);
  useEffect(() => {
    if (styleName === initialNameRef.current) return;
    persist({ styleLabel: styleName });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [styleName]);

  const imagesInitRef = useRef(true);
  useEffect(() => {
    if (imagesInitRef.current) { imagesInitRef.current = false; return; }
    persist({ styleImages: images });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [images]);

  const handleProcessStyle = useCallback(async () => {
    if (images.length === 0 || processing) return;
    setProcessing(true);
    setProcessError(null);

    try {
      const prompt = `You are a visual style analyst. Study the provided reference image(s) and produce a detailed style description that an AI image generator can follow to replicate this exact visual style.

Analyze and describe ALL of the following:
1. MEDIUM & TECHNIQUE: What art medium is this? (digital painting, 3D render, watercolor, pixel art, cel-shading, photorealistic, etc.) Be very specific about the rendering technique.
2. LINE QUALITY: How are outlines/edges handled? (clean vector lines, sketchy, no outlines, soft edges, hard edges)
3. COLOR PALETTE: Describe the overall color approach (muted, vibrant, monochromatic, warm/cool dominance, specific color choices)
4. LIGHTING: How is light rendered? (flat, volumetric, rim lighting, ambient occlusion, cel-shaded shadows)
5. TEXTURE & DETAIL: Surface quality (smooth, painterly, noisy, hand-painted, photographic detail level)
6. PROPORTIONS: Character proportions if visible (realistic, stylized, chibi, exaggerated features)
7. COMPOSITION STYLE: How are subjects framed and composed?
8. MOOD & ATMOSPHERE: Overall feeling the style conveys

Write a single cohesive paragraph (150-250 words) that could serve as a style directive for generating new images in this exact same visual style. Be precise and technical — avoid vague terms like "nice" or "good". Focus on what makes this style UNIQUE and DISTINCTIVE.

Start directly with the description, no preamble.`;

      const result = await generateText(prompt, images, textModel);
      const trimmed = result.trim();

      setStyleText(trimmed);
      persist({ styleText: trimmed });
    } catch (e) {
      setProcessError(e instanceof Error ? e.message : String(e));
    } finally {
      setProcessing(false);
    }
  }, [images, processing, persist, textModel]);

  const handleEnhanceDescription = useCallback(async () => {
    if (!styleText.trim() || processing) return;
    setProcessing(true);
    setProcessError(null);

    try {
      const prompt = `You are a visual style description enhancer for AI image generation. The user has written a style description. Your job is to enhance it — make it more specific, technical, and useful as a directive for an AI image generator.

Original style description:
"${styleText.trim()}"

Rewrite this into a single cohesive paragraph (150-250 words) that could serve as a style directive for generating new images in this exact visual style. Be precise and technical — avoid vague terms like "nice" or "good". Add specific details about rendering technique, color palette, line quality, shading method, texture, and medium. Preserve the user's core intent while making it more actionable.

Start directly with the enhanced description, no preamble.`;

      const result = await generateText(prompt, images.length > 0 ? images : undefined, textModel);
      const trimmed = result.trim();

      setStyleText(trimmed);
      persist({ styleText: trimmed });
    } catch (e) {
      setProcessError(e instanceof Error ? e.message : String(e));
    } finally {
      setProcessing(false);
    }
  }, [styleText, images, processing, persist, textModel]);

  const handleModeChange = useCallback((mode: StyleMode) => {
    setStyleMode(mode);
    persist({ styleMode: mode });
  }, [persist]);

  return (
    <div className={`style-glass-node ${selected ? 'selected' : ''}`} title={NODE_TOOLTIPS.charStyle}>
      {/* Header */}
      <div className="style-glass-header" style={{ cursor: 'pointer' }} onClick={() => setCollapsed((c) => !c)}>
        <span className="style-glass-title">Style</span>
        <span className="style-glass-count">{images.length} img{images.length !== 1 ? 's' : ''}</span>
        <span onClick={(e) => e.stopPropagation()} style={{ marginLeft: 'auto' }}>
          <TextModelSelector value={textModel} onChange={(m) => { setTextModel(m); persist({ textModel: m }); }} disabled={processing} />
        </span>
        <span style={{ fontSize: 10, opacity: 0.7, marginLeft: 4 }}>
          {collapsed ? '\u25BC' : '\u25B2'}
        </span>
      </div>

      {/* Name field */}
      <div className="style-glass-name-row">
        <input
          className="style-glass-name-input nodrag"
          value={styleName}
          onChange={(e) => setStyleName(e.target.value)}
          placeholder="Style name..."
        />
      </div>

      {/* Floating preview popup */}
      {expandedIdx !== null && images[expandedIdx] && (
        <div className="style-popup-overlay nodrag" onClick={(e) => e.stopPropagation()}>
          <div className="style-popup-window">
            <button
              type="button"
              className="style-popup-close nodrag"
              onClick={() => setExpandedIdx(null)}
            >
              &times;
            </button>
            <img
              src={`data:${images[expandedIdx].mimeType};base64,${images[expandedIdx].base64}`}
              alt="Preview"
              draggable={false}
            />
            <div className="style-popup-label">Image {expandedIdx + 1} of {images.length}</div>
          </div>
        </div>
      )}

      {!collapsed && (
        <div className="style-glass-body">
          {/* Image grid */}
          <div className="style-glass-grid-area nodrag nowheel">
            {images.length === 0 && (
              <div className="style-glass-empty">
                No images yet — use the buttons below to add
              </div>
            )}
            {images.map((img, idx) => (
              <div
                key={idx}
                className="style-glass-thumb"
                onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
              >
                <img
                  src={`data:${img.mimeType};base64,${img.base64}`}
                  alt={`Ref ${idx + 1}`}
                  draggable={false}
                />
                <button
                  type="button"
                  className="style-glass-remove nodrag"
                  onClick={(e) => { e.stopPropagation(); removeImage(idx); }}
                  title="Remove"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="style-glass-footer">
            <div className="style-glass-actions">
              <button type="button" className="style-glass-btn nodrag" onClick={handleOpenFiles}>
                Open Image
              </button>
              <button type="button" className="style-glass-btn nodrag" onClick={handlePaste}>
                Paste Image
              </button>
            </div>

            {/* Mode selector */}
            <div className="style-glass-mode-row nodrag" style={{ display: 'flex', gap: 2, marginTop: 4 }}>
              {(['images', 'text', 'both'] as StyleMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`style-glass-mode-btn nodrag${styleMode === m ? ' active' : ''}`}
                  onClick={() => handleModeChange(m)}
                  title={
                    m === 'images' ? 'Use only reference images for style'
                    : m === 'text' ? 'Use only the text prompt for style'
                    : 'Use both images and text prompt for style'
                  }
                >
                  {m === 'images' ? 'Images Only' : m === 'text' ? 'Text Only' : 'Images + Text'}
                </button>
              ))}
            </div>

            {/* Style description text — always visible */}
            <textarea
              className="style-glass-textarea nodrag nowheel"
              value={styleText}
              onChange={(e) => {
                setStyleText(e.target.value);
                persist({ styleText: e.target.value });
              }}
              placeholder="Style description — type your own, or use the buttons below to generate from images..."
              rows={4}
              style={{ minHeight: 60, resize: 'vertical', marginTop: 4 }}
            />

            {/* Enhance / Process buttons */}
            <button
              type="button"
              className="style-glass-btn style-glass-btn-process nodrag"
              onClick={handleEnhanceDescription}
              disabled={!styleText.trim() || processing}
              title="Enhance your style description with AI — rewrites it to be more specific and technical"
              style={{ width: '100%', marginTop: 4 }}
            >
              {processing ? 'Enhancing…' : 'Enhance Style Description'}
            </button>
            <button
              type="button"
              className="style-glass-btn style-glass-btn-process nodrag"
              onClick={handleProcessStyle}
              disabled={images.length === 0 || processing}
              title="Analyze style images with AI and generate a text description — replaces current text"
              style={{ width: '100%', marginTop: 2 }}
            >
              {processing ? 'Processing…' : 'Process Images to Text'}
            </button>
            {processError && <div className="char-error" style={{ fontSize: 10, margin: '4px 0' }}>{processError}</div>}

            <div className="style-glass-actions" style={{ marginTop: 4 }}>
              <button type="button" className="style-glass-btn nodrag" onClick={handleSave}>
                Save
              </button>
              <button type="button" className="style-glass-btn nodrag" onClick={() => { setShowSaveAs(true); setSaveAsName(styleName.trim() || ''); }}>
                Save As
              </button>
              <button type="button" className="style-glass-btn nodrag" onClick={handleToggleLoad}>
                {showLoadMenu ? 'Hide' : 'Load'}
              </button>
            </div>

            {/* Save As inline dialog */}
            {showSaveAs && (
              <div className="style-glass-saveas nodrag" onClick={(e) => e.stopPropagation()}>
                <input
                  className="style-glass-saveas-input nodrag"
                  value={saveAsName}
                  onChange={(e) => setSaveAsName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveAs(); if (e.key === 'Escape') setShowSaveAs(false); }}
                  placeholder="Style name..."
                  autoFocus
                />
                <button type="button" className="style-glass-btn nodrag" onClick={handleSaveAs}>
                  Save
                </button>
                <button type="button" className="style-glass-btn nodrag" onClick={() => setShowSaveAs(false)}>
                  Cancel
                </button>
              </div>
            )}

            {/* Load dropdown — only saved styles */}
            {showLoadMenu && (
              <div className="style-glass-preset-list nodrag nowheel">
                {loadingStyles ? (
                  <div className="style-glass-empty" style={{ padding: 6 }}>Loading...</div>
                ) : savedStyles.length === 0 ? (
                  <div className="style-glass-empty" style={{ padding: 6 }}>No saved styles</div>
                ) : (
                  savedStyles.map((s) => (
                    <div key={s.id} className="style-glass-preset-row">
                      <button
                        type="button"
                        className="style-glass-preset-btn nodrag"
                        onClick={() => handleLoadStyle(s)}
                      >
                        <strong>{s.name}</strong>
                        <span>{s.images?.length ?? 0} imgs{s.styleText ? ` \u2022 ${s.styleText.slice(0, 25)}...` : ''}</span>
                      </button>
                      <button
                        type="button"
                        className="style-glass-preset-del nodrag"
                        onClick={() => handleDeleteSavedStyle(s.id)}
                      >
                        &times;
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>
      )}

      <Handle type="target" position={Position.Left} id="input" className="char-handle" style={{ top: '50%' }} />
      <Handle type="source" position={Position.Right} id="output" className="char-handle" style={{ top: '50%' }} />
    </div>
  );
}

export default memo(StyleNodeInner);
