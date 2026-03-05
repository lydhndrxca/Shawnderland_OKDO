import type { CultureBlock } from '../schemas';

const STEREOTYPED_TERMS = [
  /\bexotic\b/i,
  /\bprimitive\b/i,
  /\bmystical\b/i,
  /\btribal\b/i,
  /\boriental\b/i,
  /\bnative\b.*\bwisdom\b/i,
  /\bancient\s+secret/i,
  /\bspiritual\b.*\bjourney\b/i,
];

export interface ExoticismCheckResult {
  ok: boolean;
  flags: string[];
}

export function checkCulture(culture: CultureBlock): ExoticismCheckResult {
  const flags: string[] = [];

  const allText = [
    culture.anchors.narrativeForm,
    culture.anchors.materialPractice,
    culture.anchors.socialStructure,
    culture.respectNote,
    culture.researchToValidate,
  ].join(' ');

  for (const pattern of STEREOTYPED_TERMS) {
    if (pattern.test(allText)) {
      flags.push(`Stereotyped framing detected: ${pattern.source}`);
    }
  }

  const researchItems = culture.researchToValidate
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (researchItems.length < 2) {
    flags.push('researchToValidate must be a specific, multi-item list (at least 2 items)');
  }

  for (const item of researchItems) {
    if (item.split(/\s+/).length < 3) {
      flags.push(`Research item too vague: "${item}"`);
    }
  }

  if (!culture.respectNote || culture.respectNote.length < 10) {
    flags.push('respectNote is missing or too brief');
  }

  return { ok: flags.length === 0, flags };
}

export function buildProxyFramingInstruction(): string {
  return (
    'IMPORTANT: Use fictional proxy framing for all cultural references. ' +
    'Do not claim direct representation of any real culture. Instead, create ' +
    'a fictional analog that draws inspiration while making the fictional nature explicit. ' +
    'Label all cultural references as "inspired by" rather than "from".'
  );
}
