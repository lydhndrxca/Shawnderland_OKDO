import type { EffectiveNormalize } from '../normalize';
import type { DivergeCandidate, LensType } from '../schemas';

const LENS_INSTRUCTIONS: Record<LensType, string> = {
  practical:
    'Generate candidates through a PRACTICAL lens: utilitarian, shippable, ' +
    'low-risk execution angles. Focus on clear market fit and feasibility.',
  inversion:
    'Generate candidates through a CONTRARIAN/INVERSION lens: flip assumptions, ' +
    'reverse incentives, explore "what if the opposite were true?" angles.',
  constraint_art:
    'Generate candidates through a CROSS-CULTURAL/CONSTRAINT-ART lens: apply unusual ' +
    'constraints, cultural frames, medium/format restrictions to spark unexpected ideas.',
};

function formatNormalizeContext(eff: EffectiveNormalize): string {
  let ctx = `## Seed Summary\n${eff.seedSummary}\n\n`;
  ctx += '## Assumptions\n';
  for (const a of eff.assumptions) {
    const tag = a.userOverride ? ' [USER OVERRIDE]' : '';
    ctx += `- ${a.key}: ${a.value}${tag}\n`;
  }
  return ctx;
}

export function buildDivergeLensPrompt(
  lens: LensType,
  effectiveNormalize: EffectiveNormalize,
  userInputs: string[],
  count: number,
): string {
  let prompt = `[STAGE:diverge][LENS:${lens}]\n\n`;
  prompt += formatNormalizeContext(effectiveNormalize);
  prompt += '\n';

  if (userInputs.length > 0) {
    prompt += '## User Constraints\n';
    for (const input of userInputs) prompt += `- ${input}\n`;
    prompt += '\n';
  }

  prompt += `## Lens\n${LENS_INSTRUCTIONS[lens]}\n\n`;
  prompt +=
    `Generate exactly ${count} candidates.\n\n` +
    'Return JSON in this exact shape: { "candidates": [ { "id": "<unique-id>", "hook": "<one-line pitch>", "axes": ["<axis1>", "<axis2>", "<axis3>"], "antiGenericClaim": "<what makes this non-obvious>", "first60Minutes": "<concrete first steps>", "lens": "' + lens + '", "buckets": ["<bucket>"], "operatorTags": ["<tag>"] }, ... ] }\n\n' +
    'Buckets must include at least 1 from: Tooling / Workflow, Creative Media, Simulation / Systems, Social / Community, Business / Monetization, Weird / Art Film.\n' +
    'Each candidate must have ≥3 axes and differ along ≥2 structural axes from every other candidate.\n';
  return prompt;
}

export function buildDivergeRegenPrompt(
  missingBuckets: string[],
  existingCandidates: DivergeCandidate[],
  effectiveNormalize: EffectiveNormalize,
  count: number,
): string {
  let prompt = '[STAGE:diverge][REGEN:missing]\n\n';
  prompt += formatNormalizeContext(effectiveNormalize);
  prompt += '\n';
  prompt += `## Required Buckets\n${missingBuckets.join(', ')}\n\n`;
  prompt += '## Existing Candidates (do NOT duplicate)\n';
  for (const c of existingCandidates) {
    prompt += `- ${c.id}: ${c.hook} [axes: ${c.axes.join(', ')}]\n`;
  }
  prompt += `\nGenerate ${count} NEW candidates covering the required buckets.\n`;
  prompt += 'Each must differ along ≥2 axes from all existing candidates.\n\n';
  prompt += 'Return JSON in this exact shape: { "candidates": [ { "id": "<unique-id>", "hook": "<one-line pitch>", "axes": ["<axis1>", "<axis2>", "<axis3>"], "antiGenericClaim": "<what makes this non-obvious>", "first60Minutes": "<concrete first steps>", "lens": "<practical|inversion|constraint_art>", "buckets": ["<bucket>"], "operatorTags": ["<tag>"] }, ... ] }\n';
  return prompt;
}

export function buildVariantPrompt(
  source: DivergeCandidate,
  differAlong: string,
  effectiveNormalize: EffectiveNormalize | null,
): string {
  let prompt = '[STAGE:diverge][REGEN:variant]\n\n';
  if (effectiveNormalize) {
    prompt += formatNormalizeContext(effectiveNormalize);
    prompt += '\n';
  }
  prompt += `## Source Candidate\n`;
  prompt += `Hook: ${source.hook}\n`;
  prompt += `Axes: ${source.axes.join(', ')}\n`;
  prompt += `Anti-Generic Claim: ${source.antiGenericClaim}\n\n`;
  prompt += `Generate ONE candidate similar to the source but DIFFERENT along the "${differAlong}" axis.\n`;
  prompt += 'Keep the same general bucket coverage but shift the structural approach.\n\n';
  prompt += 'Return JSON: { "id": "<unique-id>", "hook": "<one-line pitch>", "axes": ["<axis1>", "<axis2>", "<axis3>"], "antiGenericClaim": "<claim>", "first60Minutes": "<steps>", "lens": "<practical|inversion|constraint_art>", "buckets": ["<bucket>"], "operatorTags": ["<tag>"] }\n';
  return prompt;
}
