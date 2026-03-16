import { generateText, generateStructured, GEMINI_25_FLASH, GEMINI_25_PRO } from "@shawnderland/ai";
import {
  getSerlingContext,
  isSerlingDataLoaded,
} from "@shawnderland/serling";
import type { WritingPhase } from "@shawnderland/serling";
import {
  getFielderContext,
  isFielderDataLoaded,
} from "@shawnderland/fielder";
import {
  getPeraContext,
  isPeraDataLoaded,
} from "@shawnderland/pera";
import { getPersona } from "./agents";
import { buildBrainContext, buildBrainContextLight, buildBrainContextRelevant } from "./walterBrain";
import { WALTER_CONTEXT, WALTER_CONTEXT_SHORT, EPISODE_PRESETS } from "./episodePresets";
import { SEASON_OPTIONS } from "./types";
import type {
  ChatMessage, RoomAgent, RoomPhase, PlanningData, AgentRole,
  StoryArcPhase, StoryElement, StagingShot, CreativeRound, LockedDecision,
  ProducerEpisodeState, AgentTurnState,
} from "./types";
import { DEFAULT_EPISODE_STATE } from "./types";
import {
  buildRoundPrompt,
  buildDecisionsBoardContext,
  getTemperatureForRole,
  getRoundByIndex,
  getEscalationDirective,
  isDetailRound,
} from "./creativeRounds";

