"use client";

import { useState } from 'react';
import { useSession, type GuidedRunState } from '@/lib/ideation/context/SessionContext';
import { NODE_META } from './nodes/nodeRegistry';
import type { StageId } from '@/lib/ideation/engine/stages';
import { getStageOutput } from '@/lib/ideation/state/sessionSelectors';
import './GuidedRunOverlay.css';

function getStageName(stageId: StageId): string {
  return NODE_META[stageId]?.label ?? stageId;
}

function summarizeOutput(output: unknown): string {
  if (!output || typeof output !== 'object') return 'No output data.';
  const obj = output as Record<string, unknown>;

  if (obj.seedSummary) return obj.seedSummary as string;
  if (obj.candidates && Array.isArray(obj.candidates)) {
    return `${obj.candidates.length} candidate ideas generated.`;
  }
  if (obj.critiques && Array.isArray(obj.critiques)) {
    return `${obj.critiques.length} critiques completed.`;
  }
  if (obj.expansions && Array.isArray(obj.expansions)) {
    return `${obj.expansions.length} ideas expanded in detail.`;
  }
  if (obj.scorecard && Array.isArray(obj.scorecard)) {
    return `${obj.scorecard.length} ideas scored and ranked.`;
  }
  if (obj.title) return `Artifact created: "${obj.title}"`;
  if (obj.nextPromptSuggestions) return 'Next steps generated.';

  return 'Stage completed successfully.';
}

interface GuidedRunOverlayProps {
  guidedState: GuidedRunState;
}

export default function GuidedRunOverlay({ guidedState }: GuidedRunOverlayProps) {
  const { session, continueGuidedRun, stopGuidedRun, addGuidedNote, isRunning } = useSession();
  const [localNotes, setLocalNotes] = useState('');

  if (!guidedState.active || !guidedState.paused) return null;

  const lastCompletedStage = guidedState.completedStages[guidedState.completedStages.length - 1];
  const nextStage = guidedState.stages[guidedState.currentStageIndex];
  const lastOutput = lastCompletedStage ? getStageOutput(session, lastCompletedStage) : null;
  const isLastStage = guidedState.currentStageIndex >= guidedState.stages.length;

  const handleContinue = () => {
    if (localNotes.trim()) {
      addGuidedNote(localNotes.trim());
      setLocalNotes('');
    }
    continueGuidedRun();
  };

  return (
    <div className="guided-overlay">
      <div className="guided-panel">
        <div className="guided-header">
          <span className="guided-title">Interactive Mode</span>
          <button className="guided-stop" onClick={stopGuidedRun}>Stop</button>
        </div>

        <div className="guided-progress">
          {guidedState.stages.map((stageId, i) => {
            const isDone = guidedState.completedStages.includes(stageId);
            const isCurrent = i === guidedState.currentStageIndex;
            return (
              <div
                key={stageId}
                className={`guided-step ${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''}`}
              >
                <span
                  className="guided-step-dot"
                  style={{ background: isDone ? (NODE_META[stageId]?.color ?? '#6c63ff') : undefined }}
                />
                <span className="guided-step-label">{getStageName(stageId)}</span>
              </div>
            );
          })}
        </div>

        {lastCompletedStage && (
          <div className="guided-result-section">
            <div className="guided-result-label">
              Completed: <strong>{getStageName(lastCompletedStage)}</strong>
            </div>
            <div className="guided-result-summary">
              {summarizeOutput(lastOutput)}
            </div>
          </div>
        )}

        {!isLastStage && nextStage && (
          <div className="guided-next-section">
            <div className="guided-next-label">
              Next up: <strong>{getStageName(nextStage)}</strong>
            </div>
            <div className="guided-next-desc">
              {NODE_META[nextStage]?.tooltip ?? ''}
            </div>
          </div>
        )}

        <div className="guided-notes-section">
          <label className="guided-notes-label">
            Add notes for the next stage (optional):
          </label>
          <textarea
            className="guided-notes-input"
            value={localNotes}
            onChange={(e) => setLocalNotes(e.target.value)}
            placeholder="Any additional context, preferences, or constraints..."
            rows={3}
          />
        </div>

        <div className="guided-actions">
          {isLastStage ? (
            <button className="guided-btn guided-btn-finish" onClick={stopGuidedRun}>
              Finish
            </button>
          ) : (
            <button
              className="guided-btn guided-btn-continue"
              onClick={handleContinue}
              disabled={isRunning}
            >
              Continue to {nextStage ? getStageName(nextStage) : 'Next'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
