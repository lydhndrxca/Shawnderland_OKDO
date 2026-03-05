import type { EvalMetrics } from './metrics';

export interface ExpectedThresholds {
  minBucketsCovered: number;
  minAxesUniqueness: number;
  maxAvgSimilarity: number;
  maxGenericnessRate: number;
  minSalvageApplyRate: number;
}

export const DEFAULT_THRESHOLDS: ExpectedThresholds = {
  minBucketsCovered: 0.5,
  minAxesUniqueness: 0.3,
  maxAvgSimilarity: 0.5,
  maxGenericnessRate: 0.6,
  minSalvageApplyRate: 0.0,
};

export interface RegressionResult {
  seedId: string;
  passed: boolean;
  failures: string[];
  metrics: EvalMetrics;
}

export function checkRegression(
  seedId: string,
  metrics: EvalMetrics,
  thresholds: ExpectedThresholds = DEFAULT_THRESHOLDS,
): RegressionResult {
  const failures: string[] = [];

  if (metrics.bucketCoverage < thresholds.minBucketsCovered) {
    failures.push(
      `bucketCoverage ${metrics.bucketCoverage} < min ${thresholds.minBucketsCovered}`,
    );
  }
  if (metrics.axesUniqueness < thresholds.minAxesUniqueness) {
    failures.push(
      `axesUniqueness ${metrics.axesUniqueness} < min ${thresholds.minAxesUniqueness}`,
    );
  }
  if (metrics.avgSimilarity > thresholds.maxAvgSimilarity) {
    failures.push(
      `avgSimilarity ${metrics.avgSimilarity} > max ${thresholds.maxAvgSimilarity}`,
    );
  }
  if (metrics.genericnessRate > thresholds.maxGenericnessRate) {
    failures.push(
      `genericnessRate ${metrics.genericnessRate} > max ${thresholds.maxGenericnessRate}`,
    );
  }
  if (metrics.salvageApplyRate < thresholds.minSalvageApplyRate) {
    failures.push(
      `salvageApplyRate ${metrics.salvageApplyRate} < min ${thresholds.minSalvageApplyRate}`,
    );
  }

  return {
    seedId,
    passed: failures.length === 0,
    failures,
    metrics,
  };
}
