'use client';

import { memo, useCallback } from 'react';
import { NodeResizer } from '@xyflow/react';
import { ChevronDown } from 'lucide-react';
import type { TEDropdownData } from '../types';
import { updateNodeDataDirect } from '../useToolEditorStore';
import './EditorNodes.css';

interface Props {
  id: string;
  data: TEDropdownData;
  selected?: boolean;
}

function DropdownNode({ id, data, selected }: Props) {
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
        className={`te-dropdown-node${selected ? ' te-selected' : ''}`}
        style={{ width: '100%', height: '100%', borderColor: data.color }}
      >
        {data.label && <span className="te-dropdown-node-label" style={{ color: data.color }}>{data.label}</span>}
        <div className="te-dropdown-field">
          <span className="te-dropdown-value">{data.options[0] ?? 'Select...'}</span>
          <ChevronDown size={14} className="te-dropdown-chevron" />
        </div>
      </div>
    </>
  );
}

export default memo(DropdownNode);
