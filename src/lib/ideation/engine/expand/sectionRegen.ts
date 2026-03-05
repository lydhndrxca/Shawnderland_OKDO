import type { DivergeCandidate, ExpandExpansion } from '../schemas';

export function buildSectionRegenPrompt(
  candidate: DivergeCandidate,
  expansion: ExpandExpansion,
  field: string,
  hint?: string,
): string {
  let prompt = `[STAGE:expand] [SECTION_REGEN:${field}]\n\n`;
  prompt += `## Candidate\n`;
  prompt += `Hook: ${candidate.hook}\n`;
  prompt += `Axes: ${candidate.axes.join(', ')}\n\n`;
  prompt += `## Current Expansion\n`;
  prompt += `Concept: ${expansion.concept}\n`;
  prompt += `Differentiator: ${expansion.differentiator}\n`;
  prompt += `Scope tighten: ${expansion.scope.tighten}\n`;
  prompt += `Scope loosen: ${expansion.scope.loosen}\n`;
  prompt += `Plan Day 1: ${expansion.planDay1}\n`;
  prompt += `Plan Week 1: ${expansion.planWeek1}\n\n`;
  prompt += `## Instructions\n`;
  prompt += `Regenerate ONLY the "${field}" section. Keep everything else consistent.\n`;
  if (hint) {
    prompt += `User hint: ${hint}\n`;
  }
  prompt += `\nReturn the FULL expansion as JSON: { "candidateId": "${expansion.candidateId}", "concept": "<...>", "differentiator": "<...>", "scope": { "tighten": "<...>", "loosen": "<...>" }, "risks": [{ "risk": "<...>", "mitigation": "<...>" }], "planDay1": "<...>", "planWeek1": "<...>" }\n`;
  prompt += `Only change the "${field}" field; keep all other fields identical to the current expansion.\n`;

  return prompt;
}

export const REGENERABLE_FIELDS = [
  'concept',
  'differentiator',
  'scope',
  'risks',
  'planDay1',
  'planWeek1',
] as const;

export type RegenerableField = (typeof REGENERABLE_FIELDS)[number];
