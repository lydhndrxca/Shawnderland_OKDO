"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { Session, SessionEvent, SessionSettings, FlowState } from '../state/sessionTypes';
import type { StageId } from '../engine/stages';
import { STAGE_IDS, getDownstreamStages } from '../engine/stages';
import { createNewSession } from '../state/sessionStore';
import {
  runStage as engineRunStage,
  regenDivergeUnpinned as engineRegenUnpinned,
  regenDivergeVariant as engineRegenVariant,
  regenExpandSection as engineRegenSection,
} from '../engine/orchestrator';
import { logGeneration, getSessionHistory, buildLineageContext } from '../engine/generationLog';
import { mockProvider } from '../engine/provider/mockProvider';
import { createGeminiProvider } from '../engine/provider/geminiProvider';
import type { Provider } from '../engine/provider/types';
import {
  getPinnedCandidateIds,
  getResolvedWinnerId,
  getWinnerCandidate,
  getEffectiveSettings,
} from '../state/sessionSelectors';
import type { DivergeCandidate } from '../engine/schemas';

export interface GuidedRunState {
  active: boolean;
  currentStageIndex: number;
  stages: StageId[];
  paused: boolean;
  completedStages: StageId[];
  userNotes: string;
}

interface SessionContextValue {
  session: Session;
  activeStageId: StageId;
  setActiveStageId: (id: StageId) => void;
  editSeed: (text: string) => void;
  editSeedContext: (text: string) => void;
  addUserInput: (text: string) => void;
  runStage: (stageId: StageId, opts?: { templateType?: string }) => Promise<void>;
  editNormalizeSummary: (newSummary: string, previousSummary: string) => void;
  editNormalizeAssumptions: (
    changes: Array<{
      key: string;
      previous: string;
      next: string;
      userOverride: boolean;
    }>,
  ) => void;
  pinCandidate: (candidateId: string) => void;
  unpinCandidate: (candidateId: string) => void;
  regenUnpinned: () => Promise<void>;
  regenVariant: (
    sourceCandidateId: string,
    differAlong: string,
  ) => Promise<void>;
  applyMutation: (
    mutationId: string,
    fromCandidateId: string,
    mutatedCandidate: DivergeCandidate,
  ) => void;
  rejectMutation: (mutationId: string) => void;
  salvageAllAboveThreshold: () => void;
  setExpandShortlist: (candidateIds: string[]) => void;
  editExpansionField: (
    candidateId: string,
    field: string,
    previous: string,
    next: string,
  ) => void;
  regenSection: (
    candidateId: string,
    field: string,
    hint?: string,
  ) => Promise<void>;
  selectWinner: (candidateId: string) => void;
  selectRunnerUp: (candidateId: string) => void;
  overrideWinner: (candidateId: string, reason?: string) => void;
  recordExport: (type: 'markdown' | 'clipboard', path?: string) => void;
  createBranch: (fromNodeId: string, label?: string) => string;
  divergeFromWinner: () => Promise<void>;
  updateSettings: (changes: Partial<SessionSettings>) => void;
  recordEvalRun: (mode: string, pass: boolean, summary: string) => void;
  recordEvalMetrics: (metrics: Record<string, unknown>) => void;
  recordSmokeRun: (providerMode: string, pass: boolean, failuresCount: number) => void;
  recordSmokeResult: (providerMode: string, ok: boolean, failures: Array<{step: string; error: string}>, timings: Record<string, number>) => void;
  runFullPipeline: () => Promise<void>;
  runInteractivePipeline: () => Promise<void>;
  runNextStage: () => Promise<void>;
  runStrand: (stageIds: StageId[]) => Promise<void>;
  guidedRunState: GuidedRunState;
  continueGuidedRun: () => Promise<void>;
  stopGuidedRun: () => void;
  addGuidedNote: (text: string) => void;
  pipelineProgress: string | null;
  hasApiKey: boolean;
  setProjectName: (name: string) => void;
  saveFlowState: (flowState: FlowState) => void;
  exportArchive: () => Promise<void>;
  saveSessionAs: (name: string) => Promise<void>;
  loadSessionByName: (name: string) => Promise<void>;
  listSavedSessions: () => Promise<Array<{ name: string; savedAt: string }>>;
  deleteSavedSession: (name: string) => Promise<void>;
  resetSession: () => void;
  isRunning: boolean;
  runningStageId: StageId | null;
  loaded: boolean;
  loadWarning: string | null;
  dismissLoadWarning: () => void;
  sessionSizeBytes: number;
  sessionSizeWarning: boolean;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
}

