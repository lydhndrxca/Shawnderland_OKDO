/**
 * Scrapes TZ transcripts from subslikescript.com and re-runs the
 * full embedding + taxonomy pipeline with all corpus data.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CORPUS_RAW = path.join(ROOT, "corpus-raw");
const SERLING_PKG = path.join(ROOT, "packages", "serling", "src");

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) { console.error("Set GEMINI_API_KEY"); process.exit(1); }

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;
const EMBED_URL = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004`;
const BASE = "https://subslikescript.com";

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function ensureDir(d) { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); }

let lastCall = 0;
async function rateLimit(ms = 500) {
  const elapsed = Date.now() - lastCall;
  if (elapsed < ms) await sleep(ms - elapsed);
  lastCall = Date.now();
}

// Serling writer attribution
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
function isSerling(s, e) { return SERLING_WRITTEN.has(`${s}-${e}`); }

// Season year mapping
function yearForSeason(s) { return [0,1959,1960,1961,1963,1963][s] || 1960; }

// ─── Discover episode URLs ───────────────────────────────────
async function discoverEpisodes() {
  console.log("Discovering episodes...");
  const res = await fetch(`${BASE}/series/The_Twilight_Zone-52520`);
  const html = await res.text();

  // Links use SINGLE QUOTES: href='/series/The_Twilight_Zone-52520/season-X/episode-Y-Slug'
  const pattern = /href='(\/series\/The_Twilight_Zone-52520\/season-(\d+)\/episode-(\d+)-([^']+))'/g;
  const episodes = [];
  const seen = new Set();
  let match;

  while ((match = pattern.exec(html)) !== null) {
    const [, urlPath, season, episode, slug] = match;
    const key = `s${season}e${episode}`;
    if (seen.has(key)) continue;
    seen.add(key);

    episodes.push({
      url: `${BASE}${urlPath}`,
      season: parseInt(season),
      episode: parseInt(episode),
      slug,
      title: slug.replace(/_/g, " ").replace(/-/g, " "),
    });
  }

  episodes.sort((a, b) => a.season * 100 + a.episode - (b.season * 100 + b.episode));
  console.log(`  Found ${episodes.length} episodes\n`);
  return episodes;
}

// ─── Clean transcript HTML ───────────────────────────────────
function cleanTranscript(html) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
    .split("\n").map(l => l.trim()).filter(Boolean).join("\n");
}

// ─── Scrape one episode ──────────────────────────────────────
async function scrapeEpisode(ep) {
  await rateLimit(600);
  const res = await fetch(ep.url);
  if (!res.ok) { console.warn(`  HTTP ${res.status}: ${ep.title}`); return null; }

  const html = await res.text();
  const scriptMatch = html.match(/<div class="full-script">([\s\S]*?)<\/div>/);
  if (!scriptMatch) { console.warn(`  No script div: ${ep.title}`); return null; }

  const plot = html.match(/<div class="plot">([\s\S]*?)<\/div>/);
  const plotText = plot ? plot[1].replace(/<[^>]+>/g, "").trim() : "";
  const transcript = cleanTranscript(scriptMatch[1]);
  const writer = isSerling(ep.season, ep.episode) ? "Rod Serling" : "Other";

  return [
    `EPISODE: "${ep.title}"`,
    `The Twilight Zone - Season ${ep.season}, Episode ${ep.episode} (${yearForSeason(ep.season)})`,
    `Writer: ${writer}`,
    plotText ? `\nSynopsis: ${plotText}` : "",
    `\n${"=".repeat(60)}`,
    `FULL TRANSCRIPT`,
    `${"=".repeat(60)}\n`,
    transcript,
  ].filter(Boolean).join("\n");
}

// ─── Phase 1: Scrape ────────────────────────────────────────
async function scrapeAll() {
  console.log("=== PHASE 1: Scraping TZ Scripts ===\n");
  const dir = path.join(CORPUS_RAW, "scripts");
  ensureDir(dir);

  const episodes = await discoverEpisodes();
  let scraped = 0, skipped = 0, failed = 0;

  for (let i = 0; i < episodes.length; i++) {
    const ep = episodes[i];
    const s = String(ep.season).padStart(2, "0");
    const e = String(ep.episode).padStart(2, "0");
    const slug = ep.slug.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "");
    const fname = `tz-s${s}e${e}-${slug}__${yearForSeason(ep.season)}.txt`;
    const filepath = path.join(dir, fname);

    if (fs.existsSync(filepath)) { skipped++; continue; }

    console.log(`  [${i + 1}/${episodes.length}] S${ep.season}E${ep.episode}: ${ep.title}`);
    const content = await scrapeEpisode(ep);
    if (content) { fs.writeFileSync(filepath, content, "utf-8"); scraped++; }
    else { failed++; }
  }

  console.log(`\n  Scraped: ${scraped} | Skipped: ${skipped} | Failed: ${failed}`);
  const total = fs.readdirSync(dir).filter(f => f.endsWith(".txt")).length;
  console.log(`  Total script files: ${total}\n`);
}

// ─── Phase 2: Chunk & Embed everything ──────────────────────
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
  if (["interview","lecture","essay"].includes(type)) return "dialogue";
  const r = idx / total;
  if (r < 0.15) return "opening";
  if (r < 0.45) return "rising";
  if (r < 0.7) return "crisis";
  if (r < 0.85) return "inversion";
  return "closing";
}

async function embedBatch(texts) {
  await rateLimit(300);
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
  if (!res.ok) throw new Error(`Embed ${res.status}`);
  const json = await res.json();
  return json.embeddings.map(e => e.values);
}

async function chunkAndEmbed() {
  console.log("=== PHASE 2: Chunk & Embed All Corpus ===\n");

  const dirMap = { scripts:"script", narrations:"narration", interviews:"interview", lectures:"lecture", essays:"essay" };
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
          metadata: { episode: title, year: year && !isNaN(year) ? year : undefined, structuralPosition: inferPosition(i, textChunks.length, sourceType) },
        });
      }
    }
  }

  console.log(`\n  Total chunks: ${allChunks.length}`);
  console.log("  Embedding...\n");

  const BATCH = 15;
  for (let i = 0; i < allChunks.length; i += BATCH) {
    const batch = allChunks.slice(i, i + BATCH);
    const texts = batch.map(c => c.text);
    try {
      const embeddings = await embedBatch(texts);
      for (let j = 0; j < batch.length; j++) batch[j].embedding = embeddings[j];
    } catch {
      console.warn(`  Batch ${i} retry...`);
      await sleep(8000);
      try {
        const embeddings = await embedBatch(texts);
        for (let j = 0; j < batch.length; j++) batch[j].embedding = embeddings[j];
      } catch { for (const c of batch) c.embedding = []; }
    }
    const progress = Math.min(i + BATCH, allChunks.length);
    if (progress % 150 === 0 || progress === allChunks.length) {
      console.log(`  Embedded ${progress}/${allChunks.length}`);
    }
  }

  const outPath = path.join(SERLING_PKG, "corpus", "chunks.json");
  fs.writeFileSync(outPath, JSON.stringify(allChunks));
  console.log(`\n  Wrote ${allChunks.length} chunks to chunks.json`);
  return allChunks.length;
}

// ─── Phase 3: Decision Taxonomy ─────────────────────────────
async function callGemini(prompt, maxTokens = 4096) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await rateLimit(500);
      const res = await fetch(GEMINI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: maxTokens },
        }),
      });
      if (res.status === 429) { await sleep(10000); continue; }
      if (!res.ok) throw new Error(`Gemini ${res.status}`);
      const json = await res.json();
      return json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    } catch (e) {
      if (attempt < 2) await sleep(3000 * (attempt + 1));
      else throw e;
    }
  }
}

async function generateTaxonomy() {
  console.log("\n=== PHASE 3: Decision Taxonomy ===\n");

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
    const epId = `tz-s${sStr}e${eStr}`;
    const title = slug.replace(/-/g, " ");
    const scriptText = fs.readFileSync(path.join(scriptDir, filename), "utf-8");
    const excerpt = scriptText.slice(0, 8000);

    console.log(`  [${i + 1}/${serlingScripts.length}] ${title}`);

    const prompt = `Analyze The Twilight Zone episode "${title}" and catalog Rod Serling's creative decisions across 16 categories:
premise_type, structural_pattern, twist_mechanism, character_archetype, character_test, opening_strategy, closing_strategy, dialogue_density, narration_role, lighting_philosophy, staging_approach, pacing_shape, music_relationship, thematic_core, tone_blend, scale_of_stakes

Script excerpt:
${excerpt}

For EACH category: "choice" (what Serling chose), "alternatives" (2-3 rejected options), "reasoning" (why, 1-2 sentences).
Respond ONLY with JSON: { "decisions": [{ "category":"...", "choice":"...", "alternatives":[...], "reasoning":"..." }] }
Exactly 16 decisions.`;

    const result = await callGemini(prompt);
    let cleaned = result.trim();
    if (cleaned.startsWith("```")) cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    try {
      const parsed = JSON.parse(cleaned);
      for (const d of parsed.decisions || []) {
        allDecisions.push({
          id: `${epId}-${d.category}`, episodeId: epId, episodeTitle: title,
          category: d.category, choice: d.choice || "", alternatives: d.alternatives || [],
          reasoning: d.reasoning || "", embedding: [],
        });
      }
    } catch { console.warn(`  Parse failed for ${title}`); }
  }

  console.log(`\n  Total decisions: ${allDecisions.length}`);
  console.log("  Embedding decisions...\n");

  const BATCH = 15;
  for (let i = 0; i < allDecisions.length; i += BATCH) {
    const batch = allDecisions.slice(i, i + BATCH);
    const texts = batch.map(d => `${d.category}: ${d.choice}. ${d.reasoning}`);
    try {
      const embeddings = await embedBatch(texts);
      for (let j = 0; j < batch.length; j++) batch[j].embedding = embeddings[j];
    } catch {
      await sleep(8000);
      try {
        const embeddings = await embedBatch(texts);
        for (let j = 0; j < batch.length; j++) batch[j].embedding = embeddings[j];
      } catch { for (const d of batch) d.embedding = []; }
    }
    const progress = Math.min(i + BATCH, allDecisions.length);
    if (progress % 150 === 0 || progress === allDecisions.length) {
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
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║  TZ Script Scraper + Full Pipeline Rebuild          ║");
  console.log("╚══════════════════════════════════════════════════════╝\n");

  const start = Date.now();
  await scrapeAll();
  const chunks = await chunkAndEmbed();
  const decisions = await generateTaxonomy();
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

  console.log(`\n${"=".repeat(56)}`);
  console.log(`  COMPLETE`);
  console.log(`  Raw files:      ${countFiles(CORPUS_RAW)}`);
  console.log(`  Corpus chunks:  ${chunks} (embedded)`);
  console.log(`  Decisions:      ${decisions} (embedded)`);
  console.log(`  Time:           ${elapsed} min`);
  console.log("=".repeat(56));
}

main().catch(e => { console.error("FATAL:", e.message || e); process.exit(1); });
