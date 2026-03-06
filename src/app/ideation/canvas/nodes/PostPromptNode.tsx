"use client";

import { memo, useState, useCallback } from 'react';
import { Handle, Position } from '@xyflow/react';
import './PostPromptNode.css';

interface PostPromptNodeProps {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

function PostPromptNodeInner({ id, data, selected }: PostPromptNodeProps) {
  const persisted = (data.nodeText as string) ?? '';
  const [text, setText] = useState(persisted);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    if ((window as unknown as Record<string, unknown>).__updateNodeData) {
      ((window as unknown as Record<string, unknown>).__updateNodeData as (id: string, d: Record<string, unknown>) => void)(id, { nodeText: e.target.value });
    }
  }, [id]);

  return (
    <div
      className={`postprompt-node ${selected ? 'selected' : ''}`}
      title="PostPrompt — this text is appended AFTER all incoming data. Use it to tell the AI what to do with everything it just read."
    >
      <div className="postprompt-header">
        <span className="postprompt-header-icon">&#x25C0;</span>
        <span>PostPrompt</span>
      </div>
      <div className="postprompt-body">
        <span className="postprompt-hint">
          Read LAST — tells the AI what to do with the data
        </span>
        <textarea
          className="postprompt-input nodrag nowheel"
          value={text}
          onChange={handleChange}
          placeholder='e.g. "Summarize everything above into a single image prompt..."'
          spellCheck={false}
          rows={4}
        />
      </div>
      <Handle type="target" position={Position.Left} className="base-handle target-handle" style={{ background: '#ffa726' }} />
      <Handle type="source" position={Position.Right} className="base-handle source-handle" style={{ background: '#ffa726' }} />
    </div>
  );
}

export default memo(PostPromptNodeInner);
