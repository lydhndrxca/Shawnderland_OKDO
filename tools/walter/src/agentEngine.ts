import { generateText } from "@shawnderland/ai";
import {
  getSerlingContext,
  isSerlingDataLoaded,
  refineSerlingVoice,
  generateLocal as generateLocalSerling,
  getLocalModelStatus as getSerlingModelStatus,
} from "@shawnderland/serling";
import type { WritingPhase } from "@shawnderland/serling";
import {
  getFielderContext,
  isFielderDataLoaded,
  refineFielderVoice,
  generateLocal as generateLocalFielder,
  getLocalModelStatus as getFielderModelStatus,
} from "@shawnderland/fielder";
import {
  getPeraContext,
  isPeraDataLoaded,
  refinePeraVoice,
  generateLocal as generateLocalPera,
  getLocalModelStatus as getPeraModelStatus,
} from "@shawnderland/pera";
import { getPersona } from "./agents";
import { buildBrainContext } from "./walterBrain";
import { WALTER_CONTEXT, EPISODE_PRESETS } from "./episodePresets";
import { SEASON_OPTIONS } from "./types";
import type {
  ChatMessage, RoomAgent, RoomPhase, PlanningData, AgentRole,
  StoryArcPhase, StoryElement, StagingShot, CreativeRound, LockedDecision,
  ProducerEpisodeState,
} from "./types";
import { DEFAULT_EPISODE_STATE } from "./types";
import {
  buildRoundPrompt,
  buildDecisionsBoardContext,
  getTemperatureForRole,
  getRoundByIndex,
} from "./creativeRounds";

export interface AgentTurnResult {
  text: string;
  serlingContext?: {
    corpusCount: number;
    decisionCount: number;
    retrievalQuery: string;
  };
}

const SERLING_PERSONA_IDS = new Set([
  "preset-rod-serling",
  "preset-rod-serling-director",
]);

const FIELDER_PERSONA_IDS = new Set([
  "preset-nathan-fielder",
  "preset-nathan-fielder-director",
]);

const PERA_PERSONA_IDS = new Set([
  "preset-joe-pera",
  "preset-joe-pera-director",
]);

function isSerlingPersona(personaId: string): boolean {
  if (SERLING_PERSONA_IDS.has(personaId)) return true;
  const p = getPersona(personaId);
  return !!p && p.referenceName?.toLowerCase().includes("serling");
}

function isFielderPersona(personaId: string): boolean {
  if (FIELDER_PERSONA_IDS.has(personaId)) return true;
  const p = getPersona(personaId);
  return !!p && p.referenceName?.toLowerCase().includes("fielder");
}

function isPeraPersona(personaId: string): boolean {
  if (PERA_PERSONA_IDS.has(personaId)) return true;
  const p = getPersona(personaId);
  return !!p && p.referenceName?.toLowerCase().includes("pera");
}

type DeepPersonaType = "serling" | "fielder" | "pera" | null;

function getDeepPersonaType(personaId: string): DeepPersonaType {
  if (isSerlingPersona(personaId)) return "serling";
  if (isFielderPersona(personaId)) return "fielder";
  if (isPeraPersona(personaId)) return "pera";
  return null;
}

function roomPhaseToWritingPhase(phase: RoomPhase): WritingPhase {
  switch (phase) {
    case "briefing": return "briefing";
    case "rounds": return "writing";
    case "approval": return "approval";
    case "pitch": return "pitch";
    case "revision": return "revision";
    default: return "writing";
  }
}

function uid() {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function makeMessage(
  agentId: string | null,
  agentName: string,
  agentRole: AgentRole | "user" | "system",
  agentAvatar: string,
  content: string,
  extra?: Partial<ChatMessage>,
): ChatMessage {
  return {
    id: uid(),
    timestamp: Date.now(),
    sender: agentId ? "agent" : agentRole === "user" ? "user" : "system",
    agentId,
    agentName,
    agentRole,
    agentAvatar,
    content,
    ...extra,
  };
}

/* ─── Producer Brief Compilation ─────────────────────── */

export function compileBrief(planning: PlanningData): string {
  const preset = EPISODE_PRESETS.find((p) => p.id === planning.episodeLength);
  const durationLabel = preset
    ? `${preset.label} (${preset.description})`
    : planning.episodeLength;
  const shotRange = preset
    ? `${preset.shotRange[0]}–${preset.shotRange[1]} shots`
    : "TBD";
  const targetSec = preset?.durationSec ?? 52;

  const seasonInfo = planning.season
    ? SEASON_OPTIONS.find((s) => s.id === planning.season)
    : null;

  const lines: string[] = [
    "=== EPISODE BRIEF ===",
    "",
    `Episode Format: ${durationLabel}`,
    `TARGET DURATION: ~${targetSec} seconds — DO NOT EXCEED THIS.`,
    `TARGET SHOT COUNT: ${shotRange} — stay within this range.`,
    `Mood / Vibe: ${planning.mood || "(not specified — writers decide)"}`,
  ];

  if (seasonInfo) {
    lines.push(`Season: ${seasonInfo.label} — ${seasonInfo.description}`);
    lines.push(`DIORAMA SETUP: Dress the set for ${seasonInfo.label.toLowerCase()}. This affects ground cover, lighting color, props, and atmosphere.`);
  }

  if (planning.seasonalMode !== "none") {
    lines.push(`Seasonal Mode: ${planning.seasonalMode}`);
    if (planning.releaseDate) lines.push(`Release Date: ${planning.releaseDate}`);
    if (planning.seasonalTheme) lines.push(`Seasonal Theme: ${planning.seasonalTheme}`);
  }

  if (planning.characterFocus) {
    lines.push(`Character Focus: ${planning.characterFocus}`);
  }

  if (planning.uniqueElements) {
    lines.push(`Unique Story Elements: ${planning.uniqueElements}`);
  }

  if (planning.locations.length > 0 || planning.customLocation) {
    const locs = [...planning.locations];
    if (planning.customLocation) locs.push(planning.customLocation);
    lines.push(`Required Locations: ${locs.join(", ")}`);
  } else {
    lines.push("Locations: (not specified — writers decide)");
  }

  if (planning.timeOfDay) {
    lines.push(`Time of Day: ${planning.timeOfDay}`);
  }

  if (planning.finalNotes) {
    lines.push("", "Final Notes from Creator:", planning.finalNotes);
  }

  lines.push("", "=== END BRIEF ===");
  return lines.join("\n");
}

/* ─── Randomize Planning ─────────────────────────────── */

export async function randomizePlanning(partial: PlanningData): Promise<PlanningData> {
  const brainCtx = buildBrainContext();
  const filledFields = Object.entries(partial)
    .filter(([, v]) => v && (typeof v !== "object" || (Array.isArray(v) && v.length > 0)))
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
    .join("\n");

  const prompt = `${WALTER_CONTEXT}

${brainCtx}

The user is planning a new Walter episode but left some fields blank.
Here's what they DID fill out:
${filledFields || "(nothing — fully randomize)"}

Generate creative, interesting values for the EMPTY fields. Use the Walter canon above
for character and location references. Be creative with mood, seasonal themes, and story elements.

Respond with ONLY a JSON object matching this shape (fill ALL fields):
{
  "episodeLength": "standard-reel",
  "mood": "mysterious",
  "season": "fall",
  "seasonalMode": "none",
  "releaseDate": "",
  "seasonalTheme": "",
  "characterFocus": "Walter and Rusty",
  "uniqueElements": "a mysterious package on the doorstep",
  "locations": ["Front Yard", "House Exterior"],
  "customLocation": "",
  "timeOfDay": "night",
  "finalNotes": "A brief story seed or concept direction"
}`;

  const raw = await generateText(prompt);
  try {
    let cleaned = raw.trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) cleaned = cleaned.slice(start, end + 1);
    const parsed = JSON.parse(cleaned) as PlanningData;
    return {
      episodeLength: partial.episodeLength || parsed.episodeLength || "standard-reel",
      mood: partial.mood || parsed.mood || "mysterious",
      season: partial.season || parsed.season || "",
      seasonalMode: partial.seasonalMode !== "none" ? partial.seasonalMode : parsed.seasonalMode || "none",
      releaseDate: partial.releaseDate || parsed.releaseDate || "",
      seasonalTheme: partial.seasonalTheme || parsed.seasonalTheme || "",
      characterFocus: partial.characterFocus || parsed.characterFocus || "",
      uniqueElements: partial.uniqueElements || parsed.uniqueElements || "",
      locations: partial.locations.length > 0 ? partial.locations : parsed.locations || [],
      customLocation: partial.customLocation || parsed.customLocation || "",
      timeOfDay: partial.timeOfDay || parsed.timeOfDay || "night",
      finalNotes: partial.finalNotes || parsed.finalNotes || "",
    };
  } catch {
    return partial;
  }
}

