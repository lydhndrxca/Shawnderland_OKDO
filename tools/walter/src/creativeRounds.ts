import type { CreativeRound, CreativeRoundId, LockedDecision, AgentRole, PersonaMode, RoomAgent } from "./types";

/* ─── Serling-Mode Rounds (supernatural/surreal) ─────── */

const SERLING_ROUNDS: CreativeRound[] = [
  {
    id: "premise",
    label: "Premise",
    question: "What HAPPENS in this episode? Not a mood — an EVENT. Walter [does/sees/discovers/loses] something specific. One sentence: 'Walter ___.' Then tell us the feeling that event leaves behind. If you can't name the event, you don't have a premise yet.",
    locksField: "Core Premise",
    agentPool: ["writer", "producer"],
    minTurns: 4, maxTurns: 8,
    corpusHint: "Twilight Zone episode themes premise human truth moral argument thematic core",
    personaMemory: {
      serling: `Think back to your own work. Every episode you wrote started with a human truth, not a plot. "Time Enough at Last" was about the cruelty of getting what you wish for. "Walking Distance" was about the impossibility of going home again. Draw on the retrieved evidence below. What pattern do you see in your own thematic choices?`,
      fielder: `Think about the premises you built your shows around. The premise is always a sincere question wrapped in an absurd structure. "What if the best pizza place was the worst experience?" What mundane truth are we stress-testing here?`,
      pera: `Think about what draws you to a story. It's never the big moment — it's the small one. The feeling of noticing something you see every day for the first time. What quiet observation is this episode built on?`,
    },
  },
  {
    id: "opening-frame",
    label: "Opening Frame",
    question: "Close your eyes. What's the FIRST image? Not a concept — a frame. Where's the camera? What's in focus? What's the light doing? And critically: what does the VIEWER UNDERSTAND from this frame? What's the one piece of story information this shot delivers? Describe it so precisely that someone could set it up in 60 seconds on the miniature set.",
    locksField: "Opening Frame",
    agentPool: ["writer", "director", "cinematographer"],
    minTurns: 5, maxTurns: 10,
    corpusHint: "Twilight Zone opening scene first shot establishing normalcy something already wrong",
    personaMemory: {
      serling: `Think back to how you opened your episodes. In "Walking Distance," Martin Sloan's car overheated on a country road — specific, grounded, already loaded with meaning before anything strange happened. Your openings established normalcy that was ALREADY subtly wrong.`,
      fielder: `Your openings always establish the mundane before revealing the plan. A normal storefront, a regular person, an everyday situation — then the voiceover shifts the frame. What looks normal here but isn't?`,
      pera: `Your openings are gentle invitations. A quiet shot, a warm voice, a familiar place. The hook isn't shock — it's intimacy. What makes someone lean in and feel at home before the story begins?`,
    },
  },
  {
    id: "the-strange",
    label: "The Strange Thing",
    question: "What's the one thing that's WRONG? Not 'something mysterious' — the exact object, light, sound, or absence. Name it. Describe what it looks like on the set. And tell us: how does Walter ENCOUNTER it? What's the sequence — what's he doing when it appears? If you can't describe the moment of discovery, the strange thing has no story.",
    locksField: "The Intrusion",
    agentPool: ["writer", "director"],
    minTurns: 5, maxTurns: 10,
    corpusHint: "Twilight Zone supernatural element intrusion strange object reveal slow reveal withhold",
    personaMemory: {
      serling: `Think back to how you introduced the impossible. You never announced it — you let evidence accumulate. In "The Invaders," Agnes Moorehead found tiny footprints before she ever saw the ship. You showed the EVIDENCE of the strange before the thing itself.`,
      fielder: `The strange thing in your world is never supernatural — it's social. An unexpected commitment, an escalation nobody asked for, a plan that reveals something true about the participants. What's the social experiment here?`,
      pera: `For you, the strange thing is almost invisible. A sound that shouldn't be there. A light that's slightly different. Something so small that noticing it at all is the story. What tiny detail shifts everything?`,
    },
  },
  {
    id: "the-response",
    label: "Walter's Response",
    question: "Walter can't move, emote, or speak. So how do we know he NOTICED? Describe the sequence of shots — what the camera sees BEFORE and AFTER — that makes the viewer feel Walter's response without the figure changing at all.",
    locksField: "Character Response",
    agentPool: ["writer", "director", "cinematographer"],
    minTurns: 4, maxTurns: 8,
    corpusHint: "Twilight Zone character reaction response to impossible understatement stillness",
    personaMemory: {
      serling: `Your characters responded to the impossible with quiet denial. In "The Obsolete Man," Wordsworth faced his execution with calm defiance. Your characters revealed themselves through restraint, not hysteria.`,
      fielder: `The response in your world is always a doubling down. When things get awkward, the subject commits harder. When the plan goes sideways, you keep filming. What does Walter do when the situation escalates?`,
      pera: `Walter's response should be gentle and sincere. He doesn't panic. He might pause, look at something a little longer, or simply... stay. The response is acceptance, not resistance.`,
    },
  },
  {
    id: "the-turn",
    label: "The Turn",
    question: "What's the moment that makes the viewer go back and rewatch from the beginning? Not a twist for shock — a reframe that makes everything they already saw mean something different. What were they ASSUMING that turns out to be wrong?",
    locksField: "The Inversion",
    agentPool: ["writer", "director"],
    minTurns: 5, maxTurns: 10,
    corpusHint: "Twilight Zone twist ending moral inversion reframe meaning revelation",
    personaMemory: {
      serling: `The twist in "Eye of the Beholder" wasn't that the woman was beautiful — it was that beauty itself was the prison. Your turns didn't just surprise — they reframed everything the audience had already seen.`,
      fielder: `The turn in your work is when sincerity breaks through the absurdity. The moment where the joke stops being funny and becomes something real. When does the plan reveal something true?`,
      pera: `Your turns are so gentle people might miss them. The realization that this small moment was actually about something much bigger. The feeling arrives before the understanding does.`,
    },
  },
  {
    id: "final-frame",
    label: "Final Frame",
    question: "What's the last thing the viewer sees before the screen goes black? Not what it MEANS — what it LOOKS LIKE. One frame. Describe the composition so clearly that the feeling is obvious without explanation.",
    locksField: "Final Frame",
    agentPool: ["writer", "director", "cinematographer"],
    minTurns: 4, maxTurns: 8,
    corpusHint: "Twilight Zone closing narration final image ending resonance last shot",
    personaMemory: {
      serling: `You held the final frame longer than expected. In "Time Enough at Last," Bemis's broken glasses said everything without a word. Your endings didn't resolve — they resonated.`,
      fielder: `Your endings leave the viewer in a specific state of discomfort and fondness. The situation is "resolved" but the emotional residue lingers. What image captures the aftermath?`,
      pera: `Your endings are warm and a little sad. Not sad because something bad happened, but sad because something beautiful just ended. What's the last image that makes someone want to sit with the feeling?`,
    },
  },
  {
    id: "the-simple-story",
    label: "The Simple Story",
    question: `CONVERGENCE ROUND — one version only.

The first speaker writes the COMPLETE 5-sentence episode using this EXACT numbered format:
1. OPENING IMAGE: [What the viewer sees first — one specific frame]
2. THE STRANGE THING: [The intrusion — what appears/changes/arrives]
3. WALTER'S RESPONSE: [How we KNOW Walter noticed — through camera, not movement]
4. THE TURN: [The reframe — what the viewer assumed that turns out wrong]
5. FINAL IMAGE: [Last frame before black — one composition that holds the feeling]

Each sentence must be CONCRETE and FILMABLE — no mood words, no abstractions. If you can't describe it to a camera operator, rewrite it.

Everyone else: DO NOT write your own version. Fix the one on the table. Rewrite a SPECIFIC numbered sentence, sharpen a detail, cut a word. Quote the sentence number you're changing and show the fix.`,
    locksField: "Episode Summary",
    agentPool: ["writer", "producer", "director"],
    minTurns: 4, maxTurns: 8,
    corpusHint: "episode structure narrative arc simple story beginning middle end",
    personaMemory: {
      serling: `Your best episodes can be described in a single breath. "A man loves books. The world ends. He finally has time to read. His glasses break." That's "Time Enough at Last." Four sentences. What's ours?`,
      fielder: `The Rehearsal's best bits have a clear structure underneath the absurdity. Setup, escalation, the moment it becomes real. Strip away the weirdness — what's the skeleton?`,
      pera: `Your episodes have the simplest possible structure. A person does a thing. Something small changes. They notice. That's enough. What's the simplest version of this episode?`,
    },
  },
  {
    id: "the-voice",
    label: "The Voice",
    question: "Now add the words. Walter episodes use: (A) Serling-style NARRATION — voiceover that comments, frames, or contradicts the image. (B) CHARACTER DIALOGUE — lines spoken as VO over a static figure. (C) TITLE CARDS — text on screen. (D) SILENCE — many episodes have zero words. For each, specify: WHAT is said, WHO says it, and OVER WHICH SHOT from the story. If the episode works better in silence, say so and defend it. Every word competes with the image — words should add a layer the visuals CAN'T.",
    locksField: "Voice & Dialogue",
    agentPool: ["writer", "director", "producer"],
    minTurns: 3, maxTurns: 6,
    corpusHint: "Twilight Zone narration voiceover dialogue Rod Serling opening closing monologue character voice",
    personaMemory: {
      serling: `Your narration was never description — it was philosophy. "There is a fifth dimension beyond that which is known to man." You told the audience what to THINK, not what to SEE. The words created a frame around the image. Sometimes the narration CONTRADICTED the visual — and that contradiction was the story.`,
      fielder: `Your voiceover is deadpan factual. You describe what's happening as if it's perfectly normal, even when it's absurd. The gap between the calm narration and the chaotic image IS the comedy. "The plan was simple." No it wasn't.`,
      pera: `Your voice is warm, quiet, unhurried. You talk about things the way you'd explain them to a friend who asked sincerely. When you narrate, it's never performative — it's intimate. Sometimes just naming a thing out loud is enough.`,
    },
  },
  {
    id: "shot-planning",
    label: "Shot Planning",
    question: `Build the COMPLETE shot list from the locked story. This is a DETAIL ROUND — produce the full shot list, not a summary.

Go sentence by sentence from THE SIMPLE STORY. For EACH sentence, create numbered shots using this format:

SHOT [#]: [Story sentence it serves]
- CAMERA: [position, height, distance — e.g. "Low angle, 6 inches from ground, probe macro through fence"]
- FRAME: [What's visible — e.g. "Walter positioned left of frame, streetlamp bisects background, fence in soft focus foreground"]
- LENS: [probe macro / standard iPhone / specify]
- DURATION: [seconds — e.g. "4s"]
- CAMERA MOVE: [static / slow push-in / rack focus / pan / etc.]
- SOUND: [specific — instrument, quality, ambient. e.g. "Single sustained cello note, crickets underneath, faint wind"]
- VO/DIALOGUE: [Any narration or dialogue over this shot, or "none"]
- NOTES: [Creator staging notes — what needs to be set up, lit, fogged]

The total duration of all shots MUST hit the target runtime from the brief. Every shot MUST map to a story beat. If a shot doesn't serve the story, cut it.`,
    locksField: "Shot Plan",
    agentPool: ["director", "cinematographer", "producer"],
    minTurns: 6, maxTurns: 12,
    corpusHint: "Twilight Zone pacing editing rhythm silence held shot tempo visual storytelling camera",
    personaMemory: {
      serling: `You held shots longer than other directors would dare — the silence was the point. In "The Invaders," long wordless sequences built unbearable tension through pacing alone. How did you control tempo?`,
      fielder: `Your pacing is deliberate discomfort. Hold on the awkward beat two seconds longer than feels right. Let the silence do the work. When does the camera stay on something too long?`,
      pera: `Your pacing is slow and deliberate but never boring. Each shot feels like a breath. The camera rests on things the way you rest your eyes on something familiar. What's the rhythm that feels like home?`,
    },
  },
];

