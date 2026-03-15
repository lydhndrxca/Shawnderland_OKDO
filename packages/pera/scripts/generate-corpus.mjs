/**
 * Joe Pera Corpus Generator
 *
 * 1. Ingests raw scraped transcripts from corpus-raw/scripts/
 * 2. Uses Gemini to generate detailed episode analyses for all 32 episodes plus specials
 * 3. Generates technique and interview chunks
 * Outputs chunks.json ready for embedding.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenerativeAI } from "@google/generative-ai";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, "..", "..", "..");
const OUTPUT = path.join(__dirname, "..", "src", "corpus", "chunks.json");

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
  console.error("GEMINI_API_KEY not found in .env.local (repo root) or environment");
  process.exit(1);
}

const MODEL = "gemini-2.0-flash";
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: MODEL });

async function callGemini(prompt) {
  const result = await model.generateContent({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.4, maxOutputTokens: 8192 },
  });
  const response = result.response;
  if (!response || !response.text) {
    throw new Error("Gemini returned empty response");
  }
  return response.text();
}

const STRUCTURAL_POSITIONS = [
  "opening-lesson",
  "tangent",
  "emotional-turn",
  "quiet-moment",
  "community-moment",
  "closing-reflection",
  "setup",
  "payoff",
  "observation",
];

// Joe Pera Talks with You — all directed by Marty Schousboe
const EPISODES = [
  // Season 1 (2018)
  { id: "jptwy-s01e01", title: "Joe Pera Shows You Iron", year: 2018, show: "Joe Pera Talks with You" },
  { id: "jptwy-s01e02", title: "Joe Pera Takes You to Breakfast", year: 2018, show: "Joe Pera Talks with You" },
  { id: "jptwy-s01e03", title: "Joe Pera Takes You on a Fall Drive", year: 2018, show: "Joe Pera Talks with You" },
  { id: "jptwy-s01e04", title: "Joe Pera Shows You How to Dance", year: 2018, show: "Joe Pera Talks with You" },
  { id: "jptwy-s01e05", title: "Joe Pera Talks You Back to Sleep", year: 2018, show: "Joe Pera Talks with You" },
  { id: "jptwy-s01e06", title: "Joe Pera Reads You the Church Announcements", year: 2018, show: "Joe Pera Talks with You" },
  { id: "jptwy-s01e07", title: "Joe Pera Lights Up the Night with You", year: 2018, show: "Joe Pera Talks with You" },
  { id: "jptwy-s01e08", title: "Joe Pera Talks to You About the Rat Wars of Alberta, Canada", year: 2018, show: "Joe Pera Talks with You" },
  { id: "jptwy-s01e09", title: "Joe Pera Answers Your Questions About Cold Weather Sports", year: 2018, show: "Joe Pera Talks with You" },
  // Season 2 (2019-2020)
  { id: "jptwy-s02e01", title: "Joe Pera Talks with You About Beans", year: 2019, show: "Joe Pera Talks with You" },
  { id: "jptwy-s02e02", title: "Joe Pera Takes You on a Hike", year: 2019, show: "Joe Pera Talks with You" },
  { id: "jptwy-s02e03", title: "Joe Pera Waits with You", year: 2019, show: "Joe Pera Talks with You" },
  { id: "jptwy-s02e04", title: "Joe Pera Guides You Through the Dark", year: 2019, show: "Joe Pera Talks with You" },
  { id: "jptwy-s02e05", title: "Joe Pera Takes You to the Grocery Store", year: 2019, show: "Joe Pera Talks with You" },
  { id: "jptwy-s02e06", title: "Joe Pera Goes to Dave Wojcek's Bachelor Party with You", year: 2019, show: "Joe Pera Talks with You" },
  { id: "jptwy-s02e07", title: "Joe Pera Gives You Piano Lessons", year: 2019, show: "Joe Pera Talks with You" },
  { id: "jptwy-s02e08", title: "Joe Pera Watches Internet Videos with You", year: 2019, show: "Joe Pera Talks with You" },
  { id: "jptwy-s02e09", title: "Joe Pera Has a Surprise for You", year: 2019, show: "Joe Pera Talks with You" },
  { id: "jptwy-s02e10", title: "Joe Pera Helps You Write an Obituary", year: 2019, show: "Joe Pera Talks with You" },
  { id: "jptwy-s02e11", title: "Joe Pera Shows You How to Do Good Fashion", year: 2020, show: "Joe Pera Talks with You" },
  { id: "jptwy-s02e12", title: "Joe Pera Shows You How to Pack a Lunch", year: 2020, show: "Joe Pera Talks with You" },
  { id: "jptwy-s02e13", title: "Joe Pera Talks with You on the First Day of School", year: 2020, show: "Joe Pera Talks with You" },
  // Special (2020)
  { id: "jptwy-special-2020", title: "Relaxing Old Footage with Joe Pera", year: 2020, show: "Joe Pera Talks with You" },
  // Season 3 (2021)
  { id: "jptwy-s03e01", title: "Joe Pera Sits with You", year: 2021, show: "Joe Pera Talks with You" },
  { id: "jptwy-s03e02", title: "Joe Pera Shows You How to Build a Fire", year: 2021, show: "Joe Pera Talks with You" },
  { id: "jptwy-s03e03", title: "Joe Pera Shows You His Second Fridge", year: 2021, show: "Joe Pera Talks with You" },
  { id: "jptwy-s03e04", title: "Joe Pera Listens to Your Drunk Story", year: 2021, show: "Joe Pera Talks with You" },
  { id: "jptwy-s03e05", title: "Joe Pera Discusses School-Appropriate Entertainment with You", year: 2021, show: "Joe Pera Talks with You" },
  { id: "jptwy-s03e06", title: "Joe Pera Takes You for a Flight", year: 2021, show: "Joe Pera Talks with You" },
  { id: "jptwy-s03e07", title: "Joe Pera Shows You How to Keep Functioning in Mid-Late Winter", year: 2021, show: "Joe Pera Talks with You" },
  { id: "jptwy-s03e08", title: "Joe Pera Talks with You About Legacy", year: 2021, show: "Joe Pera Talks with You" },
  { id: "jptwy-s03e09", title: "Joe Pera Builds a Chair with You", year: 2021, show: "Joe Pera Talks with You" },
  // Specials
  { id: "pera-special-2016-animated", title: "Joe Pera Talks You to Sleep", year: 2016, show: "Joe Pera Talks You to Sleep" },
  { id: "pera-special-2016-live", title: "Joe Pera Helps You Find the Perfect Christmas Tree", year: 2016, show: "Joe Pera Special" },
  { id: "pera-special-2024", title: "Joe Pera: Slow & Steady", year: 2024, show: "Joe Pera: Slow & Steady" },
];

const TECHNIQUE_TOPICS = [
  "Joe Pera's pacing and timing approach — how deliberate slowness creates comedy and emotional resonance, the use of silence, the rhythm of his delivery",
  "The 'homemade' production philosophy of Joe Pera Talks with You — low-fi aesthetics, real locations, authentic Upper Peninsula setting, how it serves the comedy",
  "Direct address technique — Joe speaking to the viewer as a trusted friend, breaking the fourth wall with warmth rather than irony",
  "How mundane topics become extraordinary in Pera's work — beans, iron, breakfast, fall drives as vehicles for genuine emotion and existential reflection",
  "Collaboration with Conner O'Malley, Jo Firestone, Ryan Dann — how the writing room and performers shape the show's unique tone",
  "The anti-cringe approach — Pera's work avoids cringe comedy; instead finding sincerity and tenderness in awkward moments",
  "Upper Peninsula as setting and character — Marquette, Michigan, the landscape, the community, how place informs every episode",
];

const INTERVIEW_TOPICS = [
  "Joe Pera on developing the character and the show's format — the evolution from stand-up to Adult Swim, finding the voice",
  "Joe Pera on the balance of comedy and sincerity — when to lean into emotion, when to undercut with a joke",
  "Joe Pera on working with Marty Schousboe and the production team — the homemade feel, shooting in the UP",
];

function chunkText(text, chunkSize = 400, overlap = 60) {
  const words = text.split(/\s+/);
  if (words.length <= chunkSize) return [words.join(" ")];
  const chunks = [];
  let start = 0;
  while (start < words.length) {
    const end = Math.min(start + chunkSize, words.length);
    chunks.push(words.slice(start, end).join(" "));
    if (end >= words.length) break;
    start += chunkSize - overlap;
  }
  return chunks;
}

function inferPosition(idx, total, sourceType) {
  if (sourceType === "interview" || sourceType === "technique") {
    return "setup";
  }
  const ratio = idx / total;
  if (ratio < 0.15) return "opening-lesson";
  if (ratio < 0.4) return "tangent";
  if (ratio < 0.65) return "emotional-turn";
  if (ratio < 0.85) return "quiet-moment";
  return "closing-reflection";
}

/* ─── Ingest Raw Scraped Transcripts ─────────────────── */

