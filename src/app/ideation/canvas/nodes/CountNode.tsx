"use client";

import { memo, useCallback, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import './CountNode.css';

interface CountNodeProps {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

function CountNodeInner({ data, selected }: CountNodeProps) {
  const initial = typeof data?.count === 'number' ? data.count : 1;
  const max = typeof data?.max === 'number' ? data.max : 4;
  const [count, setCount] = useState(initial);

  const handleChange = useCallback((val: number) => {
    const clamped = Math.max(1, Math.min(max, val));
    setCount(clamped);
    if (data?.onCountChange) (data.onCountChange as (n: number) => void)(clamped);
  }, [max, data]);

  return (
    <div className={`count-node ${selected ? 'selected' : ''}`} title="Set how many results to generate">
      <div className="count-node-header">
        <span className="count-node-label">Count</span>
      </div>
      <div className="count-node-body">
        <button
          className="count-btn nodrag"
          onClick={(e) => { e.stopPropagation(); handleChange(count - 1); }}
          disabled={count <= 1}
        >
          -
        </button>
        <input
          className="count-input nodrag nowheel"
          type="number"
          min={1}
          max={max}
          value={count}
          onChange={(e) => handleChange(parseInt(e.target.value) || 1)}
        />
        <button
          className="count-btn nodrag"
          onClick={(e) => { e.stopPropagation(); handleChange(count + 1); }}
          disabled={count >= max}
        >
          +
        </button>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        id="count"
        className="count-handle"
        style={{ background: '#78909c' }}
      />
    </div>
  );
}

export default memo(CountNodeInner);
