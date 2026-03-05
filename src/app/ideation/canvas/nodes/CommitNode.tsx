"use client";

import { useCallback } from 'react';
import type { NodeProps } from '@xyflow/react';
import BaseNode from './BaseNode';
import type { NodeStatus } from './BaseNode';
import { useSession } from '@/lib/ideation/context/SessionContext';
import { getStageOutput, isStageStale } from '@/lib/ideation/state/sessionSelectors';
import type { CommitOutput } from '@/lib/ideation/engine/schemas';

export default function CommitNode({ data, selected }: NodeProps) {
  const nodeSubName = ((data as Record<string, unknown>).subName as string) ?? '';
  const { session, runStage, runningStageId } = useSession();
  const output = getStageOutput(session, 'commit') as CommitOutput | null;
  const stale = isStageStale(session, 'commit');

  const status: NodeStatus = runningStageId === 'commit' ? 'running' : output ? (stale ? 'stale' : 'complete') : 'empty';

  const handleRun = useCallback(async () => {
    try { await runStage('commit'); } catch { /* StatusBar */ }
  }, [runStage]);

  return (
    <BaseNode stageId="commit" status={status} selected={selected} onRun={handleRun} subName={nodeSubName}>
      {output ? (
        <>
          <div className="base-node-summary" title={output.title}>
            {output.title}
          </div>
          <div className="base-node-stat">
            <span className="base-node-stat-label">Type</span>
            <span className="base-node-stat-value">{output.artifactType}</span>
          </div>
          <div className="base-node-summary" title={output.differentiator}>
            {output.differentiator.slice(0, 60)}...
          </div>
        </>
      ) : (
        <div className="base-node-summary">Ready — click Run to create artifact</div>
      )}
    </BaseNode>
  );
}
