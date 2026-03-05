'use client';

import { memo, useCallback } from 'react';
import { NodeResizer } from '@xyflow/react';
import type { TEFrameData } from '../types';
import { updateNodeDataDirect } from '../useToolEditorStore';
import './EditorNodes.css';

interface Props {
  id: string;
  data: TEFrameData;
  selected?: boolean;
}

function FrameNode({ id, data, selected }: Props) {
  const onResize = useCallback(
    (_: unknown, params: { width: number; height: number }) => {
      updateNodeDataDirect(id, { width: Math.round(params.width), height: Math.round(params.height) });
    },
    [id],
  );

  return (
    <>
      <NodeResizer
        minWidth={100}
        minHeight={60}
        isVisible={!!selected}
        onResize={onResize}
        lineClassName="te-resize-line"
        handleClassName="te-resize-handle"
      />
      <div
        className={`te-frame${selected ? ' te-selected' : ''}`}
        style={{
          width: '100%',
          height: '100%',
          borderColor: data.color,
        }}
      >
        <span className="te-frame-label" style={{ color: data.color }}>
          {data.label}
        </span>
        {data.description && (
          <span className="te-frame-desc">{data.description}</span>
        )}
      </div>
    </>
  );
}

export default memo(FrameNode);
