/**
 * Fielder Decision Taxonomy Generator
 *
 * Uses Gemini to analyze each episode and catalog Nathan Fielder's creative
 * decisions across all 16 Fielder-specific categories.
 * Outputs decisions.json ready for embedding.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT = path.join(__dirname, "..", "src", "taxonomy", "decisions.json");

function loadApiKey() {
  const envPath = path.join(process.cwd(), ".env.local");
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
  console.error("GEMINI_API_KEY not found");
  process.exit(1);
}

const MODEL = "gemini-2.0-flash";

async function callGemini(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 8192 },
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini ${res.status}: ${err.slice(0, 300)}`);
  }
  const json = await res.json();
  return json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

const EPISODES = [
  // Nathan For You - key episodes
  { id: "nfy-s01e01", title: "Frozen Yogurt / Petting Zoo", year: 2013, show: "Nathan For You" },
  { id: "nfy-s01e03", title: "Gas Station / Caricature Artist", year: 2013, show: "Nathan For You" },
  { id: "nfy-s01e04", title: "Pizza Place / Haunted House", year: 2013, show: "Nathan For You" },
  { id: "nfy-s02e02", title: "Pet Store / Maid Service", year: 2014, show: "Nathan For You" },
  { id: "nfy-s02e03", title: "Dumb Starbucks", year: 2014, show: "Nathan For You" },
  { id: "nfy-s02e08", title: "Funeral Home / Hotel", year: 2014, show: "Nathan For You" },
  { id: "nfy-s03e02", title: "Smokers Allowed / The Movement", year: 2015, show: "Nathan For You" },
  { id: "nfy-s03e04", title: "The Anecdote", year: 2015, show: "Nathan For You" },
  { id: "nfy-s03e06", title: "The Hero", year: 2015, show: "Nathan For You" },
  { id: "nfy-s03e07", title: "Claw of Shame / The Hunk", year: 2015, show: "Nathan For You" },
  { id: "nfy-s04e01", title: "The Richards Tip Pt. 2", year: 2017, show: "Nathan For You" },
  { id: "nfy-s04e03", title: "The Haunted House Pt. 2 / Party Planner", year: 2017, show: "Nathan For You" },
  { id: "nfy-s04e05", title: "Andy vs. Uber / The Stun Gun", year: 2017, show: "Nathan For You" },
  { id: "nfy-s04e07", title: "Finding Frances Pt. 1", year: 2017, show: "Nathan For You" },
  { id: "nfy-s04e08", title: "Finding Frances Pt. 2", year: 2017, show: "Nathan For You" },
  // The Rehearsal
  { id: "reh-s01e01", title: "Orange Juice, No Pulp", year: 2022, show: "The Rehearsal" },
  { id: "reh-s01e02", title: "Scion", year: 2022, show: "The Rehearsal" },
  { id: "reh-s01e04", title: "The Apostate", year: 2022, show: "The Rehearsal" },
  { id: "reh-s01e06", title: "Pretend Daddy", year: 2022, show: "The Rehearsal" },
  // The Curse
  { id: "curse-e01", title: "Land of Enchantment", year: 2023, show: "The Curse" },
  { id: "curse-e05", title: "It's a Good Day", year: 2023, show: "The Curse" },
  { id: "curse-e10", title: "Green Queen", year: 2024, show: "The Curse" },
];

const CATEGORIES = [
  "scheme_type", "structural_pattern", "cringe_mechanism", "subject_archetype",
  "authenticity_test", "opening_strategy", "closing_strategy", "silence_use",
  "escalation_method", "camera_philosophy", "editing_approach", "performance_direction",
  "thematic_core", "tone_blend", "meta_layer", "emotional_payload",
];

const CATEGORY_DESCRIPTIONS = {
  scheme_type: "What kind of elaborate concept (business advice, social experiment, rehearsal, reality manipulation, scripted-as-documentary)",
  structural_pattern: "How the episode is built (escalation, nested layers, long con, reveal, parallel threads)",
  cringe_mechanism: "How discomfort is weaponized (committed silence, social pressure, logical trap, oversharing, earnest absurdity)",
  subject_archetype: "Who the central figure/mark is (small business owner, Nathan himself, volunteer, unsuspecting public, hired actor)",
  authenticity_test: "What's real vs constructed (genuine emotion in fake context, real stakes in absurd frame, documentary in fiction)",
  opening_strategy: "How the episode opens (deadpan premise pitch, voiceover setup, cold open on location, Nathan explaining the plan)",
  closing_strategy: "How the episode ends (lingering silence, accidental emotion, absurd escalation peak, meta-reveal, unresolved)",
  silence_use: "How dead air and pauses function (comic timing, power dynamics, genuine discomfort, contemplative space)",
  escalation_method: "How the premise compounds (logical extension, adding stakeholders, raising stakes, commitment deepening, scope creep)",
  camera_philosophy: "Visual approach (documentary handheld, surveillance static, observation patience, intimate close-up, neutral wide)",
  editing_approach: "How cuts function (smash cuts, lingering holds, reaction shots, match cuts, montage, jump cuts to compress time)",
  performance_direction: "How acting is deployed (Nathan's deadpan, real people reacting, rehearsed naturalism, meta-performance layers)",
  thematic_core: "Primary theme (loneliness, control, authenticity, human connection, social anxiety, the gap between intent and outcome)",
  tone_blend: "Tonal recipe (cringe-tender, absurd-melancholy, comic-profound, awkward-beautiful, deadpan-devastating)",
  meta_layer: "Level of self-awareness (straightforward scheme, show-within-show, reality questioning, fourth wall erosion, audience implication)",
  emotional_payload: "The hidden feeling (loneliness masked as comedy, genuine connection in artificial setup, the beauty of trying, the pain of wanting control)",
};

async function analyzeEpisode(ep) {
  const catList = CATEGORIES.map(
    (c) => `- ${c}: ${CATEGORY_DESCRIPTIONS[c]}`
  ).join("\n");

  const prompt = `You are a television scholar specializing in Nathan Fielder's creative work. Analyze this episode and catalog his creative decisions across all 16 categories.

EPISODE: "${ep.title}" (${ep.year}) — ${ep.show}
ID: ${ep.id}

DECISION CATEGORIES:
${catList}

For EACH category, provide:
1. "choice" — What Fielder actually chose (be specific to THIS episode, not generic)
2. "alternatives" — 2-3 things he could have chosen but didn't
3. "reasoning" — WHY this choice serves the episode's hidden emotional/comedic thesis (1-2 sentences)

Write reasoning in FIRST PERSON as Nathan Fielder: "I chose this because..." not "Fielder chose this because..."

Respond ONLY with valid JSON:
{
  "synopsis": "2-3 sentence synopsis of the episode",
  "decisions": [
    {
      "category": "scheme_type",
      "choice": "specific choice description",
      "alternatives": ["alternative 1", "alternative 2"],
      "reasoning": "first-person reasoning"
    }
  ]
}

Include exactly 16 decision objects, one per category, in the order listed above.`;

  return callGemini(prompt);
}

async function main() {
  console.log("=== Nathan Fielder Decision Taxonomy Generator ===\n");

  const allDecisions = [];

  for (let i = 0; i < EPISODES.length; i++) {
    const ep = EPISODES[i];
    console.log(`[${i + 1}/${EPISODES.length}] ${ep.show}: ${ep.title}`);

    try {
      const raw = await analyzeEpisode(ep);
      let cleaned = raw.trim();
      if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }

      const parsed = JSON.parse(cleaned);

      for (const d of (parsed.decisions || [])) {
        allDecisions.push({
          id: `${ep.id}-${d.category}`,
          episodeId: ep.id,
          episodeTitle: `${ep.show}: ${ep.title}`,
          category: d.category,
          choice: d.choice || "",
          alternatives: d.alternatives || [],
          reasoning: d.reasoning || "",
          embedding: [],
        });
      }

      console.log(`  Cataloged ${parsed.decisions?.length || 0} decisions`);
    } catch (err) {
      console.error(`  Error: ${err.message}`);
    }

    if (i < EPISODES.length - 1) {
      await new Promise((r) => setTimeout(r, 1000));
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
