"use client";

import { memo, useState, useCallback } from 'react';
import { Handle, Position, useReactFlow, useHandleConnections } from '@xyflow/react';
import { ImageContextMenu } from '@/components/ImageContextMenu';

interface OutputViewerNodeProps {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

interface MediaData {
  base64: string;
  mimeType: string;
}

function OutputViewerNodeInner({ id, selected }: OutputViewerNodeProps) {
  const { getNode } = useReactFlow();
  const imgConns = useHandleConnections({ type: 'target', id: 'media-in' });

  const [expanded, setExpanded] = useState(false);

  const getMedia = useCallback((): { type: 'image' | 'video'; data: MediaData } | null => {
    for (const conn of imgConns) {
      const src = getNode(conn.source);
      if (!src) continue;
      const d = src.data as Record<string, unknown>;

      const videoSrc = d?.videoSrc as string | undefined;
      if (videoSrc) {
        const match = videoSrc.match(/^data:(.*?);base64,(.*)$/);
        if (match) return { type: 'video', data: { mimeType: match[1], base64: match[2] } };
      }

      const genImg = d?.generatedImage as MediaData | undefined;
      if (genImg) return { type: 'image', data: genImg };

      const b64 = d?.imageBase64 as string | undefined;
      if (b64) return { type: 'image', data: { base64: b64, mimeType: (d?.mimeType as string) ?? 'image/png' } };
    }
    return null;
  }, [imgConns, getNode]);

  const media = getMedia();
  void id;

  return (
    <div className={`gs-output-node ${selected ? 'selected' : ''} ${expanded ? 'expanded' : ''}`}>
      <div className="gs-node-header gs-output-header">
        <span className="gs-node-title">Output Viewer</span>
        {media && (
          <button
            className="gs-expand-btn nodrag"
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            title={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? '⊖' : '⊕'}
          </button>
        )}
      </div>
      <div className="gs-node-tldr">View, zoom, and export generated media</div>
      <div className="gs-node-body">
        {media ? (
          media.type === 'image' ? (
            <ImageContextMenu image={media.data} alt="output">
              <img
                src={`data:${media.data.mimeType};base64,${media.data.base64}`}
                alt="Output"
                className="gs-output-preview"
              />
            </ImageContextMenu>
          ) : (
            <video
              src={`data:${media.data.mimeType};base64,${media.data.base64}`}
              className="gs-output-preview"
              controls
              autoPlay
              loop
              muted
            />
          )
        ) : (
          <div className="gs-output-empty">Connect an Image Gen or Video Gen node</div>
        )}
      </div>

      <Handle type="target" position={Position.Left} id="media-in" style={{ background: '#e0e0e0' }} />
    </div>
  );
}

export default memo(OutputViewerNodeInner);