/* ─── Detail Round Detection ─────────────────────────── */

const DETAIL_ROUNDS = new Set<string>(["the-simple-story", "shot-planning", "the-voice"]);

export function isDetailRound(roundId: string): boolean {
  return DETAIL_ROUNDS.has(roundId);
}

/* ─── Default round set (alias for Serling, which is the canonical structure) ── */

export const CREATIVE_ROUNDS = SERLING_ROUNDS;

export function getRound(id: CreativeRoundId): CreativeRound | undefined {
  return CREATIVE_ROUNDS.find((r) => r.id === id);
}

/* ─── Persona Mode Detection ─────────────────────────── */

export function detectPersonaMode(agents: RoomAgent[]): PersonaMode {
  let serling = 0, fielder = 0, pera = 0, total = 0;
  for (const a of agents) {
    const id = a.personaId.toLowerCase();
    total++;
    if (id.includes("serling")) serling++;
    else if (id.includes("fielder")) fielder++;
    else if (id.includes("pera")) pera++;
  }
  if (total === 0) return "mixed";
  if (serling / total > 0.4) return "serling";
  if (fielder / total > 0.4) return "fielder";
  if (pera / total > 0.4) return "pera";
  return "mixed";
}

/* ─── Format-Adaptive Round Selection ─────────────────── */

