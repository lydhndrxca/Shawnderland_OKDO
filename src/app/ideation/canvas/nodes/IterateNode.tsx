"use client";

import { useCallback } from 'react';
import type { NodeProps } from '@xyflow/react';
import BaseNode from './BaseNode';
import type { NodeStatus } from './BaseNode';
import { useSession } from '@/lib/ideation/context/SessionContext';
import { getStageOutput, isStageStale } from '@/lib/ideation/state/sessionSelectors';
import type { IterateOutput } from '@/lib/ideation/engine/schemas';

export default function IterateNode({ data, selected }: NodeProps) {
  const nodeSubName = ((data as Record<string, unknown>).subName as string) ?? '';
  const { session, runStage, runningStageId } = useSession();
  const output = getStageOutput(session, 'iterate') as IterateOutput | null;
  const stale = isStageStale(session, 'iterate');

  const status: NodeStatus = runningStageId === 'iterate' ? 'running' : output ? (stale ? 'stale' : 'complete') : 'empty';

  const handleRun = useCallback(async () => {
    try { await runStage('iterate'); } catch (e) { console.error('[IterateNode] runStage error:', e); }
  }, [runStage]);

  const suggestions = output?.nextPromptSuggestions
    ? output.nextPromptSuggestions.split('\n').filter(Boolean)
    : [];

  return (
    <BaseNode stageId="iterate" status={status} selected={selected} onRun={handleRun} subName={nodeSubName}>
      {output ? (
        <>
          {suggestions.slice(0, 2).map((s, i) => (
            <div key={i} className="base-node-summary" title={s}>
              {s.slice(0, 60)}{s.length > 60 ? '...' : ''}
            </div>
          ))}
          {suggestions.length > 2 && (
            <div className="base-node-detail">+{suggestions.length - 2} more</div>
          )}
        </>
      ) : (
        <div className="base-node-summary">Awaiting commit...</div>
      )}
    </BaseNode>
  );
}