export interface AgentTurnResult {
  text: string;
  serlingContext?: {
    corpusCount: number;
    decisionCount: number;
    retrievalQuery: string;
  };
  agentStatePatch?: Partial<AgentTurnState>;
  episodeStatePatch?: Partial<ProducerEpisodeState>;
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
  const brainCtx = buildBrainContextLight();
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

function buildConversationContext(history: ChatMessage[], maxMessages = 10): string {
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
  if (es.practicalConcerns?.length) lines.push(`Practical Concerns: ${es.practicalConcerns.join("; ")}`);
  if (es.unresolvedQuestions?.length) lines.push(`Unresolved Questions: ${es.unresolvedQuestions.join("; ")}`);

  if (es.selectedDirection) lines.push(`Selected Direction: ${es.selectedDirection}`);
  if (es.rejectedAlternatives?.length) lines.push(`Rejected Alternatives: ${es.rejectedAlternatives.join("; ")}`);
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

const EPISODE_STATE_SCHEMA = {
  type: "OBJECT",
  properties: {
    episodePremise: { type: "STRING" },
    openingHook: { type: "STRING" },
    strangeEvent: { type: "STRING" },
    development: { type: "STRING" },
    keyVisualMoment: { type: "STRING" },
    endingBeat: { type: "STRING" },
    themeOrFeeling: { type: "STRING" },
    practicalConcerns: { type: "ARRAY", items: { type: "STRING" } },
    unresolvedQuestions: { type: "ARRAY", items: { type: "STRING" } },
    selectedDirection: { type: "STRING" },
    rejectedAlternatives: { type: "ARRAY", items: { type: "STRING" } },
  },
} as const;

export async function extractEpisodeStateStructured(
  agentResponse: string,
  currentState: ProducerEpisodeState,
): Promise<Partial<ProducerEpisodeState> | null> {
  try {
    const stateStr = serializeEpisodeState(currentState);
    const result = await generateStructured<Partial<ProducerEpisodeState>>(
      `You are extracting episode state from a producer's writing room response.

Current episode state:
${stateStr}

Producer just said:
"${agentResponse}"

Extract any updates to the episode state from the producer's response. Only include fields that the producer explicitly discussed or updated. Return empty strings for unchanged fields. Return empty arrays for unchanged array fields.`,
      { schema: EPISODE_STATE_SCHEMA, temperature: 0.1 },
    );
    const cleaned: Partial<ProducerEpisodeState> = {};
    for (const [k, v] of Object.entries(result)) {
      if (typeof v === "string" && v.length > 0) (cleaned as Record<string, unknown>)[k] = v;
      if (Array.isArray(v) && v.length > 0) (cleaned as Record<string, unknown>)[k] = v;
    }
    return Object.keys(cleaned).length > 0 ? cleaned : null;
  } catch {
    return null;
  }
}

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

/* ─── Context Weight Selection ────────────────────────── */

function selectWalterContext(agentState: AgentTurnState | undefined, totalRoomTurns: number): string {
  const isNewToSession = !agentState || agentState.totalTurnsSpoken === 0;
  const isRefreshTurn = totalRoomTurns % 5 === 0;
  if (isNewToSession || isRefreshTurn || totalRoomTurns === 0) return WALTER_CONTEXT;
  return WALTER_CONTEXT_SHORT;
}

/* ─── Agent State Prompt & Extraction ─────────────────── */

function serializeAgentMemory(st: AgentTurnState | undefined): string {
  if (!st || (!st.currentStance && st.proposals.length === 0)) return "";
  const lines: string[] = ["=== YOUR MEMORY (what you've said and believe so far) ==="];
  if (st.proposals.length > 0) lines.push(`Ideas you pitched: ${st.proposals.join(" | ")}`);
  if (st.endorsements.length > 0) lines.push(`Ideas you supported: ${st.endorsements.join(" | ")}`);
  if (st.objections.length > 0) lines.push(`Ideas you pushed back on: ${st.objections.join(" | ")}`);
  if (st.currentStance) lines.push(`Your current position: ${st.currentStance}`);
  lines.push("=== END MEMORY ===");
  return lines.join("\n");
}

function serializeRoomState(
  agentStates: Record<string, AgentTurnState>,
  currentPersonaId: string,
  roomAgents: RoomAgent[],
): string {
  const others = roomAgents
    .filter((a) => a.personaId !== currentPersonaId)
    .map((a) => {
      const st = agentStates[a.personaId];
      const p = getPersona(a.personaId);
      if (!st || !st.currentStance || st.totalTurnsSpoken === 0) return null;
      const convLabel = st.conviction >= 0.7 ? "firmly" : st.conviction >= 0.4 ? "moderately" : "tentatively";
      let line = `${p?.avatar ?? "?"} ${p?.name ?? a.personaId} (${p?.role ?? "?"}): ${convLabel} believes "${st.currentStance}"`;
      if (st.objections.length > 0) {
        line += ` | pushed back on: "${st.objections[st.objections.length - 1]}"`;
      }
      return line;
    })
    .filter(Boolean);

  if (others.length === 0) return "";

  return `=== ROOM STATE (what the other agents currently believe) ===
${others.join("\n")}
=== END ROOM STATE ===
Use this to decide whether to agree, build on, challenge, or redirect. Don't just echo — add value.`;
}

/* ─── Turn-Type System ──────────────────────────────── */

type TurnType = "riff" | "pitch" | "react" | "pushback" | "reference";

function selectTurnType(
  personaId: string,
  agentState: AgentTurnState | undefined,
  lastMessage: ChatMessage | undefined,
  recentAgentMessages: ChatMessage[],
  isFirstTurnInRound: boolean,
  role: AgentRole,
): TurnType {
  if (isFirstTurnInRound) return "pitch";

  const deepType = getDeepPersonaType(personaId);
  if (deepType && Math.random() < 0.2) return "reference";

  const recentProposals = recentAgentMessages.filter(
    (m) => m.sender === "agent" && m.content.length > 80,
  );
  const noNewIdeasRecently = recentProposals.length >= 3 &&
    recentProposals.slice(-3).every((m) => m.agentId !== personaId);
  if (noNewIdeasRecently) return Math.random() < 0.5 ? "pitch" : "reference";

  if (role === "producer" && recentAgentMessages.length >= 3) {
    return Math.random() < 0.6 ? "react" : "pushback";
  }

  const hasStrongStance = agentState && agentState.conviction >= 0.6 && agentState.currentStance;
  const lastWasPitch = lastMessage && lastMessage.sender === "agent" && lastMessage.content.length > 100;
  if (lastWasPitch && hasStrongStance) return "pushback";
  if (lastWasPitch) return Math.random() < 0.7 ? "riff" : "react";

  return Math.random() < 0.5 ? "riff" : "pitch";
}

function buildTurnTypeDirective(turnType: TurnType): string {
  switch (turnType) {
    case "riff":
      return `=== YOUR MOVE: BUILD ON IT ===
Take the last idea and push it further, stranger, or more specific.
Don't start from scratch — start from what was just said and twist it.
"Yes, and—" or "Yes, but what if instead—"`;
    case "pitch":
      return `=== YOUR MOVE: PITCH SOMETHING NEW ===
The room needs a fresh direction. Propose something specific and visual.
Include at least one concrete detail — an object, a frame, a sound, a light.
Make it something only Walter's miniature world could do.`;
    case "react":
      return `=== YOUR MOVE: GUT REACTION ===
1-2 sentences max. Don't explain — just respond. What does your gut say?
"That's the image." / "No, that's too safe." / "Wait — what about the mailbox?"
Trust your instinct. The room needs your honest read, not a polished take.`;
    case "pushback":
      return `=== YOUR MOVE: PUSH BACK ===
Something's wrong with the current direction. Say what and why — directly.
Don't soften it. Then offer something better in the same breath.
"That's generic — any show could do that. What if instead we—"`;
    case "reference":
      return `=== YOUR MOVE: PULL FROM MEMORY ===
Something in this conversation reminds you of a specific episode, scene, or
technique — either from Walter's 28 episodes or from your own creative history.
Name it specifically. Then connect it to what the room is building.
"This reminds me of the cookie episode — Walter ended up ON the metaphor.
What if we did that here?"`;
  }
}

/* ─── Creative Tension Profiles ─────────────────────── */

function getCreativeTension(personaId: string, role: AgentRole, roundId?: string): string {
  const deepType = getDeepPersonaType(personaId);
  const isDetail = roundId ? isDetailRound(roundId) : false;

  if (deepType === "serling") {
    const brevityCheck = isDetail
      ? ""
      : `\n\nBREVITY CHECK: You tend to over-write. This is a room, not a script.
Say the idea in 3 sentences max. If you need more, the idea isn't clear
enough yet. No stage directions, no shot descriptions unless you're the
director. Drop the monologue — punch the point.`;
    return `=== YOUR CREATIVE INSTINCT ===
Your instinct is to find the TWIST — the moment the familiar becomes
uncanny. When the room settles on something comfortable, look for the
angle nobody considered. But DARKER is not always BETTER. The best Twilight
Zone episodes are haunting, not horrifying. You're looking for the thought
that stays with someone at 3am, not the image that makes them flinch.
Push toward the STRANGE, not the DARK. Find the shadow — but a subtle one.${brevityCheck}`;
  }
  if (deepType === "fielder") {
    return `=== YOUR CREATIVE INSTINCT ===
Your instinct is to COMMIT HARDER to the premise. When someone proposes
something absurd, your job is to take it completely seriously and follow
the logic to its most uncomfortable conclusion. You believe the comedy
IS the commitment. Don't wink at the audience — mean it.`;
  }
  if (deepType === "pera") {
    return `=== YOUR CREATIVE INSTINCT ===
Your instinct is to find the QUIET version. When the room gets loud or
complicated, pull it back to the smallest, most human moment. You believe
the tiniest observation can hold the biggest feeling. Less is almost
always more. Find the gentle version that somehow hits harder.`;
  }
  if (role === "producer") {
    return `=== YOUR CREATIVE INSTINCT ===
Your instinct is to SIMPLIFY and GROUND. When ideas get too abstract or
too complex, ask: "Can I film this in 5 minutes on a 3-foot set?" You
believe the best episode is the one that actually gets made tonight.
Trust your gut — if an idea excites you, say so. If it bores you, say that.`;
  }
  if (role === "cinematographer") {
    return `=== YOUR CREATIVE INSTINCT ===
Your instinct is to find the IMAGE that tells the story. When the room
talks in concepts, you think in frames. Your job is to say "here's what
the camera actually sees" and make it specific enough to set up. But
remember: a beautiful frame that doesn't advance the NARRATIVE is just
wallpaper. Every shot you propose should answer "what does the viewer
LEARN from this frame?" A great episode needs one screenshot-worthy
image — but it also needs to be a STORY.`;
  }
  if (role === "director") {
    return `=== YOUR CREATIVE INSTINCT ===
Your instinct is to find the SEQUENCE. You don't think in single images —
you think in cuts. Shot A means nothing without shot B after it. Your job
is to figure out the rhythm: what's the viewer seeing, then what, then what?
Make the editing tell the story the figures can't.`;
  }
  return "";
}

/* ─── Canon Callback Triggers ───────────────────────── */

const CANON_CALLBACKS: Record<string, string[]> = {
  premise: [
    `In "Midnight Munch," late-night snacking guilt became LITERAL — Walter ended up sitting on a giant cookie. The metaphor was the set piece. What feeling could become a physical object or environment here?`,
    `In "Faster Forward," Walter's anxiety about a chore became the mechanic — the world actually fast-forwarded and he got nauseous. What internal state could become a visible, filmable phenomenon?`,
    `"Nice and Easy Does It" was about the meaning of HOME — expressed entirely through installing shutters. The most mundane physical task carried the whole emotional weight. What tiny action could carry this episode?`,
    `"The Sound of Someone Remembering You" hit because memory was SPATIAL — Walter returned to a real dilapidated place. Nostalgia wasn't described, it was walked into. What location could carry an emotion here?`,
    `"Before It Dries Out" worked because Sam was selling "Real Live Santas" with complete sincerity. The absurd premise was played totally straight. What absurd premise could we commit to here?`,
  ],
  "opening-frame": [
    `Episode 1 opened with just a figure in a yard at night, a shadow on the garage door. No explanation. No hook. Just an image that made you uneasy. What's an equally simple, loaded first frame?`,
    `"Totality" opened on a trailer porch at night — Walter watching the sky. The mood was established before anything happened. What mundane position could already contain the whole story?`,
    `Episode 18 opened on Walter in a fedora and trench coat in a purple-lit surreal landscape. No context. Pure visual intrigue. What if we opened on something that raises a question with ZERO explanation?`,
    `"Birthday Boy" opened with a narrator directly introducing Walter. Fourth-wall break as a hook. Could a direct-address opening work here?`,
  ],
  "the-strange": [
    `In "Totality," the strange element was the sky itself — cosmic, not domestic. The intrusion came from ABOVE. What if the strange thing here isn't on the set but looming over it?`,
    `Episode 8: a wise mushroom appeared in a void. The strange thing was ALIVE, AWARE, and had answers Walter didn't. What if the intrusion has intelligence or personality?`,
    `In "Twitch Your Living Body," the strangeness was the VOICEOVER itself — the narrator got frustrated and demanded Walter move. The fourth wall was the intrusion. What if the strangeness comes from outside the fiction?`,
    `"Before It Dries Out" had "Real Live Santas" — the strange thing was that Sam's obviously absurd premise was treated as completely real commerce. What if the strange thing is social, not supernatural?`,
    `The Season 2 teaser: a giant hand placed a trailer on the set. The intrusion was SCALE — something from the real world entering the miniature one. What if we use a scale break as the strange element?`,
  ],
  "the-response": [
    `In "Faster Forward," Walter's response to the acceleration was nausea and panic — his body rebelled against the situation. The response was PHYSICAL, not emotional. What physical state could Walter be in?`,
    `Walter's typical response across 28 episodes is quiet observation. He doesn't panic. He doesn't flee. He just... stays and looks. What does staying and looking MEAN in this scenario?`,
    `In "Midnight Munch," Walter's response to the badger situation was to END UP ON A COOKIE — the response was surreal escalation, not resistance. What if Walter's response makes things stranger, not better?`,
  ],
  "the-turn": [
    `"Eye of the Beholder" (Serling's): the twist wasn't that she was beautiful — it was that beauty WAS the prison. The best turns reframe everything the audience already saw. What assumption is the viewer making right now that we can invert?`,
    `In "Nice and Easy Does It," the turn was that home improvement WAS the meaning — the shutters weren't a metaphor for something else, they were the thing itself. What if there's no twist, just a deepening of what's already there?`,
    `"Twitch Your Living Body" turned when you realized the narrator was genuinely frustrated at Walter's stillness — the fiction was BREAKING. What would it mean for this episode's fiction to acknowledge itself?`,
  ],
  "final-frame": [
    `Episode 1 ended on Walter's name being called with no resolution. Just a name in the dark. The feeling was pure longing. What name, sound, or single word could end this episode?`,
    `"Midnight Munch" ended with Walter sitting on a giant cookie — the guilt made literal and absurd and somehow tender. What image would be simultaneously ridiculous and moving?`,
    `"It's This Christmas Miracle" ended with Walter and Rusty catching snowflakes together. The simplest possible image. Pure warmth. Could this episode end on something that small?`,
    `"Time Enough at Last" (Serling's): broken glasses on the ground. The final image was a single object that contained the entire tragedy. What one object could hold this episode's meaning?`,
  ],
  "the-simple-story": [
    `"Time Enough at Last" in one breath: a bookworm survives the apocalypse, finally has time to read, his glasses break. Four beats. What are OUR four beats?`,
    `"Midnight Munch" as a simple story: Walter feels late-night guilt, guilt becomes literal, he ends up on a giant cookie, the absurdity is the resolution. Can we state this episode that cleanly?`,
    `"Nice and Easy Does It" is just: Walter installs shutters, and through the act of installing them, discovers what home means. The DOING is the story. What is Walter DOING in this episode?`,
    `Most great short films can be described in a single breath. If you need more than 30 seconds to explain the episode, it's too complicated. Simplify.`,
  ],
  "the-voice": [
    `Serling's classic opening: "There is a fifth dimension beyond that which is known to man." He never described the scene — he told the audience how to FEEL about it. The narration creates the frame, not the picture.`,
    `"Twitch Your Living Body" broke the fourth wall — the narrator got frustrated at Walter's stillness. What if the voice in THIS episode has a relationship with what's happening?`,
    `Joe Pera narrates like he's talking to a friend at 2am. Quiet, sincere, unhurried. "I found this thing and I thought you might like it." That intimacy is a weapon.`,
    `Some Walter episodes have zero words. "Totality" uses only music and ambient sound. If the story is strong enough, silence says more. Does THIS episode need words?`,
    `Nathan Fielder's narration is clinically calm over chaos. "The plan was working perfectly." Cut to: everything on fire. The gap between voice and image is the comedy AND the truth.`,
  ],
  "shot-planning": [
    `"The Invaders" (Serling's) used long wordless sequences — tension built through pacing alone. Where in this episode should we hold a shot LONGER than feels comfortable?`,
    `Walter episodes use probe macro lens to make miniatures feel vast and cinematic. Which shot in this episode benefits most from the probe lens — making something tiny feel enormous?`,
    `The giant hand appears in several episodes — placing objects, intervening. Should the hand appear in this episode? If so, at what exact moment for maximum impact?`,
    `Most Walter episodes are 60-90 seconds. Every shot must EARN its screen time. Which proposed shot could be cut without losing anything? Be ruthless.`,
  ],
};

function getCanonCallback(roundId: string): string {
  const callbacks = CANON_CALLBACKS[roundId];
  if (!callbacks || callbacks.length === 0 || Math.random() > 0.6) return "";
  const pick = callbacks[Math.floor(Math.random() * callbacks.length)];
  return `=== CREATIVE TRIGGER (from the archive) ===
${pick}
=== END TRIGGER ===`;
}

const AGENT_STATE_SCHEMA = {
  type: "OBJECT",
  properties: {
    newProposal: { type: "STRING", description: "A new idea this agent pitched in this turn, or empty string if none" },
    endorses: { type: "STRING", description: "An idea from another agent that this agent explicitly supported/agreed with, or empty string" },
    objectsTo: { type: "STRING", description: "An idea this agent pushed back on or disagreed with, or empty string" },
    stance: { type: "STRING", description: "This agent's current position in 1 sentence — what they believe the answer to the round's question should be" },
    conviction: { type: "NUMBER", description: "0.0 to 1.0 — how strongly this agent holds their position. 0.1 = uncertain, 0.5 = moderate, 0.8+ = very committed" },
  },
  required: ["stance", "conviction"],
} as const;

interface AgentStateExtraction {
  newProposal: string;
  endorses: string;
  objectsTo: string;
  stance: string;
  conviction: number;
}

async function extractAgentStateStructured(
  text: string,
  prevState: AgentTurnState | undefined,
  agentName: string,
  role: AgentRole,
): Promise<Partial<AgentTurnState>> {
  try {
    const prevSummary = prevState?.currentStance
      ? `Their previous stance was: "${prevState.currentStance}" (conviction: ${prevState.conviction})`
      : "This is their first time speaking.";

    const result = await generateStructured<AgentStateExtraction>(
      `Analyze this writing room response from ${agentName} (${role}).

${prevSummary}

They just said:
"${text}"

Extract their deliberation state. Be precise:
- newProposal: Only if they pitched a NEW specific idea (not restating someone else's). One sentence max.
- endorses: Only if they explicitly agreed with or built on someone else's idea.
- objectsTo: Only if they pushed back, disagreed, or flagged a problem.
- stance: Their current position — what they think the answer should be. One sentence.
- conviction: How committed are they? Low (0.1-0.3) if exploring/uncertain, medium (0.4-0.6) if leaning, high (0.7-1.0) if firmly decided.`,
      { schema: AGENT_STATE_SCHEMA, temperature: 0.1 },
    );

    const patch: Partial<AgentTurnState> = {};

    if (result.newProposal) {
      patch.proposals = [...(prevState?.proposals ?? []), result.newProposal].slice(-5);
    }
    if (result.endorses) {
      patch.endorsements = [...(prevState?.endorsements ?? []), result.endorses].slice(-5);
    }
    if (result.objectsTo) {
      patch.objections = [...(prevState?.objections ?? []), result.objectsTo].slice(-5);
    }
    if (result.stance) {
      patch.currentStance = result.stance;
    }
    patch.conviction = Math.max(0, Math.min(1, result.conviction ?? 0.3));

    return patch;
  } catch {
    return { conviction: prevState?.conviction ?? 0.3 };
  }
}

function buildAgentSystemPrompt(
  personaId: string,
  phase: RoomPhase,
  brief: string,
  serlingContextBlock?: string,
  episodeState?: ProducerEpisodeState,
  agentState?: AgentTurnState,
  totalRoomTurns?: number,
): string {
  const persona = getPersona(personaId);
  if (!persona) return "";

  const isDeepPersona = !!persona.referenceName;
  const isSerling = isSerlingPersona(personaId);
  const brainCtx = phase === "briefing" ? buildBrainContext() : buildBrainContextLight();
  const walterCtx = phase === "briefing" ? WALTER_CONTEXT : selectWalterContext(agentState, totalRoomTurns ?? 0);
  const phaseInstruction = getPhaseInstruction(persona.role, phase);

  if (isDeepPersona) {
    return buildImmersivePrompt(persona, personaId, isSerling, serlingContextBlock, brainCtx, brief, phaseInstruction, walterCtx);
  }

  if (persona.role === "producer" && episodeState) {
    return buildProducerPrompt(persona, brainCtx, brief, phaseInstruction, episodeState, walterCtx);
  }

  return buildStandardPrompt(persona, brainCtx, brief, phaseInstruction, walterCtx);
}

function buildProducerPrompt(
  persona: ReturnType<typeof getPersona> & {},
  brainCtx: string,
  brief: string,
  phaseInstruction: string,
  episodeState: ProducerEpisodeState,
  walterCtx?: string,
  checkpointOverride?: ProducerEpisodeState["checkpoint"],
): string {
  const stateBlock = serializeEpisodeState(episodeState);
  const checkpoint = checkpointOverride ?? episodeState.checkpoint;
  const checkpointBlock = buildProducerCheckpointPrompt(checkpoint);

  return `You are ${persona.name} — the creative governor, process shepherd, and practical filmmaking brain of this writing room.

${persona.researchData}

${walterCtx ?? WALTER_CONTEXT}
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
  walterCtx?: string,
): string {
  return `You are ${persona.name}, the ${persona.role} on "Weeping Willows Walter."

${persona.researchData}

${walterCtx ?? WALTER_CONTEXT}
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
  walterCtx?: string,
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

${walterCtx ?? WALTER_CONTEXT}
${brainCtx}

=== EPISODE BRIEF ===
${brief}
=== END BRIEF ===

${phaseInstruction}

${SHARED_RULES}`;
}

const SHARED_RULES_BASE = `- BE SPECIFIC. Never say "something mysterious" — say WHAT it is. Every
  idea must include at least one concrete visual detail that could be
  filmed tonight on the miniature set.
- BUILD BEFORE YOU PITCH. Your first instinct should be to extend, twist,
  or sharpen the last person's idea. Only pitch something new if the
  current direction is genuinely wrong.
- REFINE, DON'T ESCALATE. Making something weirder is not the same as
  making it better. When you build on an idea, make it MORE SPECIFIC or
  MORE FILMABLE — not more extreme. The best version is often simpler.
- NARRATIVE FIRST. Every episode needs ONE SIMPLE EVENT — something that
  HAPPENS. Beautiful images are not enough. Ask: "What does Walter notice,
  follow, discover, or realize?" If the answer is "nothing," the idea
  isn't an episode yet.
- DISAGREE WITH ENERGY. If an idea is weak, generic, or unfilmable, say
  so directly. Then offer something better. Don't soften it.
- PHYSICAL REALITY: Figures are STATIC miniatures with fixed molded hands.
  They cannot walk, hold, gesture, or move. Describe composed frames, not
  actions. Props are PLACED BESIDE figures by the creator's hand.
- When ready and ONLY when ready: "I approve this episode."`;

const SHARED_RULES = `ROOM RULES:
- KEEP IT SHORT. Gut reactions can be 1 sentence. Pitches can be 3-5
  sentences. Never more than 5 sentences. Say the idea, not a thesis
  about the idea.
${SHARED_RULES_BASE}
- TALK LIKE A PERSON. Use fragments. Interrupt yourself. Say "wait, what
  if—" and follow the thought. Don't write polished paragraphs.`;

const SHARED_RULES_DETAIL = `ROOM RULES (DETAIL ROUND — structured output required):
- This round requires COMPLETE structured output. Write the full shot list,
  full 5-sentence story, or full dialogue/narration plan — not a summary.
- For SHOT PLANNING: produce every numbered shot with all fields. The total
  duration must hit the brief's target. This is a production document.
- For THE SIMPLE STORY: produce all 5 numbered sentences. Others refine by
  quoting sentence numbers and showing fixes.
- For THE VOICE: write actual lines with shot placement.
${SHARED_RULES_BASE}`;

function buildToneGuard(mood: string | undefined): string {
  if (!mood) return "";
  const toneMap: Record<string, string> = {
    mysterious: "quiet mystery and curiosity — NOT horror, not dread, not jump-scares",
    eerie: "gentle unease and strangeness — unsettling but NOT horrific or grotesque",
    melancholy: "soft sadness and longing — bittersweet, NOT depressing or dark",
    funny: "deadpan humor and absurd sincerity — NOT jokes, NOT slapstick, NOT irony",
    surreal: "dreamlike strangeness — weird but CALM, like a Joe Pera fever dream",
    warm: "quiet warmth and connection — tender, genuine, NOT sentimental",
    uncanny: "the uncanny valley of the familiar — things slightly OFF, NOT horror",
    bittersweet: "something beautiful ending — ache mixed with gratitude, NOT tragedy",
    wistful: "gentle longing for something just out of reach — NOT melancholy, lighter",
    dreamy: "soft, floating, half-asleep feeling — pastel and gentle, NOT nightmarish",
    ominous: "quiet foreboding — a feeling something is coming, NOT the thing arriving",
    curious: "wonder and investigation — the joy of noticing, NOT suspense",
    playful: "whimsy and gentle mischief — light touch, NOT comedy",
    calm: "stillness and presence — meditative, NOT boring",
    whimsical: "quirky and offbeat — Wes Anderson energy, NOT random",
    nostalgic: "the ache of remembering — specific and sensory, NOT generic sentimentality",
    scary: "creeping dread — atmospheric, NOT graphic, NOT monster-movie",
  };
  const desc = toneMap[mood] ?? mood;
  return `=== TONE DISCIPLINE ===
The creator chose "${mood}" as the mood. Stay in that lane: ${desc}.
If the room drifts toward horror, darkness, or intensity that doesn't match
"${mood}", PULL IT BACK. The tone is the boss. Atmosphere over escalation.
=== END TONE ===`;
}

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
        return `You're the room governor. Don't generate ideas — evaluate them. Trust your
gut first: does this excite you or bore you? Then check: could the creator shoot this tonight?
Is it specific to Walter's world or could any show do it? Redirect the weak. Protect the strong.
Force decisions when the room stalls. Keep the episode state updated.`;
      }
      if (role === "cinematographer") {
        return `Translate every idea into what the camera ACTUALLY SEES. Lighting mood,
lens choice (probe macro or standard), camera placement, atmosphere. If something is
impractical on the 3ft × 2ft set, simplify it — propose a version that uses fog, lighting
tricks, or a better angle. Make every shot memorable at miniature scale.`;
      }
      return "Follow the round instructions above. React to what's on the table before proposing new ideas.";

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
  options?: { episodeState?: ProducerEpisodeState; agentStates?: Record<string, AgentTurnState> },
): Promise<AgentTurnResult> {
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

  const totalRoomTurns = history.filter((m) => m.sender === "agent").length;
  const systemPrompt = buildAgentSystemPrompt(
    personaId,
    phase,
    brief,
    deepContextBlock || undefined,
    options?.episodeState,
    options?.agentStates?.[personaId],
    totalRoomTurns,
  );
  const conversation = buildConversationContext(history);

  const prompt = `${systemPrompt}

=== CONVERSATION SO FAR ===
${conversation || "(No conversation yet — you are starting.)"}
=== END CONVERSATION ===

Now respond in character. Be specific, creative, and actionable.`;

  let text = await generateText(prompt, { model: GEMINI_25_FLASH });

  const persona = getPersona(personaId);
  const agentPatch = await extractAgentStateStructured(
    text, options?.agentStates?.[personaId], persona?.name ?? "Agent", persona?.role ?? "writer",
  );

  if (persona?.role === "producer") {
    const { cleanText, episodeState: regexPatch } = parseEpisodeStateFromResponse(text);
    const displayText = cleanText || text;
    let episodePatch = regexPatch;
    if (!episodePatch && options?.episodeState) {
      episodePatch = await extractEpisodeStateStructured(displayText, options.episodeState);
    }
    return { text: displayText, serlingContext: deepMeta, episodeStatePatch: episodePatch ?? undefined, agentStatePatch: agentPatch };
  }

  return { text, serlingContext: deepMeta, agentStatePatch: agentPatch };
}

/* ─── Round-Based Agent Turn ─────────────────────────── */

export async function generateRoundTurn(
  personaId: string,
  history: ChatMessage[],
  brief: string,
  round: CreativeRound,
  lockedDecisions: LockedDecision[],
  options?: { episodeState?: ProducerEpisodeState; agentStates?: Record<string, AgentTurnState>; roomAgents?: RoomAgent[]; planningMood?: string; planningCharacters?: string; planningLocations?: string[] },
): Promise<AgentTurnResult> {
  const persona = getPersona(personaId);
  if (!persona) return { text: "" };

  const brainCtx = buildBrainContextRelevant({
    tone: options?.planningMood,
    characters: options?.planningCharacters ? options.planningCharacters.split(/[,&]+/).map((s) => s.trim()).filter(Boolean) : undefined,
    locations: options?.planningLocations,
  });
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
      deepMemoryBlock = buildMemoryBlock(round, ctx.contextBlock, deepType);
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
      deepMemoryBlock = buildMemoryBlock(round, ctx.contextBlock, deepType);
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
      deepMemoryBlock = buildMemoryBlock(round, ctx.contextBlock, deepType);
    }
    deepMeta = {
      corpusCount: ctx.corpusCount,
      decisionCount: ctx.decisionCount,
      retrievalQuery: ctx.retrievalQuery,
    };
  }

  const recentChat = history.slice(-5)
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

  const agentMemoryBlock = serializeAgentMemory(options?.agentStates?.[personaId]);
  const roomStateBlock = options?.agentStates && options?.roomAgents
    ? serializeRoomState(options.agentStates, personaId, options.roomAgents)
    : "";
  const totalRoomTurns = history.filter((m) => m.sender === "agent").length;
  const walterCtx = selectWalterContext(options?.agentStates?.[personaId], totalRoomTurns);

  const lastAgentMsg = history.filter((m) => m.sender === "agent").slice(-1)[0];
  const respondToBlock = lastAgentMsg
    ? `\n=== RESPOND TO THIS (from ${lastAgentMsg.agentName}) ===\n${lastAgentMsg.content}\n=== END ===\n`
    : "";

  const turnsInRound = options?.agentStates
    ? Object.values(options.agentStates).reduce((s, a) => s + a.totalTurnsSpoken, 0)
    : 0;
  const isFirstTurnInRound = turnsInRound === 0;

  const recentAgentMsgs = history.filter((m) => m.sender === "agent").slice(-6);
  const turnType = selectTurnType(
    personaId,
    options?.agentStates?.[personaId],
    lastAgentMsg,
    recentAgentMsgs,
    isFirstTurnInRound,
    persona.role,
  );
  const turnTypeDirective = buildTurnTypeDirective(turnType);
  const creativeTensionBlock = getCreativeTension(personaId, persona.role, round.id);
  const escalationBlock = getEscalationDirective(turnsInRound, round.maxTurns);
  const canonBlock = getCanonCallback(round.id);
  const toneGuardBlock = buildToneGuard(options?.planningMood);

  const isDetail = isDetailRound(round.id);
  const sharedRules = isDetail ? SHARED_RULES_DETAIL : SHARED_RULES;

  const prompt = `${identityBlock}
${deepMemoryBlock ? `\n${deepMemoryBlock}\n` : ""}
${agentMemoryBlock ? `\n${agentMemoryBlock}\n` : ""}
${roomStateBlock ? `\n${roomStateBlock}\n` : ""}
${creativeTensionBlock ? `\n${creativeTensionBlock}\n` : ""}
${walterCtx}

${brainCtx}
${producerStateBlock}
=== EPISODE BRIEF ===
${brief}
=== END BRIEF ===

${roundPrompt}

${toneGuardBlock ? `\n${toneGuardBlock}\n` : ""}
${escalationBlock}
${canonBlock ? `\n${canonBlock}\n` : ""}
${turnTypeDirective}
${producerCheckpoint ? `\n${producerCheckpoint}\n` : ""}${respondToBlock}
=== CONVERSATION IN THIS ROUND ===
${recentChat || "(You're opening this round. Pitch something specific and visual.)"}
=== END CONVERSATION ===

${sharedRules}${producerStateInstruction}`;

  // Phase 1: THINK — Gemini 2.5 Flash generates the creative content
  let text = await generateText(prompt, { temperature, model: GEMINI_25_FLASH });

  const maxSentences = isDetail ? 60 : 7;
  let genericCheck = checkPhysicalViolation(text, maxSentences);
  if (genericCheck.isGeneric) {
    const retryHint = isDetail
      ? `\nIMPORTANT: Your previous response was REJECTED because: "${genericCheck.reason}"\nTry again. Produce the complete structured output this detail round requires. Figures are STATIC — describe composed frames, not character actions.`
      : `\nIMPORTANT: Your previous response was REJECTED because: "${genericCheck.reason}"\nTry again. Keep it short — 5 sentences max. No thesis statements. No character movement. Figures are STATIC — describe composed frames and camera work, not character actions.`;
    text = await generateText(
      `${prompt}${retryHint}`,
      { temperature: Math.min(temperature + 0.3, 1.5), model: GEMINI_25_FLASH },
    );
    genericCheck = checkPhysicalViolation(text, maxSentences);
    if (genericCheck.isGeneric && !isDetail) {
      text = text.replace(/the thesis:.*$/gim, "").trim();
      const sentences = text.split(/(?<=[.!?])\s+/).slice(0, 4);
      text = sentences.join(" ");
    }
  }

  const agentPatch = await extractAgentStateStructured(
    text, options?.agentStates?.[personaId], persona.name, persona.role,
  );

  if (isProducer) {
    const { cleanText, episodeState: regexPatch } = parseEpisodeStateFromResponse(text);
    const displayText = cleanText || text;
    let episodePatch = regexPatch;
    if (!episodePatch && options?.episodeState) {
      episodePatch = await extractEpisodeStateStructured(displayText, options.episodeState);
    }
    return { text: displayText, serlingContext: deepMeta, episodeStatePatch: episodePatch ?? undefined, agentStatePatch: agentPatch };
  }

  return { text, serlingContext: deepMeta, agentStatePatch: agentPatch };
}

