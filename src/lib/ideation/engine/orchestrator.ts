import type { StageId } from './stages';
import {
  STAGE_SCHEMAS,
  DivergeCandidateSchema,
  CritiqueSalvageOutputSchema,
  ExpandOutputSchema,
  ExpandExpansionSchema,
  ConvergeOutputSchema,
} from './schemas';
import type {
  DivergeCandidate,
  DivergeOutput,
  CritiqueSalvageOutput,
  ExpandOutput,
  ExpandExpansion,
  ConvergeOutput,
  CommitOutput,
  CultureBlock,
} from './schemas';
import { getDownstreamStages, getPreviousStage } from './stages';
import type { Provider } from './provider/types';
import type { Session, SessionEvent, StageState } from '../state/sessionTypes';
import { deriveEffectiveNormalize } from './normalize';
import { assemblePipeline } from './diverge/portfolio';
import { buildVariantPrompt } from './prompts/divergePrompt';
import { buildCritiquePrompt } from './critique/critiquePrompt';
import { GENERICNESS_THRESHOLD } from './critique/rubric';
import { buildNormalizePrompt } from './prompts/normalizePrompt';
import { buildExpandPrompt } from './expand/expandPrompt';
import { buildSectionRegenPrompt } from './expand/sectionRegen';
import { buildScorePrompt } from './converge/scorePrompt';
import { roundScores, sortByTotal } from './converge/stability';
import { buildCommitPrompt } from './commit/commitPrompt';
import { sanitizeUserInput } from './security/sanitize';
import { guardBeforeProviderCall, buildSafePrompt } from './security/promptGuards';
import { checkCulture } from './culture/antiExoticism';
import { addCultureInstructions } from './culture/culturePrompt';
import type { SessionSettings } from '../state/sessionTypes';
import {
  getEffectiveCandidatePool,
  getExpandShortlistIds,
  getEffectiveExpansions,
  getUserEditedFields,
  getResolvedWinnerId,
  getWinnerExpansion,
  getWinnerCandidate,
  getEffectiveSettings,
} from '../state/sessionSelectors';

const STAGE_SCHEMA_HINTS: Partial<Record<StageId, string>> = {
  normalize: `Return JSON: { "seedSummary": "<one-paragraph structured summary of the seed idea>", "assumptions": [{ "key": "<name>", "value": "<assumption text>", "userOverride": false }], "clarifyingQuestions": ["<question1>", "<question2>", ...] }. Generate 3-5 assumptions and 2-4 clarifying questions.`,
  iterate: `Return JSON: { "nextPromptSuggestions": "<markdown list of 3-5 follow-up prompt suggestions for the next iteration>" }`,
};

