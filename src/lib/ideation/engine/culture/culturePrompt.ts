import { getCulturePack } from './culturePacks';
import { buildProxyFramingInstruction } from './antiExoticism';

export interface CulturePromptOpts {
  proxyMode: boolean;
  packId?: string;
}

function requestTriangulationFields(): string {
  return (
    '\nEach idea must include a `culture` object with:\n' +
    '- anchors.narrativeForm: a specific storytelling or narrative tradition\n' +
    '- anchors.materialPractice: a specific craft, material, or physical practice\n' +
    '- anchors.socialStructure: a specific community organizing principle or social pattern\n' +
    '- respectNote: acknowledgment of the culture and how this idea avoids appropriation\n' +
    '- researchToValidate: comma-separated list of specific things to research before proceeding\n'
  );
}

export function addCultureInstructions(opts: CulturePromptOpts): string {
  const pack = getCulturePack(opts.packId ?? 'triangulation-default');
  if (!pack) return '';

  let text = '\n## Cultural Anchoring (Required)\n';
  text += pack.anchorsPrompt + '\n';
  text += requestTriangulationFields();

  if (opts.proxyMode) {
    text += '\n' + buildProxyFramingInstruction() + '\n';
  }

  return text;
}
