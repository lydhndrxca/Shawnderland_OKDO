export const COVERAGE_BUCKETS = [
  'Tooling / Workflow',
  'Creative Media',
  'Simulation / Systems',
  'Social / Community',
  'Business / Monetization',
  'Weird / Art Film',
] as const;

export type CoverageBucket = (typeof COVERAGE_BUCKETS)[number];

export const PORTFOLIO_SIZE_MIN = 12;
export const PORTFOLIO_SIZE_MAX = 16;
export const MIN_BUCKETS_DOUBLE = 3;

export interface QuotaResult {
  ok: boolean;
  missingBuckets: string[];
  counts: Record<string, number>;
  totalCandidates: number;
}

export function checkQuota(
  candidates: Array<{ buckets: string[] }>,
): QuotaResult {
  const counts: Record<string, number> = {};
  for (const bucket of COVERAGE_BUCKETS) counts[bucket] = 0;

  for (const c of candidates) {
    for (const b of c.buckets) {
      if (b in counts) counts[b]++;
    }
  }

  const missingBuckets: string[] = [];
  let doubleCount = 0;
  for (const bucket of COVERAGE_BUCKETS) {
    if (counts[bucket] === 0) missingBuckets.push(bucket);
    if (counts[bucket] >= 2) doubleCount++;
  }

  const total = candidates.length;
  const ok =
    missingBuckets.length === 0 &&
    doubleCount >= MIN_BUCKETS_DOUBLE &&
    total >= PORTFOLIO_SIZE_MIN &&
    total <= PORTFOLIO_SIZE_MAX;

  return { ok, missingBuckets, counts, totalCandidates: total };
}
