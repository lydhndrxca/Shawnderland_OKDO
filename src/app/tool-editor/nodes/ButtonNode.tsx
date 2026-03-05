'use client';

import { memo, useCallback } from 'react';
import { NodeResizer } from '@xyflow/react';
import type { TEButtonData } from '../types';
import { updateNodeDataDirect } from '../useToolEditorStore';
import './EditorNodes.css';

interface Props {
  id: string;
  data: TEButtonData;
  selected?: boolean;
}

function ButtonNode({ id, data, selected }: Props) {
  const onResize = useCallback(
    (_: unknown, params: { width: number; height: number }) => {
      updateNodeDataDirect(id, { width: Math.round(params.width), height: Math.round(params.height) });
    },
    [id],
  );

  return (
    <>
      <NodeResizer
        minWidth={60}
        minHeight={24}
        isVisible={!!selected}
        onResize={onResize}
        lineClassName="te-resize-line"
        handleClassName="te-resize-handle"
      />
      <div
        className={`te-button-node${selected ? ' te-selected' : ''}`}
        style={{ width: '100%', height: '100%', background: data.color, borderColor: data.color }}
      >
        <span className="te-button-label">{data.label}</span>
      </div>
    </>
  );
}

export default memo(ButtonNode);
