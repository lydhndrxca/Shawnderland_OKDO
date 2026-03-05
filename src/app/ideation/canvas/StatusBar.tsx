"use client";

import { useMemo, useCallback } from 'react';
import { useSession } from '@/lib/ideation/context/SessionContext';
import { getStageOutput, isStageStale } from '@/lib/ideation/state/sessionSelectors';
import { STAGE_ORDER, NODE_META } from './nodes/nodeRegistry';
import type { StageId } from '@/lib/ideation/engine/stages';
import './StatusBar.css';

interface StatusBarProps {
  projectName: string;
  onEditName: () => void;
}

const STEP_DESCRIPTIONS: Record<string, string> = {
  empty: 'Enter your idea above to begin.',
  seed_complete: 'Seed captured. Ready to normalize your idea.',
  normalize_complete: 'Idea structured. Ready to generate candidates.',
  diverge_complete: 'Candidates generated. Ready for critique.',
  'critique-salvage_complete': 'Critiques done. Ready to expand shortlisted ideas.',
  expand_complete: 'Expansions complete. Ready to score and rank.',
  converge_complete: 'Winner selected. Ready to create your artifact.',
  commit_complete: 'Artifact created. Plan next steps or export.',
  iterate_complete: 'Next steps ready. Start a new cycle or branch off.',
};

export default function StatusBar({ projectName, onEditName }: StatusBarProps) {
  const { session, isRunning, runFullPipeline, pipelineProgress, hasApiKey } = useSession();

  const settings = session.settings;
  const providerMode = settings?.providerMode ?? 'real';
  const isGemini = providerMode === 'real' && hasApiKey;

  const statusMessage = useMemo(() => {
    if (pipelineProgress) return pipelineProgress;
    if (isRunning) {
      const runningStage = STAGE_ORDER.find((s) => {
        const state = session.stageState[s];
        return state && !state.output;
      });
      if (runningStage) {
        return NODE_META[runningStage].loadingMessage;
      }
      return 'Processing...';
    }

    let lastComplete: StageId | null = null;
    for (const stageId of STAGE_ORDER) {
      if (getStageOutput(session, stageId)) {
        lastComplete = stageId;
      }
    }

    if (!lastComplete) return STEP_DESCRIPTIONS.empty;

    const stale = isStageStale(session, lastComplete);
    if (stale) return `${NODE_META[lastComplete].label} output is stale. Re-run to update.`;

    return STEP_DESCRIPTIONS[`${lastComplete}_complete`] ?? 'Ready.';
  }, [session, isRunning, pipelineProgress]);

  const handleRunFull = useCallback(async () => {
    try { await runFullPipeline(); } catch { /* handled in context */ }
  }, [runFullPipeline]);

  const hasSeed = session.seedText?.trim().length > 0;

  return (
    <div className="status-bar">
      <div className="status-bar-left">
        <button className="status-bar-name" onClick={onEditName} title="Click to rename project">
          {projectName || 'Untitled Project'}
        </button>

        <div className="status-bar-divider" />

        <span
          className={`status-bar-provider ${isGemini ? 'provider-gemini' : 'provider-mock'}`}
          title={isGemini
            ? 'Connected to Gemini API'
            : providerMode === 'real'
              ? 'Gemini selected but no API key found. Set GEMINI_API_KEY env variable.'
              : 'Using mock data. Switch to Gemini in Settings.'}
        >
          {isGemini ? 'Gemini' : 'Mock'}
        </span>
      </div>

      <div className="status-bar-center">
        <span className={`status-bar-message ${isRunning ? 'pulsing' : ''}`}>
          {statusMessage}
        </span>
      </div>

      <div className="status-bar-right">
        <button
          className="status-bar-run-btn"
          onClick={handleRunFull}
          disabled={isRunning || !hasSeed}
          title={!hasSeed ? 'Enter a seed idea first' : isRunning ? 'Pipeline is running...' : 'Run the full ideation pipeline from start to finish'}
        >
          {isRunning ? 'Running...' : 'Run Full Pipeline'}
        </button>
      </div>
    </div>
  );
}
