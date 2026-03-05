import type { DivergeCandidate } from '../schemas';
import type { EffectiveNormalize } from '../normalize';
import { CRITIQUE_FLAGS, GENERICNESS_THRESHOLD } from './rubric';

export function buildCritiquePrompt(
  candidates: DivergeCandidate[],
  effectiveNormalize: EffectiveNormalize,
): string {
  const candidateIds = candidates.map((c) => c.id).join(',');
  let prompt = `[STAGE:critique-salvage]\n\n`;
  prompt += `## Context\nSeed Summary: ${effectiveNormalize.seedSummary}\n`;
  prompt += `Assumptions: ${JSON.stringify(effectiveNormalize.assumptions)}\n\n`;
  prompt += `## Candidates to Critique\n[CANDIDATES:${candidateIds}]\n`;

  for (const c of candidates) {
    prompt += `\n### ${c.id}\n`;
    prompt += `Hook: ${c.hook}\n`;
    prompt += `Axes: ${c.axes.join(', ')}\n`;
    prompt += `Anti-Generic Claim: ${c.antiGenericClaim}\n`;
    prompt += `First 60 min: ${c.first60Minutes}\n`;
    prompt += `Buckets: ${c.buckets.join(', ')}\n`;
  }

  prompt += `\n## Instructions\n`;
  prompt += `Score each candidate on genericness (0–10).\n`;
  prompt += `Threshold: ${GENERICNESS_THRESHOLD}. Any candidate at or above must receive >=2 mutations.\n`;
  prompt += `Flags to check: ${CRITIQUE_FLAGS.join(', ')}.\n`;
  prompt += `For each generic candidate, provide at least 2 mutations using salvage operators.\n`;
  prompt += `Each mutation must produce a complete mutatedCandidate with feasible first60Minutes.\n\n`;
  prompt += `Return JSON in this exact shape:\n`;
  prompt += `{ "critiques": [ { "candidateId": "<id>", "genericness": <0-10>, "explanation": "<why>", "flags": "<flag notes or empty string>", "samenessNotes": "<what overlaps or empty string>" } ],\n`;
  prompt += `  "mutations": [ { "candidateId": "<id>", "mutationId": "<unique-id>", "operator": "<SCAMPER|Inversion|Constraint-Art|Design Heuristic>", "description": "<what changed>",\n`;
  prompt += `    "mutatedCandidate": { "id": "<new-id>", "hook": "<pitch>", "axes": ["<a>","<b>","<c>"], "antiGenericClaim": "<claim>", "first60Minutes": "<steps>", "lens": "practical", "buckets": ["<b>"], "operatorTags": ["<t>"] } } ] }\n`;
  prompt += `\nIMPORTANT: The "lens" field in mutatedCandidate MUST be exactly one of: "practical", "inversion", "constraint_art". No other values are allowed. Use the same lens as the original candidate being mutated, or pick the most appropriate one from these three.\n`;
  prompt += `All string fields must be non-null strings (use empty string "" if not applicable).\n`;

  return prompt;
}
