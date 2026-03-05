import type { DivergeCandidate } from '../schemas';
import type { EffectiveNormalize } from '../normalize';

export function buildExpandPrompt(
  candidate: DivergeCandidate,
  effectiveNormalize: EffectiveNormalize,
  userInputs: string[],
): string {
  let prompt = `[STAGE:expand]\n\n`;
  prompt += `## Context\nSeed Summary: ${effectiveNormalize.seedSummary}\n`;
  prompt += `Assumptions: ${JSON.stringify(effectiveNormalize.assumptions)}\n`;
  const answered = effectiveNormalize.questionAnswers?.filter((qa) => qa.answer?.trim());
  if (answered && answered.length > 0) {
    prompt += '\n## User Clarifications\n';
    for (const qa of answered) {
      prompt += `Q: ${qa.question}\nA: ${qa.answer}\n`;
    }
  }
  prompt += '\n';
  prompt += `## Candidate to Expand\n`;
  prompt += `[EXPAND_CANDIDATE:${candidate.id}]\n`;
  prompt += `Hook: ${candidate.hook}\n`;
  prompt += `Axes: ${candidate.axes.join(', ')}\n`;
  prompt += `Anti-Generic Claim: ${candidate.antiGenericClaim}\n`;
  prompt += `First 60 min: ${candidate.first60Minutes}\n`;
  prompt += `Buckets: ${candidate.buckets.join(', ')}\n\n`;

  if (userInputs.length > 0) {
    prompt += `## User Constraints\n`;
    for (const input of userInputs) {
      prompt += `- ${input}\n`;
    }
    prompt += '\n';
  }

  prompt += `## Instructions\n`;
  prompt += `Expand this candidate into a buildable concept. Include:\n`;
  prompt += `- concept: clear description of the full idea\n`;
  prompt += `- differentiator: what makes this unique\n`;
  prompt += `- scope: { tighten: how to narrow if needed, loosen: how to expand if needed }\n`;
  prompt += `- risks: [{ risk, mitigation }] (2-4 risks)\n`;
  prompt += `- planDay1: concrete day-1 plan\n`;
  prompt += `- planWeek1: concrete week-1 plan\n\n`;
  prompt += `Return JSON in this exact shape:\n`;
  prompt += `{ "candidateId": "${candidate.id}", "concept": "<full description>", "differentiator": "<unique value>", "scope": { "tighten": "<how to narrow>", "loosen": "<how to expand>" }, "risks": [{ "risk": "<risk>", "mitigation": "<mitigation>" }], "planDay1": "<day 1 plan>", "planWeek1": "<week 1 plan>" }\n`;

  return prompt;
}
