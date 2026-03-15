/**
 * Taxonomy Generation Script
 *
 * Feeds episodes (scripts or detailed synopses) to Gemini and catalogs
 * Serling's creative decisions across all 16 categories.
 *
 * Usage (from repo root):
 *   node --loader ts-node/esm packages/serling/src/taxonomy/generate.ts <episodes-dir> [output-path]
 *
 * Episodes directory: .txt files, one per episode.
 * Filename format: episode-id__Episode-Title__year.txt
 *   e.g. tz-s01e05__Walking-Distance__1959.txt
 */

import * as fs from "fs";
import * as path from "path";
import type { DecisionCategory, DecisionEntry, EpisodeDecisionSet } from "./types";
import { DECISION_CATEGORIES } from "./types";

const GEMINI_MODEL = "gemini-2.0-flash";
const EMBED_MODEL = "text-embedding-004";
const RATE_DELAY_MS = 1000;

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY environment variable required");
  return key;
}

interface EpisodeFile {
  id: string;
  title: string;
  year: number;
  text: string;
}

function readEpisodeFiles(dir: string): EpisodeFile[] {
  const files: EpisodeFile[] = [];
  for (const filename of fs.readdirSync(dir)) {
    if (!filename.endsWith(".txt")) continue;
    const raw = filename.replace(".txt", "");
    const parts = raw.split("__");
    if (parts.length < 2) {
      console.warn(`  Skipping ${filename} (expected id__title__year.txt format)`);
      continue;
    }
    files.push({
      id: parts[0],
      title: parts[1].replace(/-/g, " "),
      year: parts[2] ? parseInt(parts[2], 10) : 1960,
      text: fs.readFileSync(path.join(dir, filename), "utf-8"),
    });
  }
  return files.sort((a, b) => a.id.localeCompare(b.id));
}

async function callGemini(prompt: string, apiKey: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

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
    throw new Error(`Gemini API error ${res.status}: ${err.slice(0, 300)}`);
  }

  const json = await res.json();
  return json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

async function embedTexts(texts: string[], apiKey: string): Promise<number[][]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:batchEmbedContents?key=${apiKey}`;

  const requests = texts.map((text) => ({
    model: `models/${EMBED_MODEL}`,
    content: { parts: [{ text }] },
  }));

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ requests }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Embed API error ${res.status}: ${err.slice(0, 300)}`);
  }

  const json = await res.json();
  return json.embeddings.map((e: { values: number[] }) => e.values);
}

function buildAnalysisPrompt(episode: EpisodeFile): string {
  const categoryList = DECISION_CATEGORIES.map(
    (c) => `- ${c.id}: ${c.description}`,
  ).join("\n");

  return `You are a scholar of Rod Serling's creative work. Analyze the following episode and catalog his creative decisions across all 16 categories.

EPISODE: "${episode.title}" (${episode.year})
ID: ${episode.id}

TEXT:
${episode.text.slice(0, 12000)}

DECISION CATEGORIES:
${categoryList}

For EACH category, provide:
1. "choice" — What Serling actually chose (be specific, not generic)
2. "alternatives" — 2-3 things he could have chosen but didn't
3. "reasoning" — WHY this choice serves the episode's thesis (1-2 sentences)

Respond ONLY with valid JSON. Use this exact structure:
{
  "synopsis": "2-3 sentence synopsis of the episode",
  "decisions": [
    {
      "category": "premise_type",
      "choice": "specific choice description",
      "alternatives": ["alternative 1", "alternative 2"],
      "reasoning": "why this serves the thesis"
    }
  ]
}

Include exactly 16 decision objects, one per category, in the order listed above.`;
}

function parseAnalysisResponse(
  text: string,
  episode: EpisodeFile,
): EpisodeDecisionSet | null {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  try {
    const parsed = JSON.parse(cleaned);
    return {
      episodeId: episode.id,
      episodeTitle: episode.title,
      year: episode.year,
      synopsis: parsed.synopsis || "",
      decisions: (parsed.decisions || []).map(
        (d: { category: string; choice: string; alternatives: string[]; reasoning: string }) => ({
          id: `${episode.id}-${d.category}`,
          episodeId: episode.id,
          episodeTitle: episode.title,
          category: d.category as DecisionCategory,
          choice: d.choice || "",
          alternatives: d.alternatives || [],
          reasoning: d.reasoning || "",
        }),
      ),
    };
  } catch (e) {
    console.error(`  Failed to parse response for ${episode.title}:`, e);
    return null;
  }
}

async function main() {
  const episodesDir = process.argv[2];
  const outputPath = process.argv[3] || path.join(__dirname, "decisions.json");

  if (!episodesDir) {
    console.error("Usage: generate.ts <episodes-directory> [output-path]");
    process.exit(1);
  }

  if (!fs.existsSync(episodesDir)) {
    console.error(`Episodes directory not found: ${episodesDir}`);
    process.exit(1);
  }

  const apiKey = getApiKey();
  const episodes = readEpisodeFiles(episodesDir);
  console.log(`Found ${episodes.length} episodes`);

  const allDecisions: DecisionEntry[] = [];
  const allSets: EpisodeDecisionSet[] = [];

  for (let i = 0; i < episodes.length; i++) {
    const ep = episodes[i];
    console.log(`\n[${i + 1}/${episodes.length}] Analyzing: ${ep.title} (${ep.year})`);

    const prompt = buildAnalysisPrompt(ep);
    const response = await callGemini(prompt, apiKey);
    const parsed = parseAnalysisResponse(response, ep);

    if (!parsed) {
      console.warn(`  Skipping ${ep.title} — parse failed`);
      continue;
    }

    allSets.push(parsed);

    for (const d of parsed.decisions) {
      allDecisions.push({ ...d, embedding: [] });
    }

    console.log(`  Cataloged ${parsed.decisions.length} decisions`);

    if (i < episodes.length - 1) {
      await new Promise((r) => setTimeout(r, RATE_DELAY_MS));
    }
  }

  console.log(`\nTotal decisions: ${allDecisions.length}`);
  console.log("Embedding decision descriptions...");

  const BATCH = 20;
  for (let i = 0; i < allDecisions.length; i += BATCH) {
    const batch = allDecisions.slice(i, i + BATCH);
    const texts = batch.map(
      (d) => `${d.category}: ${d.choice}. ${d.reasoning}`,
    );
    const embeddings = await embedTexts(texts, apiKey);

    for (let j = 0; j < batch.length; j++) {
      batch[j].embedding = embeddings[j];
    }

    console.log(`  Embedded ${Math.min(i + BATCH, allDecisions.length)}/${allDecisions.length}`);

    if (i + BATCH < allDecisions.length) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  const outDir = path.dirname(outputPath);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(outputPath, JSON.stringify(allDecisions, null, 2));
  console.log(`\nWrote ${allDecisions.length} decisions to ${outputPath}`);

  const setsPath = outputPath.replace(".json", "-sets.json");
  fs.writeFileSync(setsPath, JSON.stringify(allSets, null, 2));
  console.log(`Wrote ${allSets.length} episode sets to ${setsPath}`);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
