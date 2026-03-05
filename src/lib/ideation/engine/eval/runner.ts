import type { Session } from '../../state/sessionTypes';
import { DEFAULT_SETTINGS } from '../../state/sessionTypes';
import { STAGE_IDS } from '../stages';
import { runStage } from '../orchestrator';
import type { Provider } from '../provider/types';
import { mockProvider } from '../provider/mockProvider';
import { computeMetrics, type EvalMetrics } from './metrics';
import type { GoldenSeed } from './goldenSeeds';

export interface EvalRunResult {
  seedId: string;
  seedText: string;
  metrics: EvalMetrics;
  stagesCompleted: string[];
  error?: string;
}

export interface EvalSuiteResult {
  totalPassed: number;
  totalFailed: number;
  results: EvalRunResult[];
}

function createEphemeralSession(seedText: string): Session {
  const stageState: Record<string, { output: null; stale: boolean; lastRunEventId: null }> = {};
  for (const id of STAGE_IDS) {
    stageState[id] = { output: null, stale: false, lastRunEventId: null };
  }

  const now = new Date().toISOString();
  return {
    id: `eval-${crypto.randomUUID()}`,
    createdAt: now,
    updatedAt: now,
    seedText,
    activeBranchId: 'main',
    projectName: '',
    settings: { ...DEFAULT_SETTINGS },
    events: [
      {
        id: crypto.randomUUID(),
        type: 'SESSION_CREATE',
        timestamp: now,
        branchId: 'main',
        data: {},
      },
      {
        id: crypto.randomUUID(),
        type: 'SEED_EDIT',
        timestamp: now,
        stageId: 'seed',
        branchId: 'main',
        data: { seedText },
      },
    ],
    stageState,
  };
}

export async function runSingleEval(
  seed: GoldenSeed,
  provider?: Provider,
): Promise<EvalRunResult> {
  const p = provider ?? mockProvider;
  let session = createEphemeralSession(seed.seedText);
  const stagesCompleted: string[] = [];

  try {
    session = await runStage(session, 'seed', p);
    stagesCompleted.push('seed');

    session = await runStage(session, 'normalize', p);
    stagesCompleted.push('normalize');

    session = await runStage(session, 'diverge', p);
    stagesCompleted.push('diverge');

    session = await runStage(session, 'critique-salvage', p);
    stagesCompleted.push('critique-salvage');

    const candidates = (session.stageState['diverge']?.output as { candidates: Array<{ id: string }> })?.candidates ?? [];
    const shortlistIds = candidates.slice(0, 3).map((c) => c.id);

    if (shortlistIds.length >= 2) {
      session = {
        ...session,
        updatedAt: new Date().toISOString(),
        events: [
          ...session.events,
          {
            id: crypto.randomUUID(),
            type: 'EXPAND_SHORTLIST_SET',
            timestamp: new Date().toISOString(),
            stageId: 'expand',
            branchId: 'main',
            data: { candidateIds: shortlistIds },
          },
        ],
      };

      session = await runStage(session, 'expand', p);
      stagesCompleted.push('expand');

      session = await runStage(session, 'converge', p);
      stagesCompleted.push('converge');
    }

    const metrics = computeMetrics(session);
    return { seedId: seed.id, seedText: seed.seedText, metrics, stagesCompleted };
  } catch (err) {
    const metrics = computeMetrics(session);
    return {
      seedId: seed.id,
      seedText: seed.seedText,
      metrics,
      stagesCompleted,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function runEvalSuite(
  seeds: GoldenSeed[],
  provider?: Provider,
): Promise<EvalSuiteResult> {
  const results: EvalRunResult[] = [];

  for (const seed of seeds) {
    const result = await runSingleEval(seed, provider);
    results.push(result);
  }

  const totalPassed = results.filter((r) => !r.error).length;
  const totalFailed = results.filter((r) => !!r.error).length;

  return { totalPassed, totalFailed, results };
}
