/**
 * Fielder Corpus Generator
 *
 * Uses Gemini to generate detailed episode analyses, interview reconstructions,
 * technique breakdowns, and critical essays about Nathan Fielder's work.
 * Outputs chunks.json ready for embedding.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT = path.join(__dirname, "..", "src", "corpus", "chunks.json");

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
  console.error("GEMINI_API_KEY not found in .env.local or environment");
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
      generationConfig: { temperature: 0.4, maxOutputTokens: 8192 },
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini ${res.status}: ${err.slice(0, 300)}`);
  }
  const json = await res.json();
  return json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

// Complete episode lists for corpus generation
const NATHAN_FOR_YOU_EPISODES = [
  // Season 1
  { id: "nfy-s01e01", title: "Frozen Yogurt / Petting Zoo", year: 2013, show: "Nathan For You" },
  { id: "nfy-s01e02", title: "Clothing Store / Restaurant", year: 2013, show: "Nathan For You" },
  { id: "nfy-s01e03", title: "Gas Station / Caricature Artist", year: 2013, show: "Nathan For You" },
  { id: "nfy-s01e04", title: "Pizza Place / Haunted House", year: 2013, show: "Nathan For You" },
  { id: "nfy-s01e05", title: "Mechanic / Realtor", year: 2013, show: "Nathan For You" },
  { id: "nfy-s01e06", title: "Private Investigator / Taxi Company", year: 2013, show: "Nathan For You" },
  { id: "nfy-s01e07", title: "The Richards Tip", year: 2013, show: "Nathan For You" },
  { id: "nfy-s01e08", title: "Souvenir Shop / E-Cigarette Company", year: 2013, show: "Nathan For You" },
  // Season 2
  { id: "nfy-s02e01", title: "Yogurt Shop / Pizzeria", year: 2014, show: "Nathan For You" },
  { id: "nfy-s02e02", title: "Pet Store / Maid Service", year: 2014, show: "Nathan For You" },
  { id: "nfy-s02e03", title: "Dumb Starbucks", year: 2014, show: "Nathan For You" },
  { id: "nfy-s02e04", title: "Toy Company / Movie Theatre", year: 2014, show: "Nathan For You" },
  { id: "nfy-s02e05", title: "Liquor Store / Notary Public", year: 2014, show: "Nathan For You" },
  { id: "nfy-s02e06", title: "Mechanic / Taxi Company", year: 2014, show: "Nathan For You" },
  { id: "nfy-s02e07", title: "Antique Shop / Skull", year: 2014, show: "Nathan For You" },
  { id: "nfy-s02e08", title: "Funeral Home / Hotel", year: 2014, show: "Nathan For You" },
  // Season 3
  { id: "nfy-s03e01", title: "Electronics Store", year: 2015, show: "Nathan For You" },
  { id: "nfy-s03e02", title: "Smokers Allowed / The Movement", year: 2015, show: "Nathan For You" },
  { id: "nfy-s03e03", title: "Horseback Riding / Chili Shop", year: 2015, show: "Nathan For You" },
  { id: "nfy-s03e04", title: "The Anecdote", year: 2015, show: "Nathan For You" },
  { id: "nfy-s03e05", title: "Daddy's Watching / A Celebration", year: 2015, show: "Nathan For You" },
  { id: "nfy-s03e06", title: "The Hero", year: 2015, show: "Nathan For You" },
  { id: "nfy-s03e07", title: "Claw of Shame / The Hunk", year: 2015, show: "Nathan For You" },
  { id: "nfy-s03e08", title: "The Anecdote pt. 2", year: 2015, show: "Nathan For You" },
  // Season 4
  { id: "nfy-s04e01", title: "The Richards Tip Pt. 2", year: 2017, show: "Nathan For You" },
  { id: "nfy-s04e02", title: "Shipping Logistics Company / Massage Parlor", year: 2017, show: "Nathan For You" },
  { id: "nfy-s04e03", title: "The Haunted House Pt. 2 / Party Planner", year: 2017, show: "Nathan For You" },
  { id: "nfy-s04e04", title: "Computer Repair / Psychic", year: 2017, show: "Nathan For You" },
  { id: "nfy-s04e05", title: "Andy vs. Uber / The Stun Gun", year: 2017, show: "Nathan For You" },
  { id: "nfy-s04e06", title: "Sporting Goods Store / Antique Shop", year: 2017, show: "Nathan For You" },
  { id: "nfy-s04e07", title: "Finding Frances Pt. 1", year: 2017, show: "Nathan For You" },
  { id: "nfy-s04e08", title: "Finding Frances Pt. 2", year: 2017, show: "Nathan For You" },
  // The Rehearsal
  { id: "reh-s01e01", title: "Orange Juice, No Pulp", year: 2022, show: "The Rehearsal" },
  { id: "reh-s01e02", title: "Scion", year: 2022, show: "The Rehearsal" },
  { id: "reh-s01e03", title: "Gold Digger", year: 2022, show: "The Rehearsal" },
  { id: "reh-s01e04", title: "The Apostate", year: 2022, show: "The Rehearsal" },
  { id: "reh-s01e05", title: "Jury Duty", year: 2022, show: "The Rehearsal" },
  { id: "reh-s01e06", title: "Pretend Daddy", year: 2022, show: "The Rehearsal" },
  { id: "reh-s02e01", title: "The Rehearsal Season 2 Episode 1", year: 2025, show: "The Rehearsal" },
  { id: "reh-s02e02", title: "The Rehearsal Season 2 Episode 2", year: 2025, show: "The Rehearsal" },
  { id: "reh-s02e03", title: "The Rehearsal Season 2 Episode 3", year: 2025, show: "The Rehearsal" },
  { id: "reh-s02e04", title: "The Rehearsal Season 2 Episode 4", year: 2025, show: "The Rehearsal" },
  { id: "reh-s02e05", title: "The Rehearsal Season 2 Episode 5", year: 2025, show: "The Rehearsal" },
  { id: "reh-s02e06", title: "The Rehearsal Season 2 Episode 6", year: 2025, show: "The Rehearsal" },
  // The Curse
  { id: "curse-e01", title: "Land of Enchantment", year: 2023, show: "The Curse" },
  { id: "curse-e02", title: "Pressure's Looking Down", year: 2023, show: "The Curse" },
  { id: "curse-e03", title: "Questa Lane", year: 2023, show: "The Curse" },
  { id: "curse-e04", title: "Under the Big Tree", year: 2023, show: "The Curse" },
  { id: "curse-e05", title: "It's a Good Day", year: 2023, show: "The Curse" },
  { id: "curse-e06", title: "The Fire Burns On", year: 2024, show: "The Curse" },
  { id: "curse-e07", title: "Self-Exclusion", year: 2024, show: "The Curse" },
  { id: "curse-e08", title: "Down River", year: 2024, show: "The Curse" },
  { id: "curse-e09", title: "Young Hearts", year: 2024, show: "The Curse" },
  { id: "curse-e10", title: "Green Queen", year: 2024, show: "The Curse" },
];

const INTERVIEW_TOPICS = [
  "Nathan Fielder on the creative process behind Nathan For You - developing schemes, working with real businesses, the role of improvisation, and finding comedy in genuine human reactions",
  "Nathan Fielder on building The Rehearsal - the philosophy of rehearsing real life, constructing replica environments, the ethics of manipulation, and when simulation becomes real",
  "Nathan Fielder on The Curse with Benny Safdie - transitioning to scripted television, the Safdie brothers' influence, blurring reality in a fictional frame, community integration in Espanola",
  "Nathan Fielder on his comedy philosophy - the gap between presentation and reality, commitment to the bit, deadpan as authenticity, silence as comedy, why he never breaks character",
  "Nathan Fielder on the Finding Frances finale - Bill Heath's story, the line between documentary and exploitation, when comedy becomes tragedy, the most emotional moment in his career",
  "Nathan Fielder on directing technique - documentary observation, holding shots past comfort, environmental sound over score, the importance of reaction shots, casting the frame",
  "Nathan Fielder on his business degree and how it shapes his comedy - legal loopholes, bureaucratic systems, understanding incentives, why Dumb Starbucks actually worked legally",
  "Nathan Fielder on authenticity and performance - when does performing sincerity become sincere, the meta-layers in his work, his own social anxiety as creative material",
];

const TECHNIQUE_TOPICS = [
  "The Fielder Method: Escalation Architecture - How Nathan Fielder takes a simple premise and systematically extends it through logical escalation until it reaches absurdity while maintaining internal consistency",
  "The Fielder Method: Silence as Comedy - How extended pauses, dead air, awkward silences, and held reactions create humor through audience discomfort rather than punchlines",
  "The Fielder Method: The Commitment Principle - Why deeper commitment to absurd premises produces more genuine emotion, from hiring real lawyers to building entire houses",
  "The Fielder Method: Documentary as Fiction, Fiction as Documentary - How Fielder blurs the line between reality and construction across Nathan For You, The Rehearsal, and The Curse",
  "The Fielder Method: Real People as Comedy Partners - Why genuine reactions from non-actors produce comedy that scripted performances cannot, and the ethical considerations involved",
  "The Fielder Method: The Nested Meta-Structure - How each Fielder project adds layers of self-awareness until the audience cannot determine what is real, and why that uncertainty IS the art",
  "The Fielder Method: Camera as Patient Observer - Fielder's directorial approach of documentary patience, motivated lighting, held frames, and environmental sound as emotional tools",
  "The Fielder Method: Accidental Emotion - How elaborately constructed absurd situations produce genuine, unplanned emotional moments that become the actual point of the work",
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
  if (sourceType === "interview" || sourceType === "technique" || sourceType === "critical-essay") {
    return "setup";
  }
  const ratio = idx / total;
  if (ratio < 0.15) return "opening";
  if (ratio < 0.4) return "escalation";
  if (ratio < 0.65) return "peak-absurdity";
  if (ratio < 0.85) return "emotional-turn";
  return "closing";
}

async function generateEpisodeAnalysis(ep) {
  const prompt = `You are a television scholar specializing in Nathan Fielder's work. Write a detailed creative analysis of this episode written in FIRST PERSON as Nathan Fielder reflecting on his own work.

EPISODE: "${ep.title}" (${ep.year}) — ${ep.show}
ID: ${ep.id}

Write 600-900 words as Nathan Fielder, IN FIRST PERSON, reflecting on:
1. The premise/concept and why I chose this approach
2. The escalation structure — how the idea compounds
3. Key moments of genuine human reaction that couldn't be scripted
4. Silence beats and held moments that did the most work
5. The emotional core that the comedy was hiding
6. Specific directorial and editing choices
7. What I learned from making this that informed later work

Write as lived experience, not as analysis. "When the business owner looked at me..." not "Fielder employs a technique of..."

If you don't have specific information about this episode, reconstruct what Fielder's approach WOULD have been based on the show's known format, his documented methods, and the show/season context. Make it specific and detailed.`;

  return callGemini(prompt);
}

async function generateInterview(topic) {
  const prompt = `Write a detailed interview transcript reconstruction with Nathan Fielder on the following topic. Write it as a Q&A format where Nathan responds IN FIRST PERSON with his characteristic deadpan precision and specific detail.

TOPIC: ${topic}

Write 800-1200 words. Nathan's responses should:
- Use his actual speaking style: precise, measured, slightly awkward, deeply specific
- Reference actual shows, episodes, and moments from his career
- Include his characteristic pauses and qualifications ("I thought," "I figured," "I mean")
- Reveal genuine creative insights wrapped in his deadpan delivery
- Be grounded in his documented creative philosophy and methods

Make the interviewer's questions brief. Nathan's answers should be the substance.`;

  return callGemini(prompt);
}

async function generateTechnique(topic) {
  const prompt = `Write a detailed creative technique analysis written IN FIRST PERSON as Nathan Fielder explaining his own method.

TOPIC: ${topic}

Write 600-900 words as Nathan Fielder himself, explaining:
- How I developed this technique across my career
- Specific examples from Nathan For You, The Rehearsal, and The Curse
- What doesn't work and how I learned that the hard way
- Why this approach produces results that conventional comedy cannot
- The specific mechanics and how I think about deploying them

Write as Nathan speaking directly — deadpan, specific, honest about his process.`;

  return callGemini(prompt);
}

/* ─── Ingest Raw Scraped Transcripts ─────────────────── */

