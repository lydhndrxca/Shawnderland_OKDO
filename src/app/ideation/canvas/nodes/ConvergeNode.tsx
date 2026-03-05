"use client";

import { useCallback } from 'react';
import type { NodeProps } from '@xyflow/react';
import BaseNode from './BaseNode';
import type { NodeStatus } from './BaseNode';
import { useSession } from '@/lib/ideation/context/SessionContext';
import { getStageOutput, isStageStale } from '@/lib/ideation/state/sessionSelectors';
import type { ConvergeOutput } from '@/lib/ideation/engine/schemas';

export default function ConvergeNode({ data, selected }: NodeProps) {
  const nodeSubName = ((data as Record<string, unknown>).subName as string) ?? '';
  const { session, runStage, runningStageId } = useSession();
  const output = getStageOutput(session, 'converge') as ConvergeOutput | null;
  const stale = isStageStale(session, 'converge');

  const status: NodeStatus = runningStageId === 'converge' ? 'running' : output ? (stale ? 'stale' : 'complete') : 'empty';

  const handleRun = useCallback(async () => {
    try { await runStage('converge'); } catch { /* StatusBar */ }
  }, [runStage]);

  return (
    <BaseNode stageId="converge" status={status} selected={selected} onRun={handleRun} subName={nodeSubName}>
      {output ? (
        <>
          <div className="base-node-stat">
            <span className="base-node-stat-label">Winner</span>
            <span className="base-node-stat-value">{output.winnerId}</span>
          </div>
          <div className="base-node-stat">
            <span className="base-node-stat-label">Cuts to Ship</span>
            <span className="base-node-stat-value">{output.cutsToShip?.length ?? 0}</span>
          </div>
          {output.scorecard[0] && (
            <div className="base-node-summary">
              Top: {output.scorecard[0].novelty + output.scorecard[0].usefulness + output.scorecard[0].feasibility + output.scorecard[0].differentiation + output.scorecard[0].energyGuess}pts
            </div>
          )}
        </>
      ) : (
        <div className="base-node-summary">Ready — click Run to score ideas</div>
      )}
    </BaseNode>
  );
}