function resolveInfluenceContext(session: Session): string[] {
  const parts: string[] = [];
  const flowState = session.flowState;
  if (!flowState?.nodes || !flowState?.edges) return parts;

  const nodeData = flowState.nodeData;

  for (const n of flowState.nodes) {
    if (!n.type) continue;
    const data = nodeData?.[n.id];

    if (n.type === 'emotion') {
      const text = data?.nodeText as string | undefined;
      if (text?.trim()) {
        parts.push(`[EMOTIONAL CONTEXT] Infuse the following emotional tone throughout this stage: "${text.trim()}". Let this feeling color the creative direction, language, and energy of all outputs.`);
      }
    }

    if (n.type === 'influence') {
      const personName = data?.nodeText as string | undefined;
      const notes = data?.nodeNotes as string | undefined;
      if (personName?.trim()) {
        let influencePrompt = `[CREATIVE INFLUENCE] Channel the creative perspective of ${personName.trim()}. Consider their known decision-making patterns, published works, creative philosophy, and stylistic signatures. Apply their thinking style to shape and refine the outputs.`;
        if (notes?.trim()) {
          influencePrompt += ` Focus especially on: ${notes.trim()}.`;
        }
        parts.push(influencePrompt);
      }
    }

    if (n.type === 'textInfluence') {
      const text = data?.nodeText as string | undefined;
      if (text?.trim()) {
        parts.push(`[TEXT INPUT] Consider the following user-provided text as additional context and creative fuel. Weave its themes, tone, and ideas into the outputs:\n"${text.trim()}"`);
      }
    }

    if (n.type === 'documentInfluence') {
      const text = data?.nodeText as string | undefined;
      const fileName = data?.fileName as string | undefined;
      if (text?.trim()) {
        const label = fileName ? ` (from "${fileName}")` : '';
        parts.push(`[DOCUMENT CONTEXT] The user has provided a reference document${label}. Incorporate its key concepts, structure, and insights into the creative process:\n"${text.trim()}"`);
      }
    }

    if (n.type === 'imageInfluence') {
      const description = data?.nodeText as string | undefined;
      if (description?.trim()) {
        parts.push(`[IMAGE CONTEXT] The user has provided a visual reference described as: "${description.trim()}". Incorporate the visual mood, style, composition, and aesthetic qualities into the creative direction.`);
      }
    }

    if (n.type === 'linkInfluence') {
      const url = data?.nodeText as string | undefined;
      const notes = data?.nodeNotes as string | undefined;
      if (url?.trim()) {
        let linkPrompt = `[LINK REFERENCE] Consider the content and context from this reference URL: ${url.trim()}.`;
        if (notes?.trim()) {
          linkPrompt += ` The user notes: "${notes.trim()}".`;
        }
        linkPrompt += ' Draw on the themes, ideas, and style from this source.';
        parts.push(linkPrompt);
      }
    }

    if (n.type === 'videoInfluence') {
      const description = data?.nodeText as string | undefined;
      if (description?.trim()) {
        parts.push(`[VIDEO REFERENCE] The user has provided video context described as: "${description.trim()}". Channel the visual narrative, pacing, mood, and stylistic elements into the creative output.`);
      }
    }
  }

  return parts;
}

function buildInfluenceBlock(session: Session): string {
  const parts = resolveInfluenceContext(session);
  if (parts.length === 0) return '';

  const numbered = parts.map((p, i) => `${i + 1}. ${p}`).join('\n\n');
  return `\n\n[INFLUENCE DIRECTIVES]\nThe following creative influences and context inputs shape this stage. Synthesize these inputs holistically — not as separate instructions but as facets of a unified creative direction. When influences might conflict, find the creative tension between them rather than choosing one over another.\n\n${numbered}\n\nApply these influences throughout all outputs for this stage.`;
}

function getCustomInstructions(session: Session | undefined, stageId: StageId): string {
  const nodeData = session?.flowState?.nodeData;
  if (!nodeData) return '';
  const data = nodeData[stageId];
  if (!data) return '';
  const custom = data.customInstructions;
  return typeof custom === 'string' ? custom.trim() : '';
}

function appendCustomInstructions(prompt: string, session: Session | undefined, stageId: StageId): string {
  const custom = getCustomInstructions(session, stageId);
  if (!custom) return prompt;
  return prompt + '\n\n[CUSTOM INSTRUCTIONS]\n' + custom;
}

function appendTierDirective(prompt: string, session: Session | undefined): string {
  const tier = session?.settings?.thinkingTier;
  if (!tier || tier === 'standard') return prompt;

  if (tier === 'quick') {
    return prompt + '\n\n[PROCESSING MODE: QUICK]\nPrioritize speed and conciseness. Give direct, focused answers. Minimize elaboration. Aim for the most practical and actionable output.';
  }
  if (tier === 'deep') {
    return prompt + '\n\n[PROCESSING MODE: DEEP THINKING]\nTake extra time to think deeply and creatively. Explore unconventional angles. Provide richer, more nuanced, and more detailed outputs. Consider second-order effects, hidden assumptions, and creative tensions. Push beyond the obvious.';
  }
  return prompt;
}

