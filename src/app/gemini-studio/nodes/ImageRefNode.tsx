"use client";

import { memo, useState, useCallback, useRef } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';

interface ImageRefNodeProps {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

function ImageRefNodeInner({ id, selected }: ImageRefNodeProps) {
  const { setNodes } = useReactFlow();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState('image/png');

  const loadImage = useCallback(
    (base64: string, mime: string) => {
      setPreview(base64);
      setMimeType(mime);
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id
            ? { ...n, data: { ...n.data, imageBase64: base64, mimeType: mime } }
            : n,
        ),
      );
    },
    [id, setNodes],
  );

  const handleFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const parts = dataUrl.split(',');
        const mime = parts[0].match(/:(.*?);/)?.[1] ?? 'image/png';
        loadImage(parts[1], mime);
      };
      reader.readAsDataURL(file);
    },
    [loadImage],
  );

  const handlePaste = useCallback(async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imgType = item.types.find((t) => t.startsWith('image/'));
        if (imgType) {
          const blob = await item.getType(imgType);
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = reader.result as string;
            const parts = dataUrl.split(',');
            loadImage(parts[1], imgType);
          };
          reader.readAsDataURL(blob);
          return;
        }
      }
    } catch {
      /* clipboard read not supported */
    }
  }, [loadImage]);

  const handleReset = useCallback(() => {
    setPreview(null);
    setNodes((nds) =>
      nds.map((n) =>
        n.id === id
          ? { ...n, data: { ...n.data, imageBase64: undefined, mimeType: undefined } }
          : n,
      ),
    );
  }, [id, setNodes]);

  return (
    <div className={`gs-ref-node ${selected ? 'selected' : ''}`}>
      <div className="gs-node-header">
        <span className="gs-node-title">Image Reference</span>
      </div>
      <div className="gs-node-tldr">Reference image for guided generation</div>
      <div className="gs-node-body">
        {preview ? (
          <div className="gs-ref-preview-wrap">
            <img
              src={`data:${mimeType};base64,${preview}`}
              alt="Reference"
              className="gs-ref-preview"
            />
            <button className="gs-ref-clear nodrag" onClick={handleReset}>
              &times;
            </button>
          </div>
        ) : (
          <div className="gs-ref-empty">
            <div className="gs-ref-actions nodrag">
              <button
                className="gs-ref-btn"
                onClick={() => fileRef.current?.click()}
              >
                Open
              </button>
              <button className="gs-ref-btn" onClick={handlePaste}>
                Paste
              </button>
            </div>
            <div className="gs-ref-hint">or drag &amp; drop an image</div>
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
      </div>
      <Handle
        type="source"
        position={Position.Right}
        id="ref-out"
        style={{ background: '#4dd0e1' }}
      />
    </div>
  );
}

export default memo(ImageRefNodeInner);
