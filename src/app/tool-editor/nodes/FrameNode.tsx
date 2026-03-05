'use client';

import { memo } from 'react';
import type { TEFrameData } from '../types';
import './EditorNodes.css';

interface Props {
  id: string;
  data: TEFrameData;
  selected?: boolean;
}

function FrameNode({ data, selected }: Props) {
  return (
    <div
      className={`te-frame${selected ? ' te-selected' : ''}`}
      style={{
        width: data.width,
        height: data.height,
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
  );
}

export default memo(FrameNode);
