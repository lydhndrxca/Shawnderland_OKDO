"use client";

import { useCallback } from 'react';
import type { NodeProps } from '@xyflow/react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
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

export default function DivergeNode({ data, selected, id: nodeId }: NodeProps) {
  const nodeSubName = ((data as Record<string, unknown>).subName as string) ?? '';
  const nodeData = data as Record<string, unknown>;
  const practicalCount = typeof nodeData.practicalCount === 'number' ? nodeData.practicalCount : 6;
  const inversionCount = typeof nodeData.inversionCount === 'number' ? nodeData.inversionCount : 6;
  const constraintCount = typeof nodeData.constraintCount === 'number' ? nodeData.constraintCount : 6;
  const { setNodes } = useReactFlow();
  const { session, runStage, runningStageId } = useSession();
  const output = getStageOutput(session, 'diverge') as DivergeOutput | null;
  const stale = isStageStale(session, 'diverge');

  const status: NodeStatus = runningStageId === 'diverge' ? 'running' : output ? (stale ? 'stale' : 'complete') : 'empty';

  const handleRun = useCallback(async () => {
    try { await runStage('diverge'); } catch { /* StatusBar */ }
  }, [runStage]);

  const updateCount = useCallback((field: string, value: number) => {
    setNodes((nds) => nds.map((n) => n.id === nodeId ? { ...n, data: { ...n.data, [field]: value } } : n));
  }, [nodeId, setNodes]);

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

      <div className="inline-count-controls nodrag">
        <div className="inline-count-row">
          <span className="inline-count-label">Practical</span>
          <button className="inline-count-btn" onClick={() => updateCount('practicalCount', Math.max(1, practicalCount - 1))} disabled={practicalCount <= 1}>-</button>
          <span className="inline-count-value">{practicalCount}</span>
          <button className="inline-count-btn" onClick={() => updateCount('practicalCount', Math.min(20, practicalCount + 1))} disabled={practicalCount >= 20}>+</button>
        </div>
        <div className="inline-count-row">
          <span className="inline-count-label">Inversion</span>
          <button className="inline-count-btn" onClick={() => updateCount('inversionCount', Math.max(1, inversionCount - 1))} disabled={inversionCount <= 1}>-</button>
          <span className="inline-count-value">{inversionCount}</span>
          <button className="inline-count-btn" onClick={() => updateCount('inversionCount', Math.min(20, inversionCount + 1))} disabled={inversionCount >= 20}>+</button>
        </div>
        <div className="inline-count-row">
          <span className="inline-count-label">Constraint</span>
          <button className="inline-count-btn" onClick={() => updateCount('constraintCount', Math.max(1, constraintCount - 1))} disabled={constraintCount <= 1}>-</button>
          <span className="inline-count-value">{constraintCount}</span>
          <button className="inline-count-btn" onClick={() => updateCount('constraintCount', Math.min(20, constraintCount + 1))} disabled={constraintCount >= 20}>+</button>
        </div>
      </div>

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
