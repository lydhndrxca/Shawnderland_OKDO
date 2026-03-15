import type { DecisionCategory, DecisionEntry } from "./types";

export function groupByCategory(
  entries: DecisionEntry[],
): Map<DecisionCategory, DecisionEntry[]> {
  const map = new Map<DecisionCategory, DecisionEntry[]>();
  for (const e of entries) {
    const list = map.get(e.category) || [];
    list.push(e);
    map.set(e.category, list);
  }
  return map;
}

export function groupByEpisode(
  entries: DecisionEntry[],
): Map<string, DecisionEntry[]> {
  const map = new Map<string, DecisionEntry[]>();
  for (const e of entries) {
    const list = map.get(e.episodeId) || [];
    list.push(e);
    map.set(e.episodeId, list);
  }
  return map;
}

export function uniqueChoices(
  entries: DecisionEntry[],
  category: DecisionCategory,
): string[] {
  const choices = new Set<string>();
  for (const e of entries) {
    if (e.category === category) choices.add(e.choice);
  }
  return Array.from(choices);
}

export function findSimilarChoices(
  entries: DecisionEntry[],
  category: DecisionCategory,
  choice: string,
): DecisionEntry[] {
  const target = choice.toLowerCase();
  return entries.filter(
    (e) => e.category === category && e.choice.toLowerCase().includes(target),
  );
}
