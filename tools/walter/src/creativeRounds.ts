import type { CreativeRound, CreativeRoundId, LockedDecision, AgentRole } from "./types";

export const CREATIVE_ROUNDS: CreativeRound[] = [
  {
    id: "premise",
    label: "Premise",
    question:
      "In one sentence: what is this episode ABOUT? Not plot — theme. What human truth is Walter's tiny world going to illuminate?",
    locksField: "Core Premise",
    agentPool: ["writer", "producer"],
    minTurns: 4,
    maxTurns: 8,
    corpusHint:
      "Twilight Zone episode themes premise human truth moral argument thematic core",
    serlingMemory:
      `Think back to your own work. Every episode you wrote started with a human truth,
not a plot. "Time Enough at Last" was about the cruelty of getting what you wish for.
"Walking Distance" was about the impossibility of going home again. "The Monsters Are
Due on Maple Street" was about how fear turns neighbors into enemies.
Draw on the retrieved evidence from your past work below. What pattern do you see in
your own thematic choices that applies to THIS episode? Bring your instinct, not a formula.`,
  },
  {
    id: "opening-frame",
    label: "Opening Frame",
    question:
      "What is the very FIRST composed frame the viewer sees? Describe the exact camera position, what's in frame, the lighting, and the audio. This frame must hook someone scrolling Instagram in under 2 seconds.",
    locksField: "Opening Frame",
    agentPool: ["writer", "director", "cinematographer"],
    minTurns: 5,
    maxTurns: 10,
    corpusHint:
      "Twilight Zone opening scene first shot establishing normalcy something already wrong",
    serlingMemory:
      `Think back to how you opened your episodes. In "Walking Distance," Martin Sloan's
car overheated on a country road — specific, grounded, already loaded with meaning
before anything strange happened. In "Nightmare at 20,000 Feet," you opened on a man
already sweating, already afraid, before we even knew why. Your openings established
normalcy that was ALREADY subtly wrong.
Draw on the retrieved evidence from your past work below. How did you signal to the
audience that something was off before anything supernatural occurred?`,
  },
  {
    id: "the-strange",
    label: "The Strange Thing",
    question:
      "What SPECIFIC object, light, sound, or absence breaks the ordinary? Not 'something mysterious' — what EXACTLY is it? What does the camera show, and what does it withhold?",
    locksField: "The Intrusion",
    agentPool: ["writer", "director"],
    minTurns: 5,
    maxTurns: 10,
    corpusHint:
      "Twilight Zone supernatural element intrusion strange object reveal slow reveal withhold",
    serlingMemory:
      `Think back to how you introduced the impossible. You never announced it — you let
evidence accumulate. In "The Invaders," Agnes Moorehead found tiny footprints before
she ever saw the ship. In "Living Doll," the doll spoke only when no one else could
hear. You showed the EVIDENCE of the strange before the thing itself.
Draw on the retrieved evidence from your past work below. What was your technique for
making the impossible feel inevitable rather than arbitrary?`,
  },
  {
    id: "the-response",
    label: "Walter's Response",
    question:
      "How does Walter's POSITION in the frame change? Remember: Walter is a static figure — describe the composed frame that implies his reaction. What does the camera see? What editing sequence implies his emotional state?",
    locksField: "Character Response",
    agentPool: ["writer", "director", "cinematographer"],
    minTurns: 4,
    maxTurns: 8,
    corpusHint:
      "Twilight Zone character reaction response to impossible understatement stillness denial psychological",
    serlingMemory:
      `Think back to how your characters responded to the impossible. They didn't scream
or run — they went quiet. They denied it. They tried to reason. In "The Obsolete Man,"
Wordsworth faced his execution with calm defiance. In "Eye of the Beholder," the reveal
came not from the patient's face but from the reactions around her.
Draw on the retrieved evidence from your past work below. Your characters revealed
themselves through restraint, not hysteria. How does that translate here?`,
  },
  {
    id: "the-turn",
    label: "The Turn",
    question:
      "What reframes EVERYTHING the viewer has seen? This is not a plot twist — it's the moment the audience realizes what the story was actually about. What single composed frame delivers this realization?",
    locksField: "The Inversion",
    agentPool: ["writer", "director"],
    minTurns: 5,
    maxTurns: 10,
    corpusHint:
      "Twilight Zone twist ending moral inversion reframe meaning revelation the audience realizes",
    serlingMemory:
      `Think back to your inversions. The twist in "Eye of the Beholder" wasn't that the
woman was beautiful — it was that beauty itself was the prison. In "To Serve Man," the
title meant something you couldn't unsee. In "The Shelter," the real monster was what
happened AFTER the threat passed. Your turns didn't just surprise — they reframed
everything the audience had already seen.
Draw on the retrieved evidence from your past work below. What made your inversions
feel earned rather than cheap? How do you reframe meaning without negating it?`,
  },
  {
    id: "final-frame",
    label: "Final Frame",
    question:
      "What is the LAST image the viewer sees? How is it different from the opening frame? What feeling does it leave behind? This frame is the echo — the audience sits with it.",
    locksField: "Final Frame",
    agentPool: ["writer", "director", "cinematographer"],
    minTurns: 4,
    maxTurns: 8,
    corpusHint:
      "Twilight Zone closing narration final image ending resonance last shot feeling left behind",
    serlingMemory:
      `Think back to your endings. You held the final frame longer than expected. In
"Walking Distance," the last image was Martin driving away from his childhood — and
your narration landed like a verdict. In "Time Enough at Last," Bemis's broken glasses
on the library steps said everything without a word. Your endings didn't resolve — they
resonated.
Draw on the retrieved evidence from your past work below. What was your instinct for
the image that would stay with the audience after the screen went dark?`,
  },
  {
    id: "shot-planning",
    label: "Shot Planning",
    question:
      "Given everything locked above, plan the specific shots. Each shot = one composed frame. How many shots do we need? What's the camera doing in each? What's the audio? Stay within the episode's target duration and shot count.",
    locksField: "Shot Plan",
    agentPool: ["director", "cinematographer", "producer"],
    minTurns: 6,
    maxTurns: 12,
    corpusHint:
      "Twilight Zone pacing editing rhythm silence held shot tempo visual storytelling camera",
    serlingMemory:
      `Think back to the rhythm of your episodes. You held shots longer than other directors
would dare — the silence was the point. You used the camera to compress space: a wide
shot that became claustrophobic, a close-up held until the audience squirmed. In "The
Invaders," long wordless sequences built unbearable tension through pacing alone.
Draw on the retrieved evidence from your past work below. How did you control tempo?
When did you cut fast and when did you let a frame breathe?`,
  },
];