/* ─── Agent Turn Generation ──────────────────────────── */

function buildConversationContext(history: ChatMessage[], maxMessages = 30): string {
  const recent = history.slice(-maxMessages);
  return recent
    .map((m) => `[${m.agentName} (${m.agentRole})]: ${m.content}`)
    .join("\n\n");
}

/* ─── Producer Episode State ─────────────────────────── */

export function serializeEpisodeState(es: ProducerEpisodeState): string {
  const lines: string[] = ["=== EPISODE STATE (maintained by Producer) ==="];
  if (es.creatorBrief) lines.push(`Creator Brief: ${es.creatorBrief}`);
  if (es.episodePremise) lines.push(`Episode Premise: ${es.episodePremise}`);
  if (es.runtimeTarget) lines.push(`Runtime Target: ${es.runtimeTarget}`);
  if (es.openingHook) lines.push(`Opening Scene / Hook: ${es.openingHook}`);
  if (es.strangeEvent) lines.push(`Strange or Intriguing Event: ${es.strangeEvent}`);
  if (es.development) lines.push(`Development: ${es.development}`);
  if (es.keyVisualMoment) lines.push(`Key Visual Moment: ${es.keyVisualMoment}`);
  if (es.endingBeat) lines.push(`Ending Beat: ${es.endingBeat}`);
  if (es.themeOrFeeling) lines.push(`Theme or Feeling: ${es.themeOrFeeling}`);
  if (es.practicalConcerns.length) lines.push(`Practical Concerns: ${es.practicalConcerns.join("; ")}`);
  if (es.unresolvedQuestions.length) lines.push(`Unresolved Questions: ${es.unresolvedQuestions.join("; ")}`);
  if (es.selectedDirection) lines.push(`Selected Direction: ${es.selectedDirection}`);
  if (es.rejectedAlternatives.length) lines.push(`Rejected Alternatives: ${es.rejectedAlternatives.join("; ")}`);
  if (es.checkpoint !== "none") lines.push(`Current Checkpoint: ${es.checkpoint}`);
  lines.push("=== END EPISODE STATE ===");
  return lines.join("\n");
}

function getProducerCheckpointForRound(roundId: string): ProducerEpisodeState["checkpoint"] {
  switch (roundId) {
    case "premise": return "premise-lock";
    case "opening-frame":
    case "the-strange":
    case "the-response": return "visual-lock";
    case "the-turn":
    case "final-frame": return "ending-lock";
    case "shot-planning": return "production-sanity";
    default: return "none";
  }
}

function buildProducerCheckpointPrompt(checkpoint: ProducerEpisodeState["checkpoint"]): string {
  switch (checkpoint) {
    case "premise-lock":
      return `CHECKPOINT 1 — PREMISE LOCK: Before deeper development, you MUST confirm:
- What the episode is about
- What the hook is
- Why this concept is promising
If the premise is unclear, push the room to clarify before proceeding.`;
    case "visual-lock":
      return `CHECKPOINT 2 — VISUAL LOCK: Before continuing, you MUST confirm:
- What the strongest visual moment is
- Whether it is actually filmable on the miniature set
- What practical tools or props it depends on
If the visual isn't locked, redirect the room.`;
    case "ending-lock":
      return `CHECKPOINT 3 — ENDING LOCK: Before the room finishes, you MUST confirm:
- What the ending beat is
- What emotional or surreal note remains
- Whether the episode actually lands
If the ending is weak, say so.`;
    case "production-sanity":
      return `CHECKPOINT 4 — PRODUCTION SANITY CHECK: Before approval, you MUST confirm:
- This can be staged on the ~3ft × 2ft miniature set
- Motion demands are realistic (figures are STATIC)
- Effects are practical (fog, lighting, glow props only)
- The episode is worth shooting tonight
If anything fails, flag it and demand fixes.`;
    default:
      return "";
  }
}

