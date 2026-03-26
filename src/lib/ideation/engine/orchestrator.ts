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
import type { Provider, MediaPart } from './provider/types';
import type { Session, SessionEvent, StageState, SeedMediaItem } from '../state/sessionTypes';
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
import { getPersona as getWritingRoomPersona } from '@tools/writing-room/agents';
import { generateText as aiGenerateText } from '@shawnderland/ai';
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

function buildNormalizeSchemaHint(session: Session): string {
  const nodeData = session.flowState?.nodeData?.['normalize'] as Record<string, unknown> | undefined;
  const qCount = typeof nodeData?.questionCount === 'number' ? nodeData.questionCount : 4;
  return `Return JSON: { "seedSummary": "<one-paragraph structured summary of the seed idea>", "assumptions": [{ "key": "<name>", "value": "<assumption text>", "userOverride": false }], "clarifyingQuestions": ["<question1>", "<question2>", ...] }. Generate 3-5 assumptions and exactly ${qCount} clarifying questions. Each question must be unique to this specific seed idea — never generic boilerplate.`;
}

const STAGE_SCHEMA_HINTS: Partial<Record<StageId, string>> = {
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

    if (n.type === 'wrPersona') {
      const personaId = data?.personaId as string | undefined;
      if (personaId) {
        const persona = getWritingRoomPersona(personaId);
        if (persona) {
          let directive = `[CREATIVE PERSONA] You are channeling the creative mind of ${persona.name} (${persona.role}).\nHere is their creative identity and voice:\n${persona.researchData}\n\nThink, speak, and create as this person would. Let their worldview, aesthetic sensibility, and creative instincts shape every output.`;
          const moodDirective = data?.moodDirective as string | undefined;
          if (moodDirective?.trim()) {
            directive += `\n\nCURRENT STATE OF MIND: ${moodDirective.trim()}\nThis emotional state colors their creative judgment right now — let it affect tone, risk tolerance, and the kinds of ideas they gravitate toward.`;
          }
          const useCurrentEvents = data?.useCurrentEvents as boolean | undefined;
          const eventsCache = data?.currentEventsCache as { summary?: string; fetchedAt?: number } | undefined;
          if (useCurrentEvents && eventsCache?.summary?.trim()) {
            directive += `\n\n[CURRENT WORLD EVENTS — as ${persona.name} sees them]\n` +
              `These are real events happening in the world right now that ${persona.name} is aware of ` +
              `and affected by — just as a real person would be. Let these shape their creative instincts, ` +
              `references, and emotional state:\n\n${eventsCache.summary.trim()}\n\n` +
              `React to these naturally. If something excites or disturbs this persona, let it show in the work.`;
          }
          parts.push(directive);
        }
      }
    }

    if (n.type === 'agentThinking') {
      const latestThought = data?._latestThought as string | undefined;
      if (latestThought?.trim()) {
        parts.push(`[AGENT'S INTERNAL THOUGHT PROCESS]\nBefore working on this stage, the creative persona thought through the problem. Here is their internal monologue — use this thinking to shape your approach, priorities, and creative direction:\n\n"${latestThought.trim()}"\n\nLet this thought process guide the creative output. The persona's instincts, concerns, and ideas expressed above should be reflected in the results.`);
      }
    }
  }

  return parts;
}

function resolvePromptInjections(session: Session): { preprompts: string[]; postprompts: string[] } {
  const preprompts: string[] = [];
  const postprompts: string[] = [];
  const flowState = session.flowState;
  if (!flowState?.nodes) return { preprompts, postprompts };

  const nodeData = flowState.nodeData;

  for (const n of flowState.nodes) {
    if (!n.type) continue;
    const data = nodeData?.[n.id];

    if (n.type === 'preprompt') {
      const text = data?.nodeText as string | undefined;
      if (text?.trim()) {
        preprompts.push(text.trim());
      }
    }

    if (n.type === 'postprompt') {
      const text = data?.nodeText as string | undefined;
      if (text?.trim()) {
        postprompts.push(text.trim());
      }
    }
  }

  return { preprompts, postprompts };
}

