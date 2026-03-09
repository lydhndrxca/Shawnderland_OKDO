"use client";

import { memo, useCallback, useRef, useState, useEffect } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import type { GeneratedImage } from '@/lib/ideation/engine/conceptlab/imageGenApi';
import { NODE_TOOLTIPS } from './nodeTooltips';
import './CharacterNodes.css';

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

export interface StylePreset {
  name: string;
  styleText: string;
  images: GeneratedImage[];
  savedAt: string;
}

const STYLE_STORAGE_KEY = 'shawnderland-style-presets';

function loadStylePresets(): StylePreset[] {
  try {
    return JSON.parse(localStorage.getItem(STYLE_STORAGE_KEY) || '[]');
  } catch { return []; }
}

function saveStylePresetsToStorage(presets: StylePreset[]) {
  localStorage.setItem(STYLE_STORAGE_KEY, JSON.stringify(presets));
}

function StyleNodeInner({ id, data, selected }: Props) {
  const { setNodes } = useReactFlow();
  const [styleName, setStyleName] = useState((data?.styleLabel as string) ?? '');
  const [styleText, setStyleText] = useState((data?.styleText as string) ?? '');
  const [images, setImages] = useState<GeneratedImage[]>(
    (data?.styleImages as GeneratedImage[]) ?? [],
  );
  const [collapsed, setCollapsed] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [showPresets, setShowPresets] = useState(false);
  const [presets, setPresets] = useState<StylePreset[]>(() => loadStylePresets());
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
            setImages((prev) => {
              const merged = [...prev, ...pending];
              persist({ styleImages: merged });
              return merged;
            });
          }
        };
        reader.readAsDataURL(file);
      }
      e.target.value = '';
    },
    [persist],
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
            setImages((prev) => {
              const merged = [...prev, img];
              persist({ styleImages: merged });
              return merged;
            });
          };
          reader.readAsDataURL(blob);
          return;
        }
      }
    } catch {
      /* clipboard not available */
    }
  }, [persist]);

  const removeImage = useCallback(
    (idx: number) => {
      setImages((prev) => {
        const next = prev.filter((_, i) => i !== idx);
        persist({ styleImages: next });
        return next;
      });
      if (expandedIdx === idx) setExpandedIdx(null);
    },
    [persist, expandedIdx],
  );

  const handleSavePreset = useCallback(() => {
    const name = styleName.trim() || 'Untitled Style';
    const preset: StylePreset = {
      name,
      styleText,
      images,
      savedAt: new Date().toISOString(),
    };
    setPresets((prev) => {
      const next = [...prev.filter((p) => p.name !== name), preset];
      saveStylePresetsToStorage(next);
      return next;
    });
  }, [styleName, styleText, images]);

  const handleLoadPreset = useCallback(
    (p: StylePreset) => {
      setStyleText(p.styleText);
      setStyleName(p.name);
      setImages(p.images ?? []);
      persist({ styleText: p.styleText, styleLabel: p.name, styleImages: p.images ?? [] });
      setShowPresets(false);
    },
    [persist],
  );

  const handleDeletePreset = useCallback((name: string) => {
    setPresets((prev) => {
      const next = prev.filter((p) => p.name !== name);
      saveStylePresetsToStorage(next);
      return next;
    });
  }, []);

  const initialNameRef = useRef(styleName);
  useEffect(() => {
    if (styleName === initialNameRef.current) return;
    persist({ styleLabel: styleName });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [styleName]);

  return (
    <div className={`style-glass-node ${selected ? 'selected' : ''}`} title={NODE_TOOLTIPS.charStyle}>
      {/* Header — always visible, click to collapse/expand */}
      <div className="style-glass-header" style={{ cursor: 'pointer' }} onClick={() => setCollapsed((c) => !c)}>
        <span className="style-glass-title">Style</span>
        <span className="style-glass-count">{images.length} img{images.length !== 1 ? 's' : ''}</span>
        <span style={{ marginLeft: 'auto', fontSize: 10, opacity: 0.7 }}>
          {collapsed ? '\u25BC' : '\u25B2'}
        </span>
      </div>

      {/* Name field — always visible */}
      <div className="style-glass-name-row">
        <input
          className="style-glass-name-input nodrag"
          value={styleName}
          onChange={(e) => setStyleName(e.target.value)}
          placeholder="Style name..."
        />
      </div>

      {/* Floating preview popup — beside the node */}
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
          {/* Image grid — the main visual area, takes priority */}
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

          {/* Bottom section — buttons, text, presets */}
          <div className="style-glass-footer">
            <div className="style-glass-actions">
              <button type="button" className="style-glass-btn nodrag" onClick={handleOpenFiles}>
                + Open
              </button>
              <button type="button" className="style-glass-btn nodrag" onClick={handlePaste}>
                Paste
              </button>
              <button type="button" className="style-glass-btn nodrag" onClick={handleSavePreset}>
                Save
              </button>
              <button type="button" className="style-glass-btn nodrag" onClick={() => setShowPresets(!showPresets)}>
                {showPresets ? 'Hide' : 'Load'}
              </button>
            </div>

            <textarea
              className="style-glass-textarea nodrag nowheel"
              value={styleText}
              onChange={(e) => {
                setStyleText(e.target.value);
                persist({ styleText: e.target.value });
              }}
              placeholder="Describe style... (optional)"
              rows={1}
            />

            {showPresets && (
              <div className="style-glass-preset-list nodrag nowheel">
                {presets.length === 0 ? (
                  <div className="style-glass-empty" style={{ padding: 6 }}>No saved styles</div>
                ) : (
                  presets.map((p) => (
                    <div key={p.name} className="style-glass-preset-row">
                      <button
                        type="button"
                        className="style-glass-preset-btn nodrag"
                        onClick={() => handleLoadPreset(p)}
                      >
                        <strong>{p.name}</strong>
                        <span>{p.images?.length ?? 0} imgs{p.styleText ? ` • ${p.styleText.slice(0, 25)}...` : ''}</span>
                      </button>
                      <button
                        type="button"
                        className="style-glass-preset-del nodrag"
                        onClick={() => handleDeletePreset(p.name)}
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