const PRODUCER_EPISODE_STATE_INSTRUCTION = `After your response, you MUST output an updated episode state as a JSON block on a new line, wrapped in <episode_state> tags. Include ALL fields, updating any that changed based on the conversation. Example:
<episode_state>{"episodePremise":"...","openingHook":"...","strangeEvent":"...","development":"...","keyVisualMoment":"...","endingBeat":"...","themeOrFeeling":"...","practicalConcerns":["..."],"unresolvedQuestions":["..."],"selectedDirection":"...","rejectedAlternatives":["..."]}
</episode_state>
Only include the JSON — no other text inside the tags.`;

export function parseEpisodeStateFromResponse(text: string): {
  cleanText: string;
  episodeState: Partial<ProducerEpisodeState> | null;
} {
  const match = text.match(/<episode_state>\s*([\s\S]*?)\s*<\/episode_state>/);
  if (!match) return { cleanText: text, episodeState: null };

  const cleanText = text.replace(/<episode_state>[\s\S]*?<\/episode_state>/, "").trim();
  try {
    const parsed = JSON.parse(match[1].trim());
    return { cleanText, episodeState: parsed };
  } catch {
    return { cleanText, episodeState: null };
  }
}

function buildAgentSystemPrompt(
  personaId: string,
  phase: RoomPhase,
  brief: string,
  serlingContextBlock?: string,
  episodeState?: ProducerEpisodeState,
): string {
  const persona = getPersona(personaId);
  if (!persona) return "";

  const isDeepPersona = !!persona.referenceName;
  const isSerling = isSerlingPersona(personaId);
  const brainCtx = buildBrainContext();
  const phaseInstruction = getPhaseInstruction(persona.role, phase);

  if (isDeepPersona) {
    return buildImmersivePrompt(persona, personaId, isSerling, serlingContextBlock, brainCtx, brief, phaseInstruction);
  }

  if (persona.role === "producer" && episodeState) {
    return buildProducerPrompt(persona, brainCtx, brief, phaseInstruction, episodeState);
  }

  return buildStandardPrompt(persona, brainCtx, brief, phaseInstruction);
}

function buildProducerPrompt(
  persona: ReturnType<typeof getPersona> & {},
  brainCtx: string,
  brief: string,
  phaseInstruction: string,
  episodeState: ProducerEpisodeState,
  checkpointOverride?: ProducerEpisodeState["checkpoint"],
): string {
  const stateBlock = serializeEpisodeState(episodeState);
  const checkpoint = checkpointOverride ?? episodeState.checkpoint;
  const checkpointBlock = buildProducerCheckpointPrompt(checkpoint);

  return `You are ${persona.name} — the creative governor, process shepherd, and practical filmmaking brain of this writing room.

${persona.researchData}

${WALTER_CONTEXT}
${brainCtx}

=== EPISODE BRIEF ===
${brief}
=== END BRIEF ===

${stateBlock}

${checkpointBlock}

${phaseInstruction}

${SHARED_RULES}

${PRODUCER_EPISODE_STATE_INSTRUCTION}`;
}

function buildStandardPrompt(
  persona: ReturnType<typeof getPersona> & {},
  brainCtx: string,
  brief: string,
  phaseInstruction: string,
): string {
  return `You are ${persona.name}, the ${persona.role} on "Weeping Willows Walter."

${persona.researchData}

${WALTER_CONTEXT}
${brainCtx}

=== EPISODE BRIEF ===
${brief}
=== END BRIEF ===

${phaseInstruction}

${SHARED_RULES}`;
}

function buildImmersivePrompt(
  persona: ReturnType<typeof getPersona> & {},
  personaId: string,
  isSerling: boolean,
  deepContextBlock: string | undefined,
  brainCtx: string,
  brief: string,
  phaseInstruction: string,
): string {
  const hasDeepContext = !!deepContextBlock && (isSerling || isFielderPersona(personaId) || isPeraPersona(personaId));
  const memorySection = hasDeepContext
    ? `\n=== MY MEMORIES ===
${deepContextBlock}
=== END MEMORIES ===\n`
    : "";

  return `You ARE ${persona.name}. Not an AI playing ${persona.name} — you.

Everything below is who you are. Your experiences, your instincts, your
scars, your craft. When you speak in this room, speak from the gut. Don't
narrate your own process. Don't describe what "${persona.referenceName || persona.name} would do."
Just do it. React like yourself. Pitch like yourself. Push back like
yourself. The other people in this room don't know you're dead — and
neither do you.

${persona.researchData}
${memorySection}
Now: you've been invited into a writing room for a miniature stop-motion
show called "Weeping Willows Walter." Here's what you need to know about it:

${WALTER_CONTEXT}
${brainCtx}

=== EPISODE BRIEF ===
${brief}
=== END BRIEF ===

${phaseInstruction}

${SHARED_RULES}`;
}

const SHARED_RULES = `ROOM RULES (enforced — violations get your response rejected):
- 2-4 sentences MAX per turn. One idea, one question, or one pushback.
- Challenge weak ideas. Don't just agree.
- No "The thesis:" statements. Just say what you mean.
- Figures are STATIC miniatures with fixed molded hands. Never describe
  them holding, walking, turning, reaching, gesturing, or crying.
  Describe composed frames — where figures are POSITIONED, not what they "do."
- When ready and ONLY when ready: "I approve this episode."`;