function buildPrompt(
  stageId: StageId,
  inputs: Record<string, unknown>,
  userInputs: string[],
  settings?: SessionSettings,
  session?: Session,
): string {
  const sanitized = userInputs.map(sanitizeUserInput);
  const schemaHint = STAGE_SCHEMA_HINTS[stageId] ?? '';
  let instructions = `[STAGE:${stageId}]\n\n## Stage: ${stageId}\n\n## Inputs\n${JSON.stringify(inputs, null, 2)}\n\nGenerate the structured output for the ${stageId} stage.\n\n${schemaHint}`;
  if (settings?.crossCulturalEnabled) {
    instructions += addCultureInstructions({ proxyMode: settings.proxyCultureMode });
  }

  if (session) {
    instructions += buildInfluenceBlock(session);
  }

  instructions = appendTierDirective(instructions, session);
  instructions = appendCustomInstructions(instructions, session, stageId);

  return buildSafePrompt(instructions, sanitized);
}

function runSeedStage(session: Session): Session {
  if (!session.seedText.trim()) {
    throw new Error('Enter a seed idea before running.');
  }

  const output = { seedText: session.seedText, ...(session.seedContext ? { seedContext: session.seedContext } : {}) };
  const event = createEvent('STAGE_RUN', 'seed', {
    inputs: { seedText: session.seedText, ...(session.seedContext ? { seedContext: session.seedContext } : {}) },
    output,
  });

  let stageState = markStagesFresh(session.stageState, 'seed', output, event.id);
  stageState = markDownstreamStale(stageState, 'seed');

  return {
    ...session,
    updatedAt: new Date().toISOString(),
    events: [...session.events, event],
    stageState,
  };
}

async function runNormalizeStage(
  session: Session,
  provider: Provider,
): Promise<Session> {
  if (!session.seedText.trim()) {
    throw new Error('Enter a seed idea before running Normalize.');
  }

  const userInputs = getUserInputs(session);
  const influenceContext = resolveInfluenceContext(session);
  let prompt = buildNormalizePrompt(session.seedText, userInputs, session.seedContext, influenceContext);
  prompt += buildInfluenceBlock(session);
  prompt = appendTierDirective(prompt, session);
  prompt = appendCustomInstructions(prompt, session, 'normalize');

  const schema = STAGE_SCHEMAS['normalize'];
  const rawOutput = await provider.generateStructured({ schema, prompt });
  const output = schema.parse(rawOutput);

  const event = createEvent('STAGE_RUN', 'normalize', {
    inputs: { seedText: session.seedText, seedContext: session.seedContext },
    output: JSON.parse(JSON.stringify(output)),
  });

  let stageState = markStagesFresh(session.stageState, 'normalize', output, event.id);
  stageState = markDownstreamStale(stageState, 'normalize');

  return {
    ...session,
    updatedAt: new Date().toISOString(),
    events: [...session.events, event],
    stageState,
  };
}

