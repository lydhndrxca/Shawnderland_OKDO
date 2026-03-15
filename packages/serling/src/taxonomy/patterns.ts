import type { DecisionCategory, DecisionEntry } from "./types";

/**
 * Groups decision entries by category for quick lookup.
 */
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

/**
 * Groups decision entries by episode for cross-referencing.
 */
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

/**
 * Returns unique choice values for a given category,
 * useful for understanding the range of Serling's decisions.
 */
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

/**
 * Finds all episodes where Serling made a similar choice in a given category.
 */
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
