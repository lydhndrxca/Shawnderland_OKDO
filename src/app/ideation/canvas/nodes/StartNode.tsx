"use client";

import { memo, useCallback } from 'react';
import { Handle, Position } from '@xyflow/react';
import { useSession } from '@/lib/ideation/context/SessionContext';
import './StartNode.css';

interface StartNodeProps {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

function StartNodeInner({ selected }: StartNodeProps) {
  const { session, runFullPipeline, runInteractivePipeline, runNextStage, isRunning, pipelineProgress } = useSession();

  const handleHandsFree = useCallback(() => {
    if (isRunning) return;
    runFullPipeline();
  }, [isRunning, runFullPipeline]);

  const handleInteractive = useCallback(() => {
    if (isRunning) return;
    const spawnChain = (window as unknown as Record<string, unknown>).__spawnFullChain as (() => void) | undefined;
    if (spawnChain) spawnChain();
    if (runInteractivePipeline) {
      runInteractivePipeline();
    } else {
      runFullPipeline();
    }
  }, [isRunning, runInteractivePipeline, runFullPipeline]);

  const handleStep = useCallback(() => {
    if (isRunning) return;
    runNextStage();
  }, [isRunning, runNextStage]);

  return (
    <div
      className={`start-node ${selected ? 'selected' : ''} ${isRunning ? 'running' : ''}`}
      title="Run controller — choose Hands-Free to run everything automatically, Interactive to be guided step-by-step, or Step to run one stage at a time."
    >
      <div className="start-node-header">
        <span className="start-node-dot" />
        <span className="start-node-label">Start</span>
      </div>

      <div className="start-node-body">
        {session.projectName && (
          <div className="start-node-project">{session.projectName}</div>
        )}

        {pipelineProgress && (
          <div className="start-node-progress">{pipelineProgress}</div>
        )}

        <div className="start-node-actions">
          <button
            className="start-btn start-btn-auto"
            onClick={handleHandsFree}
            disabled={isRunning || !session.seedText.trim()}
            title="Runs the entire pipeline automatically and gives you all results at the end."
          >
            Hands-Free
          </button>
          <button
            className="start-btn start-btn-interactive"
            onClick={handleInteractive}
            disabled={isRunning || !session.seedText.trim()}
            title="Shows the full pipeline chain and guides you step-by-step, pausing for your input at each stage."
          >
            Interactive
          </button>
        </div>
        <button
          className="start-btn start-btn-step"
          onClick={handleStep}
          disabled={isRunning || !session.seedText.trim()}
          title="Runs only the next stage in the pipeline, then stops so you can manually advance."
        >
          Step
        </button>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="base-handle source-handle"
        style={{ background: '#42a5f5' }}
      />
    </div>
  );
}

export default memo(StartNodeInner);
