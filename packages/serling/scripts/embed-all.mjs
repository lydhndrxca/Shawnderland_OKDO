#!/usr/bin/env node
/**
 * Batch-embeds all corpus chunks and decision entries via Gemini text-embedding-004.
 * Writes results back to chunks.json and decisions.json with embeddings filled in.
 *
 * Usage: node packages/serling/scripts/embed-all.mjs
 * Requires GEMINI_API_KEY in .env.local or environment.
 */

import fs from "fs";
import path from "path";
import https from "https";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..", "..");

// Load API key from .env.local
const envPath = path.join(ROOT, ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8").replace(/^\uFEFF/, "");
  for (const line of envContent.split(/\r?\n/)) {
    const match = line.match(/^([A-Z_]+)=(.+)$/);
    if (match) process.env[match[1]] = match[2].trim();
  }
}

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error("GEMINI_API_KEY not found. Checked:", envPath);
  console.error("Env vars with GEMINI:", Object.keys(process.env).filter(k => k.includes("GEMINI")));
  process.exit(1);
}

const MODEL = "gemini-embedding-001";
const HOST = "generativelanguage.googleapis.com";
const BATCH_SIZE = 100;
const DELAY_MS = 1200; // rate limit safety

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function httpsPost(apiPath, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request(
      {
        hostname: HOST,
        port: 443,
        path: apiPath,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(data),
        },
        timeout: 60000,
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const raw = Buffer.concat(chunks).toString();
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode}: ${raw.slice(0, 500)}`));
          } else {
            resolve(JSON.parse(raw));
          }
        });
      }
    );
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function embedBatch(texts) {
  const requests = texts.map((t) => ({
    model: `models/${MODEL}`,
    content: { parts: [{ text: t }] },
  }));

  const apiPath = `/v1beta/models/${MODEL}:batchEmbedContents?key=${API_KEY}`;
  const result = await httpsPost(apiPath, { requests });
  return result.embeddings.map((e) => e.values);
}

async function processFile(filePath, textExtractor, label) {
  console.log(`\n=== ${label} ===`);
  const raw = fs.readFileSync(filePath, "utf-8");
  const items = JSON.parse(raw);

  const needsEmbedding = items.filter(
    (item) => !item.embedding || item.embedding.length === 0
  );
  console.log(
    `Total: ${items.length} | Need embedding: ${needsEmbedding.length}`
  );

  if (needsEmbedding.length === 0) {
    console.log("All items already embedded.");
    return;
  }

  const idToIndex = new Map();
  items.forEach((item, i) => idToIndex.set(item.id, i));

  let processed = 0;
  let errors = 0;

  for (let i = 0; i < needsEmbedding.length; i += BATCH_SIZE) {
    const batch = needsEmbedding.slice(i, i + BATCH_SIZE);
    const texts = batch.map(textExtractor);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(needsEmbedding.length / BATCH_SIZE);

    process.stdout.write(
      `  Batch ${batchNum}/${totalBatches} (${batch.length} items)...`
    );

    try {
      const embeddings = await embedBatch(texts);

      for (let j = 0; j < batch.length; j++) {
        const idx = idToIndex.get(batch[j].id);
        if (idx !== undefined && embeddings[j]) {
          items[idx].embedding = embeddings[j];
          processed++;
        }
      }

      console.log(` done (${processed} total)`);
    } catch (e) {
      errors++;
      console.log(` ERROR: ${e.message}`);

      if (e.message.includes("429")) {
        console.log("  Rate limited — waiting 30s...");
        await sleep(30000);
        i -= BATCH_SIZE; // retry this batch
        continue;
      }
    }

    if (i + BATCH_SIZE < needsEmbedding.length) {
      await sleep(DELAY_MS);
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(items, null, 0));
  const fileSize = (fs.statSync(filePath).size / 1024 / 1024).toFixed(1);
  console.log(
    `  Wrote ${filePath} (${fileSize}MB) — ${processed} embedded, ${errors} errors`
  );
}

// Corpus: embed the text content with source context
function corpusTextExtractor(chunk) {
  return `${chunk.source} — ${chunk.section}\n${chunk.text}`.slice(0, 2000);
}

// Decisions: embed the choice + reasoning with episode context
function decisionTextExtractor(decision) {
  return `${decision.episodeTitle} — ${decision.category}: ${decision.choice}. ${decision.reasoning}`.slice(
    0,
    2000
  );
}

async function main() {
  console.log("Rod Serling Corpus Embedding Pipeline");
  console.log(`Model: ${MODEL} | Batch size: ${BATCH_SIZE}`);
  console.log(`API key: ${API_KEY.slice(0, 8)}...${API_KEY.slice(-4)}`);

  const chunksPath = path.join(
    ROOT, "packages", "serling", "src", "corpus", "chunks.json"
  );
  const decisionsPath = path.join(
    ROOT, "packages", "serling", "src", "taxonomy", "decisions.json"
  );

  await processFile(chunksPath, corpusTextExtractor, "CORPUS CHUNKS");
  await processFile(decisionsPath, decisionTextExtractor, "DECISION PATTERNS");

  console.log("\n=== COMPLETE ===");
  console.log("RAG pipeline is now active. Restart the dev server to load.");
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