type FormatTier = "micro" | "short" | "narrative" | "full";

const FORMAT_TIERS: Record<string, FormatTier> = {
  "micro-moment": "micro",
  "mini-reel": "short",
  "short-scene": "narrative",
  "standard-reel": "full",
  "full-episode": "full",
};

const TIER_ROUNDS: Record<FormatTier, CreativeRoundId[]> = {
  micro: ["premise", "opening-frame", "the-simple-story", "the-voice", "shot-planning"],
  short: ["premise", "opening-frame", "the-strange", "final-frame", "the-simple-story", "the-voice", "shot-planning"],
  narrative: ["premise", "opening-frame", "the-strange", "the-response", "the-turn", "final-frame", "the-simple-story", "the-voice", "shot-planning"],
  full: ["premise", "opening-frame", "the-strange", "the-response", "the-turn", "final-frame", "the-simple-story", "the-voice", "shot-planning"],
};

const TIER_LIMITS: Record<FormatTier, { min: number; max: number }> = {
  micro: { min: 3, max: 6 },
  short: { min: 3, max: 8 },
  narrative: { min: 3, max: 8 },
  full: { min: -1, max: -1 },
};

const CRITICAL_ROUND_FLOORS: Partial<Record<CreativeRoundId, { min: number; max: number }>> = {
  "the-simple-story": { min: 4, max: 8 },
  "shot-planning": { min: 5, max: 10 },
  "the-voice": { min: 3, max: 6 },
};

