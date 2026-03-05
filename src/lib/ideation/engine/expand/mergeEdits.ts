import type { Session } from '../../state/sessionTypes';
import type { ExpandExpansion, ExpandOutput } from '../schemas';

export function mergeRegeneratedSection(
  currentExpansion: ExpandExpansion,
  field: string,
  newValue: unknown,
  userEditedFields: Set<string>,
): ExpandExpansion {
  if (userEditedFields.has(field)) {
    return currentExpansion;
  }

  return {
    ...currentExpansion,
    [field]: newValue,
  };
}

export function getBaseExpansion(
  session: Session,
  candidateId: string,
): ExpandExpansion | null {
  const output = session.stageState['expand']?.output as ExpandOutput | null;
  if (!output) return null;
  return output.expansions.find((e) => e.candidateId === candidateId) ?? null;
}
