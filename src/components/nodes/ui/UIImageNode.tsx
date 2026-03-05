"use client";
import { memo, useCallback } from 'react';
import { Handle, Position, NodeResizer, useReactFlow } from '@xyflow/react';
import './UINodes.css';

interface Props { id: string; data: Record<string, unknown>; selected?: boolean }

function UIImageNode({ id, data, selected }: Props) {
  const { setNodes } = useReactFlow();
  const label = (data.label as string) || 'Image';

  const onResize = useCallback((_: unknown, p: { width: number; height: number }) => {
    setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, width: Math.round(p.width), height: Math.round(p.height) }, style: { ...n.style, width: p.width, height: p.height } } : n));
  }, [id, setNodes]);

  return (
    <>
      <NodeResizer minWidth={80} minHeight={60} isVisible={!!selected} onResize={onResize} lineClassName="ui-resize-line" handleClassName="ui-resize-handle" />
      <div className={`ui-node-image${selected ? ' ui-node-selected' : ''}`}>{label}</div>
      <Handle type="target" position={Position.Left} className="cl-handle" />
      <Handle type="source" position={Position.Right} className="cl-handle" />
    </>
  );
}

export default memo(UIImageNode);
