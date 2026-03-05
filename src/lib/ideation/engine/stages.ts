export const STAGE_IDS = [
  'seed',
  'normalize',
  'diverge',
  'critique-salvage',
  'expand',
  'converge',
  'commit',
  'iterate',
] as const;

export type StageId = (typeof STAGE_IDS)[number];

export const STAGE_LABELS: Record<StageId, string> = {
  seed: 'Seed',
  normalize: 'Normalize',
  diverge: 'Diverge',
  'critique-salvage': 'Critique/Salvage',
  expand: 'Expand',
  converge: 'Converge',
  commit: 'Commit',
  iterate: 'Iterate',
};

export function getStageIndex(stageId: StageId): number {
  return STAGE_IDS.indexOf(stageId);
}

export function getDownstreamStages(stageId: StageId): StageId[] {
  const idx = getStageIndex(stageId);
  return [...STAGE_IDS].slice(idx + 1);
}

export function getPreviousStage(stageId: StageId): StageId | undefined {
  const idx = getStageIndex(stageId);
  return idx > 0 ? STAGE_IDS[idx - 1] : undefined;
}

export function getNextStage(stageId: StageId): StageId | undefined {
  const idx = getStageIndex(stageId);
  return idx < STAGE_IDS.length - 1 ? STAGE_IDS[idx + 1] : undefined;
}
