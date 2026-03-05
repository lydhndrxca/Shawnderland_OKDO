export const GENERICNESS_THRESHOLD = 6;

export const CRITIQUE_FLAGS = [
  'cliché pattern',
  'missing differentiator',
  'unclear audience',
  'sameness to others',
] as const;

export type CritiqueFlag = (typeof CRITIQUE_FLAGS)[number];

export const SALVAGE_OPERATORS = [
  {
    id: 'scamper',
    name: 'SCAMPER',
    description:
      'Substitute, Combine, Adapt, Modify, Put to other use, Eliminate, Reverse',
  },
  {
    id: 'inversion',
    name: 'Inversion',
    description: 'Flip the core assumption or approach',
  },
  {
    id: 'constraint-art',
    name: 'Constraint-Art',
    description: 'Apply an unusual constraint to force novelty',
  },
  {
    id: 'design-heuristic',
    name: 'Design Heuristic',
    description: 'Apply established design heuristic patterns',
  },
] as const;

export type SalvageOperator = (typeof SALVAGE_OPERATORS)[number];
export type SalvageOperatorId = SalvageOperator['id'];
