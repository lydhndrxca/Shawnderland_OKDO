"use client";

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { useSession } from '@/lib/ideation/context/SessionContext';
import { STAGE_ORDER, NODE_META } from './nodeRegistry';
import type { StageId } from '@/lib/ideation/engine/stages';
import './PackedPipelineNode.css';

interface PackedPipelineNodeProps {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

function PackedPipelineNodeInner({ selected }: PackedPipelineNodeProps) {
  const { session, isRunning, runningStageId, pipelineProgress } = useSession();

  const stagesAfterSeed = STAGE_ORDER.slice(1);

  return (
    <div className={`packed-pipeline-node ${selected ? 'selected' : ''} ${isRunning ? 'running' : ''}`}>
      <Handle type="target" position={Position.Left} className="base-handle target-handle" />

      <div className="packed-pipeline-header">
        <span className="packed-pipeline-icon">⛓</span>
        <span className="packed-pipeline-label">Full Pipeline</span>
      </div>

      <div className="packed-pipeline-stages">
        {stagesAfterSeed.map((stageId) => {
          const meta = NODE_META[stageId];
          const hasOutput = !!(session.stageState as Record<string, { output: unknown }>)[stageId]?.output;
          const isCurrent = runningStageId === stageId;
          return (
            <div
              key={stageId}
              className={`packed-stage ${hasOutput ? 'complete' : ''} ${isCurrent ? 'current' : ''}`}
            >
              <span className="packed-stage-dot" style={{ background: meta.color }} />
              <span className="packed-stage-name">{meta.label}</span>
              {hasOutput && <span className="packed-stage-check">✓</span>}
              {isCurrent && <span className="packed-stage-spinner" />}
            </div>
          );
        })}
      </div>

      {pipelineProgress && (
        <div className="packed-pipeline-progress">{pipelineProgress}</div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        className="base-handle source-handle"
        style={{ background: '#4db6ac' }}
      />
    </div>
  );
}

export default memo(PackedPipelineNodeInner);
