"use client";

import { useCallback } from 'react';
import type { NodeProps } from '@xyflow/react';
import { useReactFlow } from '@xyflow/react';
import BaseNode from './BaseNode';
import type { NodeStatus } from './BaseNode';
import { useSession } from '@/lib/ideation/context/SessionContext';
import { getStageOutput, isStageStale } from '@/lib/ideation/state/sessionSelectors';
import type { CritiqueSalvageOutput } from '@/lib/ideation/engine/schemas';

export default function CritiqueNode({ data, selected, id: nodeId }: NodeProps) {
  const nodeSubName = ((data as Record<string, unknown>).subName as string) ?? '';
  const nodeData = data as Record<string, unknown>;
  const critiqueCount = typeof nodeData.critiqueCount === 'number' ? nodeData.critiqueCount : 0;
  const { setNodes } = useReactFlow();
  const { session, runStage, runningStageId } = useSession();
  const output = getStageOutput(session, 'critique-salvage') as CritiqueSalvageOutput | null;
  const stale = isStageStale(session, 'critique-salvage');

  const status: NodeStatus = runningStageId === 'critique-salvage' ? 'running' : output ? (stale ? 'stale' : 'complete') : 'empty';

  const handleRun = useCallback(async () => {
    try { await runStage('critique-salvage'); } catch (e) { console.error('[CritiqueNode] runStage error:', e); }
  }, [runStage]);

  const updateCount = useCallback((field: string, value: number) => {
    setNodes((nds) => nds.map((n) => n.id === nodeId ? { ...n, data: { ...n.data, [field]: value } } : n));
  }, [nodeId, setNodes]);

  const genericCount = output?.critiques.filter(c => c.genericness >= 7).length ?? 0;

  return (
    <BaseNode stageId="critique-salvage" status={status} selected={selected} onRun={handleRun} subName={nodeSubName}>
      {output ? (
        <>
          <div className="base-node-stat">
            <span className="base-node-stat-label">Critiques</span>
            <span className="base-node-stat-value">{output.critiques.length}</span>
          </div>
          <div className="base-node-stat">
            <span className="base-node-stat-label">Generic (≥7)</span>
            <span className="base-node-stat-value">{genericCount}</span>
          </div>
          <div className="base-node-stat">
            <span className="base-node-stat-label">Mutations</span>
            <span className="base-node-stat-value">{output.mutations.length}</span>
          </div>
        </>
      ) : (
        <div className="base-node-summary">Awaiting candidates...</div>
      )}

      <div className="inline-count-controls nodrag">
        <div className="inline-count-row">
          <span className="inline-count-label">Critiques</span>
          <button className="inline-count-btn" onClick={() => updateCount('critiqueCount', Math.max(0, critiqueCount - 1))} disabled={critiqueCount <= 0}>-</button>
          <span className="inline-count-value">{critiqueCount || 'Auto'}</span>
          <button className="inline-count-btn" onClick={() => updateCount('critiqueCount', Math.min(20, critiqueCount + 1))} disabled={critiqueCount >= 20}>+</button>
        </div>
      </div>

    </BaseNode>
  );
}
