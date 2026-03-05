'use client';

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { TEGenericData } from '../types';
import './EditorNodes.css';

interface Props {
  id: string;
  data: TEGenericData;
  selected?: boolean;
}

function GenericNode({ data, selected }: Props) {
  return (
    <div
      className={`te-node te-generic${selected ? ' te-selected' : ''}`}
      style={{ width: data.width, height: data.height, borderColor: data.color }}
    >
      <div className="te-node-header" style={{ background: data.color }}>
        <span className="te-node-label">{data.label}</span>
      </div>

      <div className="te-node-body">
        {data.description && (
          <p className="te-node-desc">{data.description}</p>
        )}

        {data.dropdowns.length > 0 && (
          <div className="te-dropdowns">
            {data.dropdowns.map((dd) => (
              <div key={dd.id} className="te-dropdown">
                <span className="te-dropdown-label">{dd.label}</span>
                <select className="te-dropdown-select" disabled>
                  {dd.options.map((o, i) => (
                    <option key={i}>{o}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
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

export default memo(GenericNode);
