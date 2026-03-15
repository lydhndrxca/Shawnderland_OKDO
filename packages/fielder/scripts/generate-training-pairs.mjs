#!/usr/bin/env node
/**
 * Generates LoRA training pairs from the Fielder corpus.
 * Creates instruction/response pairs that teach a model to THINK like Nathan Fielder.
 *
 * Pair types:
 * 1. Episode analysis pairs — scene breakdowns, escalation logic, emotional turns
 * 2. Decision pairs — "How would you escalate this?" → his actual choice + reasoning
 * 3. Technique pairs — silence use, commitment principle, meta-layers
 * 4. Interview pairs — Fielder's own words about his philosophy
 * 5. Critique/rejection pairs — what he'd push back on
 * 6. Deadpan voice pairs — rewriting in his flat, precise, business-like tone
 *
 * Usage: node packages/fielder/scripts/generate-training-pairs.mjs
 * Output: packages/fielder/training/fielder_pairs.json
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PKG_DIR = path.resolve(__dirname, "..");
const CORPUS_PATH = path.join(PKG_DIR, "src", "corpus", "chunks.json");
const DECISIONS_PATH = path.join(PKG_DIR, "src", "taxonomy", "decisions.json");
const OUTPUT_DIR = path.join(PKG_DIR, "training");
const OUTPUT_PATH = path.join(OUTPUT_DIR, "fielder_pairs.json");

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const chunks = JSON.parse(fs.readFileSync(CORPUS_PATH, "utf-8"));
const decisions = JSON.parse(fs.readFileSync(DECISIONS_PATH, "utf-8"));

const pairs = [];

/* ─── Type 1: Episode Analysis Pairs ─── */

const episodes = chunks.filter(
  (c) => c.sourceType === "episode-analysis" && c.text.length > 100
);
console.log(`Episode analysis chunks: ${episodes.length}`);

for (const chunk of episodes) {
  const meta = chunk.metadata || {};
  const pos = meta.structuralPosition || "middle";

  const taskMap = {
    opening:
      "Write the opening beat — set up the premise with a completely straight face. The viewer should barely notice how absurd it is.",
    setup:
      "Pitch the initial scheme. Lay it out like a real business plan. The comedy comes from the sincerity, not from winking.",
    escalation:
      "The premise needs to go further. What's the logical next step that everyone goes along with but shouldn't?",
    "peak-absurdity":
      "This is the moment the premise has gone way too far. Describe it with the same flat, matter-of-fact tone as the opening.",
    "emotional-turn":
      "Something genuine just happened inside the absurd structure. Describe the moment where real feeling broke through.",
    "silence-beat":
      "Hold on this moment. Nobody's talking. The camera isn't moving. What does the silence reveal?",
    "meta-layer":
      "The show is now examining itself. Describe how the constructed reality comments on reality itself.",
    payoff:
      "All the pieces come together — or don't. Describe the final result of the elaborate plan.",
    closing:
      "The episode is ending. What's the last thing the audience sees? Not a punchline — a feeling.",
  };

  const task =
    taskMap[pos] || "Describe this scene the way a documentary would — observational, patient, without judgment.";

  pairs.push({
    instruction: task,
    input: `Episode: ${chunk.source} — ${chunk.section}`,
    output: chunk.text.trim(),
  });

  // Additional voice-specific pair
  if (chunk.text.length > 200) {
    pairs.push({
      instruction:
        "Rewrite this in Nathan Fielder's voiceover style — flat, precise, slightly too detailed, as if reading a business proposal that happens to describe something absurd.",
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
      "You're in a writing room. Someone asks how you'd approach this aspect of filmmaking. Respond in your voice — measured, analytical, slightly self-deprecating.",
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
    question = "How do you think about comedy? What makes something funny to you?";
  } else if (section.includes("direct") || section.includes("camera")) {
    question = "How do you approach directing? What guides your visual decisions?";
  } else if (section.includes("real") || section.includes("authentic")) {
    question = "Where's the line between what's real and what's constructed in your work?";
  } else if (section.includes("rehearsal") || section.includes("control")) {
    question = "What happens when you try to control a situation completely? Does it work?";
  } else if (section.includes("business") || section.includes("scheme")) {
    question = "How does your business degree show up in your comedy?";
  } else {
    question = "What drives your creative choices? Walk me through your thinking.";
  }

  pairs.push({
    instruction: question,
    input: `From: ${chunk.source} — ${chunk.section}`,
    output: chunk.text.trim(),
  });
}

/* ─── Type 4: Decision Pairs ─── */

console.log(`Decision entries: ${decisions.length}`);

const categoryPrompts = {
  scheme_type:
    "What kind of scheme or concept would you use here? Be specific about the structure.",
  structural_pattern:
    "How would you structure this episode? What's the architecture?",
  cringe_mechanism:
    "How do you create discomfort in this episode? What specific technique?",
  subject_archetype:
    "Who is the central figure in this? What's their role in the dynamic?",
  authenticity_test:
    "What's real in this episode and what's constructed? How do you blur that line?",
  opening_strategy:
    "How do you open this episode? What does the audience see and hear first?",
  closing_strategy:
    "How does this episode end? What feeling do you leave behind?",
  silence_use:
    "Where does silence do the work in this episode? How long do you hold it?",
  escalation_method:
    "How does the premise compound? What's the logical-but-insane next step?",
  camera_philosophy:
    "What's the camera doing in this episode? Why?",
  editing_approach:
    "How do you use cuts and pacing in this episode? What stays in that shouldn't?",
  performance_direction:
    "How do you direct performance here? What are you doing with your own face?",
  thematic_core:
    "What is this episode actually about? Not the scheme — the human thing underneath.",
  tone_blend:
    "What's the tonal mix here? How much cringe to tenderness?",
  meta_layer:
    "How self-aware is this episode? Is the show examining itself?",
  emotional_payload:
    "What's the real feeling hiding inside the comedy?",
};

for (const d of decisions) {
  const question =
    categoryPrompts[d.category] || `What's your approach to ${d.category.replace(/_/g, " ")}?`;
  const rejections =
    d.alternatives.length > 0
      ? `\n\nI considered: ${d.alternatives.join("; ")} — but they didn't serve what I was trying to do.`
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
    output: `I don't think that works. The issue is — ${d.reasoning} What I actually did was: ${d.choice}. The difference is important because the other approach would signal that we're in on the joke, and the whole thing only works if we're not.`,
  });
}

