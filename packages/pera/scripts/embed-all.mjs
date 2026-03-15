/**
 * Pera Corpus + Taxonomy Embedding Script
 *
 * Reads chunks.json and decisions.json, embeds all items that don't yet
 * have embeddings, and writes updated files back.
 * Uses the local /api/ai-embed endpoint (localhost:3000).
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CORPUS_PATH = path.join(__dirname, "..", "src", "corpus", "chunks.json");
const DECISIONS_PATH = path.join(__dirname, "..", "src", "taxonomy", "decisions.json");

const API_BASE = "http://localhost:3000";
const BATCH_SIZE = 100;
const DELAY_MS = 1200;

async function embedBatch(texts) {
  const res = await fetch(`${API_BASE}/api/ai-embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ texts }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Embed API ${res.status}: ${err.slice(0, 300)}`);
  }

  const json = await res.json();
  return json.embeddings;
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
  console.log("=== Pera Embedding Pipeline ===\n");

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