function getStageInputs(
  session: Session,
  stageId: StageId,
): Record<string, unknown> {
  const contextPart = session.seedContext ? { seedContext: session.seedContext } : {};

  if (stageId === 'seed') {
    return { seedText: session.seedText, ...contextPart };
  }

  if (stageId === 'diverge') {
    const eff = deriveEffectiveNormalize(session);
    return eff
      ? { effectiveNormalize: eff, seedText: session.seedText, ...contextPart }
      : { seedText: session.seedText, ...contextPart };
  }

  if (stageId === 'critique-salvage') {
    const candidates = getEffectiveCandidatePool(session);
    const eff = deriveEffectiveNormalize(session);
    return {
      candidates: candidates.map((c) => ({ id: c.id, hook: c.hook })),
      effectiveNormalize: eff,
    };
  }

  if (stageId === 'expand') {
    let shortlistIds = getExpandShortlistIds(session);
    const candidates = getEffectiveCandidatePool(session);
    if (shortlistIds.length === 0 && candidates.length > 0) {
      shortlistIds = candidates.slice(0, Math.min(5, candidates.length)).map((c) => c.id);
    }
    const shortlisted = candidates.filter((c) => shortlistIds.includes(c.id));
    return {
      shortlistIds,
      candidates: shortlisted.map((c) => ({ id: c.id, hook: c.hook })),
    };
  }

  if (stageId === 'converge') {
    const expansions = getEffectiveExpansions(session);
    const candidates = getEffectiveCandidatePool(session);
    return {
      expansions: expansions.map((e) => ({
        candidateId: e.candidateId,
        concept: e.concept,
      })),
      candidateCount: candidates.length,
    };
  }

  if (stageId === 'commit') {
    const winnerId = getResolvedWinnerId(session);
    const expansion = winnerId ? getWinnerExpansion(session) : null;
    const candidate = winnerId ? getWinnerCandidate(session) : null;
    return {
      winnerId,
      hasExpansion: !!expansion,
      hasCandidate: !!candidate,
    };
  }

  const prevStage = getPreviousStage(stageId);
  if (!prevStage) return {};

  const prevOutput = session.stageState[prevStage]?.output;
  return prevOutput
    ? { previousStageOutput: prevOutput, seedText: session.seedText, ...contextPart }
    : { seedText: session.seedText, ...contextPart };
}

function getUserInputs(session: Session): string[] {
  return session.events
    .filter((e) => e.type === 'USER_INPUT')
    .map((e) => sanitizeUserInput(e.data.content as string));
}

function createEvent(
  type: SessionEvent['type'],
  stageId: StageId | undefined,
  data: Record<string, unknown>,
): SessionEvent {
  return {
    id: crypto.randomUUID(),
    type,
    timestamp: new Date().toISOString(),
    stageId,
    data,
  };
}

function markStagesFresh(
  stageState: Record<string, StageState>,
  stageId: StageId,
  output: unknown,
  eventId: string,
): Record<string, StageState> {
  const updated = { ...stageState };
  updated[stageId] = { output, stale: false, lastRunEventId: eventId };
  return updated;
}

function markDownstreamStale(
  stageState: Record<string, StageState>,
  stageId: StageId,
): Record<string, StageState> {
  const downstream = getDownstreamStages(stageId);
  const updated = { ...stageState };
  for (const dsId of downstream) {
    if (updated[dsId]) {
      updated[dsId] = { ...updated[dsId], stale: true };
    }
  }
  return updated;
}

function runGuard(
  prompt: string,
  userInputs: string[],
  session: Session,
  stageId: StageId,
): { session: Session; blocked: boolean } {
  const check = guardBeforeProviderCall(prompt, userInputs);
  if (!check.safe) {
    const event = createEvent('SAFETY_INTERVENTION', stageId, {
      kind: 'PROMPT_GUARD_BLOCK',
      reason: check.reason ?? 'Unknown',
    });
    return {
      session: {
        ...session,
        updatedAt: new Date().toISOString(),
        events: [...session.events, event],
      },
      blocked: true,
    };
  }
  return { session, blocked: false };
}

function runCultureChecks(
  candidates: DivergeCandidate[],
  session: Session,
  stageId: StageId,
): { session: Session; interventions: SessionEvent[] } {
  const settings = getEffectiveSettings(session);
  if (!settings.crossCulturalEnabled) return { session, interventions: [] };

  const interventions: SessionEvent[] = [];
  let updated = session;

  for (const c of candidates) {
    if (!c.culture) continue;
    const result = checkCulture(c.culture);
    if (!result.ok) {
      if (settings.proxyCultureMode) {
        const event = createEvent('SAFETY_INTERVENTION', stageId, {
          kind: 'PROXY_MODE_APPLIED',
          candidateId: c.id,
          flags: result.flags,
        });
        interventions.push(event);
      } else {
        const event = createEvent('SAFETY_INTERVENTION', stageId, {
          kind: 'EXOTICISM_FAIL',
          candidateId: c.id,
          flags: result.flags,
          requiresSalvage: true,
        });
        interventions.push(event);
        if (c.culture) {
          (c.culture as CultureBlock).exoticismFlags = result.flags.join('; ');
        }
      }
    }
  }

  if (interventions.length > 0) {
    updated = {
      ...updated,
      updatedAt: new Date().toISOString(),
      events: [...updated.events, ...interventions],
    };
  }

  return { session: updated, interventions };
}

