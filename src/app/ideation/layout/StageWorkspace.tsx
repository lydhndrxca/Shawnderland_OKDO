"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSession } from '@/lib/ideation/context/SessionContext';
import StageRenderer from '../stages/StageRenderer';
import { getStageOutput, isStageStale } from '@/lib/ideation/state/sessionSelectors';
import { getPreviousStage, getNextStage, STAGE_LABELS } from '@/lib/ideation/engine/stages';
import type { StageId } from '@/lib/ideation/engine/stages';
import './StageWorkspace.css';

const RUN_LABELS: Record<StageId, string> = {
  seed: 'Start Exploring',
  normalize: 'Analyze My Idea',
  diverge: 'Generate Candidates',
  'critique-salvage': 'Evaluate & Improve',
  expand: 'Deep Dive',
  converge: 'Score & Rank',
  commit: 'Create Artifact',
  iterate: 'Plan Next Steps',
};

const RERUN_LABELS: Record<StageId, string> = {
  seed: 'Re-capture Seed',
  normalize: 'Re-analyze',
  diverge: 'Regenerate Candidates',
  'critique-salvage': 'Re-evaluate',
  expand: 'Re-expand',
  converge: 'Re-score',
  commit: 'Regenerate Artifact',
  iterate: 'Refresh Suggestions',
};

const LOADING_MESSAGES: Record<StageId, string> = {
  seed: 'Capturing your idea...',
  normalize: 'Analyzing your idea...',
  diverge: 'Generating candidates across 3 lenses...',
  'critique-salvage': 'Evaluating and salvaging candidates...',
  expand: 'Deep-diving into shortlisted candidates...',
  converge: 'Scoring and ranking candidates...',
  commit: 'Creating your artifact...',
  iterate: 'Planning next steps...',
};

export default function StageWorkspace() {
  const { session, activeStageId, setActiveStageId, runStage, editSeed, isRunning } =
    useSession();

  const output = getStageOutput(session, activeStageId);
  const stale = isStageStale(session, activeStageId);
  const prevStage = getPreviousStage(activeStageId);
  const nextStage = getNextStage(activeStageId);
  const prevOutput = prevStage ? getStageOutput(session, prevStage) : null;

  const isSeed = activeStageId === 'seed';
  const inputs = isSeed
    ? { seedText: session.seedText }
    : prevOutput
      ? { previousStageOutput: prevOutput, seedText: session.seedText }
      : { seedText: session.seedText };

  const [localSeed, setLocalSeed] = useState(session.seedText);
  const [runError, setRunError] = useState<string | null>(null);
  const [justCompleted, setJustCompleted] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const wasRunningRef = useRef(false);

  useEffect(() => {
    setLocalSeed(session.seedText);
  }, [session.seedText]);

  useEffect(() => {
    if (isRunning) {
      setElapsedMs(0);
      const start = Date.now();
      timerRef.current = setInterval(() => {
        setElapsedMs(Date.now() - start);
      }, 100);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = undefined;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning]);

  useEffect(() => {
    if (wasRunningRef.current && !isRunning && !runError) {
      setJustCompleted(true);
      const timeout = setTimeout(() => setJustCompleted(false), 4000);
      return () => clearTimeout(timeout);
    }
    wasRunningRef.current = isRunning;
  }, [isRunning, runError]);

  useEffect(() => {
    setJustCompleted(false);
    setRunError(null);
  }, [activeStageId]);

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  const flushSeed = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = undefined;
    }
    setLocalSeed((cur) => {
      if (cur !== session.seedText) editSeed(cur);
      return cur;
    });
  }, [editSeed, session.seedText]);

  const handleSeedChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setLocalSeed(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      editSeed(value);
    }, 600);
  };

  const handleRun = async () => {
    setRunError(null);
    setJustCompleted(false);
    try {
      if (isSeed && localSeed !== session.seedText) {
        editSeed(localSeed);
      }
      await runStage(activeStageId);
    } catch (err) {
      setRunError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleContinue = () => {
    if (nextStage) setActiveStageId(nextStage);
  };

  const formatElapsed = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const tenths = Math.floor((ms % 1000) / 100);
    return `${s}.${tenths}s`;
  };

  const runLabel = output && !stale ? RERUN_LABELS[activeStageId] : RUN_LABELS[activeStageId];

  return (
    <div className="stage-workspace">
      {/* Left: Inputs */}
      <section className="workspace-panel workspace-inputs">
        <h3 className="panel-heading">Inputs</h3>
        {isSeed ? (
          <textarea
            className="seed-textarea"
            value={localSeed}
            onChange={handleSeedChange}
            onBlur={flushSeed}
            placeholder="Enter your seed idea…"
            spellCheck={false}
          />
        ) : (
          <pre className="inputs-json">{JSON.stringify(inputs, null, 2)}</pre>
        )}
      </section>

      {/* Center: Outputs */}
      <section className="workspace-panel workspace-outputs">
        <h3 className="panel-heading">
          {STAGE_LABELS[activeStageId]} Output
          {stale && <span className="stale-indicator"> Needs update</span>}
        </h3>

        {isRunning ? (
          <div className="loading-state">
            <div className="loading-spinner-stage" />
            <p className="loading-message">{LOADING_MESSAGES[activeStageId]}</p>
            <p className="loading-elapsed">{formatElapsed(elapsedMs)}</p>
          </div>
        ) : (
          <div className={`output-container ${justCompleted ? 'output-enter' : ''}`}>
            <StageRenderer
              stageId={activeStageId}
              output={output}
              stale={stale}
            />
          </div>
        )}
      </section>

      {/* Right: Actions */}
      <section className="workspace-panel workspace-actions">
        <h3 className="panel-heading">Actions</h3>
        <div className="actions-list">
          <button
            className="action-btn run-btn"
            onClick={handleRun}
            disabled={isRunning || (isSeed && !localSeed.trim())}
          >
            {isRunning ? (
              <span className="btn-running">
                <span className="btn-spinner" />
                Working...
              </span>
            ) : runLabel}
          </button>

          {justCompleted && nextStage && (
            <button
              className="action-btn continue-btn"
              onClick={handleContinue}
            >
              Continue to {STAGE_LABELS[nextStage]} →
            </button>
          )}

          {runError && (
            <div className="run-error">
              <strong>Error:</strong> {runError}
              <button className="run-error-dismiss" onClick={() => setRunError(null)}>&times;</button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
