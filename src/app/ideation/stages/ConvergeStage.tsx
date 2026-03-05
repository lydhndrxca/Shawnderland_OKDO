"use client";

import { useState, useMemo } from 'react';
import type { ConvergeOutput, ScoreEntry, ExpandExpansion, DivergeCandidate } from '@/lib/ideation/engine/schemas';
import { useSession } from '@/lib/ideation/context/SessionContext';
import {
  getSelectedWinner,
  getSelectedRunnerUp,
  getEffectiveExpansions,
  getEffectiveCandidatePool,
} from '@/lib/ideation/state/sessionSelectors';
import Modal from '../layout/Modal';

type SortKey = 'novelty' | 'usefulness' | 'feasibility' | 'differentiation' | 'energyGuess' | 'total';

function totalScore(s: ScoreEntry): number {
  return s.novelty + s.usefulness + s.feasibility + s.differentiation + s.energyGuess;
}

export default function ConvergeStage({ output }: { output: unknown }) {
  const data = output as ConvergeOutput;
  const {
    session,
    selectWinner,
    selectRunnerUp,
    overrideWinner,
    isRunning,
  } = useSession();

  const [sortKey, setSortKey] = useState<SortKey>('total');
  const [sortAsc, setSortAsc] = useState(false);
  const [compareIds, setCompareIds] = useState<[string, string] | null>(null);

  const currentWinner = getSelectedWinner(session) ?? data.winnerId;
  const currentRunnerUp = getSelectedRunnerUp(session) ?? data.runnerUpId;
  const expansions = getEffectiveExpansions(session);
  const candidates = getEffectiveCandidatePool(session);

  const sorted = useMemo(() => {
    const items = [...data.scorecard];
    items.sort((a, b) => {
      let va: number, vb: number;
      if (sortKey === 'total') {
        va = totalScore(a);
        vb = totalScore(b);
      } else {
        va = a[sortKey];
        vb = b[sortKey];
      }
      return sortAsc ? va - vb : vb - va;
    });
    return items;
  }, [data.scorecard, sortKey, sortAsc]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const sortArrow = (key: SortKey) =>
    sortKey === key ? (sortAsc ? ' ▲' : ' ▼') : '';

  return (
    <div className="converge-board">
      <div className="converge-selection">
        <div className="converge-pick">
          <label className="field-label">Winner</label>
          <select
            className="converge-select"
            value={currentWinner ?? ''}
            onChange={(e) => overrideWinner(e.target.value)}
            disabled={isRunning}
          >
            <option value="">— select —</option>
            {data.scorecard.map((s) => (
              <option key={s.candidateId} value={s.candidateId}>
                {s.candidateId.slice(0, 14)} (total{' '}
                {totalScore(s).toFixed(1)})
              </option>
            ))}
          </select>
        </div>
        <div className="converge-pick">
          <label className="field-label">Runner-up</label>
          <select
            className="converge-select"
            value={currentRunnerUp ?? ''}
            onChange={(e) => selectRunnerUp(e.target.value)}
            disabled={isRunning}
          >
            <option value="">— select —</option>
            {data.scorecard
              .filter((s) => s.candidateId !== currentWinner)
              .map((s) => (
                <option key={s.candidateId} value={s.candidateId}>
                  {s.candidateId.slice(0, 14)} (total{' '}
                  {totalScore(s).toFixed(1)})
                </option>
              ))}
          </select>
        </div>
        {currentWinner && currentRunnerUp && (
          <button
            className="action-btn compare-btn"
            onClick={() => setCompareIds([currentWinner!, currentRunnerUp!])}
          >
            Compare
          </button>
        )}
      </div>

      {data.cutsToShip && data.cutsToShip.length > 0 && (
        <div className="cuts-to-ship">
          <label className="field-label">Cuts to Ship</label>
          {data.cutsToShip.map((c) => (
            <p key={c.candidateId} className="field-value">
              <strong>{c.candidateId.slice(0, 12)}:</strong> {c.cuts}
            </p>
          ))}
        </div>
      )}

      <table className="output-table scorecard-table converge-table">
        <thead>
          <tr>
            <th>Candidate</th>
            <SortTh label="Nov." skey="novelty" onClick={handleSort} arrow={sortArrow} />
            <SortTh label="Use." skey="usefulness" onClick={handleSort} arrow={sortArrow} />
            <SortTh label="Feas." skey="feasibility" onClick={handleSort} arrow={sortArrow} />
            <SortTh label="Diff." skey="differentiation" onClick={handleSort} arrow={sortArrow} />
            <SortTh label="Energy" skey="energyGuess" onClick={handleSort} arrow={sortArrow} />
            <SortTh label="Total" skey="total" onClick={handleSort} arrow={sortArrow} />
            <th>Rationale</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((s) => (
            <tr
              key={s.candidateId}
              className={
                s.candidateId === currentWinner
                  ? 'winner-row'
                  : s.candidateId === currentRunnerUp
                    ? 'runner-up-row'
                    : ''
              }
            >
              <td className="candidate-cell">
                {s.candidateId.slice(0, 14)}
                {s.candidateId === currentWinner && (
                  <span className="crown-badge"> 🏆</span>
                )}
                {s.candidateId === currentRunnerUp && (
                  <span className="runner-badge"> 🥈</span>
                )}
              </td>
              <td>{s.novelty}</td>
              <td>{s.usefulness}</td>
              <td>{s.feasibility}</td>
              <td>{s.differentiation}</td>
              <td>{s.energyGuess}</td>
              <td className="total-cell">{totalScore(s).toFixed(1)}</td>
              <td className="rationale-cell">{s.rationale}</td>
              <td>
                <button
                  className="action-btn small"
                  onClick={() => selectWinner(s.candidateId)}
                  disabled={isRunning || s.candidateId === currentWinner}
                  title="Set as winner"
                >
                  ⭐
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {compareIds && (
        <CompareModal
          ids={compareIds}
          scorecard={data.scorecard}
          expansions={expansions}
          candidates={candidates}
          onClose={() => setCompareIds(null)}
        />
      )}
    </div>
  );
}

function SortTh({
  label,
  skey,
  onClick,
  arrow,
}: {
  label: string;
  skey: SortKey;
  onClick: (k: SortKey) => void;
  arrow: (k: SortKey) => string;
}) {
  return (
    <th className="sortable-th" onClick={() => onClick(skey)}>
      {label}
      {arrow(skey)}
    </th>
  );
}

function CompareModal({
  ids,
  scorecard,
  expansions,
  candidates,
  onClose,
}: {
  ids: [string, string];
  scorecard: ScoreEntry[];
  expansions: ExpandExpansion[];
  candidates: DivergeCandidate[];
  onClose: () => void;
}) {
  const data = ids.map((id) => ({
    score: scorecard.find((s) => s.candidateId === id),
    expansion: expansions.find((e) => e.candidateId === id),
    candidate: candidates.find((c) => c.id === id),
  }));

  return (
    <Modal open title="Side-by-Side Compare" onClose={onClose}>
      <div className="compare-grid">
        {data.map((d, i) => (
          <div key={ids[i]} className="compare-col">
            <h3 className="compare-col-title">
              {d.candidate?.hook ?? ids[i].slice(0, 14)}
            </h3>
            {d.score && (
              <div className="compare-scores">
                <ScoreBadge label="Nov" value={d.score.novelty} />
                <ScoreBadge label="Use" value={d.score.usefulness} />
                <ScoreBadge label="Feas" value={d.score.feasibility} />
                <ScoreBadge label="Diff" value={d.score.differentiation} />
                <ScoreBadge label="Eng" value={d.score.energyGuess} />
                <ScoreBadge label="Total" value={totalScore(d.score)} bold />
              </div>
            )}
            {d.score && (
              <div className="field">
                <label className="field-label">Rationale</label>
                <p className="field-value">{d.score.rationale}</p>
              </div>
            )}
            {d.expansion && (
              <>
                <div className="field">
                  <label className="field-label">Concept</label>
                  <p className="field-value">{d.expansion.concept}</p>
                </div>
                <div className="field">
                  <label className="field-label">Differentiator</label>
                  <p className="field-value">{d.expansion.differentiator}</p>
                </div>
                <div className="field">
                  <label className="field-label">Plan Day 1</label>
                  <p className="field-value">{d.expansion.planDay1}</p>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </Modal>
  );
}

function ScoreBadge({
  label,
  value,
  bold,
}: {
  label: string;
  value: number;
  bold?: boolean;
}) {
  return (
    <span className={`score-badge ${bold ? 'bold' : ''}`}>
      <span className="score-badge-label">{label}</span>
      <span className="score-badge-value">{value.toFixed(1)}</span>
    </span>
  );
}
