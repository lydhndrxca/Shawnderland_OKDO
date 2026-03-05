import type { Session } from '../state/sessionTypes';
import type { NormalizeOutput } from './schemas';

export interface EffectiveNormalize {
  seedSummary: string;
  assumptions: { key: string; value: string; userOverride?: boolean }[];
  clarifyingQuestions: string[];
}

export function getLatestNormalizeBaseOutput(
  session: Session,
): NormalizeOutput | null {
  const output = session.stageState['normalize']?.output;
  return output ? (output as NormalizeOutput) : null;
}

export function deriveEffectiveNormalize(
  session: Session,
): EffectiveNormalize | null {
  const base = getLatestNormalizeBaseOutput(session);
  if (!base) return null;

  let lastRunIdx = -1;
  for (let i = session.events.length - 1; i >= 0; i--) {
    if (
      session.events[i].type === 'STAGE_RUN' &&
      session.events[i].stageId === 'normalize'
    ) {
      lastRunIdx = i;
      break;
    }
  }

  let seedSummary = base.seedSummary;
  const assumptions = base.assumptions.map((a) => ({ ...a }));

  for (let i = lastRunIdx + 1; i < session.events.length; i++) {
    const event = session.events[i];
    if (event.type === 'NORMALIZE_EDIT_SUMMARY') {
      seedSummary = event.data.next as string;
    }
    if (event.type === 'NORMALIZE_EDIT_ASSUMPTIONS') {
      const changes = event.data.changes as Array<{
        key: string;
        next: string;
        userOverride: boolean;
      }>;
      for (const change of changes) {
        const existing = assumptions.find((a) => a.key === change.key);
        if (existing) {
          existing.value = change.next;
          existing.userOverride = change.userOverride;
        }
      }
    }
  }

  return {
    seedSummary,
    assumptions,
    clarifyingQuestions: base.clarifyingQuestions,
  };
}