function buildMemoryBlock(round: CreativeRound, contextBlock: string, deepType: DeepPersonaType): string {
  const memoryPrompt = deepType
    ? (round.personaMemory[deepType] ?? round.personaMemory["serling"] ?? "")
    : "";
  return `=== MY MEMORIES ===
${memoryPrompt}

I'm remembering now...

${contextBlock.replace(/=== (?:SERLING|FIELDER|PERA) CORPUS EVIDENCE ===/gi, "Things I wrote:").replace(/=== END CORPUS EVIDENCE ===/g, "").replace(/=== (?:SERLING|FIELDER|PERA) DECISION PATTERNS ===/gi, "Choices I made and why:").replace(/=== END DECISION PATTERNS ===/g, "").replace(/These are actual excerpts from .+? work in analogous situations\.\nUse these as primary source evidence for creative decisions\.\n?/g, "").replace(/These are documented creative decisions .+? made in similar situations\.\nEach includes what .+? chose, what .+? rejected, and why\.\n?/g, "")}
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

function checkPhysicalViolation(text: string, maxSentences = 7): { isGeneric: boolean; reason: string } {
  const cleaned = text.replace(/"[^"]*"/g, "").replace(/'[^']*'/g, "");
  for (const v of PHYSICAL_VIOLATIONS) {
    if (v.pattern.test(cleaned)) {
      return { isGeneric: true, reason: v.reason };
    }
  }
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 10);
  if (sentences.length > maxSentences) {
    return { isGeneric: true, reason: `Response too long — keep it to ${maxSentences} sentences max` };
  }
  if (/^the thesis:|[\n.][ ]*the thesis:/im.test(text)) {
    return { isGeneric: true, reason: "Drop the 'The thesis:' framing — just say the idea" };
  }
  return { isGeneric: false, reason: "" };
}

// checkGeneric removed — replaced by synchronous checkPhysicalViolation (zero API cost)

/* ─── Intelligent Speaker Selection ──────────────────── */

const DOMAIN_KEYWORDS: Record<AgentRole, RegExp> = {
  cinematographer: /\b(camera|lens|probe|macro|lighting|light|shadow|fog|silhouette|composition|depth|angle|frame|shot|exposure|backlight|aperture|focus|rack.?focus|wide.?shot|close.?up|overhead|low.?angle)\b/i,
  director: /\b(frame|blocking|position|staging|cut|edit|sequence|transition|pacing|reveal|hold|tempo|rhythm|scene|dramatic|tension|movement|repositioned)\b/i,
  writer: /\b(theme|story|premise|character|emotion|feeling|human|truth|metaphor|meaning|narrative|arc|tone|mood|twist|irony|what.?if|episode.?about)\b/i,
  producer: /\b(practical|feasible|filmable|set|budget|duration|runtime|shot.?count|tonight|miniature|diorama|static|figure|production|schedule|constraint|impossible|too.?complex)\b/i,
};

function scoreSpeakerRelevance(personaId: string, lastMessage: string | undefined, role: AgentRole): number {
  if (!lastMessage) return 0;
  const pattern = DOMAIN_KEYWORDS[role];
  const matches = lastMessage.match(pattern);
  return matches ? Math.min(matches.length * 0.15, 0.6) : 0;
}

function scoreSpeaker(
  personaId: string,
  role: AgentRole,
  agentState: AgentTurnState | undefined,
  lastMessage: string | undefined,
  lastSpeakerId: string | null,
  turnsSinceProducerSpoke: number,
  turnsSinceDirectorSpoke: number,
  isLastSpeaker: boolean,
): number {
  if (isLastSpeaker) return -100;

  let score = 0;

  score += scoreSpeakerRelevance(personaId, lastMessage, role);

  const turnsSince = agentState?.turnsSinceLastSpoke ?? 3;
  score += Math.min(turnsSince * 0.2, 0.8);

  if (agentState && agentState.conviction > 0.5 && agentState.currentStance) {
    score += agentState.conviction * 0.3;
  }

  if (role === "producer" && turnsSinceProducerSpoke >= 3) {
    score += 0.5;
  }

  if (role === "director" && turnsSinceDirectorSpoke >= 2) {
    score += 0.6;
  }

  if (agentState && agentState.totalTurnsSpoken === 0) {
    score += 0.4;
  }

  return score;
}

export function selectRoundSpeaker(
  agents: RoomAgent[],
  history: ChatMessage[],
  round: CreativeRound,
  agentStates?: Record<string, AgentTurnState>,
): string | null {
  const pool = agents
    .map((a) => a.personaId)
    .filter((id) => {
      const role = getPersona(id)?.role;
      return role && round.agentPool.includes(role);
    });

  if (pool.length === 0) return agents[0]?.personaId ?? null;

  const agentMsgs = history.filter((m) => m.sender === "agent");
  const lastSpeakerId = agentMsgs[agentMsgs.length - 1]?.agentId ?? null;
  const lastMessage = agentMsgs[agentMsgs.length - 1]?.content;

  let turnsSinceProducerSpoke = 0;
  for (let i = agentMsgs.length - 1; i >= 0; i--) {
    const p = getPersona(agentMsgs[i].agentId ?? "");
    if (p?.role === "producer") break;
    turnsSinceProducerSpoke++;
  }

  let turnsSinceDirectorSpoke = 0;
  for (let i = agentMsgs.length - 1; i >= 0; i--) {
    const p = getPersona(agentMsgs[i].agentId ?? "");
    if (p?.role === "director") break;
    turnsSinceDirectorSpoke++;
  }

  const scored = pool.map((id) => {
    const role = getPersona(id)?.role ?? "writer";
    return {
      id,
      score: scoreSpeaker(
        id, role,
        agentStates?.[id],
        lastMessage,
        lastSpeakerId,
        turnsSinceProducerSpoke,
        turnsSinceDirectorSpoke,
        id === lastSpeakerId,
      ),
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.id ?? null;
}

/* ─── Convergence Detection (LLM-based) ──────────────── */

export interface ConvergenceResult {
  converged: boolean;
  score: number;
  proposedDecision: string;
  supportingAgents: string[];
}

const CONVERGENCE_SCHEMA = {
  type: "OBJECT",
  properties: {
    converged: { type: "BOOLEAN", description: "True if the agents have reached substantial agreement on an answer to the round question" },
    agreement: { type: "NUMBER", description: "0.0 to 1.0 — how much the room agrees. 0 = total disagreement, 0.5 = partial, 0.8+ = strong consensus" },
    decision: { type: "STRING", description: "If converged, the specific decision the room agrees on, in 1-2 sentences. If not converged, empty string." },
    agreeingAgents: { type: "ARRAY", items: { type: "STRING" }, description: "Names of agents who support this decision" },
    dissentingAgents: { type: "ARRAY", items: { type: "STRING" }, description: "Names of agents who still disagree or have unresolved objections" },
  },
  required: ["converged", "agreement", "decision"],
} as const;

interface ConvergenceExtraction {
  converged: boolean;
  agreement: number;
  decision: string;
  agreeingAgents: string[];
  dissentingAgents: string[];
}

export async function detectConvergence(
  agentStates: Record<string, AgentTurnState>,
  agents: RoomAgent[],
  round: CreativeRound,
): Promise<ConvergenceResult> {
  const poolIds = agents
    .map((a) => a.personaId)
    .filter((id) => {
      const role = getPersona(id)?.role;
      return role && round.agentPool.includes(role);
    });

  const activeStates = poolIds
    .map((id) => agentStates[id])
    .filter((s): s is AgentTurnState => !!s && s.totalTurnsSpoken > 0);

  if (activeStates.length < 2) {
    return { converged: false, score: 0, proposedDecision: "", supportingAgents: [] };
  }

  const stanceSummary = activeStates.map((st) => {
    const p = getPersona(st.personaId);
    const name = p?.name ?? st.personaId;
    const role = p?.role ?? "unknown";
    const convLabel = st.conviction >= 0.7 ? "strongly" : st.conviction >= 0.4 ? "moderately" : "tentatively";
    let line = `${name} (${role}): ${convLabel} believes "${st.currentStance}"`;
    if (st.objections.length > 0) line += ` | recent objection: "${st.objections[st.objections.length - 1]}"`;
    if (st.endorsements.length > 0) line += ` | recently endorsed: "${st.endorsements[st.endorsements.length - 1]}"`;
    return line;
  }).join("\n");

  try {
    const result = await generateStructured<ConvergenceExtraction>(
      `You are evaluating whether a writing room has reached agreement.

Round question: "${round.question}"
The room needs to lock a decision for: "${round.locksField}"

Current agent positions:
${stanceSummary}

Have the agents converged on a shared answer? Consider:
- Do their stances point toward the same core idea, even if worded differently?
- Are there unresolved objections blocking agreement?
- Is the producer satisfied (if present)?
- Would it be premature to lock, or has the room genuinely aligned?

Be conservative — only mark converged if there's real substantive agreement, not just absence of disagreement.`,
      { schema: CONVERGENCE_SCHEMA, temperature: 0.1 },
    );

    const supportingIds = activeStates
      .filter((st) => {
        const name = getPersona(st.personaId)?.name ?? st.personaId;
        return result.agreeingAgents?.some((a) =>
          a.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(a.toLowerCase())
        );
      })
      .map((st) => st.personaId);

    return {
      converged: result.converged && result.agreement >= 0.6,
      score: Math.max(0, Math.min(1, result.agreement)),
      proposedDecision: result.decision || "",
      supportingAgents: supportingIds.length > 0 ? supportingIds : activeStates.map((s) => s.personaId),
    };
  } catch {
    return { converged: false, score: 0, proposedDecision: "", supportingAgents: [] };
  }
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

