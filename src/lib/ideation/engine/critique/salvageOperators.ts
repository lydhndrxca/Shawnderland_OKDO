import type { CritiqueEntry } from '../schemas';
import { SALVAGE_OPERATORS, type SalvageOperator } from './rubric';

export function selectOperatorsForCandidate(
  critique: CritiqueEntry,
  minMutations: number,
): SalvageOperator[] {
  const selected: SalvageOperator[] = [];
  const flags = critique.flags.toLowerCase();

  if (flags.includes('cliché') || flags.includes('sameness')) {
    selected.push(SALVAGE_OPERATORS.find((o) => o.id === 'inversion')!);
  }
  if (flags.includes('missing differentiator')) {
    selected.push(SALVAGE_OPERATORS.find((o) => o.id === 'constraint-art')!);
  }
  if (flags.includes('unclear audience')) {
    selected.push(SALVAGE_OPERATORS.find((o) => o.id === 'design-heuristic')!);
  }

  if (selected.length === 0) {
    selected.push(SALVAGE_OPERATORS.find((o) => o.id === 'scamper')!);
  }

  while (selected.length < minMutations) {
    const remaining = SALVAGE_OPERATORS.filter(
      (o) => !selected.some((s) => s.id === o.id),
    );
    if (remaining.length === 0) break;
    selected.push(remaining[0]);
  }

  return selected;
}