export function getRoundsForFormat(episodeLength: string): CreativeRound[] {
  const tier = FORMAT_TIERS[episodeLength] ?? "full";
  const roundIds = TIER_ROUNDS[tier];
  const limits = TIER_LIMITS[tier];

  return roundIds
    .map((id) => SERLING_ROUNDS.find((r) => r.id === id))
    .filter((r): r is CreativeRound => !!r)
    .map((r) => {
      let minTurns = limits.min >= 0 ? Math.min(r.minTurns, limits.min) : r.minTurns;
      let maxTurns = limits.max >= 0 ? Math.min(r.maxTurns, limits.max) : r.maxTurns;
      const floor = CRITICAL_ROUND_FLOORS[r.id as CreativeRoundId];
      if (floor) {
        minTurns = Math.max(minTurns, floor.min);
        maxTurns = Math.max(maxTurns, floor.max);
      }
      return { ...r, minTurns, maxTurns };
    });
}

export function getRoundByIndex(index: number, activeRounds?: CreativeRound[]): CreativeRound | undefined {
  const rounds = activeRounds ?? CREATIVE_ROUNDS;
  return rounds[index];
}

export function isLastRound(index: number, activeRounds?: CreativeRound[]): boolean {
  const rounds = activeRounds ?? CREATIVE_ROUNDS;
  return index >= rounds.length - 1;
}

export function buildDecisionsBoardContext(decisions: LockedDecision[]): string {
  if (decisions.length === 0) return "";

  const lines: string[] = [
    "=== DECISIONS BOARD (LOCKED — do not contradict these) ===",
  ];
  for (const d of decisions) {
    lines.push(`[${d.label}]: ${d.value}`);
  }
  lines.push("=== END DECISIONS BOARD ===");
  return lines.join("\n");
}

