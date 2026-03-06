"use client";

import { useCallback } from 'react';
import type { NodeProps } from '@xyflow/react';
import { useReactFlow } from '@xyflow/react';
import BaseNode from './BaseNode';
import type { NodeStatus } from './BaseNode';
import { useSession } from '@/lib/ideation/context/SessionContext';
import { getStageOutput, isStageStale } from '@/lib/ideation/state/sessionSelectors';
import type { ExpandOutput } from '@/lib/ideation/engine/schemas';

export default function ExpandNode({ data, selected, id: nodeId }: NodeProps) {
  const nodeSubName = ((data as Record<string, unknown>).subName as string) ?? '';
  const nodeData = data as Record<string, unknown>;
  const expandCount = typeof nodeData.expandCount === 'number' ? nodeData.expandCount : 5;
  const { setNodes } = useReactFlow();
  const { session, runStage, runningStageId } = useSession();

  const updateCount = useCallback((field: string, value: number) => {
    setNodes((nds) => nds.map((n) => n.id === nodeId ? { ...n, data: { ...n.data, [field]: value } } : n));
  }, [nodeId, setNodes]);
  const output = getStageOutput(session, 'expand') as ExpandOutput | null;
  const stale = isStageStale(session, 'expand');

  const status: NodeStatus = runningStageId === 'expand' ? 'running' : output ? (stale ? 'stale' : 'complete') : 'empty';

  const handleRun = useCallback(async () => {
    try { await runStage('expand'); } catch { /* StatusBar */ }
  }, [runStage]);

  return (
    <BaseNode stageId="expand" status={status} selected={selected} onRun={handleRun} subName={nodeSubName}>
      {output ? (
        <>
          <div className="base-node-stat">
            <span className="base-node-stat-label">Expansions</span>
            <span className="base-node-stat-value">{output.expansions.length}</span>
          </div>
          {output.expansions[0] && (
            <div className="base-node-summary" title={output.expansions[0].concept}>
              {output.expansions[0].concept.slice(0, 70)}...
            </div>
          )}
        </>
      ) : (
        <div className="base-node-summary">Ready — click Run to expand ideas</div>
      )}
      <div className="inline-count-controls nodrag">
        <div className="inline-count-row">
          <span className="inline-count-label">Expansions</span>
          <button className="inline-count-btn" onClick={() => updateCount('expandCount', Math.max(1, expandCount - 1))} disabled={expandCount <= 1}>-</button>
          <span className="inline-count-value">{expandCount}</span>
          <button className="inline-count-btn" onClick={() => updateCount('expandCount', Math.min(15, expandCount + 1))} disabled={expandCount >= 15}>+</button>
        </div>
      </div>
    </BaseNode>
  );
}