function ingestRawCorpus(allChunks, chunkIdRef) {
  const RAW_SCRIPTS_DIR = path.join(__dirname, "..", "corpus-raw", "scripts");
  if (!fs.existsSync(RAW_SCRIPTS_DIR)) {
    console.log("No corpus-raw/scripts/ directory found. Skipping raw ingestion.\n");
    return;
  }

  const files = fs.readdirSync(RAW_SCRIPTS_DIR).filter((f) => f.endsWith(".txt"));
  if (files.length === 0) {
    console.log("No .txt files in corpus-raw/scripts/. Skipping raw ingestion.\n");
    return;
  }

  console.log(`Ingesting ${files.length} raw transcript files from corpus-raw/scripts/...`);

  for (const filename of files) {
    const raw = filename.replace(".txt", "");
    const parts = raw.split("__");
    const title = (parts[1] || parts[0]).replace(/-/g, " ");
    const year = parts[2] ? parseInt(parts[2], 10) : undefined;
    const text = fs.readFileSync(path.join(RAW_SCRIPTS_DIR, filename), "utf-8");

    if (text.length < 200) continue;

    const show = raw.startsWith("jptwy-") ? "Joe Pera Talks with You" : "Joe Pera";

    const textChunks = chunkText(text);
    for (let j = 0; j < textChunks.length; j++) {
      const pos = inferPosition(j, textChunks.length, "episode-analysis");
      allChunks.push({
        id: `chunk-${String(chunkIdRef.id++).padStart(5, "0")}`,
        source: `episode-analysis/${raw}`,
        sourceType: "episode-analysis",
        section: pos,
        text: textChunks[j],
        embedding: [],
        metadata: {
          episode: title,
          show,
          year: year && !isNaN(year) ? year : undefined,
          themes: [],
          structuralPosition: pos,
        },
      });
    }
    console.log(`  ${title}: ${textChunks.length} chunks`);
  }
}

