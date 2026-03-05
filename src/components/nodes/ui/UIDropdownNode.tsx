"use client";
import { memo, useCallback } from 'react';
import { Handle, Position, NodeResizer, useReactFlow } from '@xyflow/react';
import './UINodes.css';

interface Props { id: string; data: Record<string, unknown>; selected?: boolean }

function UIDropdownNode({ id, data, selected }: Props) {
  const { setNodes } = useReactFlow();
  const label = (data.label as string) || 'Select';
  const options = (data.options as string[]) || ['Option 1', 'Option 2', 'Option 3'];

  const onResize = useCallback((_: unknown, p: { width: number; height: number }) => {
    setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, width: Math.round(p.width), height: Math.round(p.height) }, style: { ...n.style, width: p.width, height: p.height } } : n));
  }, [id, setNodes]);

  return (
    <>
      <NodeResizer minWidth={80} minHeight={28} isVisible={!!selected} onResize={onResize} lineClassName="ui-resize-line" handleClassName="ui-resize-handle" />
      <select className={`ui-node-dropdown nodrag${selected ? ' ui-node-selected' : ''}`} defaultValue="">
        <option value="" disabled>{label}</option>
        {options.map((o, i) => <option key={i} value={o}>{o}</option>)}
      </select>
      <Handle type="target" position={Position.Left} className="cl-handle" />
      <Handle type="source" position={Position.Right} className="cl-handle" />
    </>
  );
}

export default memo(UIDropdownNode);
