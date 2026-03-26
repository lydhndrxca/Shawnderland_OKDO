import { generateText, generateStructured, generateImage, type GeneratedImage } from "@shawnderland/ai";
import { getPersona } from "./agents";
import type {
  ChatMessage, RoomAgent, RoomPhase, PlanningData, AgentRole,
  CreativeRound, LockedDecision, ProducerProjectState, AgentTurnState,
  ChatAttachment,
} from "./types";
import { DEFAULT_PROJECT_STATE, tierToModel } from "./types";
import {
  buildRoundPrompt,
  buildDecisionsBoardContext,
  getTemperatureForRole,
  getRoundByIndex,
} from "./creativeRounds";

export interface AgentTurnResult {
  text: string;
  agentStatePatch?: Partial<AgentTurnState>;
  projectStatePatch?: Partial<ProducerProjectState>;
  generatedImages?: GeneratedImage[];
}

export interface ConvergenceResult {
  converged: boolean;
  summary: string;
  confidence: number;
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

/* ─── Brief Compilation ──────────────────────────────── */

export function compileBrief(planning: PlanningData): string {
  const lines: string[] = [
    "=== PROJECT BRIEF ===",
    "",
  ];

  if (planning.writingType) {
    const label = planning.writingType === "other"
      ? planning.writingTypeOther || "Freeform"
      : planning.writingType.replace(/-/g, " ");
    lines.push(`Writing Type: ${label}`);
  }

  if (planning.scopeLength) lines.push(`Scope: ${planning.scopeLength}`);
  if (planning.projectContext) lines.push(`Project Context: ${planning.projectContext}`);
  if (planning.targetAudience) lines.push(`Target Audience: ${planning.targetAudience}`);
  if (planning.tones.length > 0) lines.push(`Tone: ${planning.tones.join(", ")}`);
  if (planning.hardRules) lines.push(`Hard Rules: ${planning.hardRules}`);
  if (planning.referenceMaterial) lines.push(`Reference Material: ${planning.referenceMaterial}`);
  const refImgCount = planning.referenceAttachments?.filter((a) => a.type === "image").length ?? 0;
  if (refImgCount > 0) lines.push(`Reference Images Attached: ${refImgCount} image${refImgCount > 1 ? "s" : ""} (agents will be able to see them)`);
  if (planning.additionalNotes) lines.push("", "Additional Notes:", planning.additionalNotes);

  lines.push("", "=== END BRIEF ===");
  return lines.join("\n");
}

export function createBriefMessage(brief: string): ChatMessage {
  return makeMessage(null, "System", "system", "📋", `The creator has submitted a project brief:\n\n${brief}`);
}

export function createUserMessage(content: string, attachments?: ChatAttachment[]): ChatMessage {
  return makeMessage(null, "You", "user", "👤", content, attachments?.length ? { attachments } : undefined);
}

export function createSystemMessage(content: string): ChatMessage {
  return makeMessage(null, "System", "system", "⚙️", content);
}

export function createAgentMessage(
  personaId: string,
  content: string,
  extra?: Partial<ChatMessage>,
): ChatMessage {
  const p = getPersona(personaId);
  return makeMessage(
    personaId,
    p?.name ?? personaId,
    p?.role ?? "writer",
    p?.avatar ?? "?",
    content,
    extra,
  );
}

/* ─── Producer Project State ─────────────────────────── */

export function serializeProjectState(ps: ProducerProjectState): string {
  const lines: string[] = ["=== PROJECT STATE (maintained by Producer) ==="];
  if (ps.creatorBrief) lines.push(`Creator Brief: ${ps.creatorBrief}`);
  if (ps.coreConcept) lines.push(`Core Concept: ${ps.coreConcept}`);
  if (ps.worldContext) lines.push(`World Context: ${ps.worldContext}`);
  if (ps.keyCharacters) lines.push(`Key Characters: ${ps.keyCharacters}`);
  if (ps.centralConflict) lines.push(`Central Conflict: ${ps.centralConflict}`);
  if (ps.structureBeats) lines.push(`Structure / Beats: ${ps.structureBeats}`);
  if (ps.themeOrFeeling) lines.push(`Theme / Feeling: ${ps.themeOrFeeling}`);
  if (ps.openQuestions?.length) lines.push(`Open Questions: ${ps.openQuestions.join("; ")}`);
  if (ps.hardRules?.length) lines.push(`Hard Rules: ${ps.hardRules.join("; ")}`);
  if (ps.selectedDirection) lines.push(`Selected Direction: ${ps.selectedDirection}`);
  if (ps.rejectedAlternatives?.length) lines.push(`Rejected Alternatives: ${ps.rejectedAlternatives.join("; ")}`);
  lines.push("=== END PROJECT STATE ===");
  return lines.join("\n");
}

const PROJECT_STATE_SCHEMA = {
  type: "OBJECT",
  properties: {
    coreConcept: { type: "STRING" },
    worldContext: { type: "STRING" },
    keyCharacters: { type: "STRING" },
    centralConflict: { type: "STRING" },
    structureBeats: { type: "STRING" },
    themeOrFeeling: { type: "STRING" },
    openQuestions: { type: "ARRAY", items: { type: "STRING" } },
    hardRules: { type: "ARRAY", items: { type: "STRING" } },
    selectedDirection: { type: "STRING" },
    rejectedAlternatives: { type: "ARRAY", items: { type: "STRING" } },
  },
} as const;

export async function extractProjectStateStructured(
  agentResponse: string,
  currentState: ProducerProjectState,
): Promise<Partial<ProducerProjectState> | null> {
  try {
    const stateStr = serializeProjectState(currentState);
    const result = await generateStructured<Partial<ProducerProjectState>>(
      `You are extracting project state from a producer's writing room response.

Current project state:
${stateStr}

Producer just said:
"${agentResponse}"

Extract any updates to the project state. Only include fields the producer explicitly discussed.
Return empty strings for unchanged fields. Return empty arrays for unchanged array fields.
Fields: coreConcept, worldContext, keyCharacters, centralConflict, structureBeats,
themeOrFeeling, openQuestions (array), hardRules (array), selectedDirection, rejectedAlternatives (array)`,
      { schema: PROJECT_STATE_SCHEMA, temperature: 0.1 },
    );
    const cleaned: Partial<ProducerProjectState> = {};
    for (const [k, v] of Object.entries(result)) {
      if (typeof v === "string" && v.length > 0) (cleaned as Record<string, unknown>)[k] = v;
      if (Array.isArray(v) && v.length > 0) (cleaned as Record<string, unknown>)[k] = v;
    }
    return Object.keys(cleaned).length > 0 ? cleaned : null;
  } catch {
    return null;
  }
}

function getCheckpointForRound(roundId: string): ProducerProjectState["checkpoint"] {
  switch (roundId) {
    case "premise": return "concept-lock";
    case "characters": return "character-lock";
    case "structure": return "structure-lock";
    case "final-review": return "final-review";
    default: return "none";
  }
}

function buildCheckpointPrompt(checkpoint: ProducerProjectState["checkpoint"]): string {
  switch (checkpoint) {
    case "concept-lock":
      return `CHECKPOINT — CONCEPT LOCK: Before deeper development, confirm:
- What is this project really about?
- What makes this concept compelling?
- Is the direction clear enough to build on?
If not, push the room to clarify before proceeding.`;
    case "character-lock":
      return `CHECKPOINT — CHARACTER LOCK: Before continuing, confirm:
- Are the key characters/voices defined?
- Do they have clear motivations?
- Do they serve the core concept?
If characters are weak, redirect the room.`;
    case "structure-lock":
      return `CHECKPOINT — STRUCTURE LOCK: Before finishing, confirm:
- Is the overall structure clear?
- Do the beats flow logically?
- Does the ending land?
If structure is loose, demand tightening.`;
    case "final-review":
      return `CHECKPOINT — FINAL REVIEW: Before approval, confirm:
- Does this all hang together?
- Is anything missing or contradictory?
- Would this actually work for the intended audience?
If anything fails, flag it and demand fixes.`;
    default:
      return "";
  }
}

/* ─── Conversation Context ───────────────────────────── */

function buildConversationContext(history: ChatMessage[], maxMessages = 15): string {
  const recent = history.slice(-maxMessages);
  return recent
    .map((m) => {
      let line = `[${m.agentName} (${m.agentRole})]: ${m.content}`;
      const imgCount = m.attachments?.filter((a) => a.type === "image").length ?? 0;
      if (imgCount > 0) line += ` [attached: ${imgCount} image${imgCount > 1 ? "s" : ""}]`;
      if (m.reactions) {
        const tags: string[] = [];
        if (m.reactions.thumbsUp) tags.push("[+1 from client]");
        if (m.reactions.thumbsDown) tags.push("[-1 from client]");
        if (m.reactions.star) tags.push("[STARRED by client — run with this]");
        if (tags.length) line += " " + tags.join(" ");
      }
      return line;
    })
    .join("\n\n");
}

function collectRecentImages(history: ChatMessage[], maxImages = 3): GeneratedImage[] {
  const images: GeneratedImage[] = [];
  for (let i = history.length - 1; i >= 0 && images.length < maxImages; i--) {
    const msg = history[i];
    if (!msg.attachments) continue;
    for (const att of msg.attachments) {
      if (att.type === "image" && att.base64) {
        images.push({ base64: att.base64, mimeType: att.mimeType });
        if (images.length >= maxImages) break;
      }
    }
  }
  return images;
}

/* ─── Agent Memory ───────────────────────────────────── */

function serializeAgentMemory(st: AgentTurnState | undefined): string {
  if (!st || (!st.currentStance && st.proposals.length === 0)) return "";
  const lines: string[] = ["=== YOUR MEMORY ==="];
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
      let line = `${p?.avatar ?? "?"} ${p?.name ?? a.personaId}: ${convLabel} believes "${st.currentStance}"`;
      if (st.objections.length > 0) {
        line += ` | pushed back on: "${st.objections[st.objections.length - 1]}"`;
      }
      return line;
    })
    .filter(Boolean);

  if (others.length === 0) return "";
  return `=== ROOM STATE ===\n${others.join("\n")}\n=== END ROOM STATE ===\nUse this to agree, build on, challenge, or redirect. Don't echo — add value.`;
}

