import type { Session } from '../../state/sessionTypes';
import { DEFAULT_SETTINGS } from '../../state/sessionTypes';
import type { StageId } from '../stages';
import { STAGE_IDS, STAGE_LABELS } from '../stages';
import { STAGE_SCHEMAS } from '../schemas';
import type { CommitOutput } from '../schemas';
import { runStage } from '../orchestrator';
import type { Provider } from '../provider/types';
import { mockProvider } from '../provider/mockProvider';
import { createGeminiProvider } from '../provider/geminiProvider';
import { exportCommitAsMarkdown } from '../commit/export';

export interface SmokeResult {
  ok: boolean;
  failures: Array<{ step: string; error: string }>;
  timings: Record<string, number>;
}

function createSmokeSession(): Session {
  const stageState: Record<string, { output: null; stale: boolean; lastRunEventId: null }> = {};
  for (const id of STAGE_IDS) {
    stageState[id] = { output: null, stale: false, lastRunEventId: null };
  }

  const now = new Date().toISOString();
  const seedText = 'A collaborative puzzle game where players must solve interconnected challenges using different cognitive skills';
  return {
    id: `smoke-${crypto.randomUUID()}`,
    createdAt: now,
    updatedAt: now,
    seedText,
    activeBranchId: 'main',
    projectName: '',
    settings: { ...DEFAULT_SETTINGS },
    events: [
      { id: crypto.randomUUID(), type: 'SESSION_CREATE', timestamp: now, branchId: 'main', data: {} },
      { id: crypto.randomUUID(), type: 'SEED_EDIT', timestamp: now, stageId: 'seed', branchId: 'main', data: { seedText } },
    ],
    stageState,
  };
}

export async function runSmoke(opts: {
  providerMode: 'mock' | 'gemini';
  apiKey?: string;
}): Promise<SmokeResult> {
  const failures: SmokeResult['failures'] = [];
  const timings: Record<string, number> = {};

  let provider: Provider;
  if (opts.providerMode === 'gemini') {
    if (!opts.apiKey) {
      return { ok: false, failures: [{ step: 'provider_init', error: 'GEMINI_API_KEY not provided' }], timings };
    }
    provider = createGeminiProvider(opts.apiKey);
  } else {
    provider = mockProvider;
  }

  let session = createSmokeSession();
  const initialEventCount = session.events.length;

  const pipelineStages: Array<{ stageId: StageId; setup?: (s: Session) => Session }> = [
    { stageId: 'seed' },
    { stageId: 'normalize' },
    { stageId: 'diverge' },
    { stageId: 'critique-salvage' },
    {
      stageId: 'expand',
      setup: (s) => {
        const divergeOutput = s.stageState['diverge']?.output as { candidates: Array<{ id: string }> } | null;
        const candidates = divergeOutput?.candidates ?? [];
        const count = Math.min(3, Math.max(2, candidates.length));
        const shortlistIds = candidates.slice(0, count).map((c) => c.id);
        if (shortlistIds.length < 2) throw new Error('Need at least 2 candidates for expand shortlist');
        return {
          ...s,
          updatedAt: new Date().toISOString(),
          events: [
            ...s.events,
            {
              id: crypto.randomUUID(),
              type: 'EXPAND_SHORTLIST_SET' as const,
              timestamp: new Date().toISOString(),
              stageId: 'expand' as const,
              branchId: 'main',
              data: { candidateIds: shortlistIds },
            },
          ],
        };
      },
    },
    { stageId: 'converge' },
    { stageId: 'commit' },
  ];

  for (const { stageId, setup } of pipelineStages) {
    const start = Date.now();
    try {
      if (setup) session = setup(session);
      session = await runStage(session, stageId, provider);
      timings[stageId] = Date.now() - start;

      const output = session.stageState[stageId]?.output;
      if (!output) {
        failures.push({ step: `${stageId}:output`, error: `${STAGE_LABELS[stageId]} produced no output` });
        continue;
      }

      const schema = STAGE_SCHEMAS[stageId];
      if (schema) {
        try {
          schema.parse(output);
        } catch (e) {
          failures.push({ step: `${stageId}:schema`, error: `Schema validation: ${e instanceof Error ? e.message : String(e)}` });
        }
      }
    } catch (err) {
      timings[stageId] = Date.now() - start;
      failures.push({ step: stageId, error: err instanceof Error ? err.message : String(err) });
    }
  }

  if (session.events.length <= initialEventCount) {
    failures.push({ step: 'events_check', error: `No new events appended (still ${session.events.length})` });
  }

  try {
    const preRerunDivergeStale = session.stageState['diverge']?.stale;
    const rerunSession = await runStage(session, 'normalize', provider);
    const postRerunDivergeStale = rerunSession.stageState['diverge']?.stale;
    if (rerunSession.stageState['diverge']?.output && !postRerunDivergeStale && !preRerunDivergeStale) {
      failures.push({ step: 'staleness_check', error: 'Diverge not marked stale after normalize re-run' });
    }
  } catch (err) {
    failures.push({ step: 'staleness_rerun', error: err instanceof Error ? err.message : String(err) });
  }

  const commitOutput = session.stageState['commit']?.output as CommitOutput | null;
  if (commitOutput) {
    const markdown = exportCommitAsMarkdown(commitOutput, session);
    if (!markdown || markdown.length === 0) {
      failures.push({ step: 'commit_export', error: 'Commit export markdown is empty' });
    }
    if (!commitOutput.differentiator) failures.push({ step: 'commit_field:differentiator', error: 'empty' });
    if (!commitOutput.constraints) failures.push({ step: 'commit_field:constraints', error: 'empty' });
    if (!commitOutput.first60Minutes) failures.push({ step: 'commit_field:first60Minutes', error: 'empty' });
    if (!commitOutput.next3Actions) failures.push({ step: 'commit_field:next3Actions', error: 'empty' });
    if (!commitOutput.riskNotes) failures.push({ step: 'commit_field:riskNotes', error: 'empty' });
  }

  return { ok: failures.length === 0, failures, timings };
}

/* istanbul ignore next -- CLI entry point for Node.js only */
if (typeof process !== 'undefined' && typeof window === 'undefined' && typeof document === 'undefined') {
  const isGemini = typeof process.argv !== 'undefined' && process.argv.includes('--gemini');
  const apiKey = typeof process.env !== 'undefined' ? process.env.GEMINI_API_KEY : undefined;

  runSmoke({ providerMode: isGemini ? 'gemini' : 'mock', apiKey: apiKey || undefined })
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.ok ? 0 : 1);
    })
    .catch((err) => {
      console.error('Smoke runner failed:', err);
      process.exit(1);
    });
}
