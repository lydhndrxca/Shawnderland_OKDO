export interface CulturePack {
  id: string;
  name: string;
  description: string;
  anchorsPrompt: string;
}

export const CULTURE_PACKS: CulturePack[] = [
  {
    id: 'triangulation-default',
    name: 'Triangulation Default',
    description: 'Requires three cultural anchor fields: narrative form, material practice, and social structure.',
    anchorsPrompt:
      'For each idea, include a culture block with: narrativeForm (a storytelling tradition or genre), materialPractice (a craft, tool, or physical practice), and socialStructure (a community organizing principle). Each anchor must be specific and researchable, not stereotyped.',
  },
];

export function getCulturePack(id: string): CulturePack | undefined {
  return CULTURE_PACKS.find((p) => p.id === id);
}
