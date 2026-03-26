import type { CreativeRound, CreativeRoundId, AgentRole } from "./types";

/* ─── Creative Rounds ─────────────────────────────────── */

export const CREATIVE_ROUNDS: CreativeRound[] = [
  {
    id: "premise",
    label: "Core Concept",
    question: "What is this project really about? What's the core idea or premise?",
    locksField: "coreConcept",
    agentPool: ["producer", "writer"],
    minTurns: 3,
    maxTurns: 6,
  },
  {
    id: "world-context",
    label: "World & Context",
    question: "What world does this exist in? What's the setting, tone, and rules?",
    locksField: "worldContext",
    agentPool: ["producer", "writer"],
    minTurns: 3,
    maxTurns: 6,
  },
  {
    id: "characters",
    label: "Key Characters",
    question: "Who are the key characters or voices? What drives them?",
    locksField: "keyCharacters",
    agentPool: ["producer", "writer"],
    minTurns: 3,
    maxTurns: 6,
  },
  {
    id: "conflict",
    label: "Central Conflict",
    question: "What's the central conflict, tension, or problem to solve?",
    locksField: "centralConflict",
    agentPool: ["producer", "writer"],
    minTurns: 3,
    maxTurns: 6,
  },
  {
    id: "structure",
    label: "Structure & Beats",
    question: "How does this unfold? What are the key beats or sections?",
    locksField: "structureBeats",
    agentPool: ["producer", "writer"],
    minTurns: 3,
    maxTurns: 8,
  },
  {
    id: "details",
    label: "Details & Polish",
    question: "What specific details, language, or moments make this come alive?",
    locksField: "themeOrFeeling",
    agentPool: ["producer", "writer"],
    minTurns: 2,
    maxTurns: 5,
  },
  {
    id: "final-review",
    label: "Final Review",
    question: "Is this ready? What's missing, what's working, what needs to change?",
    locksField: "",
    agentPool: ["producer", "writer"],
    minTurns: 2,
    maxTurns: 4,
  },
];

/* ─── Round Helpers ──────────────────────────────────── */

export function getRoundsForScope(_scopeLength: string): CreativeRound[] {
  return CREATIVE_ROUNDS;
}

export function getRound(id: CreativeRoundId): CreativeRound | undefined {
  return CREATIVE_ROUNDS.find((r) => r.id === id);
}

export function getRoundByIndex(index: number, rounds?: CreativeRound[]): CreativeRound | undefined {
  const pool = rounds ?? CREATIVE_ROUNDS;
  return pool[index];
}

export function isLastRound(index: number, rounds?: CreativeRound[]): boolean {
  const pool = rounds ?? CREATIVE_ROUNDS;
  return index >= pool.length - 1;
}

/* ─── Round Prompt Building ──────────────────────────── */

export function buildRoundPrompt(
  round: CreativeRound,
  lockedDecisions: { label: string; value: string }[],
): string {
  const lines: string[] = [
    `=== CURRENT ROUND: ${round.label} ===`,
    `FOCUS QUESTION: ${round.question}`,
    "",
    "The room must address this question directly. Stay focused.",
  ];

  if (lockedDecisions.length > 0) {
    lines.push("", "=== LOCKED DECISIONS — SACRED, DO NOT MODIFY ===");
    lines.push("The client has locked in these decisions. They are FINAL. Treat them as immutable facts:");
    for (const d of lockedDecisions) {
      lines.push(`🔒 ${d.label}: "${d.value}"`);
    }
    lines.push("");
    lines.push("RULES FOR LOCKED DECISIONS:");
    lines.push("- Do NOT rephrase, reword, edit, or 'improve' locked text. The EXACT wording is intentional.");
    lines.push("- Do NOT suggest alternatives to locked decisions. They are settled.");
    lines.push("- Do NOT debate, question, or revisit locked decisions. The client has spoken.");
    lines.push("- BUILD ON TOP of locked decisions. Use them as the foundation for further creative work.");
    lines.push("- When producing final output, include locked text VERBATIM — word for word, as written.");
    lines.push("=== END LOCKED DECISIONS ===");
  }

  return lines.join("\n");
}

export function buildDecisionsBoardContext(
  decisions: { roundId: string; label: string; value: string }[],
): string {
  if (decisions.length === 0) return "";
  const lines = [
    "=== DECISIONS BOARD — CLIENT-LOCKED, IMMUTABLE ===",
    "These decisions were locked by the client. They are BIBLE. Do not modify, rephrase, or suggest changes to any of them.",
    "When referencing or incorporating these into your work, use the EXACT text as written — verbatim, no edits.",
    "",
  ];
  for (const d of decisions) {
    lines.push(`🔒 [${d.roundId}] ${d.label}: "${d.value}"`);
  }
  lines.push("", "Any creative work MUST incorporate these locked decisions exactly as stated.");
  lines.push("=== END DECISIONS BOARD ===");
  return lines.join("\n");
}

export function getTemperatureForRole(role: AgentRole): number {
  return role === "producer" ? 0.6 : 0.9;
}
