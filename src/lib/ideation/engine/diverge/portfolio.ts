import type { DivergeCandidate, DivergeOutput, LensType } from '../schemas';
import { DivergeBatchSchema } from '../schemas';
import type { EffectiveNormalize } from '../normalize';
import type { Provider } from '../provider/types';
import { LENS_TYPES } from './lenses';
import { distributeCounts } from './lenses';
import {
  checkQuota,
  PORTFOLIO_SIZE_MAX,
  PORTFOLIO_SIZE_MIN,
  type QuotaResult,
} from './quotas';
import { dedup, checkAxesDifference, type DedupResult } from './dedup';
import {
  buildDivergeLensPrompt,
  buildDivergeRegenPrompt,
} from '../prompts/divergePrompt';

const MAX_ATTEMPTS = 4;
const INITIAL_TARGET = 18;

export interface PipelineMeta {
  quotaResult: QuotaResult;
  dedupSummary: { removedIds: string[]; reasons: string[] };
  axesViolations: string[];
  attempts: number;
  promptSnapshot: string;
}

export interface PipelineResult {
  output: DivergeOutput;
  meta: PipelineMeta;
}

async function generateLensBatch(
  lens: LensType,
  count: number,
  effectiveNormalize: EffectiveNormalize,
  userInputs: string[],
  provider: Provider,
  influenceBlock?: string,
): Promise<DivergeCandidate[]> {
  let prompt = buildDivergeLensPrompt(
    lens,
    effectiveNormalize,
    userInputs,
    count,
  );
  if (influenceBlock) prompt += influenceBlock;
  const result = await provider.generateStructured({
    schema: DivergeBatchSchema,
    prompt,
  });
  return result.candidates;
}

async function generateRegenBatch(
  missingBuckets: string[],
  existing: DivergeCandidate[],
  effectiveNormalize: EffectiveNormalize,
  count: number,
  provider: Provider,
): Promise<DivergeCandidate[]> {
  const prompt = buildDivergeRegenPrompt(
    missingBuckets,
    existing,
    effectiveNormalize,
    count,
  );
  const result = await provider.generateStructured({
    schema: DivergeBatchSchema,
    prompt,
  });
  return result.candidates;
}

export async function assemblePipeline(
  effectiveNormalize: EffectiveNormalize,
  userInputs: string[],
  provider: Provider,
  pinnedCandidates: DivergeCandidate[] = [],
  influenceBlock?: string,
  customLensCounts?: { practical?: number; inversion?: number; constraint?: number },
): Promise<PipelineResult> {
  const pinnedIds = new Set(pinnedCandidates.map((c) => c.id));
  const slotsNeeded = INITIAL_TARGET - pinnedCandidates.length;
  let lensCounts: number[];
  if (customLensCounts && (customLensCounts.practical || customLensCounts.inversion || customLensCounts.constraint)) {
    lensCounts = [
      customLensCounts.practical ?? 6,
      customLensCounts.inversion ?? 6,
      customLensCounts.constraint ?? 6,
    ];
  } else {
    lensCounts = distributeCounts(
      Math.max(slotsNeeded, 0),
      LENS_TYPES.length,
    );
  }

  let allCandidates = [...pinnedCandidates];
  const prompts: string[] = [];

  for (let i = 0; i < LENS_TYPES.length; i++) {
    if (lensCounts[i] <= 0) continue;
    const batch = await generateLensBatch(
      LENS_TYPES[i],
      lensCounts[i],
      effectiveNormalize,
      userInputs,
      provider,
      influenceBlock,
    );
    allCandidates.push(...batch);
    prompts.push(`[${LENS_TYPES[i]}:${lensCounts[i]}]`);
  }

  let dedupResult: DedupResult = dedup(allCandidates, pinnedIds);
  allCandidates = dedupResult.kept;

  let quota = checkQuota(allCandidates);
  let attempts = 0;

  while (
    (!quota.ok || allCandidates.length < PORTFOLIO_SIZE_MIN) &&
    attempts < MAX_ATTEMPTS
  ) {
    attempts++;
    const need = Math.max(PORTFOLIO_SIZE_MIN - allCandidates.length, 0);
    const bucketNeed = quota.missingBuckets.length;
    const regenCount = Math.max(need, bucketNeed, 2);

    const regenBatch = await generateRegenBatch(
      quota.missingBuckets.length > 0
        ? quota.missingBuckets
        : ['Tooling / Workflow', 'Creative Media'],
      allCandidates,
      effectiveNormalize,
      regenCount,
      provider,
    );
    allCandidates.push(...regenBatch);

    dedupResult = dedup(allCandidates, pinnedIds);
    allCandidates = dedupResult.kept;
    quota = checkQuota(allCandidates);
  }

  if (allCandidates.length > PORTFOLIO_SIZE_MAX) {
    const pinned = allCandidates.filter((c) => pinnedIds.has(c.id));
    const unpinned = allCandidates.filter((c) => !pinnedIds.has(c.id));
    allCandidates = [...pinned, ...unpinned.slice(0, PORTFOLIO_SIZE_MAX - pinned.length)];
    quota = checkQuota(allCandidates);
  }

  const axesViolations = checkAxesDifference(allCandidates, pinnedIds);

  return {
    output: { candidates: allCandidates },
    meta: {
      quotaResult: quota,
      dedupSummary: {
        removedIds: dedupResult.removed.map((r) => r.candidate.id),
        reasons: dedupResult.removed.map((r) => r.reason),
      },
      axesViolations: axesViolations.map(
        (v) => `${v.candidateId} shares axes [${v.sharedAxes.join(',')}] with ${v.nearestId}`,
      ),
      attempts,
      promptSnapshot: prompts.join(' '),
    },
  };
}