async function runDivergeStage(
  session: Session,
  provider: Provider,
): Promise<Session> {
  const effectiveNormalize = deriveEffectiveNormalize(session);
  if (!effectiveNormalize) {
    throw new Error('Normalize must be run before Diverge');
  }
  const userInputs = getUserInputs(session);
  const settings = getEffectiveSettings(session);

  const guardResult = runGuard('', userInputs, session, 'diverge');
  if (guardResult.blocked) {
    throw new Error('Safety guard blocked this stage run. Check history for details.');
  }
  session = guardResult.session;

  const influenceBlock = buildInfluenceBlock(session);
  const { output, meta } = await assemblePipeline(
    effectiveNormalize,
    userInputs,
    provider,
    [],
    influenceBlock || undefined,
  );

  const { session: checkedSession } = runCultureChecks(
    output.candidates,
    session,
    'diverge',
  );
  session = checkedSession;

  const event = createEvent('STAGE_RUN', 'diverge', {
    inputs: JSON.parse(JSON.stringify(effectiveNormalize)),
    output: JSON.parse(JSON.stringify(output)),
    quotaCheck: JSON.parse(JSON.stringify(meta.quotaResult)),
    dedupSummary: JSON.parse(JSON.stringify(meta.dedupSummary)),
    axesViolations: meta.axesViolations,
    attempts: meta.attempts,
  });

  let stageState = markStagesFresh(
    session.stageState,
    'diverge',
    output,
    event.id,
  );
  stageState = markDownstreamStale(stageState, 'diverge');

  return {
    ...session,
    updatedAt: new Date().toISOString(),
    events: [...session.events, event],
    stageState,
  };
}

async function runCritiqueSalvageStage(
  session: Session,
  provider: Provider,
): Promise<Session> {
  const candidates = getEffectiveCandidatePool(session);
  if (candidates.length === 0) {
    throw new Error('Diverge must be run before Critique/Salvage');
  }

  const effectiveNormalize = deriveEffectiveNormalize(session);
  if (!effectiveNormalize) {
    throw new Error('Normalize must be run before Critique/Salvage');
  }

  let prompt = buildCritiquePrompt(candidates, effectiveNormalize);
  prompt += buildInfluenceBlock(session);
  prompt = appendTierDirective(prompt, session);
  prompt = appendCustomInstructions(prompt, session, 'critique-salvage');
  const rawOutput = await provider.generateStructured({
    schema: CritiqueSalvageOutputSchema,
    prompt,
  });
  const output = CritiqueSalvageOutputSchema.parse(rawOutput);

  const event = createEvent('CRITIQUE_RUN', 'critique-salvage', {
    portfolioSize: candidates.length,
    threshold: GENERICNESS_THRESHOLD,
    output: JSON.parse(JSON.stringify(output)),
    resultSummary: {
      totalCritiqued: output.critiques.length,
      genericCount: output.critiques.filter(
        (c) => c.genericness >= GENERICNESS_THRESHOLD,
      ).length,
      mutationsGenerated: output.mutations.length,
    },
  });

  let stageState = markStagesFresh(
    session.stageState,
    'critique-salvage',
    output,
    event.id,
  );
  stageState = markDownstreamStale(stageState, 'critique-salvage');

  return {
    ...session,
    updatedAt: new Date().toISOString(),
    events: [...session.events, event],
    stageState,
  };
}

