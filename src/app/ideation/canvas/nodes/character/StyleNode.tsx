"use client";

import { memo, useCallback, useRef, useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import type { GeneratedImage } from '@/lib/ideation/engine/conceptlab/imageGenApi';
import './CharacterNodes.css';

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

function StyleNodeInner({ id, data, selected }: Props) {
  const { setNodes } = useReactFlow();
  const [label, setLabel] = useState((data?.styleLabel as string) ?? 'Style');
  const [editing, setEditing] = useState(false);
  const [styleText, setStyleText] = useState((data?.styleText as string) ?? '');
  const [images, setImages] = useState<GeneratedImage[]>(
    (data?.styleImages as GeneratedImage[]) ?? [],
  );
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const persist = useCallback(
    (updates: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...updates } } : n)),
      );
    },
    [id, setNodes],
  );

  const commitLabel = useCallback(
    (val: string) => {
      const trimmed = val.trim() || 'Style';
      setLabel(trimmed);
      setEditing(false);
      persist({ styleLabel: trimmed });
    },
    [persist],
  );

  const handleAddFiles = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;
      const newImages: GeneratedImage[] = [];
      let loaded = 0;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1];
          newImages.push({ base64, mimeType: file.type || 'image/png' });
          loaded++;
          if (loaded === files.length) {
            setImages((prev) => {
              const merged = [...prev, ...newImages];
              persist({ styleImages: merged });
              return merged;
            });
          }
        };
        reader.readAsDataURL(file);
      }
      if (fileRef.current) fileRef.current.value = '';
    },
    [persist],
  );

  const handlePaste = useCallback(
    async () => {
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
        // clipboard access may fail
      }
    },
    [persist],
  );

  const removeImage = useCallback(
    (idx: number) => {
      setImages((prev) => {
        const next = prev.filter((_, i) => i !== idx);
        persist({ styleImages: next });
        return next;
      });
      setExpandedIdx(null);
    },
    [persist],
  );

  return (
    <div className={`char-node ${selected ? 'selected' : ''}`}>
      <div className="char-node-header" style={{ background: '#7b1fa2' }}>
        {editing ? (
          <input
            className="gate-label-input nodrag"
            autoFocus
            defaultValue={label}
            onBlur={(e) => commitLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitLabel((e.target as HTMLInputElement).value);
              if (e.key === 'Escape') setEditing(false);
            }}
          />
        ) : (
          <span onDoubleClick={() => setEditing(true)} title="Double-click to rename">
            {label}
          </span>
        )}
      </div>
      <div className="char-node-body">
        <span className="char-field-label wide">Style Prompt (overrides default style)</span>
        <textarea
          className="char-textarea nodrag nowheel"
          value={styleText}
          onChange={(e) => {
            setStyleText(e.target.value);
            persist({ styleText: e.target.value });
          }}
          placeholder="Describe the visual style... Leave empty to use default style."
          rows={3}
        />

        <span className="char-field-label wide">Reference Images</span>
        <div className="char-style-thumbnails nodrag nowheel">
          {images.map((img, idx) => (
            <div
              key={idx}
              className={`char-style-thumb ${expandedIdx === idx ? 'expanded' : ''}`}
              onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
            >
              <img
                src={`data:${img.mimeType};base64,${img.base64}`}
                alt={`Style ref ${idx + 1}`}
              />
              <button
                className="char-style-thumb-remove nodrag"
                onClick={(e) => { e.stopPropagation(); removeImage(idx); }}
                title="Remove"
              >
                &times;
              </button>
            </div>
          ))}
        </div>

        <div className="char-btn-row">
          <button className="char-btn nodrag" onClick={() => fileRef.current?.click()}>Open Images</button>
          <button className="char-btn nodrag" onClick={handlePaste}>Paste</button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={handleAddFiles}
        />
      </div>

      <Handle type="target" position={Position.Left} id="input" className="char-handle" style={{ top: '50%' }} />
      <Handle type="source" position={Position.Right} id="output" className="char-handle" style={{ top: '50%' }} />
    </div>
  );
}

export default memo(StyleNodeInner);