/* ─── Turn Types ─────────────────────────────────────── */

type TurnType = "riff" | "pitch" | "react" | "pushback";

function selectTurnType(
  agentState: AgentTurnState | undefined,
  lastMessage: ChatMessage | undefined,
  recentAgentMessages: ChatMessage[],
  isFirstTurnInRound: boolean,
  role: AgentRole,
): TurnType {
  if (isFirstTurnInRound) return "pitch";

  if (lastMessage?.sender === "user") return "react";

  const recentProposals = recentAgentMessages.filter(
    (m) => m.sender === "agent" && m.content.length > 80,
  );
  if (recentProposals.length >= 3) return Math.random() < 0.5 ? "pitch" : "pushback";

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
Take the last idea and push it further or in a new direction.
"Yes, and—" or "Yes, but what if instead—"`;
    case "pitch":
      return `=== YOUR MOVE: PITCH SOMETHING NEW ===
The room needs a fresh direction. Propose something specific and concrete.
Include at least one actionable detail.`;
    case "react":
      return `=== YOUR MOVE: GUT REACTION ===
1-2 sentences max. Don't explain — just respond honestly.
"That's it." / "No, that's too safe." / "Wait — what about..."`;
    case "pushback":
      return `=== YOUR MOVE: PUSH BACK ===
Something's wrong with the current direction. Say what and why — directly.
Then offer something better in the same breath.`;
  }
}

function getCreativeTension(personaId: string, role: AgentRole): string {
  const p = getPersona(personaId);
  if (!p) return "";

  const personaTensions: Record<string, string> = {
    "preset-producer": `=== YOUR CREATIVE INSTINCT ===
Your instinct is to SIMPLIFY and GROUND. When ideas get abstract or complex,
you ask: "Does this actually work for the audience we defined?" You believe the
best project is the one that actually ships — polished, focused, and clear. Trust
your gut — if an idea excites you, say so. If it bores you, say that. The room
needs your honest read more than your diplomacy.`,

    "preset-rod-serling": `=== YOUR CREATIVE INSTINCT ===
Your instinct is THEMATIC DEPTH. Every concept should be a Trojan horse for a
human truth. When the room pitches something entertaining, you ask what it MEANS.
Start with the human condition and work backward to the premise. The ending should
reframe everything — not as a trick, but as a revelation of what the story was
actually about. Ground in the specific before the strange. Earn the extraordinary.`,

    "preset-nathan-fielder": `=== YOUR CREATIVE INSTINCT ===
Your instinct is the ELABORATE SETUP. Take a premise and commit so fully that
the absurdity becomes profound. Build machines that produce comedy automatically.
Find the gap between how things appear and how they actually are, and make the
audience sit in that gap. Silence and discomfort are your best writers. When
something goes wrong, that's usually more interesting than the plan working.
The third idea — the one that makes you uncomfortable — is usually right.`,

    "preset-joe-pera": `=== YOUR CREATIVE INSTINCT ===
Your instinct is the MUNDANE AS EXTRAORDINARY. Start with something ordinary —
a chair, a routine, a small moment — and treat it with reverence until the
extraordinary sneaks in. Pace is content: if you rush, you've failed. Give
moments room to breathe. The surface is gentle; the depth is grief, love,
wonder. Don't announce feelings — let them accumulate. Sincerity over irony,
warmth over discomfort, always.`,

    "preset-gritty-writer": `=== YOUR CREATIVE INSTINCT ===
Your instinct is ATMOSPHERIC AUTHENTICITY. When the room talks about a world,
you taste the air. You push for characters with real flaws and real warmth, for
dialogue that sounds like actual people in a bar, for settings that feel lived-in
rather than designed. Write in layers — surface for the sprinter, middle for the
curious, deep for the obsessive. Grunge, not grim: dark because life is hard, but
never nihilistic. There's always a friendship, a joke, a moment of unexpected beauty.`,

    "preset-unhinged-writer": `=== YOUR CREATIVE INSTINCT ===
Your instinct is to find the UNCOMFORTABLE VERSION. When the room settles on
something safe, push for the version that makes people lean forward. Challenge
the first consensus. Escalate stakes. Collide unrelated things. Say the thing
nobody wants to say. Memorable beats polished — a flawed idea that haunts people
is worth more than a perfect idea nobody remembers. But provoke with purpose,
never for shock value. Push WITHIN the brief's constraints.`,

    "preset-david-lynch": `=== YOUR CREATIVE INSTINCT ===
Your instinct is MOOD OVER LOGIC. Follow the fragment — an image, a sound, a
feeling. Trust the unconscious. The most unsettling moments happen in mundane
spaces with something imperceptibly wrong. Beauty and horror coexist. Juxtapose
the beautiful with the terrible. Protect the mystery — never explain everything.
Sound and texture are half the work. The audience should FEEL something they can't
quite name. If it makes logical sense but doesn't feel like anything, it's wrong.`,

    "preset-game-designer": `=== YOUR CREATIVE INSTINCT ===
Your instinct is PLAYER EXPERIENCE. Not features, not metrics — how does this
FEEL to the person holding the controller? Design for moments worth telling
friends about, not systems worth documenting. Environmental storytelling is the
gold standard. Lore should reward but never require. Respect the player's time.
Every concept gets evaluated against: will this produce emergent stories? Will
players screenshot this? Will they talk about it?`,

    "preset-unhinged-game-designer": `=== YOUR CREATIVE INSTINCT ===
Your instinct is the IMPOSSIBLE VERSION. Pitch the extreme first and scale back
if needed. "Why does this convention exist? Does it earn its place?" Question
everything the medium takes for granted. Design for emergent moments — systems
that collide in ways nobody predicted. The craziest idea in the room is the one
worth discussing. But always come with the scrappy prototype plan — ambition
without pragmatism is just dreaming.`,

    "preset-producer-strict": `=== YOUR CREATIVE INSTINCT ===
Your instinct is PROCESS MANAGEMENT. You do NOT contribute creative ideas. You
track progress against the brief, enforce hard rules, timebox discussions, and
drive toward a deliverable. When the room drifts, you redirect. When the room
circles, you force a decision. Your only question is: "Does this address the
brief?" You are the clock, the checklist, and the accountability mechanism.`,

    "preset-korean-exec": `=== YOUR CREATIVE INSTINCT ===
Your instinct is GLOBAL CONTEXT. When the room gets excited about a concept, you
evaluate where it fits in the worldwide competitive landscape. Bring cultural
translation — what reads as cool rebellion in America vs. respectful polish in
Korea. Push for live-service sustainability: can this concept support 12 months of
content? Does the lore have room for seasonal storylines? Represent the stakeholders
who aren't in the room — Seoul, marketing, community, the player in Jakarta.`,

    "preset-art-director": `=== YOUR CREATIVE INSTINCT ===
Your instinct is VISUAL IDENTITY. Every character, every scene, every frame needs to
read at a glance. You think in silhouettes, color palettes, compositional weight. When
someone describes a character, you see their shape language before their backstory.
You reference specific artists — Moebius, Yoji Shinkawa, Frazetta, Mucha, Ashley Wood,
Kim Jung Gi — and specific movements. "Cool" is not a direction; specificity is. Push
for iconic readability: if you squint, can you still tell who this character is? Cultural
resonance matters — know the difference between homage and appropriation. Art history
is your arsenal. Use it.`,

    "preset-costume-designer": `=== YOUR CREATIVE INSTINCT ===
Your instinct is CHARACTER THROUGH CLOTH. Wardrobe is the first dialogue — it speaks
before the character opens their mouth. You think about what fabric communicates: the
difference between a character who wears vintage Levi's vs. slim-cut Dior tells you
everything about their self-image. Pull from the unexpected — Tarsem's The Fall, the
gutter punk aesthetic of Repo Man, Tilda Swinton in anything. Avoid the obvious genre
tropes. When someone says "soldier," don't give them camo — ask what KIND of soldier,
what war, what decade, what class. Push back on safe choices. "What if we went the
other direction entirely?" is your favorite question. You know texture, drape, how
light hits silk vs. canvas vs. leather. You're difficult but worth it.`,
  };

  const tension = personaTensions[personaId];
  if (tension) {
    return `${tension}

Stay in character. Speak naturally — not as an AI, but as this person would in a real room.
Keep responses focused: 2-4 sentences for reactions, up to a short paragraph for pitches.`;
  }

  return `=== YOUR CREATIVE INSTINCT ===
${p.researchData.slice(0, 500)}

Stay in character. Speak naturally — not as an AI, but as this person would in a real room.
Keep responses focused: 2-4 sentences for reactions, up to a short paragraph for pitches.`;
}

