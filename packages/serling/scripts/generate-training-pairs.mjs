#!/usr/bin/env node
/**
 * Generates LoRA training pairs from the Serling corpus.
 * Creates instruction/response pairs that teach a model to THINK like Serling.
 *
 * Pair types:
 * 1. Voice pairs — "Rewrite X in Serling's voice" → actual Serling text
 * 2. Decision pairs — "How would you open this episode?" → his actual choice + reasoning
 * 3. Critique pairs — "What's wrong with this approach?" → Serling's rejection + alternative
 * 4. Narration pairs — "Write a narration for..." → actual Serling narration
 * 5. Analysis pairs — "Why did you choose X?" → decision reasoning from taxonomy
 *
 * Usage: node packages/serling/scripts/generate-training-pairs.mjs
 * Output: packages/serling/training/serling_pairs.json
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERLING_DIR = path.resolve(__dirname, "..");
const CORPUS_PATH = path.join(SERLING_DIR, "src", "corpus", "chunks.json");
const DECISIONS_PATH = path.join(SERLING_DIR, "src", "taxonomy", "decisions.json");
const OUTPUT_DIR = path.join(SERLING_DIR, "training");
const OUTPUT_PATH = path.join(OUTPUT_DIR, "serling_pairs.json");

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const chunks = JSON.parse(fs.readFileSync(CORPUS_PATH, "utf-8"));
const decisions = JSON.parse(fs.readFileSync(DECISIONS_PATH, "utf-8"));

const pairs = [];

/* ─── Type 1: Voice Pairs (narrations) ─── */

const narrations = chunks.filter((c) => c.sourceType === "narration");
console.log(`Narrations: ${narrations.length}`);

for (const chunk of narrations) {
  const isOpen = chunk.section.toLowerCase().includes("open");
  const isClose = chunk.section.toLowerCase().includes("clos");

  if (isOpen) {
    pairs.push({
      instruction: `Write an opening narration for a Twilight Zone-style episode. The episode is "${chunk.source}."`,
      input: "",
      output: chunk.text.trim(),
    });
    pairs.push({
      instruction: "Write an opening narration that establishes a specific ordinary person in a specific ordinary place, with something already slightly wrong.",
      input: `Episode context: ${chunk.source}`,
      output: chunk.text.trim(),
    });
  }

  if (isClose) {
    pairs.push({
      instruction: `Write a closing narration for "${chunk.source}" that sits with the consequences rather than moralizing.`,
      input: "",
      output: chunk.text.trim(),
    });
    pairs.push({
      instruction: "Write a closing narration that leaves the audience with a feeling they can't quite name — not resolution, but resonance.",
      input: `Episode: ${chunk.source}`,
      output: chunk.text.trim(),
    });
  }

  if (!isOpen && !isClose) {
    pairs.push({
      instruction: "Write a narration passage in Rod Serling's voice — precise, rhythmic, building in waves.",
      input: `Context: ${chunk.source} — ${chunk.section}`,
      output: chunk.text.trim(),
    });
  }
}

/* ─── Type 2: Script Voice Pairs ─── */

const scripts = chunks.filter(
  (c) => c.sourceType === "script" && c.text.length > 100
);
console.log(`Script chunks: ${scripts.length}`);

for (const chunk of scripts) {
  const meta = chunk.metadata || {};
  const pos = meta.structuralPosition || "middle";

  const taskMap = {
    opening: "Write the opening scene — establish the ordinary with specificity before anything strange happens.",
    rising: "Write a scene where the strange element intrudes quietly. No announcements — just wrongness accumulating.",
    crisis: "Write the crisis moment — the character confronts what they can no longer deny.",
    inversion: "Write the inversion — the moment that reframes everything the audience has seen.",
    closing: "Write the final scene — hold on a single image. Let the audience sit with the weight.",
    dialogue: "Write dialogue that sounds like real people who happen to be articulate. Questions drive the scene.",
    "stage-direction": "Write stage directions that describe not just what happens but how the space feels — the power dynamics, the psychological distance.",
  };

  const task = taskMap[pos] || "Write this scene in Rod Serling's voice.";

  pairs.push({
    instruction: task,
    input: `Episode: ${chunk.source} — ${chunk.section}`,
    output: chunk.text.trim(),
  });
}

