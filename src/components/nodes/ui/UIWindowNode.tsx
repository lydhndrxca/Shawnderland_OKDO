"use client";
import { memo, useCallback } from 'react';
import { Handle, Position, NodeResizer, useReactFlow } from '@xyflow/react';
import './UINodes.css';

interface Props { id: string; data: Record<string, unknown>; selected?: boolean }

function UIWindowNode({ id, data, selected }: Props) {
  const { setNodes } = useReactFlow();
  const label = (data.label as string) || 'Viewer';
  const color = (data.color as string) || '#26a69a';

  const onResize = useCallback((_: unknown, p: { width: number; height: number }) => {
    setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, width: Math.round(p.width), height: Math.round(p.height) }, style: { ...n.style, width: p.width, height: p.height } } : n));
  }, [id, setNodes]);

  return (
    <>
      <NodeResizer minWidth={120} minHeight={80} isVisible={!!selected} onResize={onResize} lineClassName="ui-resize-line" handleClassName="ui-resize-handle" />
      <div className={`ui-node-window${selected ? ' ui-node-selected' : ''}`}>
        <div className="ui-node-window-bar" style={{ borderColor: color }}>{label}</div>
        <div className="ui-node-window-body">Window content area</div>
      </div>
      <Handle type="target" position={Position.Left} id="source-in" className="cl-handle" style={{ top: '30%' }} />
      <Handle type="source" position={Position.Right} className="cl-handle" />
    </>
  );
}

export default memo(UIWindowNode);
