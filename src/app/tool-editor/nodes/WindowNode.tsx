'use client';

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { TEWindowData } from '../types';
import './EditorNodes.css';

interface Props {
  id: string;
  data: TEWindowData;
  selected?: boolean;
}

function WindowNode({ data, selected }: Props) {
  return (
    <div
      className={`te-node te-window${selected ? ' te-selected' : ''}`}
      style={{ width: data.width, height: data.height, borderColor: data.color }}
    >
      <div className="te-node-header te-window-header" style={{ background: data.color }}>
        <span className="te-node-label">{data.label}</span>
        <div className="te-window-controls">
          <span className="te-wc" />
          <span className="te-wc" />
          <span className="te-wc" />
        </div>
      </div>

      <div className="te-window-viewport">
        {data.description ? (
          <p className="te-node-desc">{data.description}</p>
        ) : (
          <span className="te-window-placeholder">Viewport</span>
        )}
      </div>

      {data.inputs.map((p, i) => (
        <Handle
          key={p.id}
          id={p.id}
          type="target"
          position={p.side === 'top' ? Position.Top : p.side === 'bottom' ? Position.Bottom : p.side === 'right' ? Position.Right : Position.Left}
          style={{ top: `${30 + ((i + 1) * ((data.height - 30) / (data.inputs.length + 1)))}px` }}
          title={p.label}
        />
      ))}
      {data.outputs.map((p, i) => (
        <Handle
          key={p.id}
          id={p.id}
          type="source"
          position={p.side === 'top' ? Position.Top : p.side === 'bottom' ? Position.Bottom : p.side === 'left' ? Position.Left : Position.Right}
          style={{ top: `${30 + ((i + 1) * ((data.height - 30) / (data.outputs.length + 1)))}px` }}
          title={p.label}
        />
      ))}
    </div>
  );
}

export default memo(WindowNode);