async function generateEpisodeChunks(ep, transcriptText) {
  const prompt = `You are a television scholar specializing in Joe Pera Talks with You. Generate 8-12 distinct corpus chunks for this episode.

EPISODE: "${ep.title}" (${ep.year}) — ${ep.show}
ID: ${ep.id}
${transcriptText ? `\nRAW TRANSCRIPT (use to inform your analysis):\n${transcriptText.slice(0, 4000)}\n` : ""}

For each chunk, produce a JSON array. Each object must have:
- "text": 80-200 words of analysis or reconstructed content (voiceover, dialogue, observation)
- "structuralPosition": one of: opening-lesson, tangent, emotional-turn, quiet-moment, community-moment, closing-reflection, setup, payoff, observation
- "themes": array of 1-3 theme strings (e.g. ["community", "mortality", "mundane-beauty"])

Cover these elements across your 8-12 chunks:
- Opening lesson/hook
- The tangent or emotional turn
- Community moments
- Quiet moments
- Closing reflection
- Joe's voiceover passages (reconstructed or analyzed)
- Key dialogue moments

Write as creative analysis and reconstruction — first-person reflection where appropriate, or third-person scholarly analysis. Be specific to this episode.

Return ONLY valid JSON. No markdown, no explanation. Example format:
[{"text":"...","structuralPosition":"opening-lesson","themes":["..."]},{"text":"...","structuralPosition":"tangent","themes":["..."]}]`;

  const raw = await callGemini(prompt);
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    throw new Error(`Invalid JSON from Gemini: ${cleaned.slice(0, 200)}...`);
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("Gemini returned empty or non-array");
  }
  return parsed;
}

