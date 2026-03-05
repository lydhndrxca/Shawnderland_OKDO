"use client";

import { useCallback } from 'react';
import type { NodeProps } from '@xyflow/react';
import { Handle, Position } from '@xyflow/react';
import BaseNode from './BaseNode';
import type { NodeStatus } from './BaseNode';
import { useSession } from '@/lib/ideation/context/SessionContext';
import { getStageOutput, isStageStale } from '@/lib/ideation/state/sessionSelectors';
import type { DivergeOutput } from '@/lib/ideation/engine/schemas';

const SUB_HANDLES = [
  { id: 'practical', label: 'Practical', color: '#69f0ae' },
  { id: 'inversion', label: 'Inversion', color: '#ff8a65' },
  { id: 'constraint', label: 'Constraint', color: '#ce93d8' },
] as const;

export default function DivergeNode({ data, selected }: NodeProps) {
  const nodeSubName = ((data as Record<string, unknown>).subName as string) ?? '';
  const { session, runStage, runningStageId } = useSession();
  const output = getStageOutput(session, 'diverge') as DivergeOutput | null;
  const stale = isStageStale(session, 'diverge');

  const status: NodeStatus = runningStageId === 'diverge' ? 'running' : output ? (stale ? 'stale' : 'complete') : 'empty';

  const handleRun = useCallback(async () => {
    try { await runStage('diverge'); } catch { /* StatusBar */ }
  }, [runStage]);

  const lensCount = (lens: string) => output?.candidates.filter(c => c.lens === lens).length ?? 0;

  return (
    <BaseNode stageId="diverge" status={status} selected={selected} onRun={handleRun} hideSourceHandle subName={nodeSubName}>
      {output ? (
        <>
          <div className="base-node-stat">
            <span className="base-node-stat-label">Candidates</span>
            <span className="base-node-stat-value">{output.candidates.length}</span>
          </div>
          <div className="base-node-stat">
            <span className="base-node-stat-label">Practical</span>
            <span className="base-node-stat-value">{lensCount('practical')}</span>
          </div>
          <div className="base-node-stat">
            <span className="base-node-stat-label">Inversion</span>
            <span className="base-node-stat-value">{lensCount('inversion')}</span>
          </div>
          <div className="base-node-stat">
            <span className="base-node-stat-label">Constraint</span>
            <span className="base-node-stat-value">{lensCount('constraint_art')}</span>
          </div>
        </>
      ) : (
        <div className="base-node-summary">Awaiting normalization...</div>
      )}

      <div className="multi-handle-group">
        {SUB_HANDLES.map((h) => (
          <div key={h.id} className="multi-handle-row" title={`${h.label} lens candidates`}>
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
