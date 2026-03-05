"use client";

import { useState } from 'react';
import type { DivergeOutput, DivergeCandidate } from '@/lib/ideation/engine/schemas';
import { useSession } from '@/lib/ideation/context/SessionContext';
import { getPinnedCandidateIds, getEffectiveSettings } from '@/lib/ideation/state/sessionSelectors';
import { checkQuota, COVERAGE_BUCKETS } from '@/lib/ideation/engine/diverge/quotas';
import { LENS_LABELS } from '@/lib/ideation/engine/diverge/lenses';
import type { LensType } from '@/lib/ideation/engine/schemas';

function CandidateCard({
  candidate,
  isPinned,
  onPin,
  onUnpin,
  onRegenVariant,
  disabled,
}: {
  candidate: DivergeCandidate;
  isPinned: boolean;
  onPin: () => void;
  onUnpin: () => void;
  onRegenVariant: (axis: string) => void;
  disabled: boolean;
}) {
  const [showAxesMenu, setShowAxesMenu] = useState(false);

  return (
    <div className={`diverge-card ${isPinned ? 'pinned' : ''}`}>
      <div className="diverge-card-header">
        <span className="diverge-card-id">{candidate.id}</span>
        <span className={`lens-badge lens-${candidate.lens}`}>
          {LENS_LABELS[candidate.lens as LensType] ?? candidate.lens}
        </span>
      </div>

      <h4 className="diverge-card-hook">{candidate.hook}</h4>

      <div className="diverge-card-axes">
        {candidate.axes.map((axis) => (
          <span key={axis} className="axis-tag">
            {axis}
          </span>
        ))}
      </div>

      <p className="diverge-card-claim">{candidate.antiGenericClaim}</p>

      <div className="diverge-card-plan">
        <span className="field-label">First 60 min</span>
        <p className="field-value">{candidate.first60Minutes}</p>
      </div>

      <div className="diverge-card-tags">
        {candidate.buckets.map((b) => (
          <span key={b} className="bucket-tag">
            {b}
          </span>
        ))}
        {candidate.operatorTags.map((t) => (
          <span key={t} className="operator-tag">
            {t}
          </span>
        ))}
      </div>

      {candidate.culture && (
        <div className="diverge-card-culture">
          <span className="culture-badge">CULTURE</span>
          <div className="culture-anchors">
            <span title="Narrative Form">{candidate.culture.anchors.narrativeForm}</span>
            <span title="Material Practice">{candidate.culture.anchors.materialPractice}</span>
            <span title="Social Structure">{candidate.culture.anchors.socialStructure}</span>
          </div>
          {candidate.culture.exoticismFlags && (
            <span className="exoticism-flag">{candidate.culture.exoticismFlags}</span>
          )}
        </div>
      )}

      <div className="diverge-card-actions">
        <button
          className={`pin-btn ${isPinned ? 'is-pinned' : ''}`}
          onClick={isPinned ? onUnpin : onPin}
          disabled={disabled}
        >
          {isPinned ? 'Unpin' : 'Pin'}
        </button>

        {!isPinned && (
          <div className="regen-variant-wrap">
            <button
              className="regen-variant-btn"
              onClick={() => setShowAxesMenu(!showAxesMenu)}
              disabled={disabled}
            >
              More like this…
            </button>
            {showAxesMenu && (
              <div className="axes-menu">
                <div className="axes-menu-label">Different along:</div>
                {candidate.axes.map((axis) => (
                  <button
                    key={axis}
                    className="axes-menu-item"
                    onClick={() => {
                      onRegenVariant(axis);
                      setShowAxesMenu(false);
                    }}
                  >
                    {axis}
                  </button>
                ))}
                {candidate.buckets.map((b) => (
                  <button
                    key={b}
                    className="axes-menu-item bucket-option"
                    onClick={() => {
                      onRegenVariant(b);
                      setShowAxesMenu(false);
                    }}
                  >
                    bucket: {b}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DivergeStage({ output }: { output: unknown }) {
  const { session, pinCandidate, unpinCandidate, regenUnpinned, regenVariant, isRunning } =
    useSession();

  const data = output as DivergeOutput;
  const pinnedIds = getPinnedCandidateIds(session);
  const quota = checkQuota(data.candidates);

  return (
    <div className="diverge-board">
      <div className="diverge-header">
        <div className="quota-widget">
          <span className="quota-title">Coverage</span>
          <div className="quota-buckets">
            {COVERAGE_BUCKETS.map((bucket) => (
              <span
                key={bucket}
                className={`quota-bucket ${quota.counts[bucket] > 0 ? 'covered' : 'missing'}`}
              >
                {bucket}
                <span className="quota-count">{quota.counts[bucket]}</span>
              </span>
            ))}
          </div>
          <span className="quota-total">
            {quota.totalCandidates} candidates
            {quota.ok ? (
              <span className="quota-ok"> — quotas met</span>
            ) : (
              <span className="quota-fail"> — quotas not met</span>
            )}
          </span>
        </div>

        <button
          className="action-btn run-btn"
          onClick={regenUnpinned}
          disabled={isRunning || pinnedIds.size === 0}
          title={
            pinnedIds.size === 0
              ? 'Pin at least one candidate first'
              : 'Regenerate all unpinned candidates'
          }
        >
          Regenerate Unpinned ({data.candidates.length - pinnedIds.size})
        </button>
      </div>

      <div className="diverge-grid">
        {data.candidates.map((c) => (
          <CandidateCard
            key={c.id}
            candidate={c}
            isPinned={pinnedIds.has(c.id)}
            onPin={() => pinCandidate(c.id)}
            onUnpin={() => unpinCandidate(c.id)}
            onRegenVariant={(axis) => regenVariant(c.id, axis)}
            disabled={isRunning}
          />
        ))}
      </div>
    </div>
  );
}
