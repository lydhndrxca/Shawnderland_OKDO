import type { StageId } from '../engine/stages';

export interface StageState {
  output: unknown | null;
  stale: boolean;
  lastRunEventId: string | null;
}

export type EventType =
  | 'SESSION_CREATE'
  | 'SEED_EDIT'
  | 'USER_INPUT'
  | 'STAGE_RUN'
  | 'NORMALIZE_EDIT_SUMMARY'
  | 'NORMALIZE_EDIT_ASSUMPTIONS'
  | 'DIVERGE_PIN'
  | 'DIVERGE_UNPIN'
  | 'DIVERGE_REGEN_UNPINNED'
  | 'DIVERGE_REGEN_VARIANT'
  | 'CRITIQUE_RUN'
  | 'MUTATION_APPLIED'
  | 'MUTATION_REJECTED'
  | 'EXPAND_SHORTLIST_SET'
  | 'EXPAND_RUN'
  | 'EXPAND_FIELD_EDIT'
  | 'EXPAND_SECTION_REGEN'
  | 'CONVERGE_RUN'
  | 'SELECT_WINNER'
  | 'SELECT_RUNNER_UP'
  | 'OVERRIDE_WINNER'
  | 'COMMIT_RUN'
  | 'EXPORT_MARKDOWN'
  | 'EXPORT_CLIPBOARD'
  | 'BRANCH_CREATE'
  | 'SETTINGS_UPDATE'
  | 'SAFETY_INTERVENTION'
  | 'EVAL_RUN'
  | 'EVAL_METRICS_RECORDED'
  | 'SMOKE_RUN'
  | 'SMOKE_RESULT'
  | 'SESSION_CORRUPTION_DETECTED'
  | 'SESSION_SIZE_WARNING'
  | 'SESSION_ARCHIVE_EXPORTED'
  | 'IMAGE_GENERATE'
  | 'VIDEO_GENERATE'
  | 'TEXT_OUTPUT';

export type ThinkingTier = 'quick' | 'standard' | 'deep';

export interface SessionSettings {
  crossCulturalEnabled: boolean;
  proxyCultureMode: boolean;
  providerMode: 'mock' | 'real';
  thinkingTier: ThinkingTier;
}

export const DEFAULT_SETTINGS: SessionSettings = {
  crossCulturalEnabled: false,
  proxyCultureMode: false,
  providerMode: 'real',
  thinkingTier: 'standard',
};

export interface SessionEvent {
  id: string;
  type: EventType;
  timestamp: string;
  stageId?: StageId;
  branchId?: string;
  data: Record<string, unknown>;
}

export interface FlowNodePosition {
  id: string;
  position: { x: number; y: number };
  type?: string;
}

export interface FlowState {
  nodes: FlowNodePosition[];
  edges: Array<{ id: string; source: string; target: string }>;
  viewport?: { x: number; y: number; zoom: number };
  nodeData?: Record<string, Record<string, unknown>>;
}

export interface Session {
  id: string;
  createdAt: string;
  updatedAt: string;
  seedText: string;
  seedContext?: string;
  activeBranchId: string;
  projectName: string;
  settings: SessionSettings;
  events: SessionEvent[];
  stageState: Record<string, StageState>;
  flowState?: FlowState;
}