function ingestRawCorpus(allChunks, chunkIdRef) {
  const RAW_DIR = path.join(__dirname, "..", "corpus-raw");
  if (!fs.existsSync(RAW_DIR)) {
    console.log("No corpus-raw/ directory found. Run scrape-corpus.mjs first.\n");
    return;
  }

  const subdirs = { scripts: "episode-analysis", interviews: "interview" };

  for (const [subdir, sourceType] of Object.entries(subdirs)) {
    const dir = path.join(RAW_DIR, subdir);
    if (!fs.existsSync(dir)) continue;

    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".txt"));
    console.log(`Ingesting ${files.length} raw ${subdir} files...`);

    for (const filename of files) {
      const raw = filename.replace(".txt", "");
      const parts = raw.split("__");
      const title = (parts[1] || parts[0]).replace(/-/g, " ");
      const year = parts[2] ? parseInt(parts[2], 10) : undefined;
      const text = fs.readFileSync(path.join(dir, filename), "utf-8");

      if (text.length < 200) continue;

      const show = filename.startsWith("nfy-") ? "Nathan For You"
        : filename.startsWith("reh-") ? "The Rehearsal"
        : filename.startsWith("curse-") ? "The Curse"
        : "Interview";

      const textChunks = chunkText(text);
      for (let j = 0; j < textChunks.length; j++) {
        allChunks.push({
          id: `chunk-${String(chunkIdRef.id++).padStart(5, "0")}`,
          source: `${sourceType}/${raw}`,
          sourceType,
          section: inferPosition(j, textChunks.length, sourceType),
          text: textChunks[j],
          embedding: [],
          metadata: {
            episode: title,
            show,
            year: year && !isNaN(year) ? year : undefined,
            structuralPosition: inferPosition(j, textChunks.length, sourceType),
          },
        });
      }
      console.log(`  ${title}: ${textChunks.length} chunks`);
    }
  }
}

