"use client";
import { memo, useCallback } from 'react';
import { Handle, Position, NodeResizer, useReactFlow } from '@xyflow/react';
import './UINodes.css';

interface Props { id: string; data: Record<string, unknown>; selected?: boolean }

function UIGenericNode({ id, data, selected }: Props) {
  const { setNodes } = useReactFlow();
  const label = (data.label as string) || 'Node';
  const color = (data.color as string) || '#607d8b';

  const onResize = useCallback((_: unknown, p: { width: number; height: number }) => {
    setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, width: Math.round(p.width), height: Math.round(p.height) }, style: { ...n.style, width: p.width, height: p.height } } : n));
  }, [id, setNodes]);

  return (
    <>
      <NodeResizer minWidth={100} minHeight={50} isVisible={!!selected} onResize={onResize} lineClassName="ui-resize-line" handleClassName="ui-resize-handle" />
      <div className={`ui-node-generic${selected ? ' ui-node-selected' : ''}`}>
        <div className="ui-node-generic-header" style={{ background: color }}>{label}</div>
        <div className="ui-node-generic-body">{(data.description as string) || 'Custom node'}</div>
      </div>
      <Handle type="target" position={Position.Left} className="cl-handle" />
      <Handle type="source" position={Position.Right} className="cl-handle" />
    </>
  );
}

export default memo(UIGenericNode);
