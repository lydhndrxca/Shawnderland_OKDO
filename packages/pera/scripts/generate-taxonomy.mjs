/**
 * Joe Pera Decision Taxonomy Generator
 *
 * Uses Gemini to analyze each episode and catalog Joe Pera's creative
 * decisions across all 16 Pera-specific categories.
 * Outputs decisions.json ready for embedding.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenerativeAI } from "@google/generative-ai";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");
const OUTPUT = path.join(__dirname, "..", "src", "taxonomy", "decisions.json");

function loadApiKey() {
  const envPath = path.join(REPO_ROOT, ".env.local");
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf-8").replace(/^\uFEFF/, "");
    for (const line of content.split(/\r?\n/)) {
      const match = line.match(/^GEMINI_API_KEY\s*=\s*(.+)/);
      if (match) return match[1].trim();
    }
  }
  return process.env.GEMINI_API_KEY;
}

const API_KEY = loadApiKey();
if (!API_KEY) {
  console.error("GEMINI_API_KEY not found in .env.local or environment");
  process.exit(1);
}

const MODEL = "gemini-2.0-flash";
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({
  model: MODEL,
  generationConfig: { temperature: 0.3, maxOutputTokens: 8192 },
});

async function callGemini(prompt) {
  const result = await model.generateContent(prompt);
  const response = result.response;
  return response?.text() ?? "";
}

const EPISODES = [
  // Season 1 (2018)
  { id: "s1e1", title: "Joe Pera Shows You Iron", year: 2018, show: "Joe Pera Talks with You" },
  { id: "s1e2", title: "Joe Pera Takes You to Breakfast", year: 2018, show: "Joe Pera Talks with You" },
  { id: "s1e3", title: "Joe Pera Takes You on a Fall Drive", year: 2018, show: "Joe Pera Talks with You" },
  { id: "s1e4", title: "Joe Pera Shows You How to Dance", year: 2018, show: "Joe Pera Talks with You" },
  { id: "s1e5", title: "Joe Pera Talks You Back to Sleep", year: 2018, show: "Joe Pera Talks with You" },
  { id: "s1e6", title: "Joe Pera Reads You the Church Announcements", year: 2018, show: "Joe Pera Talks with You" },
  { id: "s1e7", title: "Joe Pera Lights Up the Night with You", year: 2018, show: "Joe Pera Talks with You" },
  { id: "s1e8", title: "Joe Pera Talks to You About the Rat Wars of Alberta, Canada (1950–Present Day)", year: 2018, show: "Joe Pera Talks with You" },
  { id: "s1e9", title: "Joe Pera Answers Your Questions About Cold Weather Sports", year: 2018, show: "Joe Pera Talks with You" },
  // Season 2 (2019–20)
  { id: "s2e1", title: "Joe Pera Talks with You About Beans", year: 2019, show: "Joe Pera Talks with You" },
  { id: "s2e2", title: "Joe Pera Takes You on a Hike", year: 2019, show: "Joe Pera Talks with You" },
  { id: "s2e3", title: "Joe Pera Waits with You", year: 2019, show: "Joe Pera Talks with You" },
  { id: "s2e4", title: "Joe Pera Guides You Through the Dark", year: 2019, show: "Joe Pera Talks with You" },
  { id: "s2e5", title: "Joe Pera Takes You to the Grocery Store", year: 2020, show: "Joe Pera Talks with You" },
  { id: "s2e6", title: "Joe Pera Goes to Dave Wojcek's Bachelor Party with You", year: 2020, show: "Joe Pera Talks with You" },
  { id: "s2e7", title: "Joe Pera Gives You Piano Lessons", year: 2020, show: "Joe Pera Talks with You" },
  { id: "s2e8", title: "Joe Pera Watches Internet Videos with You", year: 2020, show: "Joe Pera Talks with You" },
  { id: "s2e9", title: "Joe Pera Has a Surprise for You", year: 2020, show: "Joe Pera Talks with You" },
  { id: "s2e10", title: "Joe Pera Helps You Write an Obituary", year: 2020, show: "Joe Pera Talks with You" },
  { id: "s2e11", title: "Joe Pera Shows You How to Do Good Fashion", year: 2020, show: "Joe Pera Talks with You" },
  { id: "s2e12", title: "Joe Pera Shows You How to Pack a Lunch", year: 2020, show: "Joe Pera Talks with You" },
  { id: "s2e13", title: "Joe Pera Talks with You on the First Day of School", year: 2020, show: "Joe Pera Talks with You" },
  // Special (2020)
  { id: "special1", title: "Relaxing Old Footage with Joe Pera", year: 2020, show: "Joe Pera Talks with You (Special)" },
  // Season 3 (2021)
  { id: "s3e1", title: "Joe Pera Sits with You", year: 2021, show: "Joe Pera Talks with You" },
  { id: "s3e2", title: "Joe Pera Shows You How to Build a Fire", year: 2021, show: "Joe Pera Talks with You" },
  { id: "s3e3", title: "Joe Pera Shows You His Second Fridge", year: 2021, show: "Joe Pera Talks with You" },
  { id: "s3e4", title: "Joe Pera Listens to Your Drunk Story", year: 2021, show: "Joe Pera Talks with You" },
  { id: "s3e5", title: "Joe Pera Discusses School-Appropriate Entertainment with You", year: 2021, show: "Joe Pera Talks with You" },
  { id: "s3e6", title: "Joe Pera Takes You for a Flight", year: 2021, show: "Joe Pera Talks with You" },
  { id: "s3e7", title: "Joe Pera Shows You How to Keep Functioning in Mid-Late Winter", year: 2021, show: "Joe Pera Talks with You" },
  { id: "s3e8", title: "Joe Pera Talks with You About Legacy", year: 2021, show: "Joe Pera Talks with You" },
  { id: "s3e9", title: "Joe Pera Builds a Chair with You", year: 2021, show: "Joe Pera Talks with You" },
  // Additional specials (pre-series)
  { id: "special2", title: "Joe Pera Talks You to Sleep", year: 2016, show: "Joe Pera (Special)" },
  { id: "special3", title: "Joe Pera Helps You Find the Perfect Christmas Tree", year: 2016, show: "Joe Pera (Special)" },
];

const CATEGORIES = [
  "lesson_topic",
  "structural_pattern",
  "warmth_mechanism",
  "subject_archetype",
  "sincerity_level",
  "opening_strategy",
  "closing_strategy",
  "silence_use",
  "pacing_shape",
  "camera_philosophy",
  "music_role",
  "voiceover_approach",
  "thematic_core",
  "tone_blend",
  "community_element",
  "seasonal_connection",
];

const CATEGORY_DESCRIPTIONS = {
  lesson_topic: "What mundane topic anchors the episode (iron, beans, breakfast, chairs, grocery stores)",
  structural_pattern: "How the episode is built (lesson-with-tangent, slow-build, parallel-stories, direct-address, seasonal-arc)",
  warmth_mechanism: "How comfort is generated (routine celebration, community ritual, shared meal, quiet companionship, nature observation)",
  subject_archetype: "Who the central figure is (Joe himself, Gene, Sarah, the Melskys, the community, a concept)",
  sincerity_level: "How directly emotional the episode gets",
  opening_strategy: "How the episode opens",
  closing_strategy: "How the episode ends",
  silence_use: "How quiet moments function (meditative pause, letting a moment breathe, contemplative space)",
  pacing_shape: "Tempo arc of the episode",
  camera_philosophy: "Visual approach (patient wide shots, close-ups on objects, landscape establishing, handheld intimate)",
  music_role: "How Ryan Dann's score functions",
  voiceover_approach: "How Joe's narration works",
  thematic_core: "What the episode is actually about underneath",
  tone_blend: "The emotional recipe",
  community_element: "How the Upper Peninsula community factors in",
  seasonal_connection: "How time of year/nature connects to the episode's theme",
};

async function analyzeEpisode(ep) {
  const catList = CATEGORIES.map(
    (c) => `- ${c}: ${CATEGORY_DESCRIPTIONS[c]}`
  ).join("\n");

  const prompt = `You are a television scholar specializing in Joe Pera's creative work. Analyze this episode and catalog his creative decisions across all 16 categories.

EPISODE: "${ep.title}" (${ep.year}) — ${ep.show}
ID: ${ep.id}

DECISION CATEGORIES:
${catList}

For EACH category, provide:
1. "choice" — What Pera actually chose (be specific to THIS episode, not generic)
2. "alternatives" — 2-3 things he could have chosen but didn't
3. "reasoning" — WHY this choice serves the episode's warmth, sincerity, and emotional thesis (1-2 sentences)

Write reasoning in FIRST PERSON as Joe Pera: "I chose this because..." not "Pera chose this because..."

Respond ONLY with valid JSON:
{
  "synopsis": "2-3 sentence synopsis of the episode",
  "decisions": [
    {
      "category": "lesson_topic",
      "choice": "specific choice description",
      "alternatives": ["alternative 1", "alternative 2"],
      "reasoning": "first-person reasoning"
    }
  ]
}

Include exactly 16 decision objects, one per category, in the order listed above.`;

  return callGemini(prompt);
}

const BATCH_SIZE = 3;
const BATCH_DELAY_MS = 2000;

async function main() {
  console.log("=== Joe Pera Decision Taxonomy Generator ===\n");

  const allDecisions = [];

  for (let i = 0; i < EPISODES.length; i += BATCH_SIZE) {
    const batch = EPISODES.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(EPISODES.length / BATCH_SIZE);

    console.log(`\n--- Batch ${batchNum}/${totalBatches} ---`);

    const results = await Promise.all(
      batch.map(async (ep) => {
        console.log(`[${ep.id}] ${ep.title}`);
        try {
          const raw = await analyzeEpisode(ep);
          return { ep, raw };
        } catch (err) {
          console.error(`  Error: ${err.message}`);
          return { ep, raw: null };
        }
      })
    );

    for (const { ep, raw } of results) {
      if (!raw) continue;

      try {
        let cleaned = raw.trim();
        if (cleaned.startsWith("```")) {
          cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
        }

        const parsed = JSON.parse(cleaned);

        for (const d of parsed.decisions || []) {
          allDecisions.push({
            id: `pera-${ep.id}-${d.category}`,
            episodeId: ep.id,
            episodeTitle: ep.title,
            category: d.category,
            choice: d.choice || "",
            alternatives: d.alternatives || [],
            reasoning: d.reasoning || "",
            embedding: [],
          });
        }

        console.log(`  ${ep.id}: Cataloged ${parsed.decisions?.length || 0} decisions`);
      } catch (err) {
        console.error(`  ${ep.id} parse error: ${err.message}`);
      }
    }

    if (i + BATCH_SIZE < EPISODES.length) {
      console.log(`  Waiting ${BATCH_DELAY_MS}ms before next batch...`);
      await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
    }
  }

  console.log(`\nTotal decisions: ${allDecisions.length}`);

  const outDir = path.dirname(OUTPUT);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(OUTPUT, JSON.stringify(allDecisions, null, 2));
  console.log(`Wrote ${allDecisions.length} decisions to ${OUTPUT}`);
  console.log("Next: run embed-all.mjs to embed these decisions.");
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