async function main() {
  console.log("=== Nathan Fielder Corpus Generator ===\n");

  const allChunks = [];
  const chunkIdRef = { id: 0 };

  // Phase 1: Ingest real scraped transcripts
  console.log("--- Phase 1: Real Transcripts (scraped) ---\n");
  ingestRawCorpus(allChunks, chunkIdRef);
  let chunkId = chunkIdRef.id;

  console.log(`\nAfter raw ingestion: ${allChunks.length} chunks\n`);

  // Phase 2: Generate supplementary Gemini analysis
  console.log("--- Phase 2: Gemini-Generated Analysis ---\n");

  // Generate episode analyses
  console.log(`Generating ${NATHAN_FOR_YOU_EPISODES.length} episode analyses...`);
  for (let i = 0; i < NATHAN_FOR_YOU_EPISODES.length; i++) {
    const ep = NATHAN_FOR_YOU_EPISODES[i];
    console.log(`  [${i + 1}/${NATHAN_FOR_YOU_EPISODES.length}] ${ep.show}: ${ep.title}`);

    try {
      const analysis = await generateEpisodeAnalysis(ep);
      const textChunks = chunkText(analysis);

      for (let j = 0; j < textChunks.length; j++) {
        allChunks.push({
          id: `chunk-${String(chunkId++).padStart(5, "0")}`,
          source: `episode-analysis/${ep.id}`,
          sourceType: "episode-analysis",
          section: inferPosition(j, textChunks.length, "episode-analysis"),
          text: textChunks[j],
          embedding: [],
          metadata: {
            episode: ep.title,
            show: ep.show,
            year: ep.year,
            structuralPosition: inferPosition(j, textChunks.length, "episode-analysis"),
          },
        });
      }

      // Rate limit
      if (i < NATHAN_FOR_YOU_EPISODES.length - 1) {
        await new Promise((r) => setTimeout(r, 800));
      }
    } catch (err) {
      console.error(`    Error: ${err.message}`);
    }
  }

  // Generate interview reconstructions
  console.log(`\nGenerating ${INTERVIEW_TOPICS.length} interview analyses...`);
  for (let i = 0; i < INTERVIEW_TOPICS.length; i++) {
    const topic = INTERVIEW_TOPICS[i];
    console.log(`  [${i + 1}/${INTERVIEW_TOPICS.length}] ${topic.slice(0, 80)}...`);

    try {
      const interview = await generateInterview(topic);
      const textChunks = chunkText(interview);

      for (let j = 0; j < textChunks.length; j++) {
        allChunks.push({
          id: `chunk-${String(chunkId++).padStart(5, "0")}`,
          source: `interview/${topic.slice(0, 60).replace(/\s+/g, "-").toLowerCase()}`,
          sourceType: "interview",
          section: inferPosition(j, textChunks.length, "interview"),
          text: textChunks[j],
          embedding: [],
          metadata: {
            episode: topic.slice(0, 80),
            show: "Interview",
            themes: ["creative-process"],
            structuralPosition: inferPosition(j, textChunks.length, "interview"),
          },
        });
      }

      await new Promise((r) => setTimeout(r, 800));
    } catch (err) {
      console.error(`    Error: ${err.message}`);
    }
  }

  // Generate technique breakdowns
  console.log(`\nGenerating ${TECHNIQUE_TOPICS.length} technique analyses...`);
  for (let i = 0; i < TECHNIQUE_TOPICS.length; i++) {
    const topic = TECHNIQUE_TOPICS[i];
    console.log(`  [${i + 1}/${TECHNIQUE_TOPICS.length}] ${topic.slice(0, 80)}...`);

    try {
      const technique = await generateTechnique(topic);
      const textChunks = chunkText(technique);

      for (let j = 0; j < textChunks.length; j++) {
        allChunks.push({
          id: `chunk-${String(chunkId++).padStart(5, "0")}`,
          source: `technique/${topic.slice(0, 60).replace(/\s+/g, "-").toLowerCase()}`,
          sourceType: "technique",
          section: inferPosition(j, textChunks.length, "technique"),
          text: textChunks[j],
          embedding: [],
          metadata: {
            episode: topic.slice(0, 80),
            show: "Technique Analysis",
            themes: ["method"],
            structuralPosition: inferPosition(j, textChunks.length, "technique"),
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
  console.log("Next: run embed-all.mjs to embed these chunks.");
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
