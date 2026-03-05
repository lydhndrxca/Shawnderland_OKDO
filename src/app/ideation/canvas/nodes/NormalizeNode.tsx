"use client";

import { useCallback } from 'react';
import type { NodeProps } from '@xyflow/react';
import { Handle, Position } from '@xyflow/react';
import BaseNode from './BaseNode';
import type { NodeStatus } from './BaseNode';
import { useSession } from '@/lib/ideation/context/SessionContext';
import { getStageOutput, isStageStale } from '@/lib/ideation/state/sessionSelectors';
import type { NormalizeOutput } from '@/lib/ideation/engine/schemas';

const SUB_HANDLES = [
  { id: 'assumptions', label: 'Assumptions', color: '#64b5f6' },
  { id: 'questions', label: 'Questions', color: '#90caf9' },
] as const;

export default function NormalizeNode({ data, selected }: NodeProps) {
  const nodeSubName = ((data as Record<string, unknown>).subName as string) ?? '';
  const { session, runStage, runningStageId } = useSession();
  const output = getStageOutput(session, 'normalize') as NormalizeOutput | null;
  const stale = isStageStale(session, 'normalize');

  const status: NodeStatus = runningStageId === 'normalize' ? 'running' : output ? (stale ? 'stale' : 'complete') : 'empty';

  const handleRun = useCallback(async () => {
    try { await runStage('normalize'); } catch { /* StatusBar */ }
  }, [runStage]);

  return (
    <BaseNode stageId="normalize" status={status} selected={selected} onRun={handleRun} hideSourceHandle subName={nodeSubName}>
      {output ? (
        <>
          <div className="base-node-summary" title={output.seedSummary}>
            {output.seedSummary.slice(0, 80)}{output.seedSummary.length > 80 ? '...' : ''}
          </div>
          <div className="base-node-stat">
            <span className="base-node-stat-label">Assumptions</span>
            <span className="base-node-stat-value">{output.assumptions.length}</span>
          </div>
          <div className="base-node-stat">
            <span className="base-node-stat-label">Questions</span>
            <span className="base-node-stat-value">{output.clarifyingQuestions.length}</span>
          </div>
        </>
      ) : (
        <div className="base-node-summary">Awaiting seed input...</div>
      )}

      <div className="multi-handle-group">
        {SUB_HANDLES.map((h) => (
          <div key={h.id} className="multi-handle-row" title={`${h.label} output`}>
            <span className="multi-handle-label">{h.label}</span>
            <Handle
              type="source"
              position={Position.Right}
              id={h.id}
              className="base-handle source-handle"
              style={{ background: h.color }}
            />
          </div>
        ))}
      </div>
    </BaseNode>
  );
}