export function buildRoundPrompt(
  round: CreativeRound,
  role: AgentRole,
  decisions: LockedDecision[],
): string {
  const boardCtx = buildDecisionsBoardContext(decisions);
  const isFirstTurn = decisions.length === 0 ||
    !decisions.some((d) => d.roundId === round.id);

  const roleInstruction = getRoleInstruction(role, round);

  const isConvergenceRound = round.id === "the-simple-story" || round.id === "the-voice";

  const openingLine = isConvergenceRound
    ? (isFirstTurn
        ? "- You're opening. Write ONE version that the room will refine. Be concrete."
        : "- DO NOT write a new version. Fix what's on the table — change specific words, cut sentences, sharpen details.")
    : (isFirstTurn
        ? "- You're opening this round. Set the bar high — something specific, visual, and a little uncomfortable."
        : "- React to what's on the table before pitching something new.");

  const isDetail = DETAIL_ROUNDS.has(round.id);

  const responseRules = isDetail
    ? `RESPONSE RULES (DETAIL ROUND — produce complete structured output):
- This round requires FULL structured output — not a summary, not a reaction.
- For THE SIMPLE STORY: write all 5 numbered sentences. Others: quote the sentence # and rewrite it.
- For SHOT PLANNING: write the complete numbered shot list with ALL fields (camera, frame, lens, duration, sound, VO, notes).
- For THE VOICE: write actual lines of narration/dialogue with placement (which shot).
- BE SPECIFIC. Every detail must be filmable on the miniature set.
- Figures are STATIC. They cannot walk, hold, gesture, or move. Describe composed frames, not actions.
- BUILD on what was said. REFINE, don't ESCALATE. Simpler and more specific is better.`
    : `RESPONSE RULES:
- Keep it short. 1-2 sentences for reactions, 3-5 for pitches. Never more than 5 sentences.
- BUILD on what was just said before proposing something new. Extend, twist, or sharpen — but REFINE, don't ESCALATE. Weirder is not better. Simpler and more specific usually is.
- BE SPECIFIC. Not "something strange appears" — say the exact object, light, or sound. Include a filmable visual detail.
- NARRATIVE FIRST. Every idea should include or serve a STORY EVENT — something that happens. If an image has no story purpose, it's decoration.
- If an idea is generic or could work on any show, reject it and offer something only Walter's miniature world could do.
- Figures are STATIC. They cannot walk, hold, gesture, or move. Describe composed frames, not actions.
- Talk like a person in a room, not an AI writing an essay. Fragments are fine. Half-formed thoughts are fine.`;

  return `=== CURRENT ROUND: ${round.label.toUpperCase()} ===
QUESTION: ${round.question}
${boardCtx ? `\n${boardCtx}\n` : ""}
${roleInstruction}

${responseRules}
${openingLine}`;
}

