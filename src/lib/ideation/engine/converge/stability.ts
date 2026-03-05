import type { ScoreEntry } from '../schemas';

export function computeInputHash(inputs: unknown): string {
  const json = JSON.stringify(inputs);
  let hash = 0;
  for (let i = 0; i < json.length; i++) {
    hash = ((hash << 5) - hash) + json.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export function roundScores(scorecard: ScoreEntry[]): ScoreEntry[] {
  return scorecard.map((entry) => ({
    ...entry,
    novelty: Math.round(entry.novelty * 10) / 10,
    usefulness: Math.round(entry.usefulness * 10) / 10,
    feasibility: Math.round(entry.feasibility * 10) / 10,
    differentiation: Math.round(entry.differentiation * 10) / 10,
    energyGuess: Math.round(entry.energyGuess * 10) / 10,
  }));
}

export function sortByTotal(scorecard: ScoreEntry[]): ScoreEntry[] {
  return [...scorecard].sort((a, b) => {
    const totalA =
      a.novelty + a.usefulness + a.feasibility + a.differentiation + a.energyGuess;
    const totalB =
      b.novelty + b.usefulness + b.feasibility + b.differentiation + b.energyGuess;
    return totalB - totalA;
  });
}