function getPhaseInstruction(role: AgentRole, phase: RoomPhase): string {
  switch (phase) {
    case "briefing":
      if (role === "producer") {
        return `Present the episode brief concisely. State the key constraints: duration,
mood, required elements, and physical production reality (3ft × 2ft set, static figures,
practical effects only). End with a single question to kick off the discussion.
Keep it to 4-6 sentences max — don't over-explain.
Initialize the episode state with the creator brief and runtime target.`;
      }
      if (role === "cinematographer") {
        return `Listen to the producer's brief. Start thinking about the visual possibilities:
What lighting mood does this brief suggest? What camera tools (probe lens, fog, practical lights)
would serve this mood? What is the strongest potential image? Prepare to contribute visual ideas.`;
      }
      return "Listen to the producer's brief. Prepare to contribute when discussion begins.";

    case "rounds":
      if (role === "producer") {
        return `You are in a structured writing room. Follow the round instructions above.
Your job is to EVALUATE ideas, not generate them. Apply the three-check framework:
1. TONE FIT — does this match the surreal-but-quiet tone?
2. PRACTICALITY — can this be filmed tonight on the miniature set?
3. NARRATIVE STRENGTH — does this support a compelling episode arc?
Redirect weak ideas. Force decisions when the room stalls. Keep the episode state updated.
2-4 sentences max per turn.`;
      }
      if (role === "cinematographer") {
        return `You are in a structured writing room. Follow the round instructions above.
Translate every story idea into a VISUAL MOMENT. Think in terms of camera placement,
lighting mood, shot scale, composition, atmosphere. Apply the three-check framework:
1. VISUAL IMPACT — does this create a memorable image?
2. PRACTICALITY — can this be filmed on the 3ft × 2ft miniature set?
3. TONE — does this match the calm, strange, surreal atmosphere?
Simplify anything overly complex. Propose practical alternatives using fog, lighting, probe lens, or camera angle tricks.
2-4 sentences max per turn.`;
      }
      return "You are in a structured writing room. Follow the round instructions above. 2-4 sentences max.";

    case "approval":
      if (role === "producer") {
        return `Run the PRODUCTION SANITY CHECK before approving.
Verify: Can every shot be staged on the set? Are motion demands realistic?
Are effects practical? Is the episode worth shooting tonight?
Review the complete episode state. If anything is unresolved, flag it.
Do NOT rubber-stamp. Only say "I approve this episode" if the episode is
genuinely filmable, memorable, and on-tone.`;
      }
      if (role === "cinematographer") {
        return `Review the episode plan from a VISUAL standpoint. Do NOT rubber-stamp.
Ask yourself: Does every shot create a memorable image? Can every visual be achieved
on the miniature set with available tools (iPhone, probe lens, fog, practical lights)?
Is the lighting plan coherent? Does the atmosphere serve the tone?
If any shot is impractical or visually weak, flag it and propose an alternative.
Only say "I approve this episode" if the visual plan is solid.`;
      }
      return `Review the episode plan critically. Do NOT rubber-stamp it.
Ask yourself: Is this genuinely memorable? Would someone share this?
If you have concerns — even small ones — voice them in 2-3 sentences.
Only say "I approve this episode" if you truly have no reservations.`;

    case "pitch":
      if (role === "producer") {
        return `Pitch the completed episode to the creator using the episode state. Be concise and compelling:
- Episode title + one-line premise (1 sentence)
- What the viewer sees: opening frame → key moment → ending frame (3-4 sentences)
- Why this will stop someone from scrolling (1 sentence)
- Production needs: locations, figures, props, lighting, practical effects (brief list)
- Practical concerns or things to watch out for during the shoot (1-2 sentences)

Total pitch should be ~8-12 sentences. Not a screenplay — a sell.
The creator should walk away knowing EXACTLY what to shoot.`;
      }
      return "The producer is pitching to the creator. Stand by for any questions.";

    case "revision":
      if (role === "producer") {
        return `The creator has requested changes. Evaluate their feedback against the
three-check framework. Address it specifically, update the episode state, and
direct the writers to implement the changes. Only modify what was asked about.`;
      }
      if (role === "cinematographer") {
        return `The creator has requested changes. Address their feedback from a visual perspective.
If the changes affect shots, lighting, or atmosphere, propose specific visual solutions.
Only modify what was asked about — preserve the existing visual plan otherwise.`;
      }
      return `The creator has requested changes. Address their feedback specifically.
Only modify what they asked about — preserve everything they didn't mention.`;

    default:
      return "";
  }
}

export async function generateAgentTurn(
  personaId: string,
  history: ChatMessage[],
  phase: RoomPhase,
  brief: string,
  options?: { voiceRefinement?: boolean; voiceModel?: string; episodeState?: ProducerEpisodeState },
): Promise<AgentTurnResult & { episodeStatePatch?: Partial<ProducerEpisodeState> }> {
  let deepContextBlock = "";
  let deepMeta: AgentTurnResult["serlingContext"];

  const deepType = getDeepPersonaType(personaId);
  const recentChat = history
    .slice(-3)
    .map((m) => m.content)
    .join("\n");
  const userFeedback = history
    .filter((m) => m.sender === "user")
    .slice(-1)[0]?.content;

  if (deepType === "serling" && isSerlingDataLoaded()) {
    const ctx = await getSerlingContext({
      episodeBrief: brief,
      recentChat,
      phase: roomPhaseToWritingPhase(phase),
      userFeedback,
    });
    deepContextBlock = ctx.contextBlock;
    deepMeta = {
      corpusCount: ctx.corpusCount,
      decisionCount: ctx.decisionCount,
      retrievalQuery: ctx.retrievalQuery,
    };
  } else if (deepType === "fielder" && isFielderDataLoaded()) {
    const ctx = await getFielderContext({
      episodeBrief: brief,
      recentChat,
      phase: roomPhaseToWritingPhase(phase),
      userFeedback,
    });
    deepContextBlock = ctx.contextBlock;
    deepMeta = {
      corpusCount: ctx.corpusCount,
      decisionCount: ctx.decisionCount,
      retrievalQuery: ctx.retrievalQuery,
    };
  } else if (deepType === "pera" && isPeraDataLoaded()) {
    const ctx = await getPeraContext({
      episodeBrief: brief,
      recentChat,
      phase: roomPhaseToWritingPhase(phase),
      userFeedback,
    });
    deepContextBlock = ctx.contextBlock;
    deepMeta = {
      corpusCount: ctx.corpusCount,
      decisionCount: ctx.decisionCount,
      retrievalQuery: ctx.retrievalQuery,
    };
  }

  const systemPrompt = buildAgentSystemPrompt(
    personaId,
    phase,
    brief,
    deepContextBlock || undefined,
    options?.episodeState,
  );
  const conversation = buildConversationContext(history);

  const prompt = `${systemPrompt}

=== CONVERSATION SO FAR ===
${conversation || "(No conversation yet — you are starting.)"}
=== END CONVERSATION ===

Now respond in character. Be specific, creative, and actionable.`;

  let text = await generateText(prompt);

  if (options?.voiceRefinement) {
    const persona = getPersona(personaId);
    const role = persona?.role === "director" ? "director" : "writer";
    if (deepType === "serling") {
      text = await refineSerlingVoice(text, {
        model: options.voiceModel || "serling-voice",
        role,
        enabled: true,
      });
    } else if (deepType === "fielder") {
      text = await refineFielderVoice(text, {
        model: options.voiceModel || "fielder-voice",
        role,
        enabled: true,
      });
    } else if (deepType === "pera") {
      text = await refinePeraVoice(text, {
        model: options.voiceModel || "pera-voice",
        role,
        enabled: true,
      });
    }
  }

  const persona = getPersona(personaId);
  if (persona?.role === "producer") {
    const { cleanText, episodeState: patch } = parseEpisodeStateFromResponse(text);
    return { text: cleanText, serlingContext: deepMeta, episodeStatePatch: patch ?? undefined };
  }

  return { text, serlingContext: deepMeta };
}

