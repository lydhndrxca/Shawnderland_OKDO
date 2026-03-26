"use client";

import { memo, useEffect, useRef, useCallback } from 'react';
import { Handle, Position } from '@xyflow/react';
import { useSession } from '@/lib/ideation/context/SessionContext';
import './AgentThinkingNode.css';

export interface ThoughtEntry {
  stageId: string;
  stageLabel: string;
  personaName: string;
  personaAvatar: string;
  mood: string;
  thought: string;
  timestamp: number;
}

interface AgentThinkingNodeProps {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

function AgentThinkingNodeInner({ id, selected }: AgentThinkingNodeProps) {
  const { session } = useSession();
  const scrollRef = useRef<HTMLDivElement>(null);

  const nodeData = session.flowState?.nodeData?.[id] as Record<string, unknown> | undefined;
  const thoughts = (nodeData?.thoughts as ThoughtEntry[] | undefined) ?? [];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [thoughts.length]);

  const handleClear = useCallback(() => {
    if ((window as unknown as Record<string, unknown>).__updateNodeData) {
      ((window as unknown as Record<string, unknown>).__updateNodeData as (nid: string, d: Record<string, unknown>) => void)(
        id,
        { thoughts: [] },
      );
    }
  }, [id]);

  return (
    <div className={`agent-thinking-node ${selected ? 'selected' : ''}`}>
      <Handle
        type="target"
        position={Position.Left}
        className="base-handle target-handle"
        style={{ background: '#f59e0b' }}
      />

      <div className="agent-thinking-header">
        <span className="agent-thinking-header-icon">🧠</span>
        <span className="agent-thinking-header-label">Agent Thinking</span>
        {thoughts.length > 0 && (
          <span className="agent-thinking-header-count">
            {thoughts.length} thought{thoughts.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="agent-thinking-body nodrag nowheel" ref={scrollRef}>
        {thoughts.length === 0 ? (
          <div className="agent-thinking-empty">
            Assign a persona and run a stage to see their thought process here.
          </div>
        ) : (
          thoughts.map((t, i) => (
            <div key={i} className="agent-thinking-entry">
              <div className="agent-thinking-entry-header">
                <span className="agent-thinking-stage-badge">{t.stageLabel || t.stageId}</span>
                <span className="agent-thinking-persona-name">
                  {t.personaAvatar} {t.personaName}
                </span>
                {t.mood && (
                  <span className="agent-thinking-mood-tag">{t.mood}</span>
                )}
                <span className="agent-thinking-timestamp">
                  {new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="agent-thinking-text">{t.thought}</div>
            </div>
          ))
        )}
      </div>

      {thoughts.length > 0 && (
        <button className="agent-thinking-clear-btn nodrag" onClick={handleClear}>
          Clear thoughts
        </button>
      )}

      <Handle
        type="source"
        position={Position.Right}
        className="base-handle source-handle"
        style={{ background: '#f59e0b' }}
      />
    </div>
  );
}

export default memo(AgentThinkingNodeInner);