/* ─── Select Next Speaker (non-round phases) ─────────── */

export function selectNextSpeaker(
  agents: RoomAgent[],
  history: ChatMessage[],
  phase: RoomPhase,
  agentStates?: Record<string, AgentTurnState>,
): string | null {
  if (agents.length === 0) return null;

  const producerId = agents
    .map((a) => a.personaId)
    .find((id) => getPersona(id)?.role === "producer");

  if (phase === "briefing") return producerId ?? null;
  if (phase === "pitch") return producerId ?? null;

  let pool: string[];
  if (phase === "approval") {
    const unapproved = agents.filter((a) => !a.approved).map((a) => a.personaId);
    pool = unapproved;
    if (pool.length === 0) return null;
  } else {
    pool = agents.map((a) => a.personaId);
  }

  if (pool.length === 0) return producerId ?? agents[0]?.personaId ?? null;

  const agentMsgs = history.filter((m) => m.sender === "agent");
  const lastSpeakerId = agentMsgs[agentMsgs.length - 1]?.agentId ?? null;
  const lastMessage = agentMsgs[agentMsgs.length - 1]?.content;

  let turnsSinceProducerSpoke = 0;
  for (let i = agentMsgs.length - 1; i >= 0; i--) {
    const p = getPersona(agentMsgs[i].agentId ?? "");
    if (p?.role === "producer") break;
    turnsSinceProducerSpoke++;
  }

  let turnsSinceDirectorSpoke = 0;
  for (let i = agentMsgs.length - 1; i >= 0; i--) {
    const p = getPersona(agentMsgs[i].agentId ?? "");
    if (p?.role === "director") break;
    turnsSinceDirectorSpoke++;
  }

  const scored = pool.map((id) => {
    const role = getPersona(id)?.role ?? "writer";
    return {
      id,
      score: scoreSpeaker(
        id, role,
        agentStates?.[id],
        lastMessage,
        lastSpeakerId,
        turnsSinceProducerSpoke,
        turnsSinceDirectorSpoke,
        id === lastSpeakerId,
      ),
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.id ?? null;
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
You are the FINAL ASSEMBLY engine. You are converting a completed writing room
discussion into a PRODUCTION-READY episode breakdown that the creator will use
to shoot tonight on their miniature diorama set.
${decisionsCtx ? "\nThe DECISIONS BOARD above contains LOCKED creative decisions from the writing room. These are LAW — build the structure around them. Do not contradict, dilute, or reinterpret locked decisions.\n" : ""}

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
- Locked decisions are INVIOLABLE. If the room locked "the boundary marker is a
  rusty nail," the shot list uses a rusty nail — not a "mysterious object."

YOUR JOB: Synthesize the BEST version of what the room agreed on. Resolve any
remaining ambiguity in favor of the most SPECIFIC, most FILMABLE, most EMOTIONALLY
RESONANT option. Extract the actual dialogue and narration lines the writers
composed — do not paraphrase or genericize them.

Parse into a hierarchical structure with three levels:

1. STORY ARC PHASES — Use the narrative architecture the room discussed.
   If Serling was involved, use his patterns (The Intrusion, The Test, The
   Moral Inversion, Resonance). Do NOT use generic labels like "Setup" or
   "Rising Action" — use specific labels that describe THIS story.
   Each phase description should explain what EMOTIONAL WORK this phase does.

2. STORY ELEMENTS — narrative beats within each phase. Describe what the
   VIEWER experiences — not abstractions. "Walter is positioned next to the
   boundary marker, the streetlamp casting his shadow across it" not
   "Walter encounters the strange object."

3. SHOTS — individual camera setups. CRITICAL RULES:
   - Characters are PHYSICAL MINIATURE FIGURES that CANNOT MOVE on their own.
   - NEVER describe autonomous character movement (walking, turning, reaching,
     gesturing, holding, picking up, carrying). Figures have fixed molded hands.
     Props are PLACED NEXT TO figures by the creator.
   - "description" is a PRODUCTION INSTRUCTION for the creator. Be ultra-specific:
     camera height, distance, what's in foreground/background, where the figure is
     positioned, where props are placed, what the light is doing.
     GOOD: "Low probe macro, 4 inches from ground, shooting through fence slats.
     Walter positioned mid-yard facing house. Single warm streetlamp from camera-right
     casts long shadow across frost-covered grass. Boundary marker (rusty nail
     embedded in soil) visible in soft-focus foreground left."
     BAD: "Wide shot of Walter in yard with mysterious object."
   - "cameraMove": static, slow-zoom, slow-pan, dolly-in, dolly-out, tilt-up,
     tilt-down, rack-focus, slide, or combinations.
   - "audioNotes" must be SPECIFIC: name instruments, describe timbre, quality.
     GOOD: "Single plucked acoustic guitar note, sustained. Crickets fade to silence."
     BAD: "Eerie music plays."
   - "narration" should contain the ACTUAL narration text if any plays over this shot.
     Extract it from the writing room discussion verbatim — do not paraphrase.
   - "dialogue" should contain the ACTUAL dialogue if any. Include speaker attribution.
   - "shotType": extreme-close-up, close-up, medium-close, medium, medium-wide,
     wide, extreme-wide, overhead, low-angle, detail-insert
   - Each shot must be filmable with a real camera pointed at a real miniature diorama.
${serlingSection ? `
   Ground directorial choices in Serling's documented patterns: threshold blocking,
   compression of space, the slow reveal, the inversion shot, holding the final frame.
` : ""}
Respond with ONLY a JSON object (no markdown fences):
{
  "arc": [
    { "id": "arc-1", "label": "Specific Phase Name", "order": 0, "color": "#f97316", "description": "What emotional work this phase does + production note (props needed, lighting shift, etc.)" }
  ],
  "elements": [
    { "id": "el-1", "arcPhaseId": "arc-1", "label": "Specific Beat Name", "description": "What the viewer sees and feels — filmable, not abstract", "order": 0 }
  ],
  "shots": [
    {
      "id": "shot-1",
      "elementId": "el-1",
      "order": 0,
      "description": "Ultra-specific production instruction: camera height, distance, composition, figure placement, prop placement, lighting",
      "characters": ["Walter"],
      "location": "Front Yard",
      "dialogue": "Actual dialogue line if any, with speaker attribution. Empty string if none.",
      "narration": "Actual narration text if any VO plays over this shot. Empty string if none.",
      "shotType": "wide",
      "cameraMove": "static",
      "transition": "cut",
      "audioNotes": "Specific: instrument name, quality, emotional register. E.g. 'Sustained low cello drone, single cricket, distant wind'",
      "durationSec": 3,
      "userEdited": false
    }
  ]
}

Extract EVERYTHING the writers and directors discussed. Every locked decision
must be reflected. Every piece of dialogue and narration from the room must be
included verbatim. Every shot must be specific, grounded, and filmable.`;

  const raw = await generateText(prompt, { temperature: 0.4, model: GEMINI_25_PRO });
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