/* ─── Type 6: Deadpan Voice Rewrite Pairs ─── */

const longChunks = chunks.filter((c) => c.text.length > 300);
const sampleSize = Math.min(longChunks.length, 200);
const sampled = longChunks
  .sort(() => Math.random() - 0.5)
  .slice(0, sampleSize);

console.log(`Deadpan voice pairs from ${sampleSize} long chunks`);

for (const chunk of sampled) {
  pairs.push({
    instruction:
      "Rewrite this in a completely flat, matter-of-fact voiceover. As if describing a business procedure. No irony. No winking. The humor comes from the gap between tone and content.",
    input: `Source: ${chunk.source}\n\n${chunk.text.substring(0, 300)}`,
    output: chunk.text.trim(),
  });
}

/* ─── Type 7: Raw Transcript Pairs ─── */

const rawTranscripts = chunks.filter(
  (c) =>
    c.sourceType === "episode-analysis" &&
    c.metadata?.show &&
    c.text.length > 150
);
const transcriptSample = rawTranscripts
  .sort(() => Math.random() - 0.5)
  .slice(0, 300);

console.log(`Raw transcript context pairs: ${transcriptSample.length}`);

for (const chunk of transcriptSample) {
  pairs.push({
    instruction:
      "You're Nathan Fielder. Describe what's happening in this moment of the show as if you're recounting it to a colleague — precise, analytical, with the emotional subtext visible but unstated.",
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
console.log(`  Episode analysis: ${episodes.length * 2}`);
console.log(`  Technique: ${techniques.length * 2}`);
console.log(`  Interview: ${interviews.length}`);
console.log(`  Decision reasoning: ${decisions.length}`);
console.log(`  Critique/rejection: ${decisionsWithAlts.length}`);
console.log(`  Deadpan voice: ${sampleSize}`);
console.log(`  Transcript context: ${transcriptSample.length}`);
