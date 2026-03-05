import type { Session, SessionSettings, StageState } from './sessionTypes';
import { DEFAULT_SETTINGS } from './sessionTypes';
import type { StageId } from '../engine/stages';
import type {
  DivergeCandidate,
  DivergeOutput,
  ExpandOutput,
  ExpandExpansion,
  ConvergeOutput,
  CommitOutput,
} from '../engine/schemas';

const EMPTY_STATE: StageState = {
  output: null,
  stale: false,
  lastRunEventId: null,
};

export function getStageState(
  session: Session,
  stageId: StageId,
): StageState {
  return session.stageState[stageId] ?? EMPTY_STATE;
}

export function isStageStale(session: Session, stageId: StageId): boolean {
  return getStageState(session, stageId).stale;
}

export function getStageOutput(
  session: Session,
  stageId: StageId,
): unknown | null {
  return getStageState(session, stageId).output;
}

export function hasStageOutput(session: Session, stageId: StageId): boolean {
  return getStageState(session, stageId).output !== null;
}

export function getPinnedCandidateIds(session: Session): Set<string> {
  const pinned = new Set<string>();
  for (const event of session.events) {
    if (event.type === 'DIVERGE_PIN')
      pinned.add(event.data.candidateId as string);
    if (event.type === 'DIVERGE_UNPIN')
      pinned.delete(event.data.candidateId as string);
  }
  return pinned;
}

export function getEffectiveCandidatePool(session: Session): DivergeCandidate[] {
  const divergeOutput = session.stageState['diverge']?.output as
    | DivergeOutput
    | null;
  if (!divergeOutput) return [];

  const base = [...divergeOutput.candidates];

  for (const event of session.events) {
    if (event.type === 'MUTATION_APPLIED') {
      const candidate = event.data.mutatedCandidate as DivergeCandidate;
      if (candidate && !base.some((c) => c.id === candidate.id)) {
        base.push(candidate);
      }
    }
  }

  return base;
}

export function getExpandShortlistIds(session: Session): string[] {
  for (let i = session.events.length - 1; i >= 0; i--) {
    if (session.events[i].type === 'EXPAND_SHORTLIST_SET') {
      return session.events[i].data.candidateIds as string[];
    }
  }
  return [];
}

export function getUserEditedFields(
  session: Session,
  candidateId: string,
): Set<string> {
  const lastRunIdx = findLastStageRunIdx(session, 'expand');
  const edited = new Set<string>();

  for (let i = lastRunIdx + 1; i < session.events.length; i++) {
    const e = session.events[i];
    if (
      e.type === 'EXPAND_FIELD_EDIT' &&
      e.data.candidateId === candidateId
    ) {
      edited.add(e.data.field as string);
    }
  }
  return edited;
}

export function getEffectiveExpansions(session: Session): ExpandExpansion[] {
  const base = (session.stageState['expand']?.output as ExpandOutput | null)
    ?.expansions;
  if (!base) return [];

  const result = base.map((exp) => ({ ...exp, scope: { ...exp.scope } }));
  const lastRunIdx = findLastStageRunIdx(session, 'expand');

  for (let i = lastRunIdx + 1; i < session.events.length; i++) {
    const e = session.events[i];
    if (e.type === 'EXPAND_FIELD_EDIT') {
      const { candidateId, field, next } = e.data as {
        candidateId: string;
        field: string;
        next: string;
      };
      const exp = result.find((x) => x.candidateId === candidateId);
      if (exp) {
        (exp as Record<string, unknown>)[field] = next;
      }
    }
  }

  return result;
}

export function getSelectedWinner(session: Session): string | null {
  for (let i = session.events.length - 1; i >= 0; i--) {
    const t = session.events[i].type;
    if (t === 'OVERRIDE_WINNER' || t === 'SELECT_WINNER') {
      return session.events[i].data.candidateId as string;
    }
  }
  return null;
}

export function getSelectedRunnerUp(session: Session): string | null {
  for (let i = session.events.length - 1; i >= 0; i--) {
    if (session.events[i].type === 'SELECT_RUNNER_UP') {
      return session.events[i].data.candidateId as string;
    }
  }
  return null;
}

export function getResolvedWinnerId(session: Session): string | null {
  const userSelected = getSelectedWinner(session);
  if (userSelected) return userSelected;

  const convergeOutput = session.stageState['converge']?.output as
    | ConvergeOutput
    | null;
  return convergeOutput?.winnerId ?? null;
}

export function getWinnerExpansion(session: Session): ExpandExpansion | null {
  const winnerId = getResolvedWinnerId(session);
  if (!winnerId) return null;
  const expansions = getEffectiveExpansions(session);
  return expansions.find((e) => e.candidateId === winnerId) ?? null;
}

