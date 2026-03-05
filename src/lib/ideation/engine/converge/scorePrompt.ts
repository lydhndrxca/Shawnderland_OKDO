import type { DivergeCandidate, ExpandExpansion } from '../schemas';

export function buildScorePrompt(
  expansions: ExpandExpansion[],
  candidates: DivergeCandidate[],
): string {
  let prompt = `[STAGE:converge]\n\n`;
  prompt += `## Candidates to Score\n`;
  prompt += `[CONVERGE_IDS:${expansions.map((e) => e.candidateId).join(',')}]\n\n`;

  for (const exp of expansions) {
    const candidate = candidates.find((c) => c.id === exp.candidateId);
    prompt += `### ${exp.candidateId}\n`;
    if (candidate) {
      prompt += `Hook: ${candidate.hook}\n`;
      prompt += `Axes: ${candidate.axes.join(', ')}\n`;
    }
    prompt += `Concept: ${exp.concept}\n`;
    prompt += `Differentiator: ${exp.differentiator}\n`;
    prompt += `Risks: ${exp.risks.map((r) => r.risk).join('; ')}\n`;
    prompt += `Plan Day 1: ${exp.planDay1}\n`;
    prompt += `Plan Week 1: ${exp.planWeek1}\n\n`;
  }

  prompt += `## Instructions\n`;
  prompt += `Score each candidate on: novelty, usefulness, feasibility, differentiation, energyGuess (all 0-10).\n`;
  prompt += `Round scores to 1 decimal place for stability.\n`;
  prompt += `Select a winnerId and runnerUpId.\n`;
  prompt += `For the winner, suggest cutsToShip (what to cut for a lean launch).\n\n`;
  prompt += `Return JSON in this exact shape:\n`;
  prompt += `{ "scorecard": [ { "candidateId": "<id>", "novelty": <0-10>, "usefulness": <0-10>, "feasibility": <0-10>, "differentiation": <0-10>, "energyGuess": <0-10>, "rationale": "<why>" } ],\n`;
  prompt += `  "winnerId": "<id>", "runnerUpId": "<id>",\n`;
  prompt += `  "cutsToShip": [ { "candidateId": "<winner-id>", "cuts": "<what to cut>" } ] }\n`;

  return prompt;
}