async function runExpandStage(
  session: Session,
  provider: Provider,
): Promise<Session> {
  let shortlistIds = getExpandShortlistIds(session);

  if (shortlistIds.length === 0) {
    const pool = getEffectiveCandidatePool(session);
    if (pool.length === 0) {
      throw new Error('No candidates available — run Diverge and Critique first');
    }
    shortlistIds = pool.slice(0, Math.min(5, pool.length)).map((c) => c.id);
  }

  if (shortlistIds.length < 1 || shortlistIds.length > 5) {
    throw new Error('Expand requires a shortlist of 1–5 candidates');
  }

  const candidates = getEffectiveCandidatePool(session);
  const effectiveNormalize = deriveEffectiveNormalize(session);
  if (!effectiveNormalize) {
    throw new Error('Normalize must be run before Expand');
  }

  const userInputs = getUserInputs(session);
  const expandInfluence = buildInfluenceBlock(session);
  const expansions: ExpandExpansion[] = [];

  for (const id of shortlistIds) {
    const candidate = candidates.find((c) => c.id === id);
    if (!candidate) continue;

    let prompt = buildExpandPrompt(candidate, effectiveNormalize, userInputs);
    prompt += expandInfluence;
    prompt = appendTierDirective(prompt, session);
    prompt = appendCustomInstructions(prompt, session, 'expand');
    const rawExpansion = await provider.generateStructured({
      schema: ExpandExpansionSchema,
      prompt,
    });
    expansions.push(ExpandExpansionSchema.parse(rawExpansion));
  }

  const output: ExpandOutput = { expansions };
  ExpandOutputSchema.parse(output);

  const event = createEvent('EXPAND_RUN', 'expand', {
    candidateIds: shortlistIds,
    output: JSON.parse(JSON.stringify(output)),
    resultSummary: { expanded: expansions.length },
  });

  let stageState = markStagesFresh(
    session.stageState,
    'expand',
    output,
    event.id,
  );
  stageState = markDownstreamStale(stageState, 'expand');

  return {
    ...session,
    updatedAt: new Date().toISOString(),
    events: [...session.events, event],
    stageState,
  };
}

async function runConvergeStage(
  session: Session,
  provider: Provider,
): Promise<Session> {
  const expansions = getEffectiveExpansions(session);
  if (expansions.length === 0) {
    throw new Error('Expand must be run before Converge');
  }

  const candidates = getEffectiveCandidatePool(session);
  let prompt = buildScorePrompt(expansions, candidates);
  prompt += buildInfluenceBlock(session);
  prompt = appendTierDirective(prompt, session);
  prompt = appendCustomInstructions(prompt, session, 'converge');

  const rawOutput = await provider.generateStructured({
    schema: ConvergeOutputSchema,
    prompt,
  });
  const parsed = ConvergeOutputSchema.parse(rawOutput);

  const output: ConvergeOutput = {
    ...parsed,
    scorecard: sortByTotal(roundScores(parsed.scorecard)),
  };

  const event = createEvent('CONVERGE_RUN', 'converge', {
    shortlistIds: expansions.map((e) => e.candidateId),
    output: JSON.parse(JSON.stringify(output)),
    scoreSummary: {
      winnerId: output.winnerId,
      runnerUpId: output.runnerUpId,
      scores: output.scorecard.length,
    },
  });

  let stageState = markStagesFresh(
    session.stageState,
    'converge',
    output,
    event.id,
  );
  stageState = markDownstreamStale(stageState, 'converge');

  return {
    ...session,
    updatedAt: new Date().toISOString(),
    events: [...session.events, event],
    stageState,
  };
}

