"use client";

import { memo, useCallback, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import './ImageReferenceNode.css';

interface ImageReferenceNodeProps {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

function ImageReferenceNodeInner({ data, selected }: ImageReferenceNodeProps) {
  const initialBase64 = (data?.imageBase64 as string) || '';
  const initialMime = (data?.mimeType as string) || '';
  const initialName = (data?.fileName as string) || '';

  const [imageBase64, setImageBase64] = useState(initialBase64);
  const [mimeType, setMimeType] = useState(initialMime);
  const [fileName, setFileName] = useState(initialName);
  const [expanded, setExpanded] = useState(false);

  const handleOpen = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const parts = dataUrl.split(',');
        const mime = parts[0].match(/:(.*?);/)?.[1] ?? 'image/png';
        setImageBase64(parts[1]);
        setMimeType(mime);
        setFileName(file.name);
      };
      reader.readAsDataURL(file);
    };
    input.click();
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
            setImageBase64(parts[1]);
            setMimeType(mime);
            setFileName('pasted-image');
          };
          reader.readAsDataURL(blob);
          return;
        }
      }
    } catch {
      /* clipboard access may fail */
    }
  }, []);

  const hasImage = !!imageBase64;

  return (
    <div
      className={`image-ref-node ${selected ? 'selected' : ''} ${expanded ? 'expanded' : ''}`}
      title="Image reference — feeds visual context to connected nodes. Gemini will see and analyze this image."
    >
      <div className="image-ref-header">
        <span className="image-ref-label">Image</span>
        {fileName && <span className="image-ref-filename">{fileName}</span>}
      </div>

      <div className="image-ref-body">
        {hasImage ? (
          <div className="image-ref-preview-wrap" onClick={() => setExpanded(!expanded)}>
            <img
              src={`data:${mimeType};base64,${imageBase64}`}
              alt={fileName || 'Reference image'}
              className="image-ref-preview"
            />
          </div>
        ) : (
          <div className="image-ref-empty">
            <div className="image-ref-empty-icon">+</div>
            <div className="image-ref-empty-text">No image loaded</div>
          </div>
        )}

        <div className="image-ref-actions">
          <button className="image-ref-btn nodrag" onClick={(e) => { e.stopPropagation(); handleOpen(); }}>
            Open
          </button>
          <button className="image-ref-btn nodrag" onClick={(e) => { e.stopPropagation(); handlePaste(); }}>
            Paste
          </button>
        </div>
      </div>

      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="image-ref-handle"
        style={{ background: '#26a69a' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="image"
        className="image-ref-handle"
        style={{ background: '#26a69a' }}
      />
    </div>
  );
}

export default memo(ImageReferenceNodeInner);