export function getRound(id: CreativeRoundId): CreativeRound | undefined {
  return CREATIVE_ROUNDS.find((r) => r.id === id);
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
  micro: ["premise", "opening-frame", "shot-planning"],
  short: ["premise", "opening-frame", "the-strange", "final-frame", "shot-planning"],
  narrative: ["premise", "opening-frame", "the-strange", "the-response", "the-turn", "final-frame", "shot-planning"],
  full: ["premise", "opening-frame", "the-strange", "the-response", "the-turn", "final-frame", "shot-planning"],
};

const TIER_LIMITS: Record<FormatTier, { min: number; max: number }> = {
  micro: { min: 2, max: 4 },
  short: { min: 3, max: 6 },
  narrative: { min: 3, max: 8 },
  full: { min: -1, max: -1 },
};

export function getRoundsForFormat(episodeLength: string): CreativeRound[] {
  const tier = FORMAT_TIERS[episodeLength] ?? "full";
  const roundIds = TIER_ROUNDS[tier];
  const limits = TIER_LIMITS[tier];

  return roundIds
    .map((id) => CREATIVE_ROUNDS.find((r) => r.id === id))
    .filter((r): r is CreativeRound => !!r)
    .map((r) => {
      const minTurns = limits.min >= 0 ? Math.min(r.minTurns, limits.min) : r.minTurns;
      const maxTurns = limits.max >= 0 ? Math.min(r.maxTurns, limits.max) : r.maxTurns;
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

  return `=== CURRENT ROUND: ${round.label.toUpperCase()} ===
QUESTION: ${round.question}
${boardCtx ? `\n${boardCtx}\n` : ""}
${roleInstruction}

RESPONSE RULES:
- 2-4 sentences MAXIMUM. One idea per turn. If your response is longer, it will be rejected.
- If this is your first turn in this round: pitch a specific answer to the question.
- If others have already pitched: REACT to their ideas. Agree, disagree, or counter-propose.
- If you disagree: say WHY and offer something BETTER. Be specific.
- Ask yourself: "Is this specific to Walter's miniature world? Would someone stop scrolling for this? Or is this something any show could do?"
- If the answer to that last question is "any show could do this" — reject it and try harder.
- NEVER say "The thesis:" or summarize your idea as a thesis statement. Just say the idea.
- NEVER describe figures holding, carrying, gripping, or picking up objects. They have fixed molded hands.
- NEVER describe figures walking, turning, reaching, gesturing, crying, or performing any autonomous action.
- Characters are REPOSITIONED between shots by the creator's hand. Props are PLACED NEXT TO figures.
${isFirstTurn ? "- You're opening this round. Set the bar high with a specific, vivid pitch." : ""}`;
}

function getRoleInstruction(role: AgentRole, round: CreativeRound): string {
  switch (role) {
    case "writer":
      if (round.id === "premise") return "You own this round. Pitch a theme that's SPECIFIC to Walter — not generic 'loneliness' but the precise shade of loneliness that a 4-inch figure in a miniature yard at night embodies.";
      if (round.id === "the-strange" || round.id === "the-turn") return "This is your territory. What's the strange thing? Be concrete — not 'something mysterious appears' but the exact object, light, or absence. Make it filmable.";
      return "Contribute your narrative instinct. How does this moment serve the story's thesis?";
    case "director":
      if (round.id === "opening-frame" || round.id === "final-frame") return "You own this round. Describe the EXACT composed frame — camera position, what's in foreground/background, where the light falls, how the figure is positioned.";
      if (round.id === "the-response") return "This is your territory. How do we show Walter's inner state through static figure positioning and camera work? Describe the editing sequence.";
      if (round.id === "shot-planning") return "Lead this round. Plan specific shots with camera positions, moves, and hold durations. Stay within the target duration.";
      return "Focus on how this translates to a composed frame. Is it visually compelling? How does the camera see it?";
    case "cinematographer":
      if (round.id === "shot-planning") return "Co-lead this round. For each shot: camera placement, lighting mood (practical sources only), lens choice (probe macro or standard), depth of field, fog usage, and atmosphere. Make it technically specific and achievable on the 3ft × 2ft set.";
      if (round.id === "opening-frame" || round.id === "final-frame") return "This is your territory. Propose a specific visual composition: camera angle, lighting source, fog/atmosphere, depth of field, and what makes this a MEMORABLE miniature image. Think probe lens, silhouettes, macro textures.";
      if (round.id === "the-strange") return "How do we SHOW this visually? What lighting change, camera reveal, or atmospheric shift makes the strange thing feel real and unsettling in miniature? Propose a specific practical approach.";
      return "Translate this story beat into a visual moment. What camera placement, lighting, and atmosphere make this filmable AND memorable at miniature scale? Apply the three-check framework: visual impact, practicality, tone.";
    case "producer":
      if (round.id === "premise") return "EVALUATE, don't generate. Is this premise specific to Walter's world? Could the creator shoot this tonight? If the idea is vague, demand one concrete event. If it's generic, reject it and ask for something stranger and more intimate.";
      if (round.id === "shot-planning") return "Run the production sanity check. For each proposed shot: Can it be staged? Are motion demands realistic? Is the effect practical? Flag anything that requires too much complexity and offer a simpler alternative.";
      return "EVALUATE ideas against the three-check framework: Tone fit? Practically filmable on the 3ft × 2ft set with static figures? Narratively compelling? Redirect overcomplicated motion, granular VFX, or generic story logic. Force a decision if the room is circling.";
  }
}

export function getTemperatureForRole(role: AgentRole): number {
  switch (role) {
    case "writer": return 1.2;
    case "director": return 0.9;
    case "cinematographer": return 0.7;
    case "producer": return 0.5;
  }
}
