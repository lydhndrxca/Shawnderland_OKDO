export interface CommitTemplate {
  id: string;
  label: string;
  sections: readonly string[];
  preamble: string;
}

export const COMMIT_TEMPLATES: CommitTemplate[] = [
  {
    id: 'game-one-pager',
    label: 'Game One-Pager',
    sections: ['Differentiator', 'Constraints', 'First 60 Minutes', 'Next 3 Actions', 'Risk Notes'],
    preamble:
      'You are designing a game concept one-pager. The audience is a small team that needs to start building today. Keep every section concrete and executable within 30–90 minutes.',
  },
  {
    id: 'song-blueprint',
    label: 'Song Blueprint',
    sections: ['Differentiator', 'Constraints', 'First 60 Minutes', 'Next 3 Actions', 'Risk Notes'],
    preamble:
      'You are drafting a song blueprint for a solo musician/producer. Focus on the sonic identity, structural constraints, and the first recording session. Everything must be actionable within 30–90 minutes.',
  },
  {
    id: 'writing-outline',
    label: 'Writing Outline',
    sections: ['Differentiator', 'Constraints', 'First 60 Minutes', 'Next 3 Actions', 'Risk Notes'],
    preamble:
      'You are creating a writing outline (essay, short story, or article). Emphasize the unique angle, structural constraints, and the first drafting session. All actions must be completable within 30–90 minutes.',
  },
];

export type TemplateId = (typeof COMMIT_TEMPLATES)[number]['id'];

export function getTemplate(id: string): CommitTemplate | undefined {
  return COMMIT_TEMPLATES.find((t) => t.id === id);
}
