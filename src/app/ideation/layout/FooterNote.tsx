"use client";

import { useSession } from '@/lib/ideation/context/SessionContext';
import { getLastSafetyInterventions } from '@/lib/ideation/state/sessionSelectors';

export default function FooterNote() {
  const { session } = useSession();
  const interventions = getLastSafetyInterventions(session, 3);
  const latestIntervention = interventions[0];

  return (
    <div className="footer-note">
      <span className="footer-note-text">
        All ideas generated here are yours. AI assists with structure; you own
        the output. Exports are local files &mdash; nothing is sent externally
        unless you choose a real provider.
      </span>
      {latestIntervention && (
        <span className="footer-note-safety">
          Safety: {latestIntervention.kind} &mdash;{' '}
          {latestIntervention.reason.slice(0, 80)}
        </span>
      )}
    </div>
  );
}
