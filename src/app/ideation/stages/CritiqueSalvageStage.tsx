"use client";

import { useState } from 'react';
import type { CritiqueSalvageOutput, MutationEntry, CritiqueEntry } from '@/lib/ideation/engine/schemas';
import { GENERICNESS_THRESHOLD } from '@/lib/ideation/engine/critique/rubric';
import { useSession } from '@/lib/ideation/context/SessionContext';
import {
  getAppliedMutationIds,
  getRejectedMutationIds,
} from '@/lib/ideation/state/sessionSelectors';

export default function CritiqueSalvageStage({ output }: { output: unknown }) {
  const data = output as CritiqueSalvageOutput;
  const {
    session,
    applyMutation,
    rejectMutation,
    salvageAllAboveThreshold,
    isRunning,
  } = useSession();
  const [selectedId, setSelectedId] = useState<string | null>(
    data.critiques[0]?.candidateId ?? null,
  );

  const appliedIds = getAppliedMutationIds(session);
  const rejectedIds = getRejectedMutationIds(session);

  const selected = data.critiques.find((c) => c.candidateId === selectedId);
  const selectedMutations = data.mutations.filter(
    (m) => m.candidateId === selectedId,
  );

  const genericCount = data.critiques.filter(
    (c) => c.genericness >= GENERICNESS_THRESHOLD,
  ).length;

  const hasUnappliedGeneric = data.mutations.some(
    (m) =>
      !appliedIds.has(m.mutationId) &&
      !rejectedIds.has(m.mutationId) &&
      (data.critiques.find((c) => c.candidateId === m.candidateId)?.genericness ?? 0) >= GENERICNESS_THRESHOLD,
  );

  return (
    <div className="critique-board">
      <div className="critique-header">
        <div className="critique-stats">
          <span className="critique-stat">
            Critiqued: <strong>{data.critiques.length}</strong>
          </span>
          <span className="critique-stat">
            Generic (≥{GENERICNESS_THRESHOLD}):{' '}
            <strong className={genericCount > 0 ? 'text-danger' : ''}>
              {genericCount}
            </strong>
          </span>
          <span className="critique-stat">
            Mutations: <strong>{data.mutations.length}</strong>
          </span>
        </div>
        {hasUnappliedGeneric && (
          <button
            className="action-btn salvage-all-btn"
            onClick={salvageAllAboveThreshold}
            disabled={isRunning}
          >
            Salvage All Above Threshold
          </button>
        )}
      </div>

      <div className="critique-layout">
        {/* Left: candidate list */}
        <div className="critique-list">
          {data.critiques.map((c) => (
            <CritiqueListItem
              key={c.candidateId}
              critique={c}
              isSelected={c.candidateId === selectedId}
              onSelect={() => setSelectedId(c.candidateId)}
              mutationCount={
                data.mutations.filter((m) => m.candidateId === c.candidateId).length
              }
            />
          ))}
        </div>

        {/* Center: critique detail */}
        <div className="critique-detail">
          {selected ? (
            <CritiqueDetail critique={selected} />
          ) : (
            <p className="text-muted">Select a candidate to view critique.</p>
          )}
        </div>

        {/* Right: mutations */}
        <div className="critique-mutations">
          <h4 className="panel-subheading">Mutations</h4>
          {selectedMutations.length === 0 ? (
            <p className="text-muted">No mutations for this candidate.</p>
          ) : (
            selectedMutations.map((m) => (
              <MutationCard
                key={m.mutationId}
                mutation={m}
                isApplied={appliedIds.has(m.mutationId)}
                isRejected={rejectedIds.has(m.mutationId)}
                onApply={() =>
                  applyMutation(m.mutationId, m.candidateId, m.mutatedCandidate)
                }
                onReject={() => rejectMutation(m.mutationId)}
                disabled={isRunning}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function CritiqueListItem({
  critique,
  isSelected,
  onSelect,
  mutationCount,
}: {
  critique: CritiqueEntry;
  isSelected: boolean;
  onSelect: () => void;
  mutationCount: number;
}) {
  const isGeneric = critique.genericness >= GENERICNESS_THRESHOLD;

  return (
    <button
      className={`critique-list-item ${isSelected ? 'selected' : ''} ${isGeneric ? 'generic' : ''}`}
      onClick={onSelect}
    >
      <span className="critique-item-id">{critique.candidateId.slice(0, 12)}…</span>
      <span
        className={`genericness-pill ${isGeneric ? 'high' : 'low'}`}
      >
        {critique.genericness}/10
      </span>
      {mutationCount > 0 && (
        <span className="mutation-count">{mutationCount}m</span>
      )}
    </button>
  );
}

function CritiqueDetail({ critique }: { critique: CritiqueEntry }) {
  const isGeneric = critique.genericness >= GENERICNESS_THRESHOLD;

  return (
    <div className="critique-detail-card">
      <div className="critique-detail-header">
        <span className="critique-detail-id">{critique.candidateId}</span>
        <span
          className={`genericness-pill large ${isGeneric ? 'high' : 'low'}`}
        >
          Genericness: {critique.genericness}/10
        </span>
      </div>
      {critique.flags && (
        <div className="critique-flags">
          {critique.flags.split(',').map((f) => (
            <span key={f.trim()} className="flag-tag">
              {f.trim()}
            </span>
          ))}
        </div>
      )}
      <div className="field">
        <label className="field-label">Explanation</label>
        <p className="field-value">{critique.explanation}</p>
      </div>
      <div className="field">
        <label className="field-label">Sameness Notes</label>
        <p className="field-value">{critique.samenessNotes}</p>
      </div>
    </div>
  );
}

function MutationCard({
  mutation,
  isApplied,
  isRejected,
  onApply,
  onReject,
  disabled,
}: {
  mutation: MutationEntry;
  isApplied: boolean;
  isRejected: boolean;
  onApply: () => void;
  onReject: () => void;
  disabled: boolean;
}) {
  const decided = isApplied || isRejected;
  const mc = mutation.mutatedCandidate;

  return (
    <div className={`mutation-card ${isApplied ? 'applied' : ''} ${isRejected ? 'rejected' : ''}`}>
      <div className="mutation-card-header">
        <span className="mutation-op">{mutation.operator}</span>
        {isApplied && <span className="mutation-status applied">Applied</span>}
        {isRejected && <span className="mutation-status rejected">Rejected</span>}
      </div>
      <p className="mutation-desc">{mutation.description}</p>
      <div className="mutation-preview">
        <div className="preview-field">
          <span className="preview-label">Hook</span>
          <span className="preview-value">{mc.hook}</span>
        </div>
        <div className="preview-field">
          <span className="preview-label">Axes</span>
          <span className="preview-value">{mc.axes.join(', ')}</span>
        </div>
        <div className="preview-field">
          <span className="preview-label">Anti-Generic</span>
          <span className="preview-value">{mc.antiGenericClaim}</span>
        </div>
        <div className="preview-field">
          <span className="preview-label">First 60 min</span>
          <span className="preview-value">{mc.first60Minutes}</span>
        </div>
      </div>
      {!decided && (
        <div className="mutation-actions">
          <button
            className="action-btn apply-btn"
            onClick={onApply}
            disabled={disabled}
          >
            Apply
          </button>
          <button
            className="action-btn reject-btn"
            onClick={onReject}
            disabled={disabled}
          >
            Reject
          </button>
        </div>
      )}
    </div>
  );
}
