"use client";

import { memo, useState, useCallback } from 'react';
import { Handle, Position } from '@xyflow/react';
import './VideoInfluenceNode.css';

interface VideoInfluenceNodeProps {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

function VideoInfluenceNodeInner({ id, data, selected }: VideoInfluenceNodeProps) {
  const [fileName, setFileName] = useState((data.fileName as string) ?? '');
  const [videoBase64, setVideoBase64] = useState((data.videoBase64 as string) ?? '');
  const [mimeType, setMimeType] = useState((data.mimeType as string) ?? '');

  const handleOpen = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const parts = dataUrl.split(',');
        const mime = parts[0].match(/:(.*?);/)?.[1] ?? 'video/mp4';
        const base64 = parts[1];
        setFileName(file.name);
        setVideoBase64(base64);
        setMimeType(mime);
        if ((window as unknown as Record<string, unknown>).__updateNodeData) {
          ((window as unknown as Record<string, unknown>).__updateNodeData as (id: string, d: Record<string, unknown>) => void)(id, {
            fileName: file.name,
            videoBase64: base64,
            mimeType: mime,
          });
        }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }, [id]);

  return (
    <div
      className={`video-influence-node ${selected ? 'selected' : ''}`}
      title="Upload a video file (.mp4, .webm, .mov) as an influence on the pipeline."
    >
      <div className="video-influence-header">
        <span className="video-influence-label">Video</span>
      </div>
      <div className="video-influence-body">
        <button className="video-influence-open nodrag" onClick={handleOpen}>
          {fileName || 'Upload Video...'}
        </button>
      </div>
      <Handle type="target" position={Position.Left} className="base-handle target-handle" style={{ background: '#ce93d8' }} />
      <Handle type="source" position={Position.Right} className="base-handle source-handle" style={{ background: '#ce93d8' }} />
    </div>
  );
}

export default memo(VideoInfluenceNodeInner);
