/**
 * Fielder Corpus + Taxonomy Embedding Script
 *
 * Reads chunks.json and decisions.json, embeds all items that don't yet
 * have embeddings, and writes updated files back.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CORPUS_PATH = path.join(__dirname, "..", "src", "corpus", "chunks.json");
const DECISIONS_PATH = path.join(__dirname, "..", "src", "taxonomy", "decisions.json");

const EMBED_MODEL = "gemini-embedding-001";
const BATCH_SIZE = 100;
const DELAY_MS = 1200;

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

async function embedBatch(texts) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:batchEmbedContents?key=${API_KEY}`;
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
    throw new Error(`Embed API ${res.status}: ${err.slice(0, 300)}`);
  }

  const json = await res.json();
  return json.embeddings.map((e) => e.values);
}

async function embedItems(items, textFn, label) {
  const needsEmbed = items.filter((item) => !item.embedding || item.embedding.length === 0);
  console.log(`${label}: ${needsEmbed.length}/${items.length} need embedding`);

  if (needsEmbed.length === 0) return 0;

  let embedded = 0;
  for (let i = 0; i < needsEmbed.length; i += BATCH_SIZE) {
    const batch = needsEmbed.slice(i, i + BATCH_SIZE);
    const texts = batch.map(textFn);

    try {
      const embeddings = await embedBatch(texts);
      for (let j = 0; j < batch.length; j++) {
        batch[j].embedding = embeddings[j];
      }
      embedded += batch.length;
      console.log(`  Embedded ${Math.min(i + BATCH_SIZE, needsEmbed.length)}/${needsEmbed.length}`);
    } catch (err) {
      console.error(`  Batch error at ${i}: ${err.message}`);
    }

    if (i + BATCH_SIZE < needsEmbed.length) {
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
  }

  return embedded;
}

async function main() {
  console.log("=== Nathan Fielder Embedding Pipeline ===\n");

  // Embed corpus chunks
  if (fs.existsSync(CORPUS_PATH)) {
    const chunks = JSON.parse(fs.readFileSync(CORPUS_PATH, "utf-8"));
    const count = await embedItems(chunks, (c) => c.text, "Corpus chunks");
    if (count > 0) {
      fs.writeFileSync(CORPUS_PATH, JSON.stringify(chunks, null, 2));
      console.log(`  Updated ${CORPUS_PATH}\n`);
    }
  } else {
    console.log("No corpus chunks.json found — run generate-corpus.mjs first\n");
  }

  // Embed decision entries
  if (fs.existsSync(DECISIONS_PATH)) {
    const decisions = JSON.parse(fs.readFileSync(DECISIONS_PATH, "utf-8"));
    const count = await embedItems(
      decisions,
      (d) => `${d.category}: ${d.choice}. ${d.reasoning}`,
      "Decision entries",
    );
    if (count > 0) {
      fs.writeFileSync(DECISIONS_PATH, JSON.stringify(decisions, null, 2));
      console.log(`  Updated ${DECISIONS_PATH}\n`);
    }
  } else {
    console.log("No taxonomy decisions.json found — run generate-taxonomy.mjs first\n");
  }

  console.log("Done.");
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
