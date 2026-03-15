export interface VectorEntry {
  id: string;
  embedding: number[];
  metadata: Record<string, unknown>;
}

export interface SearchResult {
  id: string;
  score: number;
  metadata: Record<string, unknown>;
}

function dotProduct(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

function magnitude(v: number[]): number {
  let sum = 0;
  for (let i = 0; i < v.length; i++) sum += v[i] * v[i];
  return Math.sqrt(sum);
}

function cosineSimilarity(a: number[], b: number[]): number {
  const dot = dotProduct(a, b);
  const magA = magnitude(a);
  const magB = magnitude(b);
  if (magA === 0 || magB === 0) return 0;
  return dot / (magA * magB);
}

export class VectorStore {
  private entries: VectorEntry[];

  constructor(entries: VectorEntry[] = []) {
    this.entries = entries;
  }

  get size(): number {
    return this.entries.length;
  }

  add(entry: VectorEntry): void {
    this.entries.push(entry);
  }

  addBatch(entries: VectorEntry[]): void {
    this.entries.push(...entries);
  }

  search(query: number[], topK: number = 5): SearchResult[] {
    if (this.entries.length === 0) return [];

    const scored = this.entries.map((entry) => ({
      id: entry.id,
      score: cosineSimilarity(query, entry.embedding),
      metadata: entry.metadata,
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }

  searchWithFilter(
    query: number[],
    topK: number,
    filter: (metadata: Record<string, unknown>) => boolean,
  ): SearchResult[] {
    if (this.entries.length === 0) return [];

    const scored = this.entries
      .filter((e) => filter(e.metadata))
      .map((entry) => ({
        id: entry.id,
        score: cosineSimilarity(query, entry.embedding),
        metadata: entry.metadata,
      }));

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK);
  }

  clear(): void {
    this.entries = [];
  }
}