async function runCommitStage(
  session: Session,
  provider: Provider,
  templateType: string = 'game-one-pager',
): Promise<Session> {
  const winnerId = getResolvedWinnerId(session);
  if (!winnerId) throw new Error('No winner selected — run Converge first');

  const candidate = getWinnerCandidate(session);
  if (!candidate) throw new Error('Winner candidate not found in pool');

  const expansion = getWinnerExpansion(session);
  if (!expansion) throw new Error('No expansion for winner — run Expand first');

  const effectiveNormalize = deriveEffectiveNormalize(session);
  if (!effectiveNormalize) throw new Error('Normalize must be run');

  const userInputs = getUserInputs(session);

  let prompt = buildCommitPrompt({
    winnerId,
    candidate,
    expansion,
    effectiveNormalize,
    userInputs,
    templateType,
  });
  prompt += buildInfluenceBlock(session);
  prompt = appendTierDirective(prompt, session);
  prompt = appendCustomInstructions(prompt, session, 'commit');

  const rawOutput = await provider.generateStructured({
    schema: STAGE_SCHEMAS['commit'],
    prompt,
  });
  const output = STAGE_SCHEMAS['commit'].parse(rawOutput) as CommitOutput;

  const commitEvent = createEvent('COMMIT_RUN', 'commit', {
    templateType,
    winnerId,
    title: output.title,
    output: JSON.parse(JSON.stringify(output)),
  });

  let stageState = markStagesFresh(
    session.stageState,
    'commit',
    output,
    commitEvent.id,
  );
  stageState = markDownstreamStale(stageState, 'commit');

  return {
    ...session,
    updatedAt: new Date().toISOString(),
    events: [...session.events, commitEvent],
    stageState,
  };
}

export async function runStage(
  session: Session,
  stageId: StageId,
  provider: Provider,
  opts?: { templateType?: string },
): Promise<Session> {
  if (stageId === 'seed') return runSeedStage(session);
  if (stageId === 'normalize') return runNormalizeStage(session, provider);
  if (stageId === 'diverge') return runDivergeStage(session, provider);
  if (stageId === 'critique-salvage')
    return runCritiqueSalvageStage(session, provider);
  if (stageId === 'expand') return runExpandStage(session, provider);
  if (stageId === 'converge') return runConvergeStage(session, provider);
  if (stageId === 'commit') return runCommitStage(session, provider, opts?.templateType);

  const schema = STAGE_SCHEMAS[stageId];
  const inputs = getStageInputs(session, stageId);
  const userInputs = getUserInputs(session);
  const prompt = buildPrompt(stageId, inputs, userInputs, getEffectiveSettings(session), session);

  const rawOutput = await provider.generateStructured({ schema, prompt });
  const output = schema.parse(rawOutput);

  const event = createEvent('STAGE_RUN', stageId, {
    inputs: JSON.parse(JSON.stringify(inputs)),
    output: JSON.parse(JSON.stringify(output)),
  });

  let stageState = markStagesFresh(
    session.stageState,
    stageId,
    output,
    event.id,
  );
  stageState = markDownstreamStale(stageState, stageId);

  return {
    ...session,
    updatedAt: new Date().toISOString(),
    events: [...session.events, event],
    stageState,
  };
}

export async function regenDivergeUnpinned(
  session: Session,
  provider: Provider,
  pinnedIds: Set<string>,
): Promise<Session> {
  const currentOutput = session.stageState['diverge']?.output as
    | DivergeOutput
    | null;
  if (!currentOutput)
    throw new Error('No diverge output to regenerate from');

  const effectiveNormalize = deriveEffectiveNormalize(session);
  if (!effectiveNormalize)
    throw new Error('Normalize must be run before Diverge regen');

  const pinnedCandidates = currentOutput.candidates.filter((c) =>
    pinnedIds.has(c.id),
  );
  const userInputs = getUserInputs(session);

  const { output, meta } = await assemblePipeline(
    effectiveNormalize,
    userInputs,
    provider,
    pinnedCandidates,
  );

  const regenEvent = createEvent('DIVERGE_REGEN_UNPINNED', 'diverge', {
    keptPinnedIds: [...pinnedIds],
  });

  const stageEvent = createEvent('STAGE_RUN', 'diverge', {
    inputs: JSON.parse(JSON.stringify(effectiveNormalize)),
    output: JSON.parse(JSON.stringify(output)),
    quotaCheck: JSON.parse(JSON.stringify(meta.quotaResult)),
    dedupSummary: JSON.parse(JSON.stringify(meta.dedupSummary)),
    trigger: 'regen_unpinned',
  });

  let stageState = markStagesFresh(
    session.stageState,
    'diverge',
    output,
    stageEvent.id,
  );
  stageState = markDownstreamStale(stageState, 'diverge');

  return {
    ...session,
    updatedAt: new Date().toISOString(),
    events: [...session.events, regenEvent, stageEvent],
    stageState,
  };
}