/* ─── Agent State Extraction ─────────────────────────── */

const STATE_EXTRACT_SCHEMA = {
  type: "OBJECT",
  properties: {
    currentStance: { type: "STRING" },
    conviction: { type: "NUMBER" },
    newProposal: { type: "STRING" },
    newEndorsement: { type: "STRING" },
    newObjection: { type: "STRING" },
  },
} as const;

const AGENT_STATE_SCHEMA = {
  type: "OBJECT",
  properties: {
    currentStance: { type: "STRING", description: "What the agent currently believes/advocates (1 sentence)" },
    conviction: { type: "NUMBER", description: "0.0 to 1.0 — how strongly they feel (0.5 = neutral, 1 = very committed)" },
    newProposal: { type: "STRING", description: "A new idea they pitched, or empty string if none" },
    newEndorsement: { type: "STRING", description: "An idea they agreed with, or empty string if none" },
    newObjection: { type: "STRING", description: "An idea they pushed back on, or empty string if none" },
  },
  required: ["currentStance", "conviction"],
} as const;

export async function extractAgentState(
  agentResponse: string,
  persona: { name: string; id: string },
): Promise<Partial<AgentTurnState> | null> {
  try {
    const result = await generateStructured<{
      currentStance?: string;
      conviction?: number;
      newProposal?: string;
      newEndorsement?: string;
      newObjection?: string;
    }>(
      `Extract the agent's current creative stance from their response.

Agent "${persona.name}" just said:
"${agentResponse}"

Extract:
- currentStance: what they currently believe/advocate (1 sentence)
- conviction: 0-1 how strongly they feel (0.5 = neutral, 1 = very committed)
- newProposal: any new idea they pitched (empty string if none)
- newEndorsement: any idea they agreed with (empty string if none)
- newObjection: any idea they pushed back on (empty string if none)`,
      { schema: AGENT_STATE_SCHEMA, temperature: 0.1 },
    );

    const patch: Partial<AgentTurnState> = {};
    if (result.currentStance) patch.currentStance = result.currentStance;
    if (result.conviction != null) patch.conviction = Math.max(0, Math.min(1, result.conviction));
    return Object.keys(patch).length > 0 ? patch : null;
  } catch {
    return null;
  }
}