function markAllDownstreamStale(
  session: Session,
  fromStageId: StageId,
): Session {
  const downstream =
    fromStageId === 'seed'
      ? STAGE_IDS.filter((id) => id !== 'seed')
      : getDownstreamStages(fromStageId);

  const stageState = { ...session.stageState };
  for (const id of downstream) {
    if (stageState[id]) {
      stageState[id] = { ...stageState[id], stale: true };
    }
  }
  return { ...session, stageState };
}

function appendEvent(session: Session, event: SessionEvent): Session {
  return {
    ...session,
    updatedAt: new Date().toISOString(),
    events: [...session.events, event],
  };
}

function makeEvent(
  type: SessionEvent['type'],
  stageId: StageId | undefined,
  data: Record<string, unknown>,
  branchId?: string,
): SessionEvent {
  return {
    id: crypto.randomUUID(),
    type,
    timestamp: new Date().toISOString(),
    stageId,
    branchId,
    data,
  };
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session>(createNewSession);
  const [activeStageId, setActiveStageId] = useState<StageId>('seed');
  const [isRunning, setIsRunning] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loadWarning, setLoadWarning] = useState<string | null>(null);
  const [sessionSizeBytes] = useState(0);
  const [sessionSizeWarning] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const sessionRef = useRef(session);
  sessionRef.current = session;
  if (typeof window !== 'undefined') {
    (window as unknown as Record<string, unknown>).__sessionId = session.id;
    (window as unknown as Record<string, unknown>).__sessionSnapshot = session;
  }

  useEffect(() => {
    const envKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (envKey) setHasApiKey(true);
  }, []);

  const geminiProviderRef = useRef<Provider | null>(null);
  if (hasApiKey && !geminiProviderRef.current) {
    geminiProviderRef.current = createGeminiProvider();
  }

  function getProvider(): Provider {
    const settings = getEffectiveSettings(sessionRef.current);
    if (settings.providerMode === 'real') {
      if (!geminiProviderRef.current) {
        throw new Error(
          'Gemini provider selected but no NEXT_PUBLIC_GEMINI_API_KEY found. ' +
          'Set the environment variable in .env.local, or switch to Mock in Settings.',
        );
      }
      return geminiProviderRef.current;
    }
    return mockProvider;
  }

  useEffect(() => {
    setLoaded(true);
  }, []);

  const editSeed = useCallback((text: string) => {
    setSession((prev) => {
      const event = makeEvent('SEED_EDIT', 'seed', { seedText: text }, prev.activeBranchId);
      let updated = appendEvent({ ...prev, seedText: text }, event);
      updated = markAllDownstreamStale(updated, 'seed');
      return updated;
    });
  }, []);

  const editSeedContext = useCallback((text: string) => {
    setSession((prev) => {
      const event = makeEvent('SEED_EDIT', 'seed', { seedContext: text }, prev.activeBranchId);
      let updated = appendEvent({ ...prev, seedContext: text }, event);
      updated = markAllDownstreamStale(updated, 'seed');
      return updated;
    });
  }, []);

  const addUserInput = useCallback((text: string) => {
    setSession((prev) => {
      const event = makeEvent('USER_INPUT', undefined, { content: text }, prev.activeBranchId);
      let updated = appendEvent(prev, event);
      updated = markAllDownstreamStale(updated, 'seed');
      return updated;
    });
  }, []);

  const [runningStageId, setRunningStageId] = useState<StageId | null>(null);
  const [pipelineProgress, setPipelineProgress] = useState<string | null>(null);

  useEffect(() => {
    console.log(`[ShawnderMind] Provider mode: ${getEffectiveSettings(sessionRef.current).providerMode}`);
    console.log(`[ShawnderMind] Has API key: ${hasApiKey}`);
  }, [hasApiKey]);

  const runStage = useCallback(
    async (stageId: StageId, opts?: { templateType?: string }) => {
      setIsRunning(true);
      setRunningStageId(stageId);
      const startMs = Date.now();
      try {
        const provider = getProvider();
        const result = await engineRunStage(sessionRef.current, stageId, provider, opts);
        setSession(result);

        const stageOutput = (result.stageState as Record<string, { output?: unknown }>)[stageId]?.output;
        logGeneration({
          sessionId: result.id,
          category: 'pipeline',
          source: stageId,
          inputSummary: stageId === 'seed' ? result.seedText : `Stage: ${stageId}`,
          output: stageOutput ?? null,
          durationMs: Date.now() - startMs,
          lineage: buildLineageContext(result, stageId),
        });
      } finally {
        setIsRunning(false);
        setRunningStageId(null);
      }
    },
    [hasApiKey],
  );

  const initialGuidedRunState: GuidedRunState = {
    active: false,
    currentStageIndex: 0,
    stages: STAGE_IDS.slice(1),
    paused: false,
    completedStages: [],
    userNotes: '',
  };

  const [guidedRunState, setGuidedRunState] = useState<GuidedRunState>(initialGuidedRunState);
  const guidedRunRef = useRef(guidedRunState);
  guidedRunRef.current = guidedRunState;

  const runFullPipeline = useCallback(async () => {
    if (!sessionRef.current.seedText.trim()) return;

    setIsRunning(true);
    try {
      const seedState = (sessionRef.current.stageState as Record<string, { output?: unknown }>)['seed'];
      if (!seedState?.output) {
        setPipelineProgress('Running: seed');
        setRunningStageId('seed');
        const t0 = Date.now();
        const seedResult = await engineRunStage(sessionRef.current, 'seed', getProvider());
        setSession(seedResult);
        logGeneration({ sessionId: seedResult.id, category: 'pipeline', source: 'seed', inputSummary: seedResult.seedText, output: (seedResult.stageState as Record<string, { output?: unknown }>)['seed']?.output ?? null, durationMs: Date.now() - t0, lineage: buildLineageContext(seedResult, 'seed') });
      }

      const stages = STAGE_IDS.slice(1);
      for (let i = 0; i < stages.length; i++) {
        const stageId = stages[i];
        setPipelineProgress(`Running ${i + 1}/${stages.length}: ${stageId}`);
        setRunningStageId(stageId);
        const t0 = Date.now();
        const provider = getProvider();
        const result = await engineRunStage(sessionRef.current, stageId, provider);
        setSession(result);
        logGeneration({ sessionId: result.id, category: 'pipeline', source: stageId, inputSummary: `Stage: ${stageId}`, output: (result.stageState as Record<string, { output?: unknown }>)[stageId]?.output ?? null, durationMs: Date.now() - t0, lineage: buildLineageContext(result, stageId) });
      }
      setPipelineProgress(null);
    } catch (err) {
      setPipelineProgress(`Failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsRunning(false);
      setRunningStageId(null);
    }
  }, [hasApiKey]);

  const runInteractivePipeline = useCallback(async () => {
    const stages = STAGE_IDS.slice(1);
    if (!sessionRef.current.seedText.trim()) return;

    setIsRunning(true);
    try {
      const seedState = (sessionRef.current.stageState as Record<string, { output?: unknown }>)['seed'];
      if (!seedState?.output) {
        setPipelineProgress('Running: seed');
        setRunningStageId('seed');
        const t0 = Date.now();
        const seedResult = await engineRunStage(sessionRef.current, 'seed', getProvider());
        setSession(seedResult);
        logGeneration({ sessionId: seedResult.id, category: 'pipeline', source: 'seed', inputSummary: seedResult.seedText, output: (seedResult.stageState as Record<string, { output?: unknown }>)['seed']?.output ?? null, durationMs: Date.now() - t0, lineage: buildLineageContext(seedResult, 'seed') });
      }

      setGuidedRunState({
        active: true,
        currentStageIndex: 0,
        stages,
        paused: false,
        completedStages: [],
        userNotes: '',
      });

      const stageId = stages[0];
      setPipelineProgress(`Running 1/${stages.length}: ${stageId}`);
      setRunningStageId(stageId);
      const t0 = Date.now();
      const provider = getProvider();
      const result = await engineRunStage(sessionRef.current, stageId, provider);
      setSession(result);
      logGeneration({ sessionId: result.id, category: 'pipeline', source: stageId, inputSummary: `Stage: ${stageId}`, output: (result.stageState as Record<string, { output?: unknown }>)[stageId]?.output ?? null, durationMs: Date.now() - t0, lineage: buildLineageContext(result, stageId) });

      setGuidedRunState((prev) => ({
        ...prev,
        paused: true,
        completedStages: [stageId],
        currentStageIndex: 1,
      }));
      setPipelineProgress(null);
    } catch (err) {
      setPipelineProgress(`Failed: ${err instanceof Error ? err.message : String(err)}`);
      setGuidedRunState(initialGuidedRunState);
    } finally {
      setIsRunning(false);
      setRunningStageId(null);
    }
  }, [hasApiKey]);

  const continueGuidedRun = useCallback(async () => {
    const state = guidedRunRef.current;
    if (!state.active || !state.paused) return;

    const idx = state.currentStageIndex;
    if (idx >= state.stages.length) {
      setGuidedRunState(initialGuidedRunState);
      return;
    }

    if (state.userNotes.trim()) {
      setSession((prev) => {
        const event = makeEvent('USER_INPUT', undefined, { content: state.userNotes.trim() }, prev.activeBranchId);
        return appendEvent(prev, event);
      });
      setGuidedRunState((prev) => ({ ...prev, userNotes: '' }));
    }

    const stageId = state.stages[idx];
    setIsRunning(true);
    setGuidedRunState((prev) => ({ ...prev, paused: false }));

    try {
      setPipelineProgress(`Running ${idx + 1}/${state.stages.length}: ${stageId}`);
      setRunningStageId(stageId);
      const provider = getProvider();
      const result = await engineRunStage(sessionRef.current, stageId, provider);
      setSession(result);

      const nextIdx = idx + 1;
      if (nextIdx >= state.stages.length) {
        setGuidedRunState(initialGuidedRunState);
        setPipelineProgress(null);
      } else {
        setGuidedRunState((prev) => ({
          ...prev,
          paused: true,
          completedStages: [...prev.completedStages, stageId],
          currentStageIndex: nextIdx,
        }));
        setPipelineProgress(null);
      }
    } catch (err) {
      setPipelineProgress(`Failed: ${err instanceof Error ? err.message : String(err)}`);
      setGuidedRunState(initialGuidedRunState);
    } finally {
      setIsRunning(false);
      setRunningStageId(null);
    }
  }, [hasApiKey]);

  const runNextStage = useCallback(async () => {
    if (!sessionRef.current.seedText.trim()) return;

    setIsRunning(true);
    try {
      const seedState = (sessionRef.current.stageState as Record<string, { output?: unknown }>)['seed'];
      if (!seedState?.output) {
        setPipelineProgress('Running: seed');
        setRunningStageId('seed');
        const t0 = Date.now();
        const seedResult = await engineRunStage(sessionRef.current, 'seed', getProvider());
        setSession(seedResult);
        logGeneration({ sessionId: seedResult.id, category: 'pipeline', source: 'seed', inputSummary: seedResult.seedText, output: (seedResult.stageState as Record<string, { output?: unknown }>)['seed']?.output ?? null, durationMs: Date.now() - t0, lineage: buildLineageContext(seedResult, 'seed') });
        setPipelineProgress(null);
        return;
      }

      const stages = STAGE_IDS.slice(1);
      let nextStage: StageId | null = null;
      for (const s of stages) {
        const state = (sessionRef.current.stageState as Record<string, { output?: unknown }>)[s];
        if (!state?.output) {
          nextStage = s;
          break;
        }
      }
      if (!nextStage) return;

      setRunningStageId(nextStage);
      setPipelineProgress(`Running: ${nextStage}`);
      const t0 = Date.now();
      const provider = getProvider();
      const result = await engineRunStage(sessionRef.current, nextStage, provider);
      setSession(result);
      logGeneration({ sessionId: result.id, category: 'pipeline', source: nextStage, inputSummary: `Stage: ${nextStage}`, output: (result.stageState as Record<string, { output?: unknown }>)[nextStage]?.output ?? null, durationMs: Date.now() - t0, lineage: buildLineageContext(result, nextStage) });
      setPipelineProgress(null);
    } catch (err) {
      setPipelineProgress(`Failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsRunning(false);
      setRunningStageId(null);
    }
  }, [hasApiKey]);

  const runStrand = useCallback(async (stageIds: StageId[]) => {
    if (!sessionRef.current.seedText.trim() || stageIds.length === 0) return;
    setIsRunning(true);
    try {
      for (let i = 0; i < stageIds.length; i++) {
        const stageId = stageIds[i];
        setPipelineProgress(`Running ${i + 1}/${stageIds.length}: ${stageId}`);
        setRunningStageId(stageId);
        const provider = getProvider();
        const result = await engineRunStage(sessionRef.current, stageId, provider);
        setSession(result);
      }
      setPipelineProgress(null);
    } catch (err) {
      setPipelineProgress(`Failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsRunning(false);
      setRunningStageId(null);
    }
  }, [hasApiKey]);

  const stopGuidedRun = useCallback(() => {
    setGuidedRunState(initialGuidedRunState);
    setPipelineProgress(null);
  }, []);

  const addGuidedNote = useCallback((text: string) => {
    setGuidedRunState((prev) => ({ ...prev, userNotes: text }));
  }, []);

  const editNormalizeSummary = useCallback(
    (newSummary: string, previousSummary: string) => {
      setSession((prev) => {
        const event = makeEvent('NORMALIZE_EDIT_SUMMARY', 'normalize', {
          previous: previousSummary,
          next: newSummary,
        }, prev.activeBranchId);
        let updated = appendEvent(prev, event);
        updated = markAllDownstreamStale(updated, 'normalize');
        return updated;
      });
    },
    [],
  );

  const editNormalizeAssumptions = useCallback(
    (
      changes: Array<{
        key: string;
        previous: string;
        next: string;
        userOverride: boolean;
      }>,
    ) => {
      setSession((prev) => {
        const event = makeEvent('NORMALIZE_EDIT_ASSUMPTIONS', 'normalize', {
          changes,
        }, prev.activeBranchId);
        let updated = appendEvent(prev, event);
        updated = markAllDownstreamStale(updated, 'normalize');
        return updated;
      });
    },
    [],
  );

  const pinCandidate = useCallback((candidateId: string) => {
    setSession((prev) => {
      const event = makeEvent('DIVERGE_PIN', 'diverge', { candidateId }, prev.activeBranchId);
      return appendEvent(prev, event);
    });
  }, []);

  const unpinCandidate = useCallback((candidateId: string) => {
    setSession((prev) => {
      const event = makeEvent('DIVERGE_UNPIN', 'diverge', { candidateId }, prev.activeBranchId);
      return appendEvent(prev, event);
    });
  }, []);

  const regenUnpinned = useCallback(async () => {
    setIsRunning(true);
    try {
      const provider = getProvider();
      const cur = sessionRef.current;
      const pinnedIds = getPinnedCandidateIds(cur);
      const result = await engineRegenUnpinned(cur, provider, pinnedIds);
      setSession(result);
    } finally {
      setIsRunning(false);
    }
  }, [hasApiKey]);

  const regenVariant = useCallback(
    async (sourceCandidateId: string, differAlong: string) => {
      setIsRunning(true);
      try {
        const provider = getProvider();
        const result = await engineRegenVariant(
          sessionRef.current,
          provider,
          sourceCandidateId,
          differAlong,
        );
        setSession(result);
      } finally {
        setIsRunning(false);
      }
    },
    [hasApiKey],
  );

  const applyMutation = useCallback(
    (mutationId: string, fromCandidateId: string, mutatedCandidate: DivergeCandidate) => {
      setSession((prev) => {
        const event = makeEvent('MUTATION_APPLIED', 'critique-salvage', {
          mutationId,
          fromCandidateId,
          toCandidateId: mutatedCandidate.id,
          mutatedCandidate: JSON.parse(JSON.stringify(mutatedCandidate)),
        }, prev.activeBranchId);
        let updated = appendEvent(prev, event);
        updated = markAllDownstreamStale(updated, 'critique-salvage');
        return updated;
      });
    },
    [],
  );

  const rejectMutation = useCallback((mutationId: string) => {
    setSession((prev) => {
      const event = makeEvent('MUTATION_REJECTED', 'critique-salvage', { mutationId }, prev.activeBranchId);
      return appendEvent(prev, event);
    });
  }, []);

  const salvageAllAboveThreshold = useCallback(() => {
    setSession((prev) => {
      const csOutput = prev.stageState['critique-salvage']?.output as
        | { critiques: Array<{ candidateId: string; genericness: number }>; mutations: Array<{ candidateId: string; mutationId: string; mutatedCandidate: DivergeCandidate }> }
        | null;
      if (!csOutput) return prev;

      const applied = new Set<string>();
      for (const e of prev.events) {
        if (e.type === 'MUTATION_APPLIED') applied.add(e.data.mutationId as string);
        if (e.type === 'MUTATION_REJECTED') applied.add(e.data.mutationId as string);
      }

      const genericIds = new Set(
        csOutput.critiques.filter((c) => c.genericness >= 6).map((c) => c.candidateId),
      );

      let updated = prev;
      const bestPerCandidate = new Map<string, typeof csOutput.mutations[0]>();

      for (const m of csOutput.mutations) {
        if (applied.has(m.mutationId)) continue;
        if (!genericIds.has(m.candidateId)) continue;
        if (!bestPerCandidate.has(m.candidateId)) bestPerCandidate.set(m.candidateId, m);
      }

      for (const [, m] of bestPerCandidate) {
        const event = makeEvent('MUTATION_APPLIED', 'critique-salvage', {
          mutationId: m.mutationId,
          fromCandidateId: m.candidateId,
          toCandidateId: m.mutatedCandidate.id,
          mutatedCandidate: JSON.parse(JSON.stringify(m.mutatedCandidate)),
        }, prev.activeBranchId);
        updated = appendEvent(updated, event);
      }

      updated = markAllDownstreamStale(updated, 'critique-salvage');
      return updated;
    });
  }, []);

  const setExpandShortlist = useCallback((candidateIds: string[]) => {
    setSession((prev) => {
      const event = makeEvent('EXPAND_SHORTLIST_SET', 'expand', { candidateIds }, prev.activeBranchId);
      let updated = appendEvent(prev, event);
      updated = markAllDownstreamStale(updated, 'expand');
      return updated;
    });
  }, []);

  const editExpansionField = useCallback(
    (candidateId: string, field: string, previous: string, next: string) => {
      setSession((prev) => {
        const event = makeEvent('EXPAND_FIELD_EDIT', 'expand', { candidateId, field, previous, next }, prev.activeBranchId);
        return appendEvent(prev, event);
      });
    },
    [],
  );

  const regenSection = useCallback(
    async (candidateId: string, field: string, hint?: string) => {
      setIsRunning(true);
      try {
        const provider = getProvider();
        const result = await engineRegenSection(sessionRef.current, provider, candidateId, field, hint);
        setSession(result);
      } finally {
        setIsRunning(false);
      }
    },
    [hasApiKey],
  );

  const selectWinner = useCallback((candidateId: string) => {
    setSession((prev) => {
      const event = makeEvent('SELECT_WINNER', 'converge', { candidateId }, prev.activeBranchId);
      return appendEvent(prev, event);
    });
  }, []);

  const selectRunnerUp = useCallback((candidateId: string) => {
    setSession((prev) => {
      const event = makeEvent('SELECT_RUNNER_UP', 'converge', { candidateId }, prev.activeBranchId);
      return appendEvent(prev, event);
    });
  }, []);

  const overrideWinner = useCallback((candidateId: string, reason?: string) => {
    setSession((prev) => {
      const event = makeEvent('OVERRIDE_WINNER', 'converge', { candidateId, reason: reason ?? null }, prev.activeBranchId);
      return appendEvent(prev, event);
    });
  }, []);

  const recordExport = useCallback((type: 'markdown' | 'clipboard', path?: string) => {
    setSession((prev) => {
      const eventType = type === 'markdown' ? 'EXPORT_MARKDOWN' : 'EXPORT_CLIPBOARD';
      const event = makeEvent(eventType, 'commit', { path: path ?? null }, prev.activeBranchId);
      return appendEvent(prev, event);
    });
  }, []);

  const createBranch = useCallback((fromNodeId: string, label?: string): string => {
    const newBranchId = `branch-${crypto.randomUUID().slice(0, 8)}`;
    setSession((prev) => {
      const event = makeEvent('BRANCH_CREATE', undefined, { fromNodeId, newBranchId, label: label ?? null }, prev.activeBranchId);
      let updated = appendEvent(prev, event);
      updated = { ...updated, activeBranchId: newBranchId };
      return updated;
    });
    return newBranchId;
  }, []);

  const divergeFromWinner = useCallback(async () => {
    setIsRunning(true);
    try {
      const cur = sessionRef.current;
      const winnerId = getResolvedWinnerId(cur);
      if (!winnerId) throw new Error('No winner to branch from');

      const candidate = getWinnerCandidate(cur);
      if (!candidate) throw new Error('Winner candidate not found');

      const newBranchId = `branch-${crypto.randomUUID().slice(0, 8)}`;
      const branchEvent = makeEvent('BRANCH_CREATE', undefined, {
        fromNodeId: winnerId,
        newBranchId,
        label: `Diverge from winner: ${candidate.hook.slice(0, 40)}`,
      }, cur.activeBranchId);

      const constraintText =
        `WINNER_CONSTRAINTS: differentiator=${candidate.antiGenericClaim}; ` +
        `constraints=[${candidate.axes.join(', ')}]; hook=${candidate.hook}`;
      const inputEvent = makeEvent('USER_INPUT', undefined, { content: constraintText }, newBranchId);

      let updated = appendEvent(cur, branchEvent);
      updated = { ...updated, activeBranchId: newBranchId };
      updated = appendEvent(updated, inputEvent);
      updated = markAllDownstreamStale(updated, 'seed');

      const provider = getProvider();
      const result = await engineRunStage(updated, 'diverge', provider);
      setSession(result);
    } finally {
      setIsRunning(false);
    }
  }, [hasApiKey]);

  const updateSettings = useCallback((changes: Partial<SessionSettings>) => {
    setSession((prev) => {
      const event = makeEvent('SETTINGS_UPDATE', undefined, { changes }, prev.activeBranchId);
      const newSettings = { ...prev.settings, ...changes };
      return { ...appendEvent(prev, event), settings: newSettings };
    });
  }, []);

  const recordEvalRun = useCallback((mode: string, pass: boolean, summary: string) => {
    setSession((prev) => {
      const event = makeEvent('EVAL_RUN', undefined, { mode, pass, summary }, prev.activeBranchId);
      return appendEvent(prev, event);
    });
  }, []);

  const recordEvalMetrics = useCallback((metrics: Record<string, unknown>) => {
    setSession((prev) => {
      const event = makeEvent('EVAL_METRICS_RECORDED', undefined, { metrics }, prev.activeBranchId);
      return appendEvent(prev, event);
    });
  }, []);

  const recordSmokeRun = useCallback((providerMode: string, pass: boolean, failuresCount: number) => {
    setSession((prev) => {
      const event = makeEvent('SMOKE_RUN', undefined, { providerMode, pass, failuresCount }, prev.activeBranchId);
      return appendEvent(prev, event);
    });
  }, []);

  const recordSmokeResult = useCallback(
    (providerMode: string, ok: boolean, failures: Array<{step: string; error: string}>, timings: Record<string, number>) => {
      setSession((prev) => {
        const event = makeEvent('SMOKE_RESULT', undefined, { providerMode, ok, failures, timings }, prev.activeBranchId);
        return appendEvent(prev, event);
      });
    },
    [],
  );

  const exportArchive = useCallback(async () => {
    const cur = sessionRef.current;
    const history = await getSessionHistory(cur.id);
    const content = JSON.stringify({ ...cur, generationHistory: history }, null, 2);
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const ts = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const filename = `session__${cur.id.slice(0, 8)}__${ts}.json`;

    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    setSession((prev) => {
      const event = makeEvent('SESSION_ARCHIVE_EXPORTED', undefined, {
        path: filename,
        bytes: content.length,
      }, prev.activeBranchId);
      return appendEvent(prev, event);
    });
  }, []);

  const setProjectName = useCallback((name: string) => {
    setSession((prev) => ({ ...prev, projectName: name }));
  }, []);

  const saveFlowState = useCallback((flowState: FlowState) => {
    setSession((prev) => ({ ...prev, flowState }));
  }, []);

  const dismissLoadWarning = useCallback(() => {
    setLoadWarning(null);
  }, []);

  const saveSessionAs = useCallback(async (name: string) => {
    const cur = sessionRef.current;
    const history = await getSessionHistory(cur.id);
    const toSave = { ...cur, projectName: name || cur.projectName, generationHistory: history };
    const data = JSON.stringify(toSave);
    const safeName = name.replace(/[^a-zA-Z0-9_\- ]/g, '_').trim() || 'untitled';
    const stored = JSON.parse(localStorage.getItem('shawndermind-sessions-index') || '{}') as Record<string, string>;
    stored[safeName] = new Date().toISOString();
    localStorage.setItem('shawndermind-sessions-index', JSON.stringify(stored));
    localStorage.setItem(`shawndermind-session-${safeName}`, data);
    setSession((prev) => ({ ...prev, projectName: name || prev.projectName }));
  }, []);

  const loadSessionByName = useCallback(async (name: string) => {
    const safeName = name.replace(/[^a-zA-Z0-9_\- ]/g, '_').trim();
    const result = localStorage.getItem(`shawndermind-session-${safeName}`);
    if (result && typeof result === 'string') {
      const saved = JSON.parse(result) as Session;
      if (!saved.activeBranchId) saved.activeBranchId = 'main';
      if (!saved.settings) saved.settings = { crossCulturalEnabled: false, proxyCultureMode: false, providerMode: 'real' };
      if (saved.projectName === undefined) saved.projectName = '';
      setSession(saved);
    }
  }, []);

  const listSavedSessions = useCallback(async (): Promise<Array<{ name: string; savedAt: string }>> => {
    const stored = JSON.parse(localStorage.getItem('shawndermind-sessions-index') || '{}') as Record<string, string>;
    return Object.entries(stored).map(([name, savedAt]) => ({ name, savedAt }));
  }, []);

  const deleteSavedSession = useCallback(async (name: string) => {
    const safeName = name.replace(/[^a-zA-Z0-9_\- ]/g, '_').trim();
    localStorage.removeItem(`shawndermind-session-${safeName}`);
    const stored = JSON.parse(localStorage.getItem('shawndermind-sessions-index') || '{}') as Record<string, string>;
    delete stored[safeName];
    localStorage.setItem('shawndermind-sessions-index', JSON.stringify(stored));
  }, []);

  const resetSession = useCallback(() => {
    setSession(createNewSession());
  }, []);

  return (
    <SessionContext.Provider
      value={{
        session,
        activeStageId,
        setActiveStageId,
        editSeed,
        editSeedContext,
        addUserInput,
        runStage,
        editNormalizeSummary,
        editNormalizeAssumptions,
        pinCandidate,
        unpinCandidate,
        regenUnpinned,
        regenVariant,
        applyMutation,
        rejectMutation,
        salvageAllAboveThreshold,
        setExpandShortlist,
        editExpansionField,
        regenSection,
        selectWinner,
        selectRunnerUp,
        overrideWinner,
        recordExport,
        createBranch,
        divergeFromWinner,
        updateSettings,
        recordEvalRun,
        recordEvalMetrics,
        recordSmokeRun,
        recordSmokeResult,
        runFullPipeline,
        runInteractivePipeline,
        runNextStage,
        runStrand,
        guidedRunState,
        continueGuidedRun,
        stopGuidedRun,
        addGuidedNote,
        pipelineProgress,
        hasApiKey,
        setProjectName,
        saveFlowState,
        exportArchive,
        saveSessionAs,
        loadSessionByName,
        listSavedSessions,
        deleteSavedSession,
        resetSession,
        isRunning,
        runningStageId,
        loaded,
        loadWarning,
        dismissLoadWarning,
        sessionSizeBytes,
        sessionSizeWarning,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}
