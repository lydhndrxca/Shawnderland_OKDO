"use client";

import { memo, useCallback, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Play } from 'lucide-react';
import { useSession } from '@/lib/ideation/context/SessionContext';
import type { ThinkingTier } from '@/lib/ideation/state/sessionTypes';
import './StartNode.css';

interface StartNodeProps {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

const TIER_LABELS: Record<ThinkingTier, { label: string; title: string }> = {
  quick: { label: 'Quick', title: 'Fast results with lighter AI processing' },
  standard: { label: 'Standard', title: 'Balanced speed and quality (default)' },
  deep: { label: 'Deep', title: 'Maximum creativity and depth — takes longer' },
};

function StartNodeInner({ selected }: StartNodeProps) {
  const {
    session, updateSettings, runFullPipeline, runInteractivePipeline,
    isRunning, pipelineProgress, pipelineMode, setPipelineMode,
  } = useSession();
  const currentTier = (session.settings?.thinkingTier ?? 'standard') as ThinkingTier;
  const [selectedMode, setSelectedMode] = useState<'interactive' | 'automated'>('interactive');

  const handleTierChange = useCallback((tier: ThinkingTier) => {
    updateSettings({ thinkingTier: tier });
  }, [updateSettings]);

  const handleSelectMode = useCallback((mode: 'interactive' | 'automated') => {
    setSelectedMode(mode);
    if (pipelineMode) setPipelineMode(null);
  }, [pipelineMode, setPipelineMode]);

  const handleRun = useCallback(() => {
    if (isRunning) return;

    const spawnChain = (window as unknown as Record<string, unknown>).__spawnFullChain as (() => void) | undefined;
    if (spawnChain) spawnChain();

    if (selectedMode === 'automated') {
      setPipelineMode('automated');
      runFullPipeline();
    } else {
      setPipelineMode('interactive');
      if (runInteractivePipeline) {
        runInteractivePipeline();
      } else {
        runFullPipeline();
      }
    }
  }, [isRunning, selectedMode, setPipelineMode, runFullPipeline, runInteractivePipeline]);

  return (
    <div
      className={`start-node ${selected ? 'selected' : ''} ${isRunning ? 'running' : ''}`}
      title="Select a mode, then press the play button to run."
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

        <div className="start-node-tier nodrag nowheel">
          <span className="tier-label">Thinking</span>
          <div className="tier-selector">
            {(['quick', 'standard', 'deep'] as ThinkingTier[]).map((tier) => (
              <button
                key={tier}
                className={`tier-btn ${currentTier === tier ? 'active' : ''}`}
                onClick={() => handleTierChange(tier)}
                title={TIER_LABELS[tier].title}
                disabled={isRunning}
              >
                {TIER_LABELS[tier].label}
              </button>
            ))}
          </div>
        </div>

        <div className="start-node-actions">
          <button
            className={`start-btn start-btn-mode ${selectedMode === 'interactive' ? 'active' : ''}`}
            onClick={() => handleSelectMode('interactive')}
            disabled={isRunning}
            title="Step-by-step: pauses after each stage for your review."
          >
            Interactive
          </button>
          <button
            className={`start-btn start-btn-mode ${selectedMode === 'automated' ? 'active' : ''}`}
            onClick={() => handleSelectMode('automated')}
            disabled={isRunning}
            title="Runs the pipeline automatically, pausing only when user input is needed."
          >
            Automated
          </button>
        </div>
        <button
          className="start-btn start-btn-play"
          onClick={handleRun}
          disabled={isRunning || !session.seedText.trim()}
          title={`Run pipeline in ${selectedMode} mode`}
        >
          <Play size={14} fill="currentColor" />
        </button>
      </div>

      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="base-handle target-handle"
        style={{ background: '#42a5f5' }}
      />
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