/* ─── Round-Based Agent Turn ─────────────────────────── */

export async function generateRoundTurn(
  personaId: string,
  history: ChatMessage[],
  brief: string,
  round: CreativeRound,
  lockedDecisions: LockedDecision[],
  options?: { voiceRefinement?: boolean; voiceModel?: string; episodeState?: ProducerEpisodeState },
): Promise<AgentTurnResult & { episodeStatePatch?: Partial<ProducerEpisodeState> }> {
  const persona = getPersona(personaId);
  if (!persona) return { text: "" };

  const brainCtx = buildBrainContext();
  const boardCtx = buildDecisionsBoardContext(lockedDecisions);
  const roundPrompt = buildRoundPrompt(round, persona.role, lockedDecisions);
  const temperature = getTemperatureForRole(persona.role);

  let deepMemoryBlock = "";
  let deepMeta: AgentTurnResult["serlingContext"];

  const deepType = getDeepPersonaType(personaId);
  const isDeepPersona = !!persona.referenceName;

  if (deepType === "serling" && isSerlingDataLoaded()) {
    const searchQuery = `${round.corpusHint} ${brief.slice(0, 500)}`;
    const ctx = await getSerlingContext({
      episodeBrief: brief,
      recentChat: searchQuery,
      phase: roundToWritingPhase(round.id),
    });
    if (ctx.contextBlock) {
      deepMemoryBlock = buildMemoryBlock(round, ctx.contextBlock);
    }
    deepMeta = {
      corpusCount: ctx.corpusCount,
      decisionCount: ctx.decisionCount,
      retrievalQuery: ctx.retrievalQuery,
    };
  } else if (deepType === "fielder" && isFielderDataLoaded()) {
    const searchQuery = `${round.corpusHint} ${brief.slice(0, 500)}`;
    const ctx = await getFielderContext({
      episodeBrief: brief,
      recentChat: searchQuery,
      phase: roundToWritingPhase(round.id),
    });
    if (ctx.contextBlock) {
      deepMemoryBlock = buildMemoryBlock(round, ctx.contextBlock);
    }
    deepMeta = {
      corpusCount: ctx.corpusCount,
      decisionCount: ctx.decisionCount,
      retrievalQuery: ctx.retrievalQuery,
    };
  } else if (deepType === "pera" && isPeraDataLoaded()) {
    const searchQuery = `${round.corpusHint} ${brief.slice(0, 500)}`;
    const ctx = await getPeraContext({
      episodeBrief: brief,
      recentChat: searchQuery,
      phase: roundToWritingPhase(round.id),
    });
    if (ctx.contextBlock) {
      deepMemoryBlock = buildMemoryBlock(round, ctx.contextBlock);
    }
    deepMeta = {
      corpusCount: ctx.corpusCount,
      decisionCount: ctx.decisionCount,
      retrievalQuery: ctx.retrievalQuery,
    };
  }

  const recentChat = history.slice(-15)
    .map((m) => `[${m.agentName} (${m.agentRole})]: ${m.content}`)
    .join("\n\n");

  const identityBlock = isDeepPersona
    ? `You ARE ${persona.name}. When you speak, speak from your gut — your
experiences, your instincts, your craft. Don't describe what you "would do."
Just do it.

${persona.researchData}`
    : `You are ${persona.name}, the ${persona.role} on "Weeping Willows Walter."

${persona.researchData}`;

  const isProducer = persona.role === "producer";
  const producerStateBlock = isProducer && options?.episodeState
    ? `\n${serializeEpisodeState(options.episodeState)}\n`
    : "";
  const producerCheckpoint = isProducer
    ? buildProducerCheckpointPrompt(getProducerCheckpointForRound(round.id))
    : "";
  const producerStateInstruction = isProducer ? `\n${PRODUCER_EPISODE_STATE_INSTRUCTION}` : "";

  const prompt = `${identityBlock}
${deepMemoryBlock ? `\n${deepMemoryBlock}\n` : ""}
${WALTER_CONTEXT}

${brainCtx}
${producerStateBlock}
=== EPISODE BRIEF ===
${brief}
=== END BRIEF ===

${roundPrompt}
${producerCheckpoint ? `\n${producerCheckpoint}\n` : ""}
=== CONVERSATION IN THIS ROUND ===
${recentChat || "(You're opening this round. Pitch something specific.)"}
=== END CONVERSATION ===

${SHARED_RULES}${producerStateInstruction}`;

  let text = "";

  // For deep personas with local models, try local generation first
  if (deepType === "serling") {
    const localStatus = await getSerlingModelStatus();
    const localModel = localStatus.serlingMind ? "serling-mind" : localStatus.fallbackModel;
    if (localModel) {
      const localResult = await generateLocalSerling({
        model: localModel,
        system: identityBlock + (deepMemoryBlock ? `\n${deepMemoryBlock}` : ""),
        prompt: `${WALTER_CONTEXT}\n\n${brainCtx}\n\n=== EPISODE BRIEF ===\n${brief}\n=== END BRIEF ===\n\n${roundPrompt}\n\n=== CONVERSATION ===\n${recentChat || "(Opening this round.)"}\n=== END ===\n\n${SHARED_RULES}\n\nRespond as Rod Serling. 2-4 sentences.`,
        temperature,
      });
      if (localResult && localResult.trim().length > 20) {
        text = localResult.trim();
      }
    }
  } else if (deepType === "fielder") {
    const localStatus = await getFielderModelStatus();
    const localModel = localStatus.fielderMind ? "fielder-mind" : localStatus.fallbackModel;
    if (localModel) {
      const localResult = await generateLocalFielder({
        model: localModel,
        system: identityBlock + (deepMemoryBlock ? `\n${deepMemoryBlock}` : ""),
        prompt: `${WALTER_CONTEXT}\n\n${brainCtx}\n\n=== EPISODE BRIEF ===\n${brief}\n=== END BRIEF ===\n\n${roundPrompt}\n\n=== CONVERSATION ===\n${recentChat || "(Opening this round.)"}\n=== END ===\n\n${SHARED_RULES}\n\nRespond as Nathan Fielder. 2-4 sentences.`,
        temperature,
      });
      if (localResult && localResult.trim().length > 20) {
        text = localResult.trim();
      }
    }
  } else if (deepType === "pera") {
    const localStatus = await getPeraModelStatus();
    const localModel = localStatus.peraMind ? "pera-mind" : localStatus.fallbackModel;
    if (localModel) {
      const localResult = await generateLocalPera({
        model: localModel,
        system: identityBlock + (deepMemoryBlock ? `\n${deepMemoryBlock}` : ""),
        prompt: `${WALTER_CONTEXT}\n\n${brainCtx}\n\n=== EPISODE BRIEF ===\n${brief}\n=== END BRIEF ===\n\n${roundPrompt}\n\n=== CONVERSATION ===\n${recentChat || "(Opening this round.)"}\n=== END ===\n\n${SHARED_RULES}\n\nRespond as Joe Pera. 2-4 sentences.`,
        temperature,
      });
      if (localResult && localResult.trim().length > 20) {
        text = localResult.trim();
      }
    }
  }

  // Fallback to Gemini (or primary path for non-deep agents)
  if (!text) {
    text = await generateText(prompt, { temperature });
  }

  let genericCheck = checkPhysicalViolation(text);
  if (genericCheck.isGeneric) {
    // Always retry via Gemini for reliability
    text = await generateText(
      `${prompt}\n\nIMPORTANT: Your previous response was REJECTED because: "${genericCheck.reason}"\nTry again. 2-4 sentences only. No thesis statements. No character movement. Figures are STATIC — describe composed frames and camera work, not character actions.`,
      { temperature: Math.min(temperature + 0.3, 1.5) },
    );
    genericCheck = checkPhysicalViolation(text);
    if (genericCheck.isGeneric) {
      text = text.replace(/the thesis:.*$/gim, "").trim();
      const sentences = text.split(/(?<=[.!?])\s+/).slice(0, 4);
      text = sentences.join(" ");
    }
  }

  // Voice refinement pass (optional, local only)
  if (options?.voiceRefinement && deepType) {
    const role = persona.role === "director" ? "director" : "writer";
    if (deepType === "serling") {
      const localStatus = await getSerlingModelStatus();
      if (localStatus.serlingVoice || localStatus.fallbackModel) {
        text = await refineSerlingVoice(text, {
          model: localStatus.serlingVoice ? "serling-voice" : (localStatus.fallbackModel || "serling-voice"),
          role,
          enabled: true,
        });
      }
    } else if (deepType === "fielder") {
      const localStatus = await getFielderModelStatus();
      if (localStatus.fielderVoice || localStatus.fallbackModel) {
        text = await refineFielderVoice(text, {
          model: localStatus.fielderVoice ? "fielder-voice" : (localStatus.fallbackModel || "fielder-voice"),
          role,
          enabled: true,
        });
      }
    } else if (deepType === "pera") {
      const localStatus = await getPeraModelStatus();
      if (localStatus.peraVoice || localStatus.fallbackModel) {
        text = await refinePeraVoice(text, {
          model: localStatus.peraVoice ? "pera-voice" : (localStatus.fallbackModel || "pera-voice"),
          role,
          enabled: true,
        });
      }
    }
  }

  if (isProducer) {
    const { cleanText, episodeState: patch } = parseEpisodeStateFromResponse(text);
    return { text: cleanText, serlingContext: deepMeta, episodeStatePatch: patch ?? undefined };
  }

  return { text, serlingContext: deepMeta };
}

