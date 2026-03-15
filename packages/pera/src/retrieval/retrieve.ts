import type { CorpusChunk } from "../corpus/types";
import type { DecisionCategory, DecisionEntry } from "../taxonomy/types";
import { embedText } from "./embeddings";
import { VectorStore } from "./vectorStore";

let corpusStore: VectorStore | null = null;
let decisionStore: VectorStore | null = null;
let corpusChunksById: Map<string, CorpusChunk> = new Map();
let decisionsById: Map<string, DecisionEntry> = new Map();
let initialized = false;

export interface PeraRetrievalResult {
  corpusChunks: CorpusChunk[];
  decisionPatterns: DecisionEntry[];
  contextBlock: string;
}

export function isPeraDataLoaded(): boolean {
  return initialized;
}

export function getCorpusSize(): number {
  return corpusStore?.size ?? 0;
}

export function getDecisionCount(): number {
  return decisionStore?.size ?? 0;
}

export function loadCorpusData(chunks: CorpusChunk[]): void {
  corpusStore = new VectorStore();
  corpusChunksById = new Map();

  for (const chunk of chunks) {
    if (chunk.embedding.length === 0) continue;
    corpusStore.add({
      id: chunk.id,
      embedding: chunk.embedding,
      metadata: {
        source: chunk.source,
        sourceType: chunk.sourceType,
        section: chunk.section,
        ...chunk.metadata,
      },
    });
    corpusChunksById.set(chunk.id, chunk);
  }

  initialized = corpusStore.size > 0 || (decisionStore?.size ?? 0) > 0;
}

export function loadDecisionData(decisions: DecisionEntry[]): void {
  decisionStore = new VectorStore();
  decisionsById = new Map();

  for (const decision of decisions) {
    if (decision.embedding.length === 0) continue;
    decisionStore.add({
      id: decision.id,
      embedding: decision.embedding,
      metadata: {
        episodeId: decision.episodeId,
        episodeTitle: decision.episodeTitle,
        category: decision.category,
      },
    });
    decisionsById.set(decision.id, decision);
  }

  initialized = (corpusStore?.size ?? 0) > 0 || decisionStore.size > 0;
}

export async function retrievePeraContext(
  query: string,
  options?: {
    corpusTopK?: number;
    decisionTopK?: number;
    categories?: DecisionCategory[];
  },
): Promise<PeraRetrievalResult> {
  const corpusTopK = options?.corpusTopK ?? 5;
  const decisionTopK = options?.decisionTopK ?? 8;
  const categoryFilter = options?.categories;

  if (!initialized) {
    return {
      corpusChunks: [],
      decisionPatterns: [],
      contextBlock: "",
    };
  }

  let queryEmbedding: number[];
  try {
    queryEmbedding = await embedText(query);
  } catch {
    return { corpusChunks: [], decisionPatterns: [], contextBlock: "" };
  }

  const corpusChunks: CorpusChunk[] = [];
  if (corpusStore && corpusStore.size > 0) {
    const results = corpusStore.search(queryEmbedding, corpusTopK);
    for (const r of results) {
      const chunk = corpusChunksById.get(r.id);
      if (chunk) corpusChunks.push(chunk);
    }
  }

  const decisionPatterns: DecisionEntry[] = [];
  if (decisionStore && decisionStore.size > 0) {
    const filter = categoryFilter
      ? (meta: Record<string, unknown>) =>
          categoryFilter.includes(meta.category as DecisionCategory)
      : undefined;

    const results = filter
      ? decisionStore.searchWithFilter(queryEmbedding, decisionTopK, filter)
      : decisionStore.search(queryEmbedding, decisionTopK);

    for (const r of results) {
      const decision = decisionsById.get(r.id);
      if (decision) decisionPatterns.push(decision);
    }
  }

  const contextBlock = buildContextBlock(corpusChunks, decisionPatterns);

  return { corpusChunks, decisionPatterns, contextBlock };
}

function buildContextBlock(
  chunks: CorpusChunk[],
  decisions: DecisionEntry[],
): string {
  const lines: string[] = [];

  if (chunks.length > 0) {
    lines.push("Things I made:\n");
    for (const chunk of chunks) {
      lines.push(`[${chunk.source} — ${chunk.section}]`);
      lines.push(chunk.text);
      lines.push("");
    }
  }

  if (decisions.length > 0) {
    lines.push("Choices I made and why:\n");
    for (const d of decisions) {
      lines.push(`[${d.episodeTitle} — ${d.category}]`);
      lines.push(`I chose: ${d.choice}`);
      if (d.alternatives.length > 0) {
        lines.push(`I rejected: ${d.alternatives.join("; ")}`);
      }
      lines.push(`Because: ${d.reasoning}`);
      lines.push("");
    }
  }

  return lines.join("\n");
}
