import type { LensType } from '../schemas';

export const LENS_TYPES: readonly LensType[] = [
  'practical',
  'inversion',
  'constraint_art',
] as const;

export const LENS_LABELS: Record<LensType, string> = {
  practical: 'Practical',
  inversion: 'Contrarian / Inversion',
  constraint_art: 'Constraint Art',
};

export function distributeCounts(
  total: number,
  lensCount: number,
): number[] {
  const base = Math.floor(total / lensCount);
  const remainder = total % lensCount;
  return Array.from({ length: lensCount }, (_, i) =>
    base + (i < remainder ? 1 : 0),
  );
}