export function getWinnerCandidate(session: Session): DivergeCandidate | null {
  const winnerId = getResolvedWinnerId(session);
  if (!winnerId) return null;
  const pool = getEffectiveCandidatePool(session);
  return pool.find((c) => c.id === winnerId) ?? null;
}

export function getLastCommitOutput(session: Session): CommitOutput | null {
  return (session.stageState['commit']?.output as CommitOutput) ?? null;
}

export function getLastExportPath(session: Session): string | null {
  for (let i = session.events.length - 1; i >= 0; i--) {
    if (session.events[i].type === 'EXPORT_MARKDOWN') {
      return (session.events[i].data.path as string) ?? null;
    }
  }
  return null;
}

export function getBranchIds(session: Session): string[] {
  const branches = new Set<string>(['main']);
  for (const event of session.events) {
    if (event.type === 'BRANCH_CREATE') {
      branches.add(event.data.newBranchId as string);
    }
    if (event.branchId) branches.add(event.branchId);
  }
  return [...branches];
}

export function getRejectedMutationIds(session: Session): Set<string> {
  const rejected = new Set<string>();
  for (const event of session.events) {
    if (event.type === 'MUTATION_REJECTED') {
      rejected.add(event.data.mutationId as string);
    }
  }
  return rejected;
}

export function getAppliedMutationIds(session: Session): Set<string> {
  const applied = new Set<string>();
  for (const event of session.events) {
    if (event.type === 'MUTATION_APPLIED') {
      applied.add(event.data.mutationId as string);
    }
  }
  return applied;
}

export function getEffectiveSettings(session: Session): SessionSettings {
  const base = session.settings ?? { ...DEFAULT_SETTINGS };
  const settings = { ...base };
  for (const event of session.events) {
    if (event.type === 'SETTINGS_UPDATE') {
      Object.assign(settings, event.data.changes);
    }
  }
  return settings;
}

export function getLastSafetyInterventions(
  session: Session,
  limit = 10,
): Array<{ kind: string; reason: string; stageId?: string; timestamp: string }> {
  const results: Array<{ kind: string; reason: string; stageId?: string; timestamp: string }> = [];
  for (let i = session.events.length - 1; i >= 0 && results.length < limit; i--) {
    const e = session.events[i];
    if (e.type === 'SAFETY_INTERVENTION') {
      results.push({
        kind: e.data.kind as string,
        reason: e.data.reason as string,
        stageId: e.stageId,
        timestamp: e.timestamp,
      });
    }
  }
  return results;
}

export interface EvalMetricsSnapshot {
  diversity: number;
  genericnessRate: number;
  salvageApplyRate: number;
  bucketCoverage: number;
  axesUniqueness: number;
  avgSimilarity: number;
  timestamp: string;
}

export function getLastEvalMetrics(session: Session): EvalMetricsSnapshot | null {
  for (let i = session.events.length - 1; i >= 0; i--) {
    if (session.events[i].type === 'EVAL_METRICS_RECORDED') {
      return session.events[i].data.metrics as EvalMetricsSnapshot;
    }
  }
  return null;
}

export function getEvalRuns(
  session: Session,
): Array<{ mode: string; pass: boolean; summary: string; timestamp: string }> {
  return session.events
    .filter((e) => e.type === 'EVAL_RUN')
    .map((e) => ({
      mode: e.data.mode as string,
      pass: e.data.pass as boolean,
      summary: e.data.summary as string,
      timestamp: e.timestamp,
    }));
}

export interface SmokeResultSnapshot {
  providerMode: string;
  ok: boolean;
  failures: Array<{ step: string; error: string }>;
  timings: Record<string, number>;
  timestamp: string;
}

export function getLastSmokeResult(session: Session): SmokeResultSnapshot | null {
  for (let i = session.events.length - 1; i >= 0; i--) {
    if (session.events[i].type === 'SMOKE_RESULT') {
      const d = session.events[i].data;
      return {
        providerMode: d.providerMode as string,
        ok: d.ok as boolean,
        failures: d.failures as Array<{ step: string; error: string }>,
        timings: d.timings as Record<string, number>,
        timestamp: session.events[i].timestamp,
      };
    }
  }
  return null;
}

export function hasSizeWarningBeenEmitted(session: Session): boolean {
  return session.events.some((e) => e.type === 'SESSION_SIZE_WARNING');
}

function findLastStageRunIdx(session: Session, stageId: StageId): number {
  for (let i = session.events.length - 1; i >= 0; i--) {
    if (
      session.events[i].type === 'STAGE_RUN' &&
      session.events[i].stageId === stageId
    ) {
      return i;
    }
  }
  return -1;
}
