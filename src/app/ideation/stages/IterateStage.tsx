"use client";

import { useState } from 'react';
import type { IterateOutput } from '@/lib/ideation/engine/schemas';
import { copyToClipboard } from '../ipc';
import { useSession } from '@/lib/ideation/context/SessionContext';
import {
  getResolvedWinnerId,
  getSelectedRunnerUp,
  getEffectiveCandidatePool,
} from '@/lib/ideation/state/sessionSelectors';
import type { StageId } from '@/lib/ideation/engine/stages';
import { STAGE_IDS, STAGE_LABELS } from '@/lib/ideation/engine/stages';

const BRANCHABLE_STAGES: readonly StageId[] = STAGE_IDS;

export default function IterateStage({ output }: { output: unknown }) {
  const {
    session,
    createBranch,
    divergeFromWinner,
    isRunning,
  } = useSession();
  const data = output as IterateOutput | null;
  const [copied, setCopied] = useState(false);
  const [branchSource, setBranchSource] = useState<'winner' | 'runner-up' | 'candidate' | 'stage'>('winner');
  const [selectedCandidateId, setSelectedCandidateId] = useState('');
  const [selectedStage, setSelectedStage] = useState<StageId>('seed');
  const [lastBranchId, setLastBranchId] = useState<string | null>(null);

  const winnerId = getResolvedWinnerId(session);
  const runnerUpId = getSelectedRunnerUp(session);
  const candidates = getEffectiveCandidatePool(session);

  const handleCopy = async () => {
    if (!data) return;
    await copyToClipboard(data.nextPromptSuggestions);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleBranch = () => {
    let fromNodeId = '';
    let label = '';

    switch (branchSource) {
      case 'winner':
        if (!winnerId) return;
        fromNodeId = winnerId;
        label = 'Branch from winner';
        break;
      case 'runner-up':
        if (!runnerUpId) return;
        fromNodeId = runnerUpId;
        label = 'Branch from runner-up';
        break;
      case 'candidate':
        if (!selectedCandidateId) return;
        fromNodeId = selectedCandidateId;
        label = `Branch from candidate ${selectedCandidateId.slice(0, 12)}`;
        break;
      case 'stage':
        fromNodeId = `stage-${selectedStage}`;
        label = `Branch from ${STAGE_LABELS[selectedStage]}`;
        break;
    }

    const newId = createBranch(fromNodeId, label);
    setLastBranchId(newId);
  };

  const handleDivergeFromWinner = async () => {
    await divergeFromWinner();
  };

  return (
    <div className="iterate-board">
      {data && (
        <>
          <div className="iterate-header">
            <h4 className="panel-subheading">Iteration Suggestions</h4>
            <button className="action-btn small" onClick={handleCopy}>
              {copied ? 'Copied!' : 'Copy to Clipboard'}
            </button>
          </div>
          <div className="field">
            <p className="field-value pre-wrap iterate-suggestions">
              {data.nextPromptSuggestions}
            </p>
          </div>
          <div className="iterate-hint">
            <p className="text-muted">
              Copy these suggestions and paste them back into the Seed stage to
              start a new iteration, or add them as user input constraints.
            </p>
          </div>
        </>
      )}

      <div className="iterate-branch-section">
        <h4 className="panel-subheading">Branch from…</h4>
        <div className="iterate-branch-controls">
          <div className="iterate-branch-source-row">
            <label>
              <input
                type="radio"
                name="branchSource"
                value="winner"
                checked={branchSource === 'winner'}
                onChange={() => setBranchSource('winner')}
              />
              Winner{winnerId ? ` (${winnerId.slice(0, 12)}…)` : ' (none)'}
            </label>
            <label>
              <input
                type="radio"
                name="branchSource"
                value="runner-up"
                checked={branchSource === 'runner-up'}
                onChange={() => setBranchSource('runner-up')}
              />
              Runner-up{runnerUpId ? ` (${runnerUpId.slice(0, 12)}…)` : ' (none)'}
            </label>
            <label>
              <input
                type="radio"
                name="branchSource"
                value="candidate"
                checked={branchSource === 'candidate'}
                onChange={() => setBranchSource('candidate')}
              />
              Any candidate
            </label>
            <label>
              <input
                type="radio"
                name="branchSource"
                value="stage"
                checked={branchSource === 'stage'}
                onChange={() => setBranchSource('stage')}
              />
              Any prior stage
            </label>
          </div>

          {branchSource === 'candidate' && (
            <select
              className="iterate-candidate-select"
              value={selectedCandidateId}
              onChange={(e) => setSelectedCandidateId(e.target.value)}
            >
              <option value="">Select candidate…</option>
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.hook.slice(0, 60)} ({c.id.slice(0, 10)})
                </option>
              ))}
            </select>
          )}

          {branchSource === 'stage' && (
            <select
              className="iterate-stage-select"
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value as StageId)}
            >
              {BRANCHABLE_STAGES.map((s) => (
                <option key={s} value={s}>
                  {STAGE_LABELS[s]}
                </option>
              ))}
            </select>
          )}

          <div className="iterate-branch-actions">
            <button
              className="action-btn"
              onClick={handleBranch}
              disabled={
                isRunning ||
                (branchSource === 'winner' && !winnerId) ||
                (branchSource === 'runner-up' && !runnerUpId) ||
                (branchSource === 'candidate' && !selectedCandidateId)
              }
            >
              Create Branch
            </button>
            {winnerId && (
              <button
                className="action-btn secondary"
                onClick={handleDivergeFromWinner}
                disabled={isRunning}
              >
                {isRunning ? 'Running…' : 'Diverge from Winner'}
              </button>
            )}
          </div>

          {lastBranchId && (
            <div className="iterate-branch-result">
              <span className="text-muted">
                Created branch: <strong>{lastBranchId}</strong>
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="iterate-branch-info">
        <div className="iterate-current-branch">
          <span className="text-muted">Active branch:</span>{' '}
          <strong>{session.activeBranchId}</strong>
        </div>
      </div>
    </div>
  );
}