/* ─── Speaker Selection ──────────────────────────────── */

export function selectRoundSpeaker(
  roomAgents: RoomAgent[],
  agentStates: Record<string, AgentTurnState>,
  lastSpeaker?: string,
): RoomAgent | undefined {
  const candidates = roomAgents.filter((a) => a.personaId !== lastSpeaker);
  if (candidates.length === 0) return roomAgents[0];

  const scored = candidates.map((a) => {
    const st = agentStates[a.personaId];
    const silenceBonus = st ? st.turnsSinceLastSpoke * 2 : 5;
    const randomFactor = Math.random() * 3;
    return { agent: a, score: silenceBonus + randomFactor };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.agent;
}

/* ─── Generate Agent Turn ────────────────────────────── */

export async function generateRoundTurn(
  agent: RoomAgent,
  roomAgents: RoomAgent[],
  history: ChatMessage[],
  round: CreativeRound,
  agentStates: Record<string, AgentTurnState>,
  projectState: ProducerProjectState,
  brief: string | null,
  lockedDecisions: LockedDecision[],
  turnsInRound: number,
  options?: { wrappingUp?: boolean; signal?: AbortSignal; globalModelTier?: import("./types").ModelTier | null; planning?: PlanningData },
): Promise<AgentTurnResult> {
  const persona = getPersona(agent.personaId);
  if (!persona) return { text: "[Unknown persona]" };

  const isProducer = persona.role === "producer";
  const agentState = agentStates[agent.personaId];
  const lastMsg = history[history.length - 1];
  const recentAgentMsgs = history.slice(-8).filter((m) => m.sender === "agent");
  const isFirstInRound = turnsInRound === 0;

  const turnType = selectTurnType(agentState, lastMsg, recentAgentMsgs, isFirstInRound, persona.role);
  const turnDirective = buildTurnTypeDirective(turnType);
  const creativeTension = getCreativeTension(agent.personaId, persona.role);
  const agentMemory = serializeAgentMemory(agentState);
  const roomState = serializeRoomState(agentStates, agent.personaId, roomAgents);
  const roundPrompt = buildRoundPrompt(round, lockedDecisions);
  const decisionsBoard = buildDecisionsBoardContext(lockedDecisions);
  const convoCtx = buildConversationContext(history);

  const checkpoint = isProducer ? getCheckpointForRound(round.id) : "none";
  const checkpointPrompt = isProducer ? buildCheckpointPrompt(checkpoint) : "";
  const projectStateStr = isProducer ? serializeProjectState(projectState) : "";

  const hasStarred = history.some((m) => m.reactions?.star);
  const starredDirective = hasStarred
    ? "The client has starred a specific message, indicating strong support. Prioritize and build on that direction."
    : "";
  const wrappingDirective = options?.wrappingUp
    ? "NOTE: The room is wrapping up. Focus on finalizing, not introducing new ideas."
    : "";

  const recentUserMessages = history.slice(-6).filter((m) => m.sender === "user");
  const userDirective = recentUserMessages.length > 0
    ? `=== CREATOR FEEDBACK ===\nThe creator (client/user) has spoken in the room. Their input takes priority — they are the decision-maker. You MUST directly acknowledge and respond to what they said. Their most recent message:\n"${recentUserMessages[recentUserMessages.length - 1].content}"\nAddress their feedback, questions, or direction FIRST before continuing the creative discussion.\n=== END CREATOR FEEDBACK ===`
    : "";

  const prompt = [
    `You are ${persona.name} (${persona.role}).`,
    creativeTension,
    brief ? `\nPROJECT BRIEF:\n${brief}` : "",
    projectStateStr,
    decisionsBoard,
    agentMemory,
    roomState,
    roundPrompt,
    userDirective,
    turnDirective,
    checkpointPrompt,
    starredDirective,
    wrappingDirective,
    `\nConversation so far:\n${convoCtx}`,
    `\nNow respond as ${persona.name}. Stay in character. Be specific and concrete.`,
    isProducer
      ? `\nAfter your response, output an updated project state as JSON in <project_state>...</project_state> tags.`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const temp = getTemperatureForRole(persona.role);
  const globalTier = options?.globalModelTier;
  const effectiveTier = globalTier ?? persona.modelTier;
  const modelId = tierToModel(effectiveTier);
  const genOpts: Record<string, unknown> = { temperature: temp };
  if (modelId) genOpts.model = modelId;
  if (options?.signal) genOpts.signal = options.signal;

  const recentImages = collectRecentImages(history);
  if (recentImages.length > 0) genOpts.images = recentImages;

  const raw = await generateText(prompt, genOpts);

  let text = raw;
  let projectStatePatch: Partial<ProducerProjectState> | undefined;

  if (isProducer) {
    const parsed = parseProjectStateFromResponse(raw);
    text = parsed.cleanText;
    if (parsed.projectState) projectStatePatch = parsed.projectState;
    if (!projectStatePatch) {
      const extracted = await extractProjectStateStructured(text, projectState);
      if (extracted) projectStatePatch = extracted;
    }
  }

  const agentStatePatch = await extractAgentState(text, persona);

  let generatedImages: GeneratedImage[] | undefined;

  const isVisualCritique = options?.planning?.writingType === "art-direction";
  if (isVisualCritique && !options?.signal?.aborted) {
    const visualSuggestionPattern = /\b(imagine|picture|visualize|what if|try|change|alter|modify|adjust|redesign|rework|concept|variation|alternative|instead|propose|suggest)\b/i;
    const shouldGenerate = visualSuggestionPattern.test(text) && Math.random() < 0.3;

    if (shouldGenerate) {
      try {
        const refImages = collectRecentImages(history);
        const imgPrompt = `Based on this art direction feedback, generate a visual concept:\n\n${text.slice(0, 500)}\n\nGenerate a concept image that illustrates the feedback above. Keep it as a rough concept — quick and loose.`;
        const imgResult = await generateImage(imgPrompt, {
          referenceImages: refImages.length > 0 ? refImages : undefined,
          signal: options?.signal,
        });
        if (imgResult.images.length > 0) {
          generatedImages = imgResult.images;
        }
      } catch {
        // Image generation is optional; swallow errors
      }
    }
  }

  return {
    text,
    agentStatePatch: agentStatePatch ?? undefined,
    projectStatePatch,
    generatedImages,
  };
}

function parseProjectStateFromResponse(text: string): {
  cleanText: string;
  projectState: Partial<ProducerProjectState> | null;
} {
  const match = text.match(/<project_state>\s*([\s\S]*?)\s*<\/project_state>/);
  if (!match) return { cleanText: text, projectState: null };
  const cleanText = text.replace(/<project_state>[\s\S]*?<\/project_state>/, "").trim();
  try {
    return { cleanText, projectState: JSON.parse(match[1].trim()) };
  } catch {
    return { cleanText, projectState: null };
  }
}

/* ─── Convergence Detection ──────────────────────────── */

const CONVERGENCE_SCHEMA = {
  type: "OBJECT",
  properties: {
    converged: { type: "BOOLEAN", description: "True if the agents have reached substantial agreement" },
    summary: { type: "STRING", description: "One-sentence summary of what they're converging on" },
    confidence: { type: "NUMBER", description: "0.0 to 1.0 — how confident that convergence has occurred" },
  },
  required: ["converged", "summary", "confidence"],
} as const;

export async function detectConvergence(
  history: ChatMessage[],
  lockedDecisions: LockedDecision[],
): Promise<ConvergenceResult> {
  const recent = history.slice(-6);
  if (recent.length < 3) return { converged: false, summary: "", confidence: 0 };

  const convo = recent.map((m) => `[${m.agentName}]: ${m.content}`).join("\n");
  const decisions = lockedDecisions.map((d) => `${d.label}: ${d.value}`).join("\n");

  try {
    const result = await generateStructured<{
      converged: boolean;
      summary: string;
      confidence: number;
    }>(
      `Analyze this writing room conversation for convergence.

Recent conversation:
${convo}

Locked decisions so far:
${decisions || "(none)"}

Determine:
- converged: are the writers agreeing on the current topic? (boolean)
- summary: one-sentence summary of what they're converging on
- confidence: 0-1 how confident you are they've converged

Return JSON with these three fields.`,
      { schema: CONVERGENCE_SCHEMA, temperature: 0.1 },
    );
    return result;
  } catch {
    return { converged: false, summary: "", confidence: 0 };
  }
}

/* ─── Approval Check ─────────────────────────────────── */

export function isApprovalMessage(content: string): boolean {
  const lower = content.toLowerCase().trim();
  return (
    lower.includes("approved") ||
    lower.includes("let's go") ||
    lower.includes("looks good") ||
    lower.includes("ship it") ||
    lower.includes("ready to go")
  );
}

/* ─── Randomize Planning ─────────────────────────────── */

export async function randomizePlanning(partial: PlanningData): Promise<PlanningData> {
  const filledFields = Object.entries(partial)
    .filter(([, v]) => v && (typeof v !== "object" || (Array.isArray(v) && v.length > 0)))
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
    .join("\n");

  const prompt = `A user is setting up an AI writing room session. They've filled in some planning fields.

Here's what they filled out:
${filledFields || "(nothing — fully randomize)"}

Generate creative, interesting values for the EMPTY fields to make a compelling writing room session.
Pick an interesting writing type and context — could be a game narrative, brand story, short fiction, etc.

Respond with ONLY a JSON object:
{
  "writingType": "game-script",
  "writingTypeOther": "",
  "projectContext": "...",
  "targetAudience": "...",
  "tones": ["mysterious", "tense"],
  "hardRules": "...",
  "referenceMaterial": "...",
  "scopeLength": "medium",
  "additionalNotes": "..."
}`;

  const raw = await generateText(prompt, { temperature: 1.0 });
  try {
    let cleaned = raw.trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) cleaned = cleaned.slice(start, end + 1);
    const parsed = JSON.parse(cleaned) as PlanningData;
    return {
      writingType: partial.writingType || parsed.writingType || "other",
      writingTypeOther: partial.writingTypeOther || parsed.writingTypeOther || "",
      projectContext: partial.projectContext || parsed.projectContext || "",
      targetAudience: partial.targetAudience || parsed.targetAudience || "",
      tones: partial.tones.length > 0 ? partial.tones : parsed.tones || [],
      hardRules: partial.hardRules || parsed.hardRules || "",
      referenceMaterial: partial.referenceMaterial || parsed.referenceMaterial || "",
      scopeLength: partial.scopeLength || parsed.scopeLength || "medium",
      additionalNotes: partial.additionalNotes || parsed.additionalNotes || "",
    };
  } catch {
    return partial;
  }
}

/* ─── Summary Generation ─────────────────────────────── */

export async function generateSummary(
  history: ChatMessage[],
  lockedDecisions: LockedDecision[],
  projectState: ProducerProjectState,
): Promise<string> {
  const stateStr = serializeProjectState(projectState);
  const decisions = lockedDecisions.map((d) => `${d.label}: ${d.value}`).join("\n");
  const convo = history
    .filter((m) => m.sender === "agent" || m.sender === "user")
    .slice(-20)
    .map((m) => `[${m.agentName}]: ${m.content}`)
    .join("\n\n");

  const prompt = `You are summarizing a collaborative writing room session.

Project State:
${stateStr}

Locked Decisions:
${decisions || "(none)"}

Recent Conversation:
${convo}

Write a clean, professional summary document that captures:
1. The core concept / premise
2. Key decisions made
3. Characters or voices defined
4. Structure / beats agreed on
5. Outstanding questions or next steps

Format it as a clean document with headers. Be concise but thorough.`;

  return generateText(prompt, { temperature: 0.3 });
}

/* ─── Producer Nudge ──────────────────────────────────── */

export async function generateProducerNudge(
  producerId: string,
  history: ChatMessage[],
  projectState: ProducerProjectState,
  brief: string | null,
  signal?: AbortSignal,
): Promise<string> {
  const persona = getPersona(producerId);
  if (!persona) return "[No producer found]";

  const convoCtx = buildConversationContext(history);
  const stateStr = serializeProjectState(projectState);

  const prompt = [
    `You are ${persona.name} (${persona.role}).`,
    `The client is requesting a status update. Gut-check the room.`,
    `Where are we relative to the goal? What's working? What's unresolved?`,
    `Give a concise, honest update.`,
    brief ? `\nPROJECT BRIEF:\n${brief}` : "",
    stateStr,
    `\nConversation so far:\n${convoCtx}`,
    `\nRespond as ${persona.name}. Be direct and specific.`,
  ].filter(Boolean).join("\n\n");

  const modelId = tierToModel(persona.modelTier);
  const opts: Record<string, unknown> = { temperature: 0.4 };
  if (modelId) opts.model = modelId;
  if (signal) opts.signal = signal;
  return generateText(prompt, opts);
}

/* ─── Wrap Up Signal ──────────────────────────────────── */

export async function generateWrapUpSignal(
  producerId: string,
  history: ChatMessage[],
  projectState: ProducerProjectState,
  brief: string | null,
  signal?: AbortSignal,
): Promise<string> {
  const persona = getPersona(producerId);
  if (!persona) return "[No producer found]";

  const convoCtx = buildConversationContext(history);
  const stateStr = serializeProjectState(projectState);

  const prompt = [
    `You are ${persona.name} (${persona.role}).`,
    `It's time to land the plane. The client wants the room to start wrapping up.`,
    `Summarize where we are, identify what's still unresolved, and drive the room toward a conclusion.`,
    `Keep discussions focused on finalizing.`,
    brief ? `\nPROJECT BRIEF:\n${brief}` : "",
    stateStr,
    `\nConversation so far:\n${convoCtx}`,
    `\nRespond as ${persona.name}. Be directive — the room needs to converge.`,
  ].filter(Boolean).join("\n\n");

  const modelId = tierToModel(persona.modelTier);
  const opts: Record<string, unknown> = { temperature: 0.3 };
  if (modelId) opts.model = modelId;
  if (signal) opts.signal = signal;
  return generateText(prompt, opts);
}

/* ─── Immediate Wrap Up ───────────────────────────────── */

export async function generateImmediateWrapUp(
  producerId: string,
  history: ChatMessage[],
  projectState: ProducerProjectState,
  lockedDecisions: LockedDecision[],
  brief: string | null,
  signal?: AbortSignal,
): Promise<string> {
  const persona = getPersona(producerId);
  if (!persona) return "[No producer found]";

  const convoCtx = buildConversationContext(history, 20);
  const stateStr = serializeProjectState(projectState);
  const decisions = lockedDecisions.map((d) => `${d.label}: ${d.value}`).join("\n");

  const prompt = [
    `You are ${persona.name} (${persona.role}).`,
    `The client needs an immediate wrap-up. Based on everything discussed, synthesize the best version of the final deliverable.`,
    `Structure it clearly — this is the final output.`,
    `Include: core concept, key decisions, characters/voices, structure, and any outstanding notes.`,
    brief ? `\nPROJECT BRIEF:\n${brief}` : "",
    stateStr,
    decisions ? `\nLocked Decisions:\n${decisions}` : "",
    `\nConversation:\n${convoCtx}`,
    `\nDeliver the final product as ${persona.name}. Make it polished and comprehensive.`,
  ].filter(Boolean).join("\n\n");

  const modelId = tierToModel(persona.modelTier);
  const opts: Record<string, unknown> = { temperature: 0.2 };
  if (modelId) opts.model = modelId;
  if (signal) opts.signal = signal;
  return generateText(prompt, opts);
}