export async function regenDivergeVariant(
  session: Session,
  provider: Provider,
  sourceCandidateId: string,
  differAlong: string,
): Promise<Session> {
  const currentOutput = session.stageState['diverge']?.output as
    | DivergeOutput
    | null;
  if (!currentOutput) throw new Error('No diverge output for variant regen');

  const source = currentOutput.candidates.find(
    (c) => c.id === sourceCandidateId,
  );
  if (!source) throw new Error('Source candidate not found');

  const effectiveNormalize = deriveEffectiveNormalize(session);
  const prompt = buildVariantPrompt(source, differAlong, effectiveNormalize);

  const newCandidate = await provider.generateStructured({
    schema: DivergeCandidateSchema,
    prompt,
  });

  const replacementId = crypto.randomUUID();
  const updatedCandidates = currentOutput.candidates.map((c) =>
    c.id === sourceCandidateId ? { ...newCandidate, id: replacementId } : c,
  );
  const output: DivergeOutput = { candidates: updatedCandidates };

  const variantEvent = createEvent('DIVERGE_REGEN_VARIANT', 'diverge', {
    sourceCandidateId,
    differAlong,
    replacedCandidateId: sourceCandidateId,
    newCandidateId: replacementId,
  });

  let stageState = { ...session.stageState };
  stageState['diverge'] = {
    ...stageState['diverge'],
    output,
  };
  stageState = markDownstreamStale(stageState, 'diverge');

  return {
    ...session,
    updatedAt: new Date().toISOString(),
    events: [...session.events, variantEvent],
    stageState,
  };
}

export async function regenExpandSection(
  session: Session,
  provider: Provider,
  candidateId: string,
  field: string,
  hint?: string,
): Promise<Session> {
  const candidates = getEffectiveCandidatePool(session);
  const candidate = candidates.find((c) => c.id === candidateId);
  if (!candidate) throw new Error('Candidate not found');

  const currentExpansions = getEffectiveExpansions(session);
  const expansion = currentExpansions.find(
    (e) => e.candidateId === candidateId,
  );
  if (!expansion) throw new Error('No expansion for this candidate');

  const userEdited = getUserEditedFields(session, candidateId);
  if (userEdited.has(field)) {
    throw new Error(`Field "${field}" has user edits — skipping regen to preserve`);
  }

  const prompt = buildSectionRegenPrompt(candidate, expansion, field, hint);
  const rawResult = await provider.generateStructured({
    schema: ExpandExpansionSchema,
    prompt,
  });
  const regenResult = ExpandExpansionSchema.parse(rawResult);
  const newValue = (regenResult as Record<string, unknown>)[field];

  const currentOutput = session.stageState['expand']?.output as ExpandOutput;
  const updatedExpansions = currentOutput.expansions.map((e) =>
    e.candidateId === candidateId ? { ...e, [field]: newValue } : e,
  );

  const output: ExpandOutput = { expansions: updatedExpansions };
  const event = createEvent('EXPAND_SECTION_REGEN', 'expand', {
    candidateId,
    field,
    promptHint: hint ?? null,
  });

  const stageState = { ...session.stageState };
  stageState['expand'] = { ...stageState['expand'], output };

  return {
    ...session,
    updatedAt: new Date().toISOString(),
    events: [...session.events, event],
    stageState,
  };
}

export {
  buildPrompt,
  getStageInputs,
  getUserInputs,
  markDownstreamStale,
};
