import type { DivergeCandidate, CritiqueEntry } from '../schemas';
import type { SalvageOperator } from './rubric';

export function buildSalvagePrompt(
  candidate: DivergeCandidate,
  critique: CritiqueEntry,
  operators: SalvageOperator[],
): string {
  let prompt = `[STAGE:critique-salvage] [SALVAGE]\n\n`;
  prompt += `## Original Candidate\n`;
  prompt += `ID: ${candidate.id}\n`;
  prompt += `Hook: ${candidate.hook}\n`;
  prompt += `Axes: ${candidate.axes.join(', ')}\n`;
  prompt += `Anti-Generic Claim: ${candidate.antiGenericClaim}\n`;
  prompt += `First 60 min: ${candidate.first60Minutes}\n\n`;
  prompt += `## Critique\n`;
  prompt += `Genericness: ${critique.genericness}/10\n`;
  prompt += `Explanation: ${critique.explanation}\n`;
  prompt += `Flags: ${critique.flags}\n`;
  prompt += `Sameness Notes: ${critique.samenessNotes}\n\n`;
  prompt += `## Operators to Apply\n`;
  for (const op of operators) {
    prompt += `- ${op.name}: ${op.description}\n`;
  }
  prompt += `\nGenerate one mutation per operator. Each mutation must:\n`;
  prompt += `- Produce a full candidate with id, hook, axes, antiGenericClaim, first60Minutes, lens, buckets, operatorTags\n`;
  prompt += `- Maintain feasibility (first60Minutes must be actionable)\n`;
  prompt += `- Differ meaningfully from the original along >=2 axes\n`;

  return prompt;
}
