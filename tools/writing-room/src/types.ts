/* ─── Tone / Mood ──────────────────────────────────────── */

export type ToneMood =
  | "professional" | "gritty" | "whimsical" | "dark" | "humorous"
  | "serious" | "mysterious" | "surreal" | "warm" | "melancholy"
  | "playful" | "bittersweet" | "nostalgic" | "dreamy" | "tense"
  | "epic" | "intimate" | "satirical";

export const TONE_OPTIONS: { id: ToneMood; label: string }[] = [
  { id: "professional", label: "Professional" },
  { id: "gritty", label: "Gritty" },
  { id: "whimsical", label: "Whimsical" },
  { id: "dark", label: "Dark" },
  { id: "humorous", label: "Humorous" },
  { id: "serious", label: "Serious" },
  { id: "mysterious", label: "Mysterious" },
  { id: "surreal", label: "Surreal" },
  { id: "warm", label: "Warm" },
  { id: "melancholy", label: "Melancholy" },
  { id: "playful", label: "Playful" },
  { id: "bittersweet", label: "Bittersweet" },
  { id: "nostalgic", label: "Nostalgic" },
  { id: "dreamy", label: "Dreamy" },
  { id: "tense", label: "Tense" },
  { id: "epic", label: "Epic" },
  { id: "intimate", label: "Intimate" },
  { id: "satirical", label: "Satirical" },
];

/* ─── Planning Data ──────────────────────────────────── */

export type WritingType =
  | "game-script" | "character-backstory" | "world-lore"
  | "story-pitch" | "marketing-copy" | "dialogue" | "other";

export const WRITING_TYPE_OPTIONS: { id: WritingType; label: string }[] = [
  { id: "game-script", label: "Game Script" },
  { id: "character-backstory", label: "Character Backstory" },
  { id: "world-lore", label: "World Lore" },
  { id: "story-pitch", label: "Story Pitch" },
  { id: "marketing-copy", label: "Marketing Copy" },
  { id: "dialogue", label: "Dialogue" },
  { id: "other", label: "Other (freeform)" },
];

export type ScopeLength = "short" | "medium" | "long" | "open";

export const SCOPE_OPTIONS: { id: ScopeLength; label: string; description: string }[] = [
  { id: "short", label: "Short", description: "A few paragraphs" },
  { id: "medium", label: "Medium", description: "1–2 pages" },
  { id: "long", label: "Long", description: "Detailed document" },
  { id: "open", label: "Open-ended", description: "No length constraint" },
];

export interface PlanningData {
  writingType: WritingType | "";
  writingTypeOther: string;
  projectContext: string;
  targetAudience: string;
  tones: ToneMood[];
  hardRules: string;
  referenceMaterial: string;
  scopeLength: ScopeLength;
  additionalNotes: string;
}

export const DEFAULT_PLANNING: PlanningData = {
  writingType: "",
  writingTypeOther: "",
  projectContext: "",
  targetAudience: "",
  tones: [],
  hardRules: "",
  referenceMaterial: "",
  scopeLength: "medium",
  additionalNotes: "",
};

/* ─── Agent / Persona System ─────────────────────────── */

export type AgentRole = "producer" | "writer";

export const AGENT_ROLES: { id: AgentRole; label: string; icon: string }[] = [
  { id: "producer", label: "Producer", icon: "🎬" },
  { id: "writer", label: "Writer", icon: "✍️" },
];

export interface AgentPersona {
  id: string;
  role: AgentRole;
  name: string;
  referenceName: string;
  isPreset: boolean;
  researchData: string;
  avatar: string;
}

export interface RoomAgent {
  personaId: string;
  approved: boolean;
}

/* ─── Chat / Writing Room ────────────────────────────── */

export type MessageSender = "agent" | "user" | "system";

export interface ChatMessage {
  id: string;
  timestamp: number;
  sender: MessageSender;
  agentId: string | null;
  agentName: string;
  agentRole: AgentRole | "user" | "system";
  agentAvatar: string;
  content: string;
  isApproval?: boolean;
  isTldr?: boolean;
}

export type RoomPhase =
  | "idle"
  | "briefing"
  | "rounds"
  | "approval"
  | "pitch"
  | "revision"
  | "approved";

/* ─── Round-Based Writing Room ──────────────────────── */

export type CreativeRoundId =
  | "premise"
  | "world-context"
  | "characters"
  | "conflict"
  | "structure"
  | "details"
  | "final-review";

export interface CreativeRound {
  id: CreativeRoundId;
  label: string;
  question: string;
  locksField: string;
  agentPool: AgentRole[];
  minTurns: number;
  maxTurns: number;
}

export interface LockedDecision {
  roundId: CreativeRoundId;
  label: string;
  value: string;
  lockedBy: "user" | string;
  lockedAt: number;
}

export interface RoundState {
  currentRoundIndex: number;
  turnsInRound: number;
  lockedDecisions: LockedDecision[];
}

/* ─── Producer Project State ─────────────────────────── */

export interface ProducerProjectState {
  creatorBrief: string;
  coreConcept: string;
  worldContext: string;
  keyCharacters: string;
  centralConflict: string;
  structureBeats: string;
  themeOrFeeling: string;
  openQuestions: string[];
  hardRules: string[];
  selectedDirection: string;
  rejectedAlternatives: string[];
  checkpoint: "none" | "concept-lock" | "character-lock" | "structure-lock" | "final-review";
}

export const DEFAULT_PROJECT_STATE: ProducerProjectState = {
  creatorBrief: "",
  coreConcept: "",
  worldContext: "",
  keyCharacters: "",
  centralConflict: "",
  structureBeats: "",
  themeOrFeeling: "",
  openQuestions: [],
  hardRules: [],
  selectedDirection: "",
  rejectedAlternatives: [],
  checkpoint: "none",
};

/* ─── Agent Deliberation State ────────────────────────── */

export interface AgentTurnState {
  personaId: string;
  proposals: string[];
  objections: string[];
  endorsements: string[];
  currentStance: string;
  conviction: number;
  turnsSinceLastSpoke: number;
  totalTurnsSpoken: number;
}

export const DEFAULT_AGENT_TURN_STATE: Omit<AgentTurnState, "personaId"> = {
  proposals: [],
  objections: [],
  endorsements: [],
  currentStance: "",
  conviction: 0,
  turnsSinceLastSpoke: 0,
  totalTurnsSpoken: 0,
};

/* ─── Session ────────────────────────────────────────── */

export type ScreenId = "planning" | "writing";

export interface WritingSession {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  planning: PlanningData;
  producerBrief: string | null;
  roomAgents: RoomAgent[];
  chatHistory: ChatMessage[];
  roomPhase: RoomPhase;
  roundState: RoundState;
  agentStates: Record<string, AgentTurnState>;
  projectState: ProducerProjectState;
  activeScreen: ScreenId;
  userApproved: boolean;
}

/* ─── UI ─────────────────────────────────────────────── */

export interface ToastItem {
  id: string;
  message: string;
  type: "info" | "success" | "error" | "warning";
}
