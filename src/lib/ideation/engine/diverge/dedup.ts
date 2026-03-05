import type { DivergeCandidate } from '../schemas';
import { COVERAGE_BUCKETS } from './quotas';

export interface DedupResult {
  kept: DivergeCandidate[];
  removed: Array<{ candidate: DivergeCandidate; reason: string }>;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/\W+/)
    .filter((t) => t.length > 2);
}

function buildTfIdfVectors(documents: string[][]): {
  terms: string[];
  vectors: number[][];
} {
  const df = new Map<string, number>();
  const N = documents.length;

  for (const doc of documents) {
    const seen = new Set<string>();
    for (const term of doc) {
      if (!seen.has(term)) {
        df.set(term, (df.get(term) ?? 0) + 1);
        seen.add(term);
      }
    }
  }

  const terms = [...df.keys()];
  const vectors: number[][] = documents.map((doc) => {
    return terms.map((term) => {
      const tf = doc.filter((t) => t === term).length / (doc.length || 1);
      const idf = Math.log(N / (df.get(term) ?? 1));
      return tf * idf;
    });
  });

  return { terms, vectors };
}

function cosineSim(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function jaccard(a: string[], b: string[]): number {
  const setA = new Set(a.map((s) => s.toLowerCase()));
  const setB = new Set(b.map((s) => s.toLowerCase()));
  const intersection = [...setA].filter((x) => setB.has(x)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

function candidateText(c: DivergeCandidate): string {
  return `${c.hook} ${c.antiGenericClaim} ${c.first60Minutes}`;
}

function bucketRarity(
  candidate: DivergeCandidate,
  allCandidates: DivergeCandidate[],
): number {
  let rarity = 0;
  const counts = new Map<string, number>();
  for (const c of allCandidates) {
    for (const b of c.buckets) counts.set(b, (counts.get(b) ?? 0) + 1);
  }
  for (const b of candidate.buckets) {
    const count = counts.get(b) ?? 0;
    rarity += count > 0 ? 1 / count : COVERAGE_BUCKETS.length;
  }
  return rarity;
}

export function dedup(
  candidates: DivergeCandidate[],
  pinnedIds: Set<string>,
): DedupResult {
  if (candidates.length <= 1)
    return { kept: [...candidates], removed: [] };

  const docs = candidates.map((c) => tokenize(candidateText(c)));
  const { vectors } = buildTfIdfVectors(docs);

  const sortedIndices = candidates
    .map((c, i) => ({
      index: i,
      pinned: pinnedIds.has(c.id),
      rarity: bucketRarity(c, candidates),
    }))
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.rarity - a.rarity;
    })
    .map((x) => x.index);

  const kept: DivergeCandidate[] = [];
  const keptVectorIndices: number[] = [];
  const removed: Array<{ candidate: DivergeCandidate; reason: string }> = [];

  for (const idx of sortedIndices) {
    const c = candidates[idx];

    if (pinnedIds.has(c.id)) {
      kept.push(c);
      keptVectorIndices.push(idx);
      continue;
    }

    let isDup = false;
    for (const keptIdx of keptVectorIndices) {
      const cos = cosineSim(vectors[idx], vectors[keptIdx]);
      const axJ = jaccard(c.axes, candidates[keptIdx].axes);

      if (cos >= 0.82 || (cos >= 0.72 && axJ >= 0.5)) {
        isDup = true;
        removed.push({
          candidate: c,
          reason: `duplicate of ${candidates[keptIdx].id} (cos=${cos.toFixed(2)}, axesJaccard=${axJ.toFixed(2)})`,
        });
        break;
      }
    }

    if (!isDup) {
      kept.push(c);
      keptVectorIndices.push(idx);
    }
  }

  return { kept, removed };
}

export function checkAxesDifference(
  candidates: DivergeCandidate[],
  pinnedIds: Set<string>,
): Array<{ candidateId: string; nearestId: string; sharedAxes: string[] }> {
  const violations: Array<{
    candidateId: string;
    nearestId: string;
    sharedAxes: string[];
  }> = [];

  for (const c of candidates) {
    if (pinnedIds.has(c.id)) continue;

    const others = candidates.filter((o) => o.id !== c.id);
    if (others.length === 0) continue;

    let maxOverlap = 0;
    let nearest = others[0];
    for (const o of others) {
      const shared = c.axes.filter((a) =>
        o.axes.map((x) => x.toLowerCase()).includes(a.toLowerCase()),
      );
      if (shared.length > maxOverlap) {
        maxOverlap = shared.length;
        nearest = o;
      }
    }

    const shared = c.axes.filter((a) =>
      nearest.axes.map((x) => x.toLowerCase()).includes(a.toLowerCase()),
    );
    const unique = c.axes.filter(
      (a) =>
        !nearest.axes.map((x) => x.toLowerCase()).includes(a.toLowerCase()),
    );

    if (unique.length < 2) {
      violations.push({
        candidateId: c.id,
        nearestId: nearest.id,
        sharedAxes: shared,
      });
    }
  }

  return violations;
}
