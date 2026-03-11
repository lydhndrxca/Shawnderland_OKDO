"use client";
import { memo, useCallback, useState, useRef, useEffect } from 'react';
import { NodeResizer, useReactFlow } from '@xyflow/react';
import './UINodes.css';

interface Props { id: string; data: Record<string, unknown>; selected?: boolean }

function UIFrameNode({ id, data, selected }: Props) {
  const { setNodes } = useReactFlow();
  const label = (data.label as string) || '';
  const color = (data.color as string) || '#78909c';
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setText(label); }, [label]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  const onResize = useCallback((_: unknown, p: { width: number; height: number }) => {
    setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, width: Math.round(p.width), height: Math.round(p.height) }, style: { ...n.style, width: p.width, height: p.height } } : n));
  }, [id, setNodes]);

  const commit = useCallback(() => {
    setEditing(false);
    setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, label: text } } : n));
  }, [id, text, setNodes]);

  return (
    <>
      <NodeResizer minWidth={100} minHeight={60} isVisible={!!selected} onResize={onResize} lineClassName="ui-resize-line" handleClassName="ui-resize-handle" />
      <div className={`ui-node-frame${selected ? ' ui-node-selected' : ''}`} style={{ borderColor: color }}>
        {editing ? (
          <input
            ref={inputRef}
            className="ui-node-frame-name-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => { if (e.key === 'Enter') commit(); }}
            style={{ color }}
          />
        ) : (
          <span
            className="ui-node-frame-label"
            style={{ color, cursor: 'text' }}
            onDoubleClick={() => setEditing(true)}
          >
            {text || 'Double-click to name'}
          </span>
        )}
      </div>
    </>
  );
}

export default memo(UIFrameNode);
