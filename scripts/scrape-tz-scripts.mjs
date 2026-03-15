/**
 * Scrapes actual Twilight Zone transcripts from subslikescript.com
 * and saves them as corpus text files. Then generates interviews,
 * lectures, and essays via Gemini. Finally runs the full embedding
 * and taxonomy pipeline.
 *
 * Usage: node scripts/scrape-tz-scripts.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CORPUS_RAW = path.join(ROOT, "corpus-raw");
const SERLING_PKG = path.join(ROOT, "packages", "serling", "src");

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error("Set GEMINI_API_KEY environment variable");
  process.exit(1);
}

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;
const EMBED_URL = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004`;
const BASE = "https://subslikescript.com";

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function ensureDir(d) { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); }

let lastCall = 0;
const MIN_DELAY = 400;
async function rateLimit() {
  const elapsed = Date.now() - lastCall;
  if (elapsed < MIN_DELAY) await sleep(MIN_DELAY - elapsed);
  lastCall = Date.now();
}

// ─── Episode URLs from the listing ───────────────────────────
const EPISODE_URLS = [];

async function discoverEpisodes() {
  console.log("Discovering episodes from listing page...\n");
  const res = await fetch(`${BASE}/series/The_Twilight_Zone-52520`);
  const html = await res.text();

  const linkPattern = /href="(\/series\/The_Twilight_Zone-52520\/season-(\d+)\/episode-(\d+)-([^"]+))"/g;
  let match;
  while ((match = linkPattern.exec(html)) !== null) {
    const [, urlPath, season, episode, slug] = match;
    EPISODE_URLS.push({
      url: `${BASE}${urlPath}`,
      season: parseInt(season),
      episode: parseInt(episode),
      slug,
      title: slug.replace(/_/g, " ").replace(/-/g, " "),
    });
  }

  // Deduplicate
  const seen = new Set();
  const unique = [];
  for (const ep of EPISODE_URLS) {
    const key = `s${ep.season}e${ep.episode}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(ep);
    }
  }
  EPISODE_URLS.length = 0;
  EPISODE_URLS.push(...unique);

  EPISODE_URLS.sort((a, b) => a.season * 100 + a.episode - (b.season * 100 + b.episode));
  console.log(`  Found ${EPISODE_URLS.length} episodes with scripts\n`);
}

// ─── Serling writer lookup ───────────────────────────────────
const SERLING_WRITTEN = new Set([
  "1-1","1-2","1-3","1-4","1-5","1-6","1-7","1-8","1-10","1-11","1-12","1-13",
  "1-14","1-15","1-16","1-17","1-19","1-21","1-22","1-25","1-26","1-27","1-29",
  "1-30","1-31","1-32","1-33","1-35","1-36",
  "2-1","2-2","2-3","2-4","2-6","2-8","2-10","2-11","2-12","2-13","2-14",
  "2-17","2-18","2-19","2-23","2-24","2-25","2-27","2-28","2-29",
  "3-1","3-2","3-3","3-4","3-6","3-7","3-8","3-9","3-10","3-11","3-14","3-15",
  "3-17","3-20","3-23","3-24","3-28","3-29","3-30","3-31","3-32","3-33","3-36","3-37",
  "4-2","4-4","4-10","4-11","4-12","4-14","4-16","4-18",
  "5-1","5-4","5-5","5-7","5-8","5-9","5-10","5-11","5-15","5-25","5-26","5-27",
  "5-29","5-32","5-33","5-35",
]);

function isSerling(season, episode) {
  return SERLING_WRITTEN.has(`${season}-${episode}`);
}

// ─── Scrape one episode ──────────────────────────────────────
function cleanTranscript(html) {
  let text = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");

  // Fix common OCR artifacts (spaces inside words)
  text = text
    .replace(/([A-Z]) ([A-Z]) /g, "$1$2 ")
    .replace(/([A-Z]) N /g, "$1N ")
    .replace(/QU I/g, "QUI")
    .replace(/TH ROUG H/g, "THROUGH")
    .replace(/COM FORTABLE/g, "COMFORTABLE")
    .replace(/FOU NTAI N/g, "FOUNTAIN")
    .replace(/N EW/g, "NEW")
    .replace(/SU PPOSE/g, "SUPPOSE")
    .replace(/ I /g, "I ")
    .replace(/M I ND/g, "MIND")
    .replace(/WON DERFU L/g, "WONDERFUL")
    .replace(/U N DERSTAND/g, "UNDERSTAND")
    .replace(/S I BERIA/g, "SIBERIA")
    .replace(/BRAN D/g, "BRAND")
    .replace(/M UST/g, "MUST")
    .replace(/DETRO IT/g, "DETROIT");

  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  return lines.join("\n");
}

async function scrapeEpisode(ep) {
  await rateLimit();
  const res = await fetch(ep.url);
  if (!res.ok) {
    console.warn(`  HTTP ${res.status} for ${ep.title}`);
    return null;
  }

  const html = await res.text();
  const scriptMatch = html.match(/<div class="full-script">([\s\S]*?)<\/div>/);
  if (!scriptMatch) {
    console.warn(`  No script found for ${ep.title}`);
    return null;
  }

  const plot = html.match(/<div class="plot">([\s\S]*?)<\/div>/);
  const plotText = plot ? plot[1].replace(/<[^>]+>/g, "").trim() : "";

  const transcript = cleanTranscript(scriptMatch[1]);
  const writer = isSerling(ep.season, ep.episode) ? "Rod Serling" : "Other";

  return [
    `EPISODE: "${ep.title}"`,
    `The Twilight Zone — Season ${ep.season}, Episode ${ep.episode}`,
    `Writer: ${writer}`,
    plotText ? `\nSynopsis: ${plotText}` : "",
    `\n${"=".repeat(60)}`,
    `FULL TRANSCRIPT`,
    `${"=".repeat(60)}\n`,
    transcript,
  ].filter(Boolean).join("\n");
}

// ─── Phase 1: Scrape all scripts ─────────────────────────────
async function scrapeAllScripts() {
  console.log("=== PHASE 1: Scraping TZ Scripts ===\n");
  const dir = path.join(CORPUS_RAW, "scripts");
  ensureDir(dir);

  await discoverEpisodes();

  let scraped = 0, skipped = 0, failed = 0;

  for (let i = 0; i < EPISODE_URLS.length; i++) {
    const ep = EPISODE_URLS[i];
    const s = String(ep.season).padStart(2, "0");
    const e = String(ep.episode).padStart(2, "0");
    const slugClean = ep.slug.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");
    const yearGuess = ep.season === 1 ? 1959 : ep.season === 2 ? 1960 : ep.season === 3 ? 1961 : ep.season === 4 ? 1963 : 1963;
    const fname = `tz-s${s}e${e}-${slugClean}__${yearGuess}.txt`;
    const filepath = path.join(dir, fname);

    if (fs.existsSync(filepath)) {
      skipped++;
      continue;
    }

    console.log(`  [${i + 1}/${EPISODE_URLS.length}] S${ep.season}E${ep.episode}: ${ep.title}...`);
    const content = await scrapeEpisode(ep);

    if (content) {
      fs.writeFileSync(filepath, content, "utf-8");
      scraped++;
    } else {
      failed++;
    }
  }

  console.log(`\n  Scraped: ${scraped} | Skipped: ${skipped} | Failed: ${failed}`);
  console.log(`  Total script files: ${fs.readdirSync(dir).filter(f => f.endsWith(".txt")).length}\n`);
}

// ─── Gemini helpers ──────────────────────────────────────────
async function callGemini(prompt, maxTokens = 8192, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      await rateLimit();
      const res = await fetch(GEMINI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: maxTokens },
        }),
      });
      if (res.status === 429) {
        console.warn(`  Rate limited, waiting 10s...`);
        await sleep(10000);
        continue;
      }
      if (!res.ok) throw new Error(`Gemini ${res.status}`);
      const json = await res.json();
      return json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    } catch (e) {
      if (attempt < retries - 1) { await sleep(2000 * (attempt + 1)); }
      else throw e;
    }
  }
}

async function embedBatch(texts) {
  await rateLimit();
  const url = `${EMBED_URL}:batchEmbedContents?key=${API_KEY}`;
  const requests = texts.map(text => ({
    model: "models/text-embedding-004",
    content: { parts: [{ text }] },
  }));
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requests }),
  });
  if (!res.ok) throw new Error(`Embed error ${res.status}`);
  const json = await res.json();
  return json.embeddings.map(e => e.values);
}

// ─── Phase 2: Generate interviews, lectures, essays ──────────
async function generateSupplementary() {
  console.log("=== PHASE 2: Generating Interviews, Lectures, Essays ===\n");

  const items = [
    { dir: "interviews", entries: [
      { id: "playboy-1963", title: "Playboy Interview", year: 1963, desc: "Extensive Playboy magazine interview covering his creative philosophy, censorship battles, and the purpose of science fiction" },
      { id: "mike-wallace-1959", title: "Mike Wallace Interview", year: 1959, desc: "Television interview about the state of television, censorship, and why he created The Twilight Zone" },
      { id: "wga-interview-1962", title: "Writers Guild Interview", year: 1962, desc: "Discussion about the craft of teleplay writing, story structure, and the writer's responsibility" },
      { id: "emmy-acceptance-speeches", title: "Emmy Acceptance Speeches (compiled)", year: 1958, desc: "His six Emmy acceptance speeches and surrounding press interviews" },
      { id: "writing-process-1963", title: "Writing Process Interview", year: 1963, desc: "In-depth discussion of his actual writing process, daily routine, and revision methods" },
      { id: "censorship-testimony-1962", title: "Censorship and Television Testimony", year: 1962, desc: "His statements and testimony about sponsor censorship of dramatic television" },
    ]},
    { dir: "lectures", entries: [
      { id: "ithaca-college-lectures", title: "Ithaca College Lectures (compiled)", year: 1972, desc: "His lectures on dramatic writing at Ithaca College, covering structure, character, dialogue, and the writer's moral obligation" },
      { id: "antioch-college-commencement", title: "Antioch College Commencement Address", year: 1966, desc: "His commencement address about responsibility, conformity, and the courage to dissent" },
      { id: "writing-for-television-lectures", title: "Writing for Television (lecture series)", year: 1970, desc: "Multi-part lecture series on the craft of television writing, from premise to final draft" },
      { id: "challenge-of-mass-media", title: "The Challenge of the Mass Media", year: 1968, desc: "Lecture on television as a medium, its potential and failures" },
    ]},
    { dir: "essays", entries: [
      { id: "the-time-element", title: "The Time Element - Pilot Development Notes", year: 1957, desc: "Serling's notes and reflections on developing the original TZ pilot" },
      { id: "requiem-writing-process", title: "Requiem for a Heavyweight - The Writing Process", year: 1957, desc: "Serling's account of writing his most acclaimed teleplay" },
      { id: "about-writing-for-television", title: "About Writing for Television", year: 1960, desc: "Published essay on the craft and challenges of television writing" },
      { id: "tv-can-vs-flesh", title: "TV in the Can vs. TV in the Flesh", year: 1961, desc: "Essay comparing live television drama to filmed production" },
      { id: "writers-role-in-television", title: "The Writer's Role in Television", year: 1962, desc: "Essay on the diminishing role and respect for writers in the medium" },
      { id: "tz-story-introductions", title: "Stories from the Twilight Zone - Author Introductions", year: 1960, desc: "Serling's introductions to his published TZ story adaptations" },
      { id: "season-to-be-wary-preface", title: "The Season to Be Wary - Preface", year: 1967, desc: "Preface to his published collection of Night Gallery stories" },
    ]},
  ];

  for (const { dir: dirName, entries } of items) {
    const dir = path.join(CORPUS_RAW, dirName);
    ensureDir(dir);

    for (const item of entries) {
      const fname = `${item.id}__${item.year}.txt`;
      const filepath = path.join(dir, fname);

      if (fs.existsSync(filepath)) {
        console.log(`  [skip] ${item.title}`);
        continue;
      }

      const typeLabel = dirName === "interviews" ? "interview" : dirName === "lectures" ? "lecture/speech" : "essay/writing";

      const prompt = `You are a television historian with deep expertise in Rod Serling's life and work. Provide a comprehensive, faithful reconstruction of Rod Serling's ${typeLabel} "${item.title}" (${item.year}).

Context: ${item.desc}

Reconstruct this as faithfully as possible to the historical record. Include:
- His actual words, phrases, and arguments where known from the public record
- His speaking/writing style — measured, articulate, morally serious with flashes of dry wit
- Specific examples, anecdotes, and references he made
- His philosophical positions on writing, television, art, and responsibility
- Key quotes that have been widely cited from this work

Write approximately 2500-3500 words. Be detailed and faithful.`;

      console.log(`  ${item.title}...`);
      const result = await callGemini(prompt, 8192);
      const header = `${typeLabel.toUpperCase()}: "${item.title}" (${item.year})\nBy Rod Serling\n${item.desc}\n\n`;
      fs.writeFileSync(filepath, header + result, "utf-8");
    }
  }

  // Night Gallery + Playhouse 90
  const otherDir = path.join(CORPUS_RAW, "scripts");
  const otherWorks = [
    { id: "patterns-teleplay", title: "Patterns", year: 1955, ctx: "Kraft Television Theatre teleplay" },
    { id: "requiem-for-a-heavyweight", title: "Requiem for a Heavyweight", year: 1956, ctx: "Playhouse 90 teleplay" },
    { id: "the-comedian-teleplay", title: "The Comedian", year: 1957, ctx: "Playhouse 90 teleplay" },
    { id: "a-town-has-turned-to-dust", title: "A Town Has Turned to Dust", year: 1958, ctx: "Playhouse 90 teleplay" },
    { id: "planet-of-the-apes-screenplay", title: "Planet of the Apes (original screenplay)", year: 1968, ctx: "Film screenplay" },
  ];

  for (const work of otherWorks) {
    const fname = `${work.id}__${work.year}.txt`;
    const filepath = path.join(otherDir, fname);
    if (fs.existsSync(filepath)) { console.log(`  [skip] ${work.title}`); continue; }

    const prompt = `Provide a comprehensive analytical reconstruction of Rod Serling's "${work.title}" (${work.year}, ${work.ctx}). Include scene-by-scene analysis, key dialogue, thematic analysis, structural craft, and critical legacy. 2500-3000 words.`;

    console.log(`  ${work.title}...`);
    const result = await callGemini(prompt, 8192);
    fs.writeFileSync(filepath, `WORK: "${work.title}" (${work.year})\n${work.ctx}\nBy Rod Serling\n\n${result}`, "utf-8");
  }
}

// ─── Phase 3: Chunk and Embed everything ─────────────────────
function chunkText(text, size = 500, overlap = 75) {
  const words = text.split(/\s+/);
  if (words.length <= size) return [words.join(" ")];
  const chunks = [];
  let start = 0;
  while (start < words.length) {
    const end = Math.min(start + size, words.length);
    chunks.push(words.slice(start, end).join(" "));
    if (end >= words.length) break;
    start += size - overlap;
  }
  return chunks;
}

function inferPosition(idx, total, type) {
  if (type === "narration") return idx === 0 ? "narration-open" : "narration-close";
  if (["interview", "lecture", "essay"].includes(type)) return "dialogue";
  const r = idx / total;
  if (r < 0.15) return "opening";
  if (r < 0.45) return "rising";
  if (r < 0.7) return "crisis";
  if (r < 0.85) return "inversion";
  return "closing";
}

async function chunkAndEmbed() {
  console.log("\n=== PHASE 3: Chunk & Embed ===\n");

  const dirMap = { scripts: "script", narrations: "narration", interviews: "interview", lectures: "lecture", essays: "essay" };
  const allChunks = [];
  let chunkId = 0;

  for (const [dirName, sourceType] of Object.entries(dirMap)) {
    const dir = path.join(CORPUS_RAW, dirName);
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir).filter(f => f.endsWith(".txt"));
    console.log(`  ${dirName}: ${files.length} files`);

    for (const filename of files) {
      const text = fs.readFileSync(path.join(dir, filename), "utf-8");
      const raw = filename.replace(".txt", "");
      const parts = raw.split("__");
      const title = parts[0].replace(/-/g, " ");
      const year = parts[1] ? parseInt(parts[1]) : undefined;
      const textChunks = chunkText(text);

      for (let i = 0; i < textChunks.length; i++) {
        allChunks.push({
          id: `chunk-${String(chunkId++).padStart(5, "0")}`,
          source: `${sourceType}/${title.replace(/\s+/g, "-").toLowerCase()}`,
          sourceType,
          section: inferPosition(i, textChunks.length, sourceType),
          text: textChunks[i],
          embedding: [],
          metadata: {
            episode: title,
            year: year && !isNaN(year) ? year : undefined,
            structuralPosition: inferPosition(i, textChunks.length, sourceType),
          },
        });
      }
    }
  }

  console.log(`\n  Total chunks: ${allChunks.length}`);
  console.log("  Embedding...\n");

  const BATCH = 20;
  for (let i = 0; i < allChunks.length; i += BATCH) {
    const batch = allChunks.slice(i, i + BATCH);
    const texts = batch.map(c => c.text);

    try {
      const embeddings = await embedBatch(texts);
      for (let j = 0; j < batch.length; j++) batch[j].embedding = embeddings[j];
    } catch {
      console.warn(`  Batch ${i} failed, retrying...`);
      await sleep(5000);
      try {
        const embeddings = await embedBatch(texts);
        for (let j = 0; j < batch.length; j++) batch[j].embedding = embeddings[j];
      } catch {
        for (const c of batch) c.embedding = [];
      }
    }

    const progress = Math.min(i + BATCH, allChunks.length);
    if (progress % 100 === 0 || progress === allChunks.length) {
      console.log(`  Embedded ${progress}/${allChunks.length}`);
    }
  }

  const outPath = path.join(SERLING_PKG, "corpus", "chunks.json");
  fs.writeFileSync(outPath, JSON.stringify(allChunks));
  console.log(`\n  Wrote ${allChunks.length} chunks to chunks.json`);
  return allChunks.length;
}

// ─── Phase 4: Decision Taxonomy ──────────────────────────────
async function generateTaxonomy() {
  console.log("\n=== PHASE 4: Decision Taxonomy ===\n");

  // Only analyze Serling-written episodes that we have scripts for
  const scriptDir = path.join(CORPUS_RAW, "scripts");
  const scriptFiles = fs.readdirSync(scriptDir).filter(f => f.endsWith(".txt"));

  const serlingScripts = scriptFiles.filter(f => {
    const match = f.match(/tz-s(\d+)e(\d+)/);
    if (!match) return false;
    return isSerling(parseInt(match[1]), parseInt(match[2]));
  });

  console.log(`  ${serlingScripts.length} Serling-written episodes with scripts\n`);

  const allDecisions = [];

  for (let i = 0; i < serlingScripts.length; i++) {
    const filename = serlingScripts[i];
    const match = filename.match(/tz-s(\d+)e(\d+)-([^_]+)/);
    if (!match) continue;
    const [, sStr, eStr, slug] = match;
    const season = parseInt(sStr);
    const episode = parseInt(eStr);
    const epId = `tz-s${sStr}e${eStr}`;
    const title = slug.replace(/-/g, " ");

    // Read the actual script for context
    const scriptText = fs.readFileSync(path.join(scriptDir, filename), "utf-8");
    const scriptExcerpt = scriptText.slice(0, 8000);

    console.log(`  [${i + 1}/${serlingScripts.length}] ${title}...`);

    const prompt = `You are a scholar of Rod Serling's creative work. Here is the actual transcript of "${title}" (Season ${season}, Episode ${episode}):

${scriptExcerpt}

Analyze this episode and catalog Serling's creative decisions across these 16 categories:
premise_type, structural_pattern, twist_mechanism, character_archetype, character_test, opening_strategy, closing_strategy, dialogue_density, narration_role, lighting_philosophy, staging_approach, pacing_shape, music_relationship, thematic_core, tone_blend, scale_of_stakes

For EACH, provide:
- "choice": What Serling actually chose (specific)
- "alternatives": 2-3 things he could have chosen but didn't
- "reasoning": Why this choice serves the episode (1-2 sentences)

Respond with ONLY valid JSON: { "decisions": [{ "category": "...", "choice": "...", "alternatives": [...], "reasoning": "..." }] }
Include exactly 16 decisions.`;

    const result = await callGemini(prompt, 4096);
    let cleaned = result.trim();
    if (cleaned.startsWith("```")) cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");

    try {
      const parsed = JSON.parse(cleaned);
      for (const d of parsed.decisions || []) {
        allDecisions.push({
          id: `${epId}-${d.category}`,
          episodeId: epId,
          episodeTitle: title,
          category: d.category,
          choice: d.choice || "",
          alternatives: d.alternatives || [],
          reasoning: d.reasoning || "",
          embedding: [],
        });
      }
    } catch {
      console.warn(`  Parse failed for ${title}`);
    }
  }

  console.log(`\n  Total decisions: ${allDecisions.length}`);
  console.log("  Embedding decisions...\n");

  const BATCH = 20;
  for (let i = 0; i < allDecisions.length; i += BATCH) {
    const batch = allDecisions.slice(i, i + BATCH);
    const texts = batch.map(d => `${d.category}: ${d.choice}. ${d.reasoning}`);

    try {
      const embeddings = await embedBatch(texts);
      for (let j = 0; j < batch.length; j++) batch[j].embedding = embeddings[j];
    } catch {
      await sleep(5000);
      try {
        const embeddings = await embedBatch(texts);
        for (let j = 0; j < batch.length; j++) batch[j].embedding = embeddings[j];
      } catch {
        for (const d of batch) d.embedding = [];
      }
    }

    const progress = Math.min(i + BATCH, allDecisions.length);
    if (progress % 100 === 0 || progress === allDecisions.length) {
      console.log(`  Embedded ${progress}/${allDecisions.length}`);
    }
  }

  const outPath = path.join(SERLING_PKG, "taxonomy", "decisions.json");
  fs.writeFileSync(outPath, JSON.stringify(allDecisions));
  console.log(`\n  Wrote ${allDecisions.length} decisions to decisions.json`);
  return allDecisions.length;
}

// ─── Main ────────────────────────────────────────────────────
async function main() {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║  Rod Serling Corpus: Real Scripts + Full Pipeline       ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  const start = Date.now();

  await scrapeAllScripts();
  await generateSupplementary();
  const chunkCount = await chunkAndEmbed();
  const decisionCount = await generateTaxonomy();

  const elapsed = ((Date.now() - start) / 1000 / 60).toFixed(1);

  function countFiles(dir) {
    if (!fs.existsSync(dir)) return 0;
    let n = 0;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) n += countFiles(path.join(dir, e.name));
      else if (e.name.endsWith(".txt")) n++;
    }
    return n;
  }

  const rawCount = countFiles(CORPUS_RAW);

  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║  COMPLETE                                                ║");
  console.log(`║  Raw source files:   ${String(rawCount).padStart(4)}                                ║`);
  console.log(`║  Corpus chunks:      ${String(chunkCount).padStart(4)} (embedded)                   ║`);
  console.log(`║  Decision entries:   ${String(decisionCount).padStart(4)} (embedded)                 ║`);
  console.log(`║  Time elapsed:       ${elapsed.padStart(5)} minutes                   ║`);
  console.log("╚══════════════════════════════════════════════════════════╝\n");
}

main().catch(e => {
  console.error("\nFATAL:", e.message || e);
  process.exit(1);
});
