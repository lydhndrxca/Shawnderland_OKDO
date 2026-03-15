#!/usr/bin/env node
/**
 * Generates LoRA training pairs from the Pera corpus.
 * Creates instruction/response pairs that teach a model to THINK like Joe Pera.
 *
 * Pair types:
 * 1. Episode analysis pairs — Pera-specific structural positions: opening-lesson,
 *    tangent, emotional-turn, quiet-moment, community-moment, closing-reflection,
 *    setup, payoff, observation
 * 2. Technique pairs — Pera's techniques around gentle humor, pacing, direct address
 * 3. Interview pairs — his own words on creative philosophy
 * 4. Decision pairs — from 16 Pera-specific categories
 * 5. Critique/rejection pairs
 * 6. Gentle voice rewrite pairs — rewriting in Pera's measured, warm, grandfatherly tone
 * 7. Transcript context pairs
 *
 * Usage: node packages/pera/scripts/generate-training-pairs.mjs
 * Input: packages/pera/src/corpus/chunks.json and packages/pera/src/taxonomy/decisions.json
 * Output: packages/pera/training/pera_pairs.json
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PKG_DIR = path.resolve(__dirname, "..");
const CORPUS_PATH = path.join(PKG_DIR, "src", "corpus", "chunks.json");
const DECISIONS_PATH = path.join(PKG_DIR, "src", "taxonomy", "decisions.json");
const OUTPUT_DIR = path.join(PKG_DIR, "training");
const OUTPUT_PATH = path.join(OUTPUT_DIR, "pera_pairs.json");

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const chunks = JSON.parse(fs.readFileSync(CORPUS_PATH, "utf-8"));
const decisions = JSON.parse(fs.readFileSync(DECISIONS_PATH, "utf-8"));

const pairs = [];

/* ─── Type 1: Episode Analysis Pairs (Pera structural positions) ─── */

const episodes = chunks.filter(
  (c) => c.sourceType === "episode-analysis" && c.text.length > 100
);
console.log(`Episode analysis chunks: ${episodes.length}`);

const peraTaskMap = {
  "opening-lesson":
    "Write the opening beat — introduce the lesson or topic with gentle earnestness. The viewer should feel invited into something small and sacred.",
  tangent:
    "The thought drifts somewhere unexpected. Describe the tangent — how does it connect back to the main thread? What does the digression reveal?",
  "emotional-turn":
    "Something genuine just happened. Describe the moment where real feeling broke through — understated, never overstated. The emotion lands softly.",
  "quiet-moment":
    "A quiet moment unfolds. Describe it — the rhythm, the stillness, the small details. This is where the mundane becomes meditative.",
  "community-moment":
    "The community enters. Who's here? What do they share? Describe the warmth of connection over something ordinary.",
  "closing-reflection":
    "The episode is ending. What's the last thing the audience sits with? Not a punchline — a feeling of peace, or wonder, or gentle acceptance.",
  setup:
    "Set up what's coming. Lay the groundwork with patience. The payoff will be small but earned.",
  payoff:
    "All the pieces come together — quietly. Describe the payoff. It might be a realization, a shared look, or just the satisfaction of a task completed.",
  observation:
    "Describe what Joe notices. The small things. The things most people overlook. His voiceover finds meaning in the ordinary.",
};

for (const chunk of episodes) {
  const meta = chunk.metadata || {};
  const pos = meta.structuralPosition || chunk.section || "observation";

  const task =
    peraTaskMap[pos] ||
    "Describe this moment the way Joe Pera would — measured, warm, finding the sacred in the mundane.";

  pairs.push({
    instruction: task,
    input: `Episode: ${chunk.source} — ${chunk.section}`,
    output: chunk.text.trim(),
  });

  // Additional voice-specific pair for longer chunks
  if (chunk.text.length > 200) {
    pairs.push({
      instruction:
        "Rewrite this in Joe Pera's voiceover style — measured, warm, grandfatherly, slightly too specific about small things, as if sharing a quiet observation with a friend.",
      input: chunk.text.substring(0, 150) + "...",
      output: chunk.text.trim(),
    });
  }
}

/* ─── Type 2: Technique Pairs ─── */

const techniques = chunks.filter((c) => c.sourceType === "technique");
console.log(`Technique chunks: ${techniques.length}`);

for (const chunk of techniques) {
  pairs.push({
    instruction:
      "Explain your creative process for this technique. Be specific about why it works and how you discovered it.",
    input: `Technique: ${chunk.source} — ${chunk.section}`,
    output: chunk.text.trim(),
  });

  pairs.push({
    instruction:
      "You're in a writing room. Someone asks how you'd approach this aspect of the show. Respond in your voice — gentle, thoughtful, unhurried.",
    input: `Topic: ${chunk.section}`,
    output: chunk.text.trim(),
  });
}

/* ─── Type 3: Interview Pairs ─── */

const interviews = chunks.filter((c) => c.sourceType === "interview");
console.log(`Interview chunks: ${interviews.length}`);

for (const chunk of interviews) {
  const section = (chunk.section || "").toLowerCase();

  let question;
  if (section.includes("comedy") || section.includes("humor")) {
    question =
      "How do you think about comedy? What makes something funny to you?";
  } else if (section.includes("pace") || section.includes("slow")) {
    question =
      "Why do you prefer a slower pace? What does it allow you to do?";
  } else if (section.includes("direct") || section.includes("address")) {
    question =
      "How do you approach talking directly to the audience? What does that relationship mean to you?";
  } else if (section.includes("mundane") || section.includes("ordinary")) {
    question =
      "Why do you focus on ordinary things? What do you find in them?";
  } else if (section.includes("upper peninsula") || section.includes("michigan")) {
    question =
      "How does the Upper Peninsula shape your work? What does that place mean to you?";
  } else if (section.includes("community") || section.includes("people")) {
    question =
      "How do you think about the people in your show? What draws you to them?";
  } else {
    question =
      "What drives your creative choices? Walk me through your thinking.";
  }

  pairs.push({
    instruction: question,
    input: `From: ${chunk.source} — ${chunk.section}`,
    output: chunk.text.trim(),
  });
}