function buildPrepromptBlock(session: Session): string {
  const { preprompts } = resolvePromptInjections(session);
  if (preprompts.length === 0) return '';

  const block = preprompts.map((p, i) =>
    preprompts.length === 1 ? p : `${i + 1}. ${p}`
  ).join('\n\n');

  return `[PREPROMPT — READ THIS FIRST]\nThe user has provided framing context that must shape how you interpret everything that follows. Internalize this before processing the stage data.\n\n${block}\n\n`;
}

function buildPostpromptBlock(session: Session): string {
  const { postprompts } = resolvePromptInjections(session);
  if (postprompts.length === 0) return '';

  const block = postprompts.map((p, i) =>
    postprompts.length === 1 ? p : `${i + 1}. ${p}`
  ).join('\n\n');

  return `\n\n[POSTPROMPT — FINAL INSTRUCTION]\nAfter processing all the above data, apply the following user instruction as a final directive:\n\n${block}`;
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

function appendStrictAdherence(prompt: string, session: Session | undefined): string {
  if (!session?.settings?.strictAdherence) return prompt;
  return prompt +
    '\n\n[STRICT ADHERENCE MODE]\n' +
    'The user has enabled Strict Adherence. You MUST interpret the seed idea and all inputs ' +
    'EXACTLY as stated. Do NOT impose any framing, categorization, or domain that is not ' +
    'explicitly present in the user\'s words.\n' +
    '- Do NOT assume this is a "product", "game", "app", "business", "startup", or any other ' +
    'category unless the user EXPLICITLY states it or it is unmistakable from context.\n' +
    '- Do NOT invent target audiences, markets, revenue models, or use cases.\n' +
    '- Do NOT reinterpret abstract or open-ended ideas as commercial/utilitarian concepts.\n' +
    '- Keep all outputs tightly scoped to what the user actually wrote.\n' +
    '- If the idea is vague, treat it as intentionally open — do not narrow it.\n';
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
  const schemaHint = stageId === 'normalize' && session
    ? buildNormalizeSchemaHint(session)
    : (STAGE_SCHEMA_HINTS[stageId] ?? '');

  const preprompt = session ? buildPrepromptBlock(session) : '';

  let instructions = `${preprompt}[STAGE:${stageId}]\n\n## Stage: ${stageId}\n\n## Inputs\n${JSON.stringify(inputs, null, 2)}\n\nGenerate the structured output for the ${stageId} stage.\n\n${schemaHint}`;
  if (settings?.crossCulturalEnabled) {
    instructions += addCultureInstructions({ proxyMode: settings.proxyCultureMode });
  }

  if (session) {
    instructions += buildInfluenceBlock(session);
  }

  instructions = appendStrictAdherence(instructions, session);
  instructions = appendTierDirective(instructions, session);
  instructions = appendCustomInstructions(instructions, session, stageId);

  if (session) {
    instructions += buildPostpromptBlock(session);
  }

  return buildSafePrompt(instructions, sanitized);
}

/* ── Agent Thinking: persona thought generation before stage runs ── */

const STAGE_THINKING_LABELS: Record<string, string> = {
  normalize: 'Normalize',
  diverge: 'Diverge',
  'critique-salvage': 'Critique',
  expand: 'Expand',
  converge: 'Converge',
  commit: 'Commit',
  iterate: 'Iterate',
};

interface ActivePersona {
  personaId: string;
  name: string;
  avatar: string;
  role: string;
  researchData: string;
  moodDirective: string;
  useCurrentEvents: boolean;
  currentEventsSummary: string;
}

function getActivePersona(session: Session): ActivePersona | null {
  const flowState = session.flowState;
  if (!flowState?.nodes) return null;

  for (const n of flowState.nodes) {
    if (n.type !== 'wrPersona') continue;
    const data = flowState.nodeData?.[n.id];
    const personaId = data?.personaId as string | undefined;
    if (!personaId) continue;
    const persona = getWritingRoomPersona(personaId);
    if (!persona) continue;
    const eventsCache = data?.currentEventsCache as { summary?: string } | undefined;
    return {
      personaId,
      name: persona.name,
      avatar: persona.avatar,
      role: persona.role,
      researchData: persona.researchData ?? '',
      moodDirective: (data?.moodDirective as string) ?? '',
      useCurrentEvents: (data?.useCurrentEvents as boolean) ?? false,
      currentEventsSummary: eventsCache?.summary?.trim() ?? '',
    };
  }
  return null;
}

function findThinkingNodeId(session: Session): string | null {
  const flowState = session.flowState;
  if (!flowState?.nodes) return null;
  for (const n of flowState.nodes) {
    if (n.type === 'agentThinking') return n.id;
  }
  return null;
}

function injectPersonaThoughtContext(
  session: Session,
  _persona: ActivePersona,
  thought: string,
  _stageId: StageId,
): Session {
  const thinkingNodeId = findThinkingNodeId(session);
  if (!thinkingNodeId) return session;

  const existingNodeData = session.flowState?.nodeData?.[thinkingNodeId] as Record<string, unknown> | undefined;

  return {
    ...session,
    flowState: {
      ...(session.flowState ?? { nodes: [], edges: [] }),
      nodeData: {
        ...(session.flowState?.nodeData ?? {}),
        [thinkingNodeId]: {
          ...(existingNodeData ?? {}),
          _latestThought: thought.trim(),
        },
      },
    },
  };
}

async function generatePersonaThought(
  session: Session,
  stageId: StageId,
  _provider: Provider,
  persona: ActivePersona,
): Promise<{ thought: string; updatedSession: Session }> {
  const seedDesc = getSeedDescription(session);
  const stageLabel = STAGE_THINKING_LABELS[stageId] ?? stageId;

  const existingOutput = session.stageState[stageId]?.output;
  const contextHint = existingOutput
    ? `\nPrevious stage output exists and will be refreshed.`
    : `\nThis stage has not been run yet.`;

  const moodBlock = persona.moodDirective.trim()
    ? `\n\nYour current state of mind: ${persona.moodDirective.trim()}\nThis is how you're feeling RIGHT NOW. Let it color your thinking, your tone, your instincts.`
    : '';

  const eventsBlock = (persona.useCurrentEvents && persona.currentEventsSummary)
    ? `\n\nYou're also aware of what's happening in the world right now:\n${persona.currentEventsSummary.slice(0, 1500)}\nThese real events are on your mind. Reference them if they're relevant to the creative task.`
    : '';

  const prompt = [
    `You are ${persona.name}, a ${persona.role}.`,
    `Here is who you are:\n${persona.researchData}`,
    moodBlock,
    eventsBlock,
    `\nThe creator has given you this seed idea: "${seedDesc}"`,
    contextHint,
    `\nYou are about to work on the "${stageLabel}" stage of the creative pipeline.`,
    `\nThink through this stage from YOUR unique perspective. What matters to you here? What are your instincts telling you? How does your mood affect your approach?`,
    `Write 2-4 sentences of raw, honest internal monologue — as if thinking out loud in your own voice. Be specific about the seed idea. Don't be generic.`,
    `Do NOT use any formatting, headers, or bullet points. Just pure thought.`,
  ].join('\n');

  let thought: string;
  try {
    thought = await aiGenerateText(prompt, { temperature: 0.7 });
  } catch {
    thought = `[${persona.name} is thinking about ${stageLabel}...]`;
  }

  const thinkingNodeId = findThinkingNodeId(session);
  if (!thinkingNodeId) {
    return { thought, updatedSession: session };
  }

  const existingNodeData = session.flowState?.nodeData?.[thinkingNodeId] as Record<string, unknown> | undefined;
  const existingThoughts = (existingNodeData?.thoughts as Array<Record<string, unknown>>) ?? [];

  const newThought = {
    stageId,
    stageLabel,
    personaName: persona.name,
    personaAvatar: persona.avatar,
    mood: persona.moodDirective.trim(),
    thought: thought.trim(),
    timestamp: Date.now(),
  };

  const updatedNodeData: Record<string, Record<string, unknown>> = {
    ...(session.flowState?.nodeData ?? {}),
    [thinkingNodeId]: {
      ...(existingNodeData ?? {}),
      thoughts: [...existingThoughts, newThought],
    },
  };

  const updatedSession: Session = {
    ...session,
    flowState: {
      ...(session.flowState ?? { nodes: [], edges: [] }),
      nodeData: updatedNodeData,
    },
  };

  return { thought, updatedSession };
}

function buildSeedMediaParts(session: Session): MediaPart[] {
  const parts: MediaPart[] = [];
  if (!session.seedMedia?.length) return parts;
  for (const m of session.seedMedia) {
    if ((m.type === 'image' || m.type === 'video') && m.base64) {
      parts.push({ inlineData: { mimeType: m.mimeType, data: m.base64 } });
    }
  }
  return parts;
}

function buildSeedMediaTextBlock(session: Session): string {
  if (!session.seedMedia?.length) return '';
  const blocks: string[] = [];
  for (const m of session.seedMedia) {
    if (m.type === 'document' && m.textContent) {
      blocks.push(`[UPLOADED DOCUMENT: "${m.fileName}"]\n${m.textContent}`);
    }
    if (m.type === 'image') {
      blocks.push(`[UPLOADED IMAGE: "${m.fileName}" — analyze the image content above and incorporate it as the seed idea]`);
    }
    if (m.type === 'video') {
      blocks.push(`[UPLOADED VIDEO: "${m.fileName}" — analyze the video content above and incorporate it as the seed idea]`);
    }
  }
  if (blocks.length === 0) return '';
  return '\n\n[SEED MEDIA INPUTS]\n' + blocks.join('\n\n');
}

function hasSeedContent(session: Session): boolean {
  return session.seedText.trim().length > 0 || (session.seedMedia ?? []).length > 0;
}

function getSeedDescription(session: Session): string {
  if (session.seedText.trim()) return session.seedText;
  const media = session.seedMedia ?? [];
  if (media.length === 0) return '';
  return media.map((m) => `[${m.type}: ${m.fileName}]`).join(', ');
}

function runSeedStage(session: Session): Session {
  if (!hasSeedContent(session)) {
    throw new Error('Enter a seed idea or upload media before running.');
  }

  const seedDesc = getSeedDescription(session);
  const output = {
    seedText: seedDesc,
    ...(session.seedContext ? { seedContext: session.seedContext } : {}),
    ...(session.seedMedia?.length ? { hasMedia: true, mediaCount: session.seedMedia.length } : {}),
  };
  const event = createEvent('STAGE_RUN', 'seed', {
    inputs: { seedText: seedDesc, ...(session.seedContext ? { seedContext: session.seedContext } : {}) },
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
  if (!hasSeedContent(session)) {
    throw new Error('Enter a seed idea or upload media before running Normalize.');
  }

  const userInputs = getUserInputs(session);
  const settings = getEffectiveSettings(session);
  const influenceContext = resolveInfluenceContext(session);
  const preprompt = buildPrepromptBlock(session);
  const seedDesc = getSeedDescription(session);
  const normNodeData = session.flowState?.nodeData?.['normalize'] as Record<string, unknown> | undefined;
  const questionCount = typeof normNodeData?.questionCount === 'number' ? normNodeData.questionCount : 4;
  let prompt = preprompt + buildNormalizePrompt(seedDesc, userInputs, session.seedContext, influenceContext, settings.strictAdherence, questionCount);
  prompt += buildSeedMediaTextBlock(session);
  prompt += buildInfluenceBlock(session);
  prompt = appendStrictAdherence(prompt, session);
  prompt = appendTierDirective(prompt, session);
  prompt = appendCustomInstructions(prompt, session, 'normalize');
  prompt += buildPostpromptBlock(session);

  const mediaParts = buildSeedMediaParts(session);
  const schema = STAGE_SCHEMAS['normalize'];
  const rawOutput = await provider.generateStructured({ schema, prompt, mediaParts: mediaParts.length > 0 ? mediaParts : undefined });
  const output = schema.parse(rawOutput);

  const event = createEvent('STAGE_RUN', 'normalize', {
    inputs: { seedText: seedDesc, seedContext: session.seedContext },
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
  const seedDesc = getSeedDescription(session);

  if (stageId === 'seed') {
    return { seedText: seedDesc, ...contextPart };
  }

  if (stageId === 'diverge') {
    const eff = deriveEffectiveNormalize(session);
    return eff
      ? { effectiveNormalize: eff, seedText: seedDesc, ...contextPart }
      : { seedText: seedDesc, ...contextPart };
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
    ? { previousStageOutput: prevOutput, seedText: seedDesc, ...contextPart }
    : { seedText: seedDesc, ...contextPart };
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

  const preprompt = buildPrepromptBlock(session);
  const postprompt = buildPostpromptBlock(session);
  let influenceBlock = buildInfluenceBlock(session);
  if (settings.strictAdherence) {
    influenceBlock +=
      '\n\n[STRICT ADHERENCE MODE]\n' +
      'The user has enabled Strict Adherence. You MUST generate candidates that stay true to ' +
      'EXACTLY what the user stated in their seed idea. Do NOT assume this is any particular type ' +
      'of product, game, app, or business unless the user EXPLICITLY said so. Do NOT invent ' +
      'target audiences, markets, or commercial angles. If the idea is abstract or open-ended, ' +
      'generate candidates that explore it on its own terms — not as a product pitch.\n';
  }
  if (preprompt) influenceBlock = preprompt + influenceBlock;
  if (postprompt) influenceBlock += postprompt;
  const divergeNodeData = session.flowState?.nodeData?.['diverge'] as Record<string, unknown> | undefined;
  const customLensCounts = divergeNodeData ? {
    practical: typeof divergeNodeData.practicalCount === 'number' ? divergeNodeData.practicalCount : undefined,
    inversion: typeof divergeNodeData.inversionCount === 'number' ? divergeNodeData.inversionCount : undefined,
    constraint: typeof divergeNodeData.constraintCount === 'number' ? divergeNodeData.constraintCount : undefined,
  } : undefined;

  const { output, meta } = await assemblePipeline(
    effectiveNormalize,
    userInputs,
    provider,
    [],
    influenceBlock || undefined,
    customLensCounts,
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

  let prompt = buildPrepromptBlock(session) + buildCritiquePrompt(candidates, effectiveNormalize);
  prompt += buildInfluenceBlock(session);
  prompt = appendStrictAdherence(prompt, session);
  prompt = appendTierDirective(prompt, session);
  prompt = appendCustomInstructions(prompt, session, 'critique-salvage');
  prompt += buildPostpromptBlock(session);
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

  const expandNodeData = session.flowState?.nodeData?.['expand'] as Record<string, unknown> | undefined;
  const configuredExpandCount = typeof expandNodeData?.expandCount === 'number' ? expandNodeData.expandCount : 5;

  if (shortlistIds.length === 0) {
    const pool = getEffectiveCandidatePool(session);
    if (pool.length === 0) {
      throw new Error('No candidates available — run Diverge and Critique first');
    }
    shortlistIds = pool.slice(0, Math.min(configuredExpandCount, pool.length)).map((c) => c.id);
  }

  if (shortlistIds.length < 1 || shortlistIds.length > 15) {
    throw new Error('Expand requires a shortlist of 1–15 candidates');
  }

  const candidates = getEffectiveCandidatePool(session);
  const effectiveNormalize = deriveEffectiveNormalize(session);
  if (!effectiveNormalize) {
    throw new Error('Normalize must be run before Expand');
  }

  const userInputs = getUserInputs(session);
  const expandInfluence = buildInfluenceBlock(session);
  const expandPreprompt = buildPrepromptBlock(session);
  const expandPostprompt = buildPostpromptBlock(session);
  const expansions: ExpandExpansion[] = [];

  for (const id of shortlistIds) {
    const candidate = candidates.find((c) => c.id === id);
    if (!candidate) continue;

    let prompt = expandPreprompt + buildExpandPrompt(candidate, effectiveNormalize, userInputs);
    prompt += expandInfluence;
    prompt = appendStrictAdherence(prompt, session);
    prompt = appendTierDirective(prompt, session);
    prompt = appendCustomInstructions(prompt, session, 'expand');
    prompt += expandPostprompt;
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
  let prompt = buildPrepromptBlock(session) + buildScorePrompt(expansions, candidates);
  prompt += buildInfluenceBlock(session);
  prompt = appendStrictAdherence(prompt, session);
  prompt = appendTierDirective(prompt, session);
  prompt = appendCustomInstructions(prompt, session, 'converge');
  prompt += buildPostpromptBlock(session);

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

  let prompt = buildPrepromptBlock(session) + buildCommitPrompt({
    winnerId,
    candidate,
    expansion,
    effectiveNormalize,
    userInputs,
    templateType,
  });
  prompt += buildInfluenceBlock(session);
  prompt = appendStrictAdherence(prompt, session);
  prompt = appendTierDirective(prompt, session);
  prompt = appendCustomInstructions(prompt, session, 'commit');
  prompt += buildPostpromptBlock(session);

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

  // Generate persona thinking before actual stage execution
  const persona = getActivePersona(session);
  let activeSession = session;
  let personaThought: string | null = null;
  if (persona && STAGE_THINKING_LABELS[stageId]) {
    try {
      const result = await generatePersonaThought(activeSession, stageId, provider, persona);
      personaThought = result.thought;
      activeSession = result.updatedSession;
    } catch {
      // Thinking is non-critical; proceed with the stage
    }
  }

  // Inject the persona thought as a transient influence so it shapes the stage output
  if (personaThought) {
    activeSession = injectPersonaThoughtContext(activeSession, persona!, personaThought, stageId);
  }

  if (stageId === 'normalize') return runNormalizeStage(activeSession, provider);
  if (stageId === 'diverge') return runDivergeStage(activeSession, provider);
  if (stageId === 'critique-salvage')
    return runCritiqueSalvageStage(activeSession, provider);
  if (stageId === 'expand') return runExpandStage(activeSession, provider);
  if (stageId === 'converge') return runConvergeStage(activeSession, provider);
  if (stageId === 'commit') return runCommitStage(activeSession, provider, opts?.templateType);

  const schema = STAGE_SCHEMAS[stageId];
  const inputs = getStageInputs(activeSession, stageId);
  const userInputs = getUserInputs(activeSession);
  const prompt = buildPrompt(stageId, inputs, userInputs, getEffectiveSettings(activeSession), activeSession);

  const rawOutput = await provider.generateStructured({ schema, prompt });
  const output = schema.parse(rawOutput);

  const event = createEvent('STAGE_RUN', stageId, {
    inputs: JSON.parse(JSON.stringify(inputs)),
    output: JSON.parse(JSON.stringify(output)),
  });

  let stageState = markStagesFresh(
    activeSession.stageState,
    stageId,
    output,
    event.id,
  );
  stageState = markDownstreamStale(stageState, stageId);

  return {
    ...activeSession,
    updatedAt: new Date().toISOString(),
    events: [...activeSession.events, event],
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
