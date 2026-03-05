import type { DivergeCandidate, ExpandExpansion } from '../schemas';
import type { EffectiveNormalize } from '../normalize';
import { getTemplate } from './templates';

export interface CommitInputs {
  winnerId: string;
  candidate: DivergeCandidate;
  expansion: ExpandExpansion;
  effectiveNormalize: EffectiveNormalize;
  userInputs: string[];
  templateType: string;
}

export function buildCommitPrompt(inputs: CommitInputs): string {
  const template = getTemplate(inputs.templateType);
  const preamble = template?.preamble ?? 'Create a commit artifact for this idea.';

  let prompt = `[STAGE:commit]\n\n`;
  prompt += `## Template: ${template?.label ?? inputs.templateType}\n`;
  prompt += `${preamble}\n\n`;
  prompt += `## Winner Candidate\n`;
  prompt += `ID: ${inputs.candidate.id}\n`;
  prompt += `Hook: ${inputs.candidate.hook}\n`;
  prompt += `Axes: ${inputs.candidate.axes.join(', ')}\n`;
  prompt += `Anti-Generic Claim: ${inputs.candidate.antiGenericClaim}\n`;
  prompt += `First 60 min: ${inputs.candidate.first60Minutes}\n\n`;
  prompt += `## Expansion\n`;
  prompt += `Concept: ${inputs.expansion.concept}\n`;
  prompt += `Differentiator: ${inputs.expansion.differentiator}\n`;
  prompt += `Scope tighten: ${inputs.expansion.scope.tighten}\n`;
  prompt += `Scope loosen: ${inputs.expansion.scope.loosen}\n`;
  prompt += `Risks: ${inputs.expansion.risks.map((r) => `${r.risk} → ${r.mitigation}`).join('; ')}\n`;
  prompt += `Plan Day 1: ${inputs.expansion.planDay1}\n`;
  prompt += `Plan Week 1: ${inputs.expansion.planWeek1}\n\n`;
  prompt += `## Normalize Context\n`;
  prompt += `Summary: ${inputs.effectiveNormalize.seedSummary}\n`;
  prompt += `Assumptions: ${inputs.effectiveNormalize.assumptions.map((a) => `${a.key}=${a.value}${a.userOverride ? ' [OVERRIDE]' : ''}`).join('; ')}\n\n`;

  if (inputs.userInputs.length > 0) {
    prompt += `## User Constraints\n`;
    for (const ui of inputs.userInputs) {
      prompt += `- ${ui}\n`;
    }
    prompt += '\n';
  }

  prompt += `## Instructions\n`;
  prompt += `Produce a commit artifact with these sections:\n`;
  prompt += `- artifactType: "${template?.label ?? 'Product Concept'}"\n`;
  prompt += `- title: concise, memorable name\n`;
  prompt += `- differentiator: what makes this unique (from expansion)\n`;
  prompt += `- constraints: explicit constraints from normalize overrides + user inputs + winner constraints\n`;
  prompt += `- first60Minutes: actionable plan for the first 30–90 minutes\n`;
  prompt += `- next3Actions: 3 imperative-verb actions\n`;
  prompt += `- riskNotes: key risks with mitigations\n\n`;
  prompt += `Return JSON in this exact shape:\n`;
  prompt += `{ "artifactType": "${template?.label ?? 'Product Concept'}", "title": "<name>", "differentiator": "<unique value>", "constraints": "<constraints>", "first60Minutes": "<action plan>", "next3Actions": "<3 actions>", "riskNotes": "<risks>" }\n`;

  return prompt;
}

export function buildCommitMarkdown(
  data: {
    artifactType: string;
    title: string;
    differentiator: string;
    constraints: string;
    first60Minutes: string;
    next3Actions: string;
    riskNotes: string;
  },
  metadata: {
    sessionId: string;
    winnerId: string;
    templateType: string;
  },
): string {
  const ts = new Date().toISOString();
  let md = '';
  md += `sessionId: ${metadata.sessionId}\n`;
  md += `timestamp: ${ts}\n`;
  md += `winnerId: ${metadata.winnerId}\n`;
  md += `templateType: ${metadata.templateType}\n`;
  md += `--------------------\n\n`;
  md += `# ${data.title}\n\n`;
  md += `**Type:** ${data.artifactType}\n\n`;
  md += `## Differentiator\n${data.differentiator}\n\n`;
  md += `## Constraints\n${data.constraints}\n\n`;
  md += `## First 60 Minutes\n${data.first60Minutes}\n\n`;
  md += `## Next 3 Actions\n${data.next3Actions}\n\n`;
  md += `## Risk Notes\n${data.riskNotes}\n`;
  return md;
}
