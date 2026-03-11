"use client";

import { memo, useState, useCallback, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import './ImageInfluenceNode.css';

interface ImageInfluenceNodeProps {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

function ImageInfluenceNodeInner({ id, data, selected }: ImageInfluenceNodeProps) {
  const [imageBase64, setImageBase64] = useState((data.imageBase64 as string) ?? '');
  const [mimeType, setMimeType] = useState((data.mimeType as string) ?? '');
  const [fileName, setFileName] = useState((data.fileName as string) ?? '');

  // Sync state when node data changes externally (e.g. session restore)
  useEffect(() => {
    const b64 = (data?.imageBase64 as string) || '';
    const mime = (data?.mimeType as string) || '';
    const name = (data?.fileName as string) || '';
    if (b64 !== imageBase64) setImageBase64(b64);
    if (mime !== mimeType) setMimeType(mime);
    if (name !== fileName) setFileName(name);
  }, [data?.imageBase64, data?.mimeType, data?.fileName]); // eslint-disable-line react-hooks/exhaustive-deps

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
        const base64 = parts[1];
        setImageBase64(base64);
        setMimeType(mime);
        setFileName(file.name);
        if ((window as unknown as Record<string, unknown>).__updateNodeData) {
          ((window as unknown as Record<string, unknown>).__updateNodeData as (id: string, d: Record<string, unknown>) => void)(id, {
            imageBase64: base64, mimeType: mime, fileName: file.name,
          });
        }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }, [id]);

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
            if ((window as unknown as Record<string, unknown>).__updateNodeData) {
              ((window as unknown as Record<string, unknown>).__updateNodeData as (id: string, d: Record<string, unknown>) => void)(id, {
                imageBase64: parts[1], mimeType: mime, fileName: 'pasted-image',
              });
            }
          };
          reader.readAsDataURL(blob);
          return;
        }
      }
    } catch { /* clipboard access may fail */ }
  }, [id]);

  const hasImage = imageBase64.length > 0;

  return (
    <div
      className={`img-influence-node ${selected ? 'selected' : ''}`}
      title="Add an image as an influence. The AI will analyze it and incorporate visual elements into the pipeline."
    >
      <div className="img-influence-header">
        <span className="img-influence-label">Image</span>
      </div>
      <div className="img-influence-body">
        {hasImage ? (
          <img className="img-influence-thumb" src={`data:${mimeType};base64,${imageBase64}`} alt={fileName} />
        ) : (
          <div className="img-influence-empty">No image</div>
        )}
        <div className="img-influence-actions">
          <button className="img-influence-btn nodrag" onClick={handleOpen}>Open</button>
          <button className="img-influence-btn nodrag" onClick={handlePaste}>Paste</button>
        </div>
      </div>
      <Handle type="target" position={Position.Left} className="base-handle target-handle" style={{ background: '#4db6ac' }} />
      <Handle type="source" position={Position.Right} className="base-handle source-handle" style={{ background: '#4db6ac' }} />
    </div>
  );
}

export default memo(ImageInfluenceNodeInner);
