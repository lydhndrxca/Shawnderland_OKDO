import type { Session } from '../../state/sessionTypes';
import type { DivergeOutput, CritiqueSalvageOutput } from '../schemas';
import { COVERAGE_BUCKETS } from '../diverge/quotas';
import { GENERICNESS_THRESHOLD } from '../critique/rubric';

export interface EvalMetrics {
  diversity: number;
  genericnessRate: number;
  salvageApplyRate: number;
  bucketCoverage: number;
  axesUniqueness: number;
  avgSimilarity: number;
  timeToDecisionMs: number | null;
}

export function computeMetrics(session: Session): EvalMetrics {
  const divergeOutput = session.stageState['diverge']?.output as DivergeOutput | null;
  const critiqueOutput = session.stageState['critique-salvage']?.output as CritiqueSalvageOutput | null;

  const candidates = divergeOutput?.candidates ?? [];

  const allAxes = new Set<string>();
  const axesPerCandidate: string[][] = [];
  for (const c of candidates) {
    axesPerCandidate.push(c.axes);
    for (const a of c.axes) allAxes.add(a);
  }
  const axesUniqueness = candidates.length > 0
    ? allAxes.size / (candidates.length * 3)
    : 0;

  const coveredBuckets = new Set<string>();
  for (const c of candidates) {
    for (const b of c.buckets) coveredBuckets.add(b);
  }
  const bucketCoverage = COVERAGE_BUCKETS.length > 0
    ? coveredBuckets.size / COVERAGE_BUCKETS.length
    : 0;

  let avgSimilarity = 0;
  if (candidates.length > 1) {
    let totalSim = 0;
    let pairs = 0;
    for (let i = 0; i < candidates.length; i++) {
      for (let j = i + 1; j < candidates.length; j++) {
        const wordsA = new Set(candidates[i].hook.toLowerCase().split(/\s+/));
        const wordsB = new Set(candidates[j].hook.toLowerCase().split(/\s+/));
        const intersection = [...wordsA].filter((w) => wordsB.has(w)).length;
        const union = new Set([...wordsA, ...wordsB]).size;
        totalSim += union > 0 ? intersection / union : 0;
        pairs++;
      }
    }
    avgSimilarity = pairs > 0 ? totalSim / pairs : 0;
  }

  const diversity = Math.min(1, (axesUniqueness + bucketCoverage + (1 - avgSimilarity)) / 3);

  const critiques = critiqueOutput?.critiques ?? [];
  const genericCount = critiques.filter((c) => c.genericness >= GENERICNESS_THRESHOLD).length;
  const genericnessRate = critiques.length > 0 ? genericCount / critiques.length : 0;

  let appliedCount = 0;
  let flaggedGeneric = 0;
  for (const e of session.events) {
    if (e.type === 'MUTATION_APPLIED') appliedCount++;
  }
  flaggedGeneric = genericCount;
  const salvageApplyRate = flaggedGeneric > 0 ? Math.min(1, appliedCount / flaggedGeneric) : 1;

  let timeToDecisionMs: number | null = null;
  const firstDiverge = session.events.find(
    (e) => e.type === 'STAGE_RUN' && e.stageId === 'diverge',
  );
  const firstWinner = session.events.find(
    (e) => e.type === 'SELECT_WINNER' || e.type === 'OVERRIDE_WINNER',
  );
  const firstCommit = session.events.find((e) => e.type === 'COMMIT_RUN');
  if (firstDiverge && (firstWinner || firstCommit)) {
    const end = firstCommit ?? firstWinner!;
    timeToDecisionMs = new Date(end.timestamp).getTime() - new Date(firstDiverge.timestamp).getTime();
  }

  return {
    diversity: Math.round(diversity * 1000) / 1000,
    genericnessRate: Math.round(genericnessRate * 1000) / 1000,
    salvageApplyRate: Math.round(salvageApplyRate * 1000) / 1000,
    bucketCoverage: Math.round(bucketCoverage * 1000) / 1000,
    axesUniqueness: Math.round(axesUniqueness * 1000) / 1000,
    avgSimilarity: Math.round(avgSimilarity * 1000) / 1000,
    timeToDecisionMs,
  };
}