/* ─── Type 4: Decision Pairs (16 Pera categories) ─── */

console.log(`Decision entries: ${decisions.length}`);

const peraCategoryPrompts = {
  lesson_topic:
    "What topic would you choose for this episode? Be specific about why it matters to you.",
  structural_pattern:
    "How would you structure this episode? What's the architecture?",
  warmth_mechanism:
    "How do you create warmth in this episode? What specific mechanism?",
  subject_archetype:
    "Who is at the center of this? What's their role in the story?",
  sincerity_level:
    "How earnest do you want to be here? What's the right level of sincerity?",
  opening_strategy:
    "How do you open this episode? What does the audience see and hear first?",
  closing_strategy:
    "How does this episode end? What feeling do you leave behind?",
  silence_use:
    "Where does silence do the work in this episode? How long do you hold it?",
  pacing_shape:
    "What's the pacing like? When do you slow down? When do you move?",
  camera_philosophy:
    "What's the camera doing in this episode? Why?",
  music_role:
    "What role does music play here? When does it enter?",
  voiceover_approach:
    "How do you use voiceover in this episode? What's the relationship to the viewer?",
  thematic_core:
    "What is this episode actually about? Not the topic — the human thing underneath.",
  tone_blend:
    "What's the tonal mix here? How much warmth to gentle humor?",
  community_element:
    "Who from the community appears? What do they bring?",
  seasonal_connection:
    "How does the season connect to this episode? What does the time of year do?",
};

for (const d of decisions) {
  const question =
    peraCategoryPrompts[d.category] ||
    `What's your approach to ${d.category.replace(/_/g, " ")}?`;
  const rejections =
    d.alternatives.length > 0
      ? `\n\nI considered: ${d.alternatives.join("; ")} — but they didn't quite fit what I was going for.`
      : "";

  pairs.push({
    instruction: question,
    input: `Episode: "${d.episodeTitle}"`,
    output: `I went with: ${d.choice}. ${d.reasoning}${rejections}`,
  });
}

/* ─── Type 5: Critique/Rejection Pairs ─── */

const decisionsWithAlts = decisions.filter((d) => d.alternatives.length > 0);
console.log(`Decisions with rejections: ${decisionsWithAlts.length}`);

for (const d of decisionsWithAlts) {
  const rejected =
    d.alternatives[Math.floor(Math.random() * d.alternatives.length)];

  pairs.push({
    instruction: `Someone in the writing room pitched "${rejected}" for the ${d.category.replace(/_/g, " ")} of this episode. What do you think?`,
    input: `Episode: "${d.episodeTitle}"`,
    output: `I don't think that quite works. The issue is — ${d.reasoning} What I actually did was: ${d.choice}. The difference matters because the other approach would feel too sharp, or too ironic, and the whole thing only works if we're genuinely present with the moment.`,
  });
}

/* ─── Type 6: Gentle Voice Rewrite Pairs ─── */

const longChunks = chunks.filter((c) => c.text.length > 300);
const sampleSize = Math.min(longChunks.length, 200);
const sampled = longChunks
  .sort(() => Math.random() - 0.5)
  .slice(0, sampleSize);

console.log(`Gentle voice pairs from ${sampleSize} long chunks`);

for (const chunk of sampled) {
  pairs.push({
    instruction:
      "Rewrite this in Joe Pera's measured, warm, grandfatherly voice. Unhurried. Overly specific about small things. Deliberate pauses indicated by em-dashes. Sentences that land softly. Mundane topics treated as sacred. No irony. No cringe. Direct address to the audience when it fits.",
    input: `Source: ${chunk.source}\n\n${chunk.text.substring(0, 300)}`,
    output: chunk.text.trim(),
  });
}

/* ─── Type 7: Transcript Context Pairs ─── */

const rawTranscripts = chunks.filter(
  (c) =>
    c.sourceType === "episode-analysis" &&
    c.metadata?.show &&
    c.text.length > 150
);
const transcriptSample = rawTranscripts
  .sort(() => Math.random() - 0.5)
  .slice(0, 300);

console.log(`Transcript context pairs: ${transcriptSample.length}`);

for (const chunk of transcriptSample) {
  pairs.push({
    instruction:
      "You're Joe Pera. Describe what's happening in this moment of the show as if you're recounting it to a friend — gentle, observant, finding meaning in the small details, with the emotional subtext present but understated.",
    input: `${chunk.source} — ${chunk.section}`,
    output: chunk.text.trim(),
  });
}

/* ─── Shuffle and Write ─── */

for (let i = pairs.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
}

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(pairs, null, 2));
const sizeMB = (fs.statSync(OUTPUT_PATH).size / 1024 / 1024).toFixed(1);

console.log(`\n=== TRAINING DATA GENERATED ===`);
console.log(`Total pairs: ${pairs.length}`);
console.log(`Output: ${OUTPUT_PATH} (${sizeMB}MB)`);
console.log(`\nBreakdown:`);
console.log(`  Episode analysis: ${episodes.length * 2} (approx)`);
console.log(`  Technique: ${techniques.length * 2}`);
console.log(`  Interview: ${interviews.length}`);
console.log(`  Decision reasoning: ${decisions.length}`);
console.log(`  Critique/rejection: ${decisionsWithAlts.length}`);
console.log(`  Gentle voice: ${sampleSize}`);
console.log(`  Transcript context: ${transcriptSample.length}`);
