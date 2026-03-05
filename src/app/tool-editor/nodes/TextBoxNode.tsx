'use client';

import { memo, useCallback } from 'react';
import { NodeResizer } from '@xyflow/react';
import type { TETextBoxData } from '../types';
import { updateNodeDataDirect } from '../useToolEditorStore';
import './EditorNodes.css';

interface Props {
  id: string;
  data: TETextBoxData;
  selected?: boolean;
}

function TextBoxNode({ id, data, selected }: Props) {
  const onResize = useCallback(
    (_: unknown, params: { width: number; height: number }) => {
      updateNodeDataDirect(id, { width: Math.round(params.width), height: Math.round(params.height) });
    },
    [id],
  );

  return (
    <>
      <NodeResizer
        minWidth={80}
        minHeight={28}
        isVisible={!!selected}
        onResize={onResize}
        lineClassName="te-resize-line"
        handleClassName="te-resize-handle"
      />
      <div
        className={`te-textbox-node${selected ? ' te-selected' : ''}`}
        style={{ width: '100%', height: '100%', borderColor: data.color }}
      >
        {data.label && <span className="te-textbox-label" style={{ color: data.color }}>{data.label}</span>}
        <div className="te-textbox-field">
          <span className="te-textbox-placeholder">{data.placeholder || 'Enter text...'}</span>
        </div>
      </div>
    </>
  );
}

export default memo(TextBoxNode);
