"use client";

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import type { GeneratedImage } from '@/lib/ideation/engine/conceptlab/imageGenApi';
import './UtilityNodes.css';

const ACCEPTED_FORMATS = '.png,.jpg,.jpeg,.webp,.gif,.bmp,.tiff,.svg';

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

function BulkImageInputNodeInner({ id, data, selected }: Props) {
  const { setNodes } = useReactFlow();
  const fileRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<GeneratedImage[]>(
    (data._bulkImages as GeneratedImage[]) ?? [],
  );
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    const ext = (data._bulkImages as GeneratedImage[]) ?? [];
    if (ext.length !== images.length) setImages(ext);
  }, [data._bulkImages]); // eslint-disable-line react-hooks/exhaustive-deps

  const persist = useCallback(
    (imgs: GeneratedImage[]) => {
      queueMicrotask(() => {
        setNodes((nds) =>
          nds.map((n) =>
            n.id === id ? { ...n, data: { ...n.data, _bulkImages: imgs } } : n,
          ),
        );
      });
    },
    [id, setNodes],
  );

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const pending: GeneratedImage[] = [];
      let loaded = 0;
      const total = Array.from(files).length;
      if (total === 0) return;
      Array.from(files).forEach((file) => {
        if (!file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          if (base64) pending.push({ base64, mimeType: file.type || 'image/png' });
          loaded++;
          if (loaded === total) {
            setImages((prev) => {
              const next = [...prev, ...pending];
              persist(next);
              return next;
            });
          }
        };
        reader.readAsDataURL(file);
      });
    },
    [persist],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);
      if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
    },
    [addFiles],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

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
            setImages((prev) => {
              const next = [...prev, { base64: parts[1], mimeType: mime }];
              persist(next);
              return next;
            });
          };
          reader.readAsDataURL(blob);
          return;
        }
      }
    } catch { /* clipboard not available */ }
  }, [persist]);

  const handleBrowse = useCallback(() => { fileRef.current?.click(); }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.length) addFiles(e.target.files);
      e.target.value = '';
    },
    [addFiles],
  );

  const removeImage = useCallback(
    (idx: number) => {
      setImages((prev) => {
        const next = prev.filter((_, i) => i !== idx);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const clearAll = useCallback(() => {
    setImages([]);
    persist([]);
  }, [persist]);

  return (
    <div className={`util-node ${selected ? 'selected' : ''}`}>
      <Handle type="source" position={Position.Right} id="output" />

      <div className="util-node-header" style={{ background: '#26a69a' }}>
        Bulk Image Input
      </div>

      <div className="util-node-body">
        <div
          className={`util-dropzone nodrag nopan ${dragOver ? 'drag-over' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={handleBrowse}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <span style={{ fontSize: 11, fontWeight: 600 }}>
            Drop images here
          </span>
          <span style={{ fontSize: 10, color: '#888' }}>
            or click to browse
          </span>
        </div>

        <div style={{ display: 'flex', gap: 4 }}>
          <button
            type="button"
            className="util-btn nodrag nopan"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); handleBrowse(); }}
            style={{ flex: 1 }}
          >
            Open
          </button>
          <button
            type="button"
            className="util-btn nodrag nopan"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); handlePaste(); }}
            style={{ flex: 1 }}
          >
            Paste
          </button>
        </div>

        {images.length > 0 && (
          <>
            <div className="util-thumb-grid nodrag nopan" onPointerDown={(e) => e.stopPropagation()}>
              {images.map((img, i) => (
                <div key={i} className="util-thumb-item">
                  <img
                    src={`data:${img.mimeType};base64,${img.base64}`}
                    alt={`input-${i}`}
                    draggable={false}
                  />
                  <button
                    className="util-thumb-remove"
                    onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="util-hint">{images.length} image{images.length !== 1 ? 's' : ''} loaded</span>
              <button
                type="button"
                className="util-btn danger nodrag nopan"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); clearAll(); }}
                style={{ fontSize: 10, padding: '3px 8px' }}
              >
                Clear All
              </button>
            </div>
          </>
        )}

        <input
          ref={fileRef}
          type="file"
          accept={ACCEPTED_FORMATS}
          multiple
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
}

const BulkImageInputNode = memo(BulkImageInputNodeInner);
export default BulkImageInputNode;
