/**
 * Corpus Ingestion Script
 *
 * Reads raw text files from a source directory, chunks them with overlap,
 * embeds each chunk via Gemini text-embedding-004, and writes chunks.json.
 *
 * Usage (from repo root):
 *   node --loader ts-node/esm packages/serling/src/corpus/ingest.ts <source-dir> [output-path]
 *
 * Source directory structure:
 *   corpus-raw/
 *     scripts/          <- .txt files of full scripts
 *     narrations/       <- .txt files of opening/closing narrations
 *     interviews/       <- .txt files of interview transcripts
 *     lectures/         <- .txt files of lecture transcripts
 *     essays/           <- .txt files of essays and articles
 *
 * Each .txt filename should follow: title__year.txt  (e.g. walking-distance__1959.txt)
 * The double-underscore separates title from year. Year is optional.
 */

import * as fs from "fs";
import * as path from "path";
import type { CorpusChunk, RawCorpusFile, SourceType, StructuralPosition } from "./types";

const EMBED_MODEL = "text-embedding-004";
const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 75;
const EMBED_BATCH_SIZE = 20;
const EMBED_DELAY_MS = 200;

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY environment variable required");
  return key;
}

async function embedBatch(texts: string[], apiKey: string): Promise<number[][]> {
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
    throw new Error(`Embedding API error ${res.status}: ${err.slice(0, 300)}`);
  }

  const json = await res.json();
  return json.embeddings.map((e: { values: number[] }) => e.values);
}

function chunkText(text: string, chunkSize: number, overlap: number): string[] {
  const words = text.split(/\s+/);
  if (words.length <= chunkSize) return [words.join(" ")];

  const chunks: string[] = [];
  let start = 0;
  while (start < words.length) {
    const end = Math.min(start + chunkSize, words.length);
    chunks.push(words.slice(start, end).join(" "));
    if (end >= words.length) break;
    start += chunkSize - overlap;
  }
  return chunks;
}

function inferStructuralPosition(
  chunkIndex: number,
  totalChunks: number,
  sourceType: SourceType,
): StructuralPosition {
  if (sourceType === "narration") {
    return chunkIndex === 0 ? "narration-open" : "narration-close";
  }
  if (sourceType === "interview" || sourceType === "lecture" || sourceType === "essay") {
    return "dialogue";
  }
  const ratio = chunkIndex / totalChunks;
  if (ratio < 0.15) return "opening";
  if (ratio < 0.45) return "rising";
  if (ratio < 0.7) return "crisis";
  if (ratio < 0.85) return "inversion";
  return "closing";
}

function readSourceDir(dirPath: string): RawCorpusFile[] {
  const files: RawCorpusFile[] = [];
  const sourceTypes: SourceType[] = ["script", "narration", "interview", "lecture", "essay"];
  const dirMap: Record<string, SourceType> = {
    scripts: "script",
    narrations: "narration",
    interviews: "interview",
    lectures: "lecture",
    essays: "essay",
  };

  for (const [dirName, sourceType] of Object.entries(dirMap)) {
    const subDir = path.join(dirPath, dirName);
    if (!fs.existsSync(subDir)) continue;

    for (const filename of fs.readdirSync(subDir)) {
      if (!filename.endsWith(".txt")) continue;
      const raw = filename.replace(".txt", "");
      const parts = raw.split("__");
      const title = parts[0].replace(/-/g, " ");
      const year = parts[1] ? parseInt(parts[1], 10) : undefined;

      files.push({
        filename,
        sourceType,
        title,
        year: year && !isNaN(year) ? year : undefined,
        text: fs.readFileSync(path.join(subDir, filename), "utf-8"),
      });
    }
  }

  if (files.length === 0) {
    const txtFiles = fs.readdirSync(dirPath).filter((f) => f.endsWith(".txt"));
    for (const filename of txtFiles) {
      const raw = filename.replace(".txt", "");
      const parts = raw.split("__");
      const title = parts[0].replace(/-/g, " ");
      const year = parts[1] ? parseInt(parts[1], 10) : undefined;

      files.push({
        filename,
        sourceType: "script",
        title,
        year: year && !isNaN(year) ? year : undefined,
        text: fs.readFileSync(path.join(dirPath, filename), "utf-8"),
      });
    }
  }

  return files;
}

async function main() {
  const sourceDir = process.argv[2];
  const outputPath = process.argv[3] || path.join(__dirname, "chunks.json");

  if (!sourceDir) {
    console.error("Usage: ingest.ts <source-directory> [output-path]");
    process.exit(1);
  }

  if (!fs.existsSync(sourceDir)) {
    console.error(`Source directory not found: ${sourceDir}`);
    process.exit(1);
  }

  const apiKey = getApiKey();
  const rawFiles = readSourceDir(sourceDir);
  console.log(`Found ${rawFiles.length} source files`);

  const allChunks: CorpusChunk[] = [];
  let chunkId = 0;

  for (const file of rawFiles) {
    const textChunks = chunkText(file.text, CHUNK_SIZE, CHUNK_OVERLAP);
    console.log(`  ${file.title}: ${textChunks.length} chunks`);

    for (let i = 0; i < textChunks.length; i++) {
      allChunks.push({
        id: `chunk-${String(chunkId++).padStart(5, "0")}`,
        source: `${file.sourceType}/${file.title.replace(/\s+/g, "-").toLowerCase()}`,
        sourceType: file.sourceType,
        section: inferStructuralPosition(i, textChunks.length, file.sourceType),
        text: textChunks[i],
        embedding: [],
        metadata: {
          episode: file.title,
          year: file.year,
          structuralPosition: inferStructuralPosition(i, textChunks.length, file.sourceType),
        },
      });
    }
  }

  console.log(`\nTotal chunks: ${allChunks.length}`);
  console.log("Embedding chunks...");

  for (let i = 0; i < allChunks.length; i += EMBED_BATCH_SIZE) {
    const batch = allChunks.slice(i, i + EMBED_BATCH_SIZE);
    const texts = batch.map((c) => c.text);
    const embeddings = await embedBatch(texts, apiKey);

    for (let j = 0; j < batch.length; j++) {
      batch[j].embedding = embeddings[j];
    }

    const progress = Math.min(i + EMBED_BATCH_SIZE, allChunks.length);
    console.log(`  Embedded ${progress}/${allChunks.length}`);

    if (i + EMBED_BATCH_SIZE < allChunks.length) {
      await new Promise((r) => setTimeout(r, EMBED_DELAY_MS));
    }
  }

  const outDir = path.dirname(outputPath);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(outputPath, JSON.stringify(allChunks, null, 2));
  console.log(`\nWrote ${allChunks.length} chunks to ${outputPath}`);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