async function generateTechnique(topic) {
  const prompt = `Write a detailed creative technique analysis about Joe Pera's work, written as scholarly analysis or first-person reflection.

TOPIC: ${topic}

Write 600-900 words covering:
- How this technique manifests across Joe Pera Talks with You
- Specific examples from episodes
- Why this approach produces the show's unique tone
- The mechanics and creative philosophy behind it

Be specific and grounded in the actual show.`;

  return callGemini(prompt);
}

async function generateInterview(topic) {
  const prompt = `Write a detailed interview transcript reconstruction with Joe Pera on the following topic. Write it as Q&A format where Joe responds IN FIRST PERSON with his characteristic gentle, measured, sincere delivery.

TOPIC: ${topic}

Write 800-1200 words. Joe's responses should:
- Use his actual speaking style: gentle, specific, earnest, slightly formal
- Reference actual episodes and moments from his career
- Reveal genuine creative insights
- Be grounded in his documented approach and the show's philosophy

Make the interviewer's questions brief. Joe's answers should be the substance.`;

  return callGemini(prompt);
}

const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 2000;

async function main() {
  console.log("=== Joe Pera Corpus Generator ===\n");

  const allChunks = [];
  const chunkIdRef = { id: 0 };

  // Phase 1: Ingest raw scraped transcripts
  console.log("--- Phase 1: Raw Transcripts (corpus-raw/scripts/) ---\n");
  ingestRawCorpus(allChunks, chunkIdRef);
  let chunkId = chunkIdRef.id;

  console.log(`\nAfter raw ingestion: ${allChunks.length} chunks\n`);

  // Phase 2: Load raw transcripts for episode context (if available)
  const RAW_SCRIPTS_DIR = path.join(__dirname, "..", "corpus-raw", "scripts");
  const rawTranscripts = {};
  if (fs.existsSync(RAW_SCRIPTS_DIR)) {
    const files = fs.readdirSync(RAW_SCRIPTS_DIR).filter((f) => f.endsWith(".txt"));
    for (const f of files) {
      const raw = f.replace(".txt", "");
      const key = raw.split("__")[0] || raw;
      rawTranscripts[key] = fs.readFileSync(path.join(RAW_SCRIPTS_DIR, f), "utf-8");
    }
  }

  // Phase 3: Generate episode analyses (batch of 5)
  console.log("--- Phase 2: Gemini-Generated Episode Analyses ---\n");
  console.log(`Generating analyses for ${EPISODES.length} episodes (batches of ${BATCH_SIZE})...`);

  for (let i = 0; i < EPISODES.length; i += BATCH_SIZE) {
    const batch = EPISODES.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(EPISODES.length / BATCH_SIZE);
    console.log(`\n  Batch ${batchNum}/${totalBatches}: ${batch.map((e) => e.title.slice(0, 30)).join(", ")}...`);

    const results = await Promise.all(
      batch.map(async (ep) => {
        const transcriptText = rawTranscripts[ep.id] || null;
        try {
          const chunks = await generateEpisodeChunks(ep, transcriptText);
          return { ep, chunks };
        } catch (err) {
          console.error(`    Error [${ep.title}]: ${err.message}`);
          return { ep, chunks: [] };
        }
      })
    );

    for (const { ep, chunks } of results) {
      for (const c of chunks) {
        const pos = STRUCTURAL_POSITIONS.includes(c.structuralPosition) ? c.structuralPosition : "observation";
        allChunks.push({
          id: `chunk-${String(chunkId++).padStart(5, "0")}`,
          source: `episode-analysis/${ep.id}`,
          sourceType: "episode-analysis",
          section: pos,
          text: c.text,
          embedding: [],
          metadata: {
            episode: ep.title,
            show: ep.show,
            year: ep.year,
            themes: Array.isArray(c.themes) ? c.themes : [],
            structuralPosition: pos,
          },
        });
      }
      console.log(`    ${ep.title}: ${chunks.length} chunks`);
    }

    if (i + BATCH_SIZE < EPISODES.length) {
      await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
    }
  }

  // Phase 4: Technique analyses
  console.log(`\n--- Phase 3: Technique Analyses ---\n`);
  for (let i = 0; i < TECHNIQUE_TOPICS.length; i++) {
    const topic = TECHNIQUE_TOPICS[i];
    console.log(`  [${i + 1}/${TECHNIQUE_TOPICS.length}] ${topic.slice(0, 70)}...`);

    try {
      const text = await generateTechnique(topic);
      const textChunks = chunkText(text);

      for (let j = 0; j < textChunks.length; j++) {
        allChunks.push({
          id: `chunk-${String(chunkId++).padStart(5, "0")}`,
          source: `technique/${topic.slice(0, 50).replace(/\s+/g, "-").toLowerCase()}`,
          sourceType: "technique",
          section: "setup",
          text: textChunks[j],
          embedding: [],
          metadata: {
            episode: topic.slice(0, 80),
            show: "Technique Analysis",
            themes: ["method"],
            structuralPosition: "setup",
          },
        });
      }

      await new Promise((r) => setTimeout(r, 800));
    } catch (err) {
      console.error(`    Error: ${err.message}`);
    }
  }

  // Phase 5: Interview reconstructions
  console.log(`\n--- Phase 4: Interview Reconstructions ---\n`);
  for (let i = 0; i < INTERVIEW_TOPICS.length; i++) {
    const topic = INTERVIEW_TOPICS[i];
    console.log(`  [${i + 1}/${INTERVIEW_TOPICS.length}] ${topic.slice(0, 70)}...`);

    try {
      const text = await generateInterview(topic);
      const textChunks = chunkText(text);

      for (let j = 0; j < textChunks.length; j++) {
        allChunks.push({
          id: `chunk-${String(chunkId++).padStart(5, "0")}`,
          source: `interview/${topic.slice(0, 50).replace(/\s+/g, "-").toLowerCase()}`,
          sourceType: "interview",
          section: "setup",
          text: textChunks[j],
          embedding: [],
          metadata: {
            episode: topic.slice(0, 80),
            show: "Interview",
            themes: ["creative-process"],
            structuralPosition: "setup",
          },
        });
      }

      await new Promise((r) => setTimeout(r, 800));
    } catch (err) {
      console.error(`    Error: ${err.message}`);
    }
  }

  console.log(`\nTotal chunks generated: ${allChunks.length}`);

  const outDir = path.dirname(OUTPUT);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(OUTPUT, JSON.stringify(allChunks, null, 2));
  console.log(`Wrote ${allChunks.length} chunks to ${OUTPUT}`);
  console.log("Next: run embed-all.mjs (or equivalent) to embed these chunks.");
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