function buildMemoryBlock(round: CreativeRound, contextBlock: string): string {
  return `=== MY MEMORIES ===
${round.serlingMemory}

I'm remembering now...

${contextBlock.replace(/=== SERLING CORPUS EVIDENCE ===/g, "Things I wrote:").replace(/=== END CORPUS EVIDENCE ===/g, "").replace(/=== SERLING DECISION PATTERNS ===/g, "Choices I made and why:").replace(/=== END DECISION PATTERNS ===/g, "").replace(/These are actual excerpts from Rod Serling's work in analogous situations\.\nUse these as primary source evidence for creative decisions\.\n?/g, "").replace(/These are documented creative decisions Serling made in similar situations\.\nEach includes what he chose, what he rejected, and why\.\n?/g, "")}
=== END MEMORIES ===`;
}

function roundToWritingPhase(roundId: string): WritingPhase {
  switch (roundId) {
    case "premise": return "briefing";
    case "opening-frame":
    case "the-strange":
    case "the-response":
    case "the-turn":
    case "final-frame": return "writing";
    case "shot-planning": return "directing";
    default: return "writing";
  }
}

/* ─── Anti-Generic Check ─────────────────────────────── */

const PHYSICAL_VIOLATIONS = [
  { pattern: /\b(holds?|holding)\b(?!\s+(shot|frame|the frame|the shot|that|on|for|longer|still|the camera|camera|a universe|meaning|weight|true|promise|key|place|value|onto))/i, reason: "Figures cannot hold objects — they have fixed molded hands" },
  { pattern: /\b(picks?\s+up|picking\s+up)\b/i, reason: "Figures cannot pick things up" },
  { pattern: /\b(takes?\s+(the|his|her|its|a|an)\s+\w+(?:'s)?\s+(hand|arm|object|item))/i, reason: "Figures cannot take/grab things" },
  { pattern: /\b(carr(ies|y|ying))\b(?!\s+(emotional|weight|the weight))/i, reason: "Figures cannot carry objects" },
  { pattern: /\b(grips?|gripping|grasps?|grasping)\b/i, reason: "Figures cannot grip objects" },
  { pattern: /\b(walks?|walking|strolls?|strolling)\b/i, reason: "Figures cannot walk — they are repositioned between shots" },
  { pattern: /\bbacks?\s+away/i, reason: "Figures cannot move — they are repositioned between shots" },
  { pattern: /\b(turns?\s+(around|to|toward|towards|away))\b/i, reason: "Figures cannot turn — reposition between shots" },
  { pattern: /\b(turns),/i, reason: "Figures cannot turn — reposition between shots" },
  { pattern: /\b(extends?\s+(his|her|its|a|the)\s+(hand|arm|paw))/i, reason: "Figures cannot extend limbs" },
  { pattern: /\b(raises?|lowers?|lifts?)\s+(his|her|its|the|a)\b/i, reason: "Figures cannot raise or lower limbs/objects" },
  { pattern: /\b(reaches?|reaching)\s+(out|for|toward)/i, reason: "Figures cannot reach" },
  { pattern: /\b(sits?\s+down|stands?\s+up|kneels?|crouches?)\b/i, reason: "Figures cannot change posture" },
  { pattern: /(?<!\w)(nods?|shrugs?|gestures?)\b/i, reason: "Figures cannot gesture" },
  { pattern: /\bwaves?\s+(his|her|its|a|the|at|to|goodbye|hello)\b/i, reason: "Figures cannot wave" },
  { pattern: /\b(points?\s+(at|to|toward|towards))\b/i, reason: "Figures cannot point" },
  { pattern: /\b(tears?\s+(track|down|in|stream|roll))/i, reason: "Figures cannot cry — they are plastic/resin" },
  { pattern: /\b(cries|crying|sobbing)\b/i, reason: "Figures cannot cry" },
  { pattern: /(?<!weeping willow)(?<!Weeping Willow)\b(weeps?|weeping)\b(?!\s+willow)/i, reason: "Figures cannot cry" },
];

function checkPhysicalViolation(text: string): { isGeneric: boolean; reason: string } {
  const cleaned = text.replace(/"[^"]*"/g, "").replace(/'[^']*'/g, "");
  for (const v of PHYSICAL_VIOLATIONS) {
    if (v.pattern.test(cleaned)) {
      return { isGeneric: true, reason: v.reason };
    }
  }
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 10);
  if (sentences.length > 5) {
    return { isGeneric: true, reason: "Response too long — keep to 2-4 sentences" };
  }
  if (/^the thesis:|[\n.][ ]*the thesis:/im.test(text)) {
    return { isGeneric: true, reason: "Drop the 'The thesis:' framing — just say the idea" };
  }
  return { isGeneric: false, reason: "" };
}

// checkGeneric removed — replaced by synchronous checkPhysicalViolation (zero API cost)

/* ─── Round-Based Speaker Selection ──────────────────── */

export function selectRoundSpeaker(
  agents: RoomAgent[],
  history: ChatMessage[],
  round: CreativeRound,
): string | null {
  const pool = agents
    .map((a) => a.personaId)
    .filter((id) => {
      const role = getPersona(id)?.role;
      return role && round.agentPool.includes(role);
    });

  if (pool.length === 0) return agents[0]?.personaId ?? null;

  const lastAgentMsgs = history.filter((m) => m.sender === "agent");
  const lastSpeaker = lastAgentMsgs[lastAgentMsgs.length - 1]?.agentId;
  const notLast = pool.filter((id) => id !== lastSpeaker);
  const candidates = notLast.length > 0 ? notLast : pool;

  return candidates[Math.floor(Math.random() * candidates.length)];
}

/* ─── Producer Brief Message ─────────────────────────── */

export function createBriefMessage(brief: string): ChatMessage {
  return makeMessage(
    "preset-producer",
    "The Producer",
    "producer",
    "🎬",
    `Team, here's what we're working with for this episode:\n\n${brief}\n\nLet's build something great. Writers — take it from here.`,
  );
}

/* ─── User Message ───────────────────────────────────── */

export function createUserMessage(content: string, shotId?: string): ChatMessage {
  return makeMessage(null, "Creator", "user", "👤", content, {
    referencedShotId: shotId,
  });
}

/* ─── System Message ─────────────────────────────────── */

export function createSystemMessage(content: string): ChatMessage {
  return makeMessage(null, "System", "system", "⚙️", content);
}

/* ─── Agent Message ──────────────────────────────────── */

export function createAgentMessage(
  personaId: string,
  content: string,
  extra?: Partial<ChatMessage>,
): ChatMessage {
  const persona = getPersona(personaId);
  return makeMessage(
    personaId,
    persona?.name ?? "Agent",
    persona?.role ?? "writer",
    persona?.avatar ?? "🤖",
    content,
    extra,
  );
}

/* ─── Select Next Speaker ────────────────────────────── */

export function selectNextSpeaker(
  agents: RoomAgent[],
  history: ChatMessage[],
  phase: RoomPhase,
): string | null {
  if (agents.length === 0) return null;

  const writerIds = agents
    .map((a) => a.personaId)
    .filter((id) => getPersona(id)?.role === "writer");
  const directorIds = agents
    .map((a) => a.personaId)
    .filter((id) => getPersona(id)?.role === "director");
  const cinematographerIds = agents
    .map((a) => a.personaId)
    .filter((id) => getPersona(id)?.role === "cinematographer");
  const producerId = agents
    .map((a) => a.personaId)
    .find((id) => getPersona(id)?.role === "producer");

  if (phase === "briefing") return producerId ?? null;
  if (phase === "pitch") return producerId ?? null;

  let pool: string[];
  if (phase === "rounds") {
    pool = agents.map((a) => a.personaId);
  } else if (phase === "approval") {
    const unapproved = agents.filter((a) => !a.approved).map((a) => a.personaId);
    pool = unapproved;
    if (pool.length === 0) return null;
  } else {
    pool = agents.map((a) => a.personaId);
  }

  if (pool.length === 0) return producerId ?? agents[0]?.personaId ?? null;

  const lastAgentMsgs = history.filter((m) => m.sender === "agent");
  const lastSpeaker = lastAgentMsgs[lastAgentMsgs.length - 1]?.agentId;
  const notLast = pool.filter((id) => id !== lastSpeaker);
  const candidates = notLast.length > 0 ? notLast : pool;

  return candidates[Math.floor(Math.random() * candidates.length)];
}

/* ─── Parse Story Structure from Writing Room ────────── */

export async function parseStoryStructure(
  chatHistory: ChatMessage[],
  brief: string,
  planning?: PlanningData,
  lockedDecisions?: LockedDecision[],
): Promise<{
  arc: StoryArcPhase[];
  elements: StoryElement[];
  shots: StagingShot[];
}> {
  const conversation = buildConversationContext(chatHistory);
  const brainCtx = buildBrainContext();
  const decisionsCtx = lockedDecisions?.length
    ? buildDecisionsBoardContext(lockedDecisions)
    : "";
  const preset = planning
    ? EPISODE_PRESETS.find((p) => p.id === planning.episodeLength)
    : null;
  const targetSec = preset?.durationSec ?? 52;
  const shotMin = preset?.shotRange[0] ?? 5;
  const shotMax = preset?.shotRange[1] ?? 12;

  let serlingSection = "";
  if (isSerlingDataLoaded()) {
    const ctx = await getSerlingContext({
      episodeBrief: brief,
      recentChat: conversation.slice(-2000),
      phase: "directing",
    });
    if (ctx.contextBlock) {
      serlingSection = `\n${ctx.contextBlock}\n`;
    }
  }

  const prompt = `${WALTER_CONTEXT}

${brainCtx}
${serlingSection}
${decisionsCtx ? `\n${decisionsCtx}\n` : ""}
You are converting a completed writing room discussion into a structured
PRODUCTION-READY episode breakdown for a real miniature diorama shoot.
${decisionsCtx ? "\nThe DECISIONS BOARD above contains locked creative decisions from the writing room. These are authoritative — build the structure around them.\n" : ""}

=== EPISODE BRIEF ===
${brief}
=== END BRIEF ===

=== WRITING ROOM DISCUSSION ===
${conversation}
=== END DISCUSSION ===

HARD CONSTRAINTS:
- Total episode duration: ~${targetSec} seconds. DO NOT EXCEED THIS.
- Total shot count: ${shotMin}–${shotMax} shots. Stay within this range.
- Each shot's durationSec must add up to approximately ${targetSec}s total.

Parse the discussion into a hierarchical structure with three levels:

1. STORY ARC PHASES — Use Serling's narrative architecture if a Serling persona
   was involved (The Intrusion, The Test, The Moral Inversion, Resonance, etc.)
   or use whatever structure the writers discussed. Do NOT use generic labels
   like "Setup" or "Rising Action" — use specific labels that describe THIS story.

2. STORY ELEMENTS — narrative beats within each phase. Be specific about what
   the VIEWER sees, not abstract descriptions.

3. SHOTS — individual camera frames. CRITICAL RULES FOR SHOTS:
   - Characters are PHYSICAL MINIATURE FIGURES that CANNOT MOVE on their own.
   - NEVER describe autonomous character movement (walking, turning, reaching,
     gesturing, holding, picking up, carrying). Figures have fixed molded hands
     and cannot grip or hold objects. Props are PLACED NEXT TO figures by the
     creator. Describe where the figure IS POSITIONED and where props are placed.
   - "cameraMove" can be: static, slow-zoom, slow-pan, dolly-in, dolly-out,
     tilt-up, tilt-down, rack-focus, slide, or any deliberate camera move.
     The camera is fully capable — use movement for emphasis and reveals.
   - "description" is a PRODUCTION INSTRUCTION: describe the composed frame.
     Example: "Static frame: Walter positioned at yard edge, facing away from
     house. Single streetlamp casts long shadow across empty sidewalk."
   - "audioNotes" should be specific: name instruments, describe the quality
     of sound (not just "music plays").
   - "shotType" options: extreme-close-up, close-up, medium-close, medium,
     medium-wide, wide, extreme-wide, overhead, low-angle, detail-insert
   - Each shot should be filmable with a real camera on a tripod pointed at a
     real miniature diorama.
${serlingSection ? `
   If Serling corpus evidence was provided above, ground the directorial choices
   in his documented patterns: threshold blocking, compression of space, the
   slow reveal, the inversion shot, holding the final frame.
` : ""}
Respond with ONLY a JSON object (no markdown fences):
{
  "arc": [
    { "id": "arc-1", "label": "Specific Phase Name", "order": 0, "color": "#f97316", "description": "What this phase accomplishes in the story" }
  ],
  "elements": [
    { "id": "el-1", "arcPhaseId": "arc-1", "label": "Specific Beat Name", "description": "What the viewer experiences", "order": 0 }
  ],
  "shots": [
    {
      "id": "shot-1",
      "elementId": "el-1",
      "order": 0,
      "description": "Production instruction: what the composed frame looks like",
      "characters": ["Walter"],
      "location": "Front Yard",
      "dialogue": "",
      "narration": "",
      "shotType": "wide",
      "cameraMove": "static",
      "transition": "cut",
      "audioNotes": "Specific audio: instrument, quality, emotional register",
      "durationSec": 3,
      "userEdited": false
    }
  ]
}

Extract everything the writers and directors discussed. Every shot must be
specific, grounded in the diorama reality, and filmable.`;

  const raw = await generateText(prompt);
  try {
    let cleaned = raw.trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) cleaned = cleaned.slice(start, end + 1);
    return JSON.parse(cleaned);
  } catch {
    return { arc: [], elements: [], shots: [] };
  }
}

/* ─── Check if content contains approval ─────────────── */

export function isApprovalMessage(content: string): boolean {
  const lower = content.toLowerCase();
  return (
    lower.includes("i approve this episode") ||
    lower.includes("i approve") ||
    lower.includes("approved")
  );
}
