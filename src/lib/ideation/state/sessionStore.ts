import type { Session } from './sessionTypes';
import { DEFAULT_SETTINGS } from './sessionTypes';
import { STAGE_IDS } from '../engine/stages';

export interface LoadResult {
  session: Session | null;
  corrupted: boolean;
  reason?: string;
}

export function createNewSession(): Session {
  const stageState: Record<string, { output: null; stale: boolean; lastRunEventId: null }> = {};
  for (const id of STAGE_IDS) {
    stageState[id] = { output: null, stale: false, lastRunEventId: null };
  }

  const now = new Date().toISOString();
  const branchId = 'main';
  return {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    seedText: '',
    activeBranchId: branchId,
    projectName: '',
    settings: { ...DEFAULT_SETTINGS },
    events: [
      {
        id: crypto.randomUUID(),
        type: 'SESSION_CREATE',
        timestamp: now,
        branchId,
        data: {},
      },
    ],
    stageState,
  };
}

export async function persistSession(session: Session): Promise<{ bytes: number }> {
  const data = JSON.stringify(session, null, 2);
  const bytes = data.length;
  localStorage.setItem('shawndermind-session', data);
  return { bytes };
}

export async function loadSession(): Promise<LoadResult> {
  try {
    const data = localStorage.getItem('shawndermind-session');
    if (!data) return { session: null, corrupted: false };
    return { session: JSON.parse(data) as Session, corrupted: false };
  } catch {
    return { session: null, corrupted: true, reason: 'parse_error' };
  }
}