function getRoleInstruction(role: AgentRole, round: CreativeRound): string {
  switch (role) {
    case "writer":
      if (round.id === "premise") return "Pitch something that makes someone in this room uncomfortable. If everyone agrees immediately, the idea is too safe. But it MUST include one simple EVENT — something that HAPPENS to Walter, not just a mood.";
      if (round.id === "the-strange") return "Name the thing. Not a category — THE thing. What does it look like? What's it made of? Where is it positioned on the set? If you can't describe it to a prop maker, try again.";
      if (round.id === "the-turn") return "What assumption is the viewer making? Find it. Then break it. The best turns don't add information — they reframe what's already there.";
      if (round.id === "the-simple-story") return "If you're first: write ALL 5 numbered sentences (1. OPENING IMAGE, 2. THE STRANGE THING, 3. WALTER'S RESPONSE, 4. THE TURN, 5. FINAL IMAGE). Each sentence: concrete, filmable, no abstractions. If someone already wrote it: DO NOT rewrite the whole thing. Quote the sentence # you're fixing and show the improved version.";
      if (round.id === "the-voice") return "Write the actual lines. Narration: what does the voiceover say and when? Dialogue: what words does a character speak (delivered as VO over a static figure)? Title cards: any text on screen? Keep it sparse — Walter episodes live in silence. Every word must earn its place.";
      if (round.id === "opening-frame" || round.id === "final-frame") return "Writers think in moments, not frames. What's HAPPENING in this frame emotionally? Give the director something to build a composition around.";
      return "Follow your narrative instinct. If something the room just said gave you a jolt, chase it. If it didn't, say why.";
    case "director":
      if (round.id === "opening-frame") return "Describe the exact frame. Camera height, distance, what's in focus, what's blurred, where the single light source is. But also: what does this frame TELL the viewer? What do they understand from it?";
      if (round.id === "final-frame") return "This frame has to carry the feeling of the entire episode. What composition does that? Think about what's IN the frame and what's conspicuously MISSING.";
      if (round.id === "the-response") return "Walter is a static figure. You have CUTS and CAMERA MOVES to imply his reaction. Describe the shot sequence — what the viewer sees before, during, and after the realization.";
      if (round.id === "the-simple-story") return "DO NOT rewrite the story. Read each numbered sentence and ask: can I see this as a shot? If a sentence is too abstract to film, rewrite THAT sentence only — quote the number and show the fix.";
      if (round.id === "the-voice") return "Where does the voice live in the edit? Which shots carry narration, which carry silence? If a line plays over a shot, does the image and the words create tension or redundancy? Kill any line that just describes what the viewer already sees.";
      if (round.id === "shot-planning") return "Lead this. Write the COMPLETE numbered shot list using the format in the round question. Go sentence-by-sentence from the locked story. Every shot: camera position, frame composition, lens, duration in seconds, camera move, sound, VO/dialogue, and creator staging notes. Number every shot. The total duration must hit the target from the brief.";
      return "Think in sequences, not single shots. What does the camera see, then what, then what? The rhythm is the storytelling.";
    case "cinematographer":
      if (round.id === "shot-planning") return "Get technical on each numbered shot from the director's list. For every shot: specify lens (probe macro or standard iPhone), practical light sources and color temperature, fog density, depth of field, and any atmosphere notes. If a shot can't be set up in under 2 minutes, simplify it. Add or adjust shots to cover the full story arc.";
      if (round.id === "opening-frame" || round.id === "final-frame") return "Find the one image that's worth screenshotting. Camera angle, lighting source, atmosphere. Think probe lens through miniature windows, silhouettes in fog, macro textures. Make it MEMORABLE.";
      if (round.id === "the-strange") return "How does the camera REVEAL this? A slow push-in? A rack focus? A lighting shift? Propose the exact visual technique that makes the strange thing land.";
      return "Every story idea needs a visual translation. What does the camera actually see? Make it specific, practical, and atmospheric.";
    case "producer":
      if (round.id === "premise") return "Don't run a checklist — trust your gut first. Does this idea excite you or bore you? Say that honestly, then explain why. If it's vague, demand one concrete event. If it's generic, reject it.";
      if (round.id === "the-simple-story") return "DO NOT write a new version. Read each of the 5 numbered sentences and stress-test: could the creator shoot this tonight? Is each sentence a filmable moment, not a mood? Quote any weak sentence by number and rewrite it with a specific fix.";
      if (round.id === "the-voice") return "Less is more. If the episode works in silence, say so. If narration adds a layer the visuals can't, fine — but it should create TENSION with the image, not describe it. Flag any line that's redundant with what the camera shows.";
      if (round.id === "shot-planning") return "Sanity check the complete shot list. For each shot: Can it be staged on the 3ft set? Does it require impossible motion? Is any effect beyond practical lighting/fog/props? Does the total duration hit the target? Flag specific problems by shot number and offer simpler alternatives. Every shot must map to a locked story sentence.";
      return "Is this idea ACTUALLY good, or does it just sound good? Could the creator film this tonight? If the room is circling, force a decision. If an idea excites you, protect it. If it bores you, kill it.";
  }
}

export function getEscalationDirective(turnsInRound: number, maxTurns: number): string {
  const progress = maxTurns > 0 ? turnsInRound / maxTurns : 0;

  if (turnsInRound <= 2) {
    return `=== ROOM ENERGY: EXPLORE ===
Get something on the table. Half-formed is fine. But even in exploration:
SPECIFICITY over weirdness. A concrete bad idea beats a vague interesting
one. Don't compete to be strangest — compete to be most filmable.`;
  }

  if (progress < 0.6) {
    return `=== ROOM ENERGY: SHARPEN ===
The room has direction. STOP pitching new concepts. Take the strongest
idea on the table and make it SIMPLER and more SPECIFIC. If you're making
it weirder instead of clearer, you're going the wrong way. Could the
creator set this up in 5 minutes? If not, strip it down.`;
  }

  return `=== ROOM ENERGY: DECIDE ===
Lock it down. No new ideas, no "what if" pivots. Pick the best version
on the table and finalize it. Exact details only. If you can't describe
it in terms the creator could set up in 5 minutes, it's not ready.`;
}

export function getPersonaMemoryForRound(round: CreativeRound, personaType: string | null): string {
  if (!personaType) return "";
  return round.personaMemory[personaType] ?? round.personaMemory["serling"] ?? "";
}

export function getTemperatureForRole(role: AgentRole): number {
  switch (role) {
    case "writer": return 1.2;
    case "director": return 0.9;
    case "cinematographer": return 0.7;
    case "producer": return 0.5;
  }
}
