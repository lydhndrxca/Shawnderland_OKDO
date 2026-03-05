'use client';

import { memo, useCallback } from 'react';
import { NodeResizer } from '@xyflow/react';
import { ImageIcon } from 'lucide-react';
import { updateNodeDataDirect } from '../useToolEditorStore';
import type { TEImageData } from '../types';
import './EditorNodes.css';

interface Props {
  id: string;
  data: TEImageData;
  selected?: boolean;
}

function ImageNode({ id, data, selected }: Props) {
  const onResize = useCallback(
    (_: unknown, params: { width: number; height: number }) => {
      updateNodeDataDirect(id, { width: params.width, height: params.height });
    },
    [id],
  );

  return (
    <>
      <NodeResizer
        minWidth={80}
        minHeight={60}
        isVisible={!!selected}
        onResize={onResize}
        lineClassName="te-resize-line"
        handleClassName="te-resize-handle"
      />
      <div
        className={`te-image-node${selected ? ' te-selected' : ''}`}
        style={{ width: '100%', height: '100%', borderColor: data.color }}
      >
        <div className="te-image-label" style={{ color: data.color }}>
          {data.label}
        </div>
        <div className="te-image-placeholder">
          <ImageIcon size={32} strokeWidth={1.2} />
          {data.alt && <span className="te-image-alt">{data.alt}</span>}
        </div>
      </div>
    </>
  );
}

export default memo(ImageNode);