/* ─── Type 3: Decision Pairs ─── */

console.log(`Decision entries: ${decisions.length}`);

const categoryPrompts = {
  premise_type: "What kind of story seed would you choose for this episode, and why?",
  structural_pattern: "How would you structure this story? What pattern serves the thesis?",
  twist_mechanism: "How does the inversion work? What kind of reframe serves the meaning?",
  character_archetype: "What kind of protagonist does this story need?",
  character_test: "How should the main character be tested? What reveals who they really are?",
  opening_strategy: "How would you open this episode? What does the audience see first?",
  closing_strategy: "How should this episode end? What feeling do you leave behind?",
  dialogue_density: "How much should characters talk in this episode? Why?",
  narration_role: "What role should the narrator play in this episode?",
  lighting_philosophy: "What's the visual approach for this episode's lighting?",
  staging_approach: "How should the space be used? Confined, expansive, threshold?",
  pacing_shape: "What's the tempo arc? Where does it surge and where does it pause?",
  music_relationship: "How should the score function in this episode?",
  thematic_core: "What is this episode actually about? Not plot — theme.",
  tone_blend: "What's the tonal recipe for this episode?",
  scale_of_stakes: "What's at risk in this episode? Personal, communal, existential?",
};

for (const d of decisions) {
  const question = categoryPrompts[d.category] || `What would you choose for ${d.category}?`;
  const rejections = d.alternatives.length > 0
    ? `\n\nI rejected: ${d.alternatives.join("; ")} — they wouldn't serve the story the way I needed.`
    : "";

  pairs.push({
    instruction: question,
    input: `Episode: "${d.episodeTitle}"`,
    output: `I chose: ${d.choice}. ${d.reasoning}${rejections}`,
  });
}

/* ─── Type 4: Interview/Lecture Pairs (Serling's own philosophy) ─── */

const interviews = chunks.filter((c) => c.sourceType === "interview" || c.sourceType === "lecture");
console.log(`Interview/lecture chunks: ${interviews.length}`);

for (const chunk of interviews) {
  pairs.push({
    instruction: `In your own words: ${chunk.section.includes("writing") || chunk.section.includes("craft")
      ? "How do you approach the craft of writing?"
      : chunk.section.includes("television") || chunk.section.includes("TV")
      ? "What is the role of television as a medium?"
      : chunk.section.includes("censor") || chunk.section.includes("sponsor")
      ? "How did you handle censorship and sponsor interference?"
      : chunk.section.includes("war") || chunk.section.includes("combat")
      ? "How did the war shape your work?"
      : "What drives your creative choices?"}`,
    input: `From: ${chunk.source} — ${chunk.section}`,
    output: chunk.text.trim(),
  });
}

/* ─── Type 5: Essay Pairs ─── */

const essays = chunks.filter((c) => c.sourceType === "essay");
console.log(`Essay chunks: ${essays.length}`);

for (const chunk of essays) {
  pairs.push({
    instruction: "Share your thoughts on this creative topic, in your own voice.",
    input: `Topic: ${chunk.source} — ${chunk.section}`,
    output: chunk.text.trim(),
  });
}

/* ─── Type 6: Critique/Anti-Pattern Pairs (from decision rejections) ─── */

const decisionsWithAlts = decisions.filter((d) => d.alternatives.length > 0);
console.log(`Decisions with rejections: ${decisionsWithAlts.length}`);

for (const d of decisionsWithAlts) {
  const rejected = d.alternatives[Math.floor(Math.random() * d.alternatives.length)];
  pairs.push({
    instruction: `Someone pitched "${rejected}" for the ${d.category.replace(/_/g, " ")} of "${d.episodeTitle}." What do you think?`,
    input: "",
    output: `No. That's not what this story needs. I went with: ${d.choice}. ${d.reasoning} The other approach would have cheapened it.`,
  });
}

/* ─── Write Output ─── */

// Shuffle for training diversity
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
console.log(`  Voice (narrations): ${narrations.length * 2}`);
console.log(`  Script voice: ${scripts.length}`);
console.log(`  Decision reasoning: ${decisions.length}`);
console.log(`  Interview/lecture: ${interviews.length}`);
console.log(`  Essays: ${essays.length}`);
console.log(`  Critique/rejection: ${decisionsWithAlts.length}`);
