"use client";

import { STAGE_IDS, STAGE_LABELS } from '@/lib/ideation/engine/stages';
import { useSession } from '@/lib/ideation/context/SessionContext';
import { isStageStale, hasStageOutput } from '@/lib/ideation/state/sessionSelectors';
import './StageTabs.css';

export default function StageTabs() {
  const { session, activeStageId, setActiveStageId } = useSession();

  return (
    <nav className="stage-tabs">
      {STAGE_IDS.map((id) => {
        const stale = isStageStale(session, id);
        const hasOutput = hasStageOutput(session, id);
        const isActive = id === activeStageId;

        return (
          <button
            key={id}
            className={[
              'stage-tab',
              isActive && 'active',
              stale && 'stale',
              hasOutput && 'has-output',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => setActiveStageId(id)}
          >
            <span className="stage-tab-label">{STAGE_LABELS[id]}</span>
            {stale && <span className="stale-badge">⟳</span>}
            {hasOutput && !stale && <span className="output-dot" />}
          </button>
        );
      })}
    </nav>
  );
}
