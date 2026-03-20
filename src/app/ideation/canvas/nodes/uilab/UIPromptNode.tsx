"use client";

import { memo, useCallback, useMemo, useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { parsePromptRefs } from '@/lib/ideation/engine/conceptlab/uiPrompts';
import '../character/CharacterNodes.css';
import './UILabNodes.css';

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

function UIPromptNodeInner({ id, data, selected }: Props) {
  const { setNodes } = useReactFlow();
  const [collapsed, setCollapsed] = useState(false);
  const [promptText, setPromptText] = useState((data?.promptText as string) ?? '');

  const persist = useCallback(
    (updates: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...updates } } : n)),
      );
    },
    [id, setNodes],
  );

  const detectedRefs = useMemo(() => parsePromptRefs(promptText), [promptText]);

  return (
    <div className={`char-node ${selected ? 'selected' : ''}`}>
      <div
        className="char-node-header"
        style={{ background: '#7b1fa2', cursor: 'pointer' }}
        onClick={() => setCollapsed((c) => !c)}
      >
        <span>UI Prompt</span>
        {detectedRefs.size > 0 && (
          <span style={{ marginLeft: 6, fontSize: 9, background: 'rgba(255,255,255,0.15)', padding: '1px 5px', borderRadius: 8 }}>
            {detectedRefs.size} ref{detectedRefs.size !== 1 ? 's' : ''}
          </span>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 10, opacity: 0.7 }}>
          {collapsed ? '\u25BC' : '\u25B2'}
        </span>
      </div>

      {collapsed && (
        <div className="char-node-body" style={{ padding: '4px 10px' }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            {promptText.trim().slice(0, 60) || 'No prompt'}
            {promptText.length > 60 ? '...' : ''}
          </span>
        </div>
      )}

      {!collapsed && (
        <div className="char-node-body" style={{ gap: 6 }}>
          <textarea
            className="char-textarea nodrag nopan nowheel"
            value={promptText}
            onChange={(e) => {
              setPromptText(e.target.value);
              persist({ promptText: e.target.value });
            }}
            placeholder="Describe the UI asset you want...&#10;&#10;Use refA, refB, refC to reference connected images."
            rows={6}
            style={{ fontSize: 11, minHeight: 80, resize: 'vertical' }}
          />

          {detectedRefs.size > 0 && (
            <div className="uilab-ref-tokens">
              {[...detectedRefs].sort().map((r) => (
                <span key={r} className="uilab-ref-token">{r}</span>
              ))}
            </div>
          )}

          <div style={{ fontSize: 9, color: '#666', lineHeight: 1.3 }}>
            Tokens: <code>refA</code>, <code>refB</code>, <code>refC</code> map to connected image nodes
          </div>
        </div>
      )}

      <Handle type="target" position={Position.Left} id="input" className="char-handle" style={{ top: '50%' }} />
      <Handle type="source" position={Position.Right} id="prompt-out" className="char-handle" style={{ top: '50%' }} />
    </div>
  );
}

export default memo(UIPromptNodeInner);
