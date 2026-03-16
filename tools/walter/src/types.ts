/* ─── Shot Types ──────────────────────────────────────── */

export type ShotType =
  | "wide"
  | "medium"
  | "close-up"
  | "extreme-close-up"
  | "over-shoulder"
  | "pov"
  | "aerial"
  | "low-angle"
  | "dutch-angle"
  | "tracking"
  | "insert"
  | "reaction"
  | "ambient"
  | "transition";

export type CameraMove =
  | "static"
  | "pan-left"
  | "pan-right"
  | "tilt-up"
  | "tilt-down"
  | "dolly-in"
  | "dolly-out"
  | "crane-up"
  | "crane-down"
  | "orbit"
  | "handheld"
  | "steadicam";

export type TransitionType =
  | "cut"
  | "dissolve"
  | "fade-in"
  | "fade-out"
  | "wipe"
  | "whip-pan"
  | "match-cut"
  | "j-cut"
  | "l-cut";

/* ─── Tone ───────────────────────────────────────────── */

export type ToneMood =
  | "mysterious"
  | "eerie"
  | "melancholy"
  | "funny"
  | "surreal"
  | "warm"
  | "uncanny"
  | "ominous"
  | "curious"
  | "playful"
  | "bittersweet"
  | "wistful"
  | "scary"
  | "calm"
  | "asmr"
  | "whimsical"
  | "nostalgic"
  | "dreamy";

export const TONE_OPTIONS: { id: ToneMood; label: string }[] = [
  { id: "mysterious", label: "Mysterious" },
  { id: "eerie", label: "Eerie" },
  { id: "melancholy", label: "Melancholy" },
  { id: "funny", label: "Funny" },
  { id: "surreal", label: "Surreal" },
  { id: "warm", label: "Warm" },
  { id: "uncanny", label: "Uncanny" },
  { id: "ominous", label: "Ominous" },
  { id: "curious", label: "Curious" },
  { id: "playful", label: "Playful" },
  { id: "bittersweet", label: "Bittersweet" },
  { id: "wistful", label: "Wistful" },
  { id: "scary", label: "Scary" },
  { id: "calm", label: "Calm" },
  { id: "asmr", label: "Weird ASMR" },
  { id: "whimsical", label: "Whimsical" },
  { id: "nostalgic", label: "Nostalgic" },
  { id: "dreamy", label: "Dreamy" },
];

/* ─── Planning Data ──────────────────────────────────── */

export type SeasonalMode = "none" | "date" | "holiday" | "national-day" | "historical";

export type Season = "" | "winter" | "spring" | "summer" | "fall";

export const SEASON_OPTIONS: { id: Season; label: string; description: string }[] = [
  { id: "", label: "Not set", description: "Let the writers decide" },
  { id: "winter", label: "Winter", description: "Snow on ground, bare trees, cold breath, holiday lights, frost on windows" },
  { id: "spring", label: "Spring", description: "Fresh green, flowers blooming, rain puddles, pastel light, birds" },
  { id: "summer", label: "Summer", description: "Warm golden light, lush green, fireflies, long evenings, sprinklers" },
  { id: "fall", label: "Fall", description: "Fallen leaves, orange/amber palette, bare branches, fog, harvest decor" },
];

export interface PlanningData {
  episodeLength: string;
  mood: ToneMood | "";
  season: Season;
  seasonalMode: SeasonalMode;
  releaseDate: string;
  seasonalTheme: string;
  characterFocus: string;
  uniqueElements: string;
  locations: string[];
  customLocation: string;
  timeOfDay: "day" | "night" | "";
  finalNotes: string;
}

export const DEFAULT_PLANNING: PlanningData = {
  episodeLength: "standard-reel",
  mood: "",
  season: "",
  seasonalMode: "none",
  releaseDate: "",
  seasonalTheme: "",
  characterFocus: "",
  uniqueElements: "",
  locations: [],
  customLocation: "",
  timeOfDay: "",
  finalNotes: "",
};

/* ─── Agent / Persona System ─────────────────────────── */

export type AgentRole = "producer" | "writer" | "director" | "cinematographer";

export const AGENT_ROLES: { id: AgentRole; label: string; icon: string }[] = [
  { id: "producer", label: "Producer", icon: "🎬" },
  { id: "writer", label: "Writer", icon: "✍️" },
  { id: "director", label: "Director", icon: "🎭" },
  { id: "cinematographer", label: "Cinematographer", icon: "📷" },
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
  referencedShotId?: string;
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
  | "opening-frame"
  | "the-strange"
  | "the-response"
  | "the-turn"
  | "final-frame"
  | "the-simple-story"
  | "the-voice"
  | "shot-planning";

export type PersonaMode = "serling" | "fielder" | "pera" | "mixed";

export interface CreativeRound {
  id: CreativeRoundId;
  label: string;
  question: string;
  locksField: string;
  agentPool: AgentRole[];
  minTurns: number;
  maxTurns: number;
  corpusHint: string;
  personaMemory: Record<string, string>;
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

/* ─── Producer Episode State ─────────────────────────── */

export interface ProducerEpisodeState {
  creatorBrief: string;
  episodePremise: string;
  runtimeTarget: string;
  openingHook: string;
  strangeEvent: string;
  development: string;
  keyVisualMoment: string;
  endingBeat: string;
  themeOrFeeling: string;
  practicalConcerns: string[];
  unresolvedQuestions: string[];
  selectedDirection: string;
  rejectedAlternatives: string[];
  checkpoint: "none" | "premise-lock" | "visual-lock" | "ending-lock" | "production-sanity";
}

export const DEFAULT_EPISODE_STATE: ProducerEpisodeState = {
  creatorBrief: "",
  episodePremise: "",
  runtimeTarget: "",
  openingHook: "",
  strangeEvent: "",
  development: "",
  keyVisualMoment: "",
  endingBeat: "",
  themeOrFeeling: "",
  practicalConcerns: [],
  unresolvedQuestions: [],
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

/* ─── Staging Room ───────────────────────────────────── */

export interface StoryArcPhase {
  id: string;
  label: string;
  order: number;
  color: string;
  description: string;
}

export interface StoryElement {
  id: string;
  arcPhaseId: string;
  label: string;
  description: string;
  order: number;
}

export interface StagingShot {
  id: string;
  elementId: string;
  order: number;
  description: string;
  characters: string[];
  location: string;
  dialogue: string;
  narration: string;
  shotType: string;
  cameraMove: string;
  transition: string;
  audioNotes: string;
  durationSec: number;
  userEdited: boolean;
}

/* ─── Session (top-level project) ────────────────────── */

export type ScreenId = "planning" | "writing" | "staging";

export interface WalterSession {
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

  episodeState: ProducerEpisodeState;

  storyArc: StoryArcPhase[];
  storyElements: StoryElement[];
  shots: StagingShot[];

  activeScreen: ScreenId;
  userApproved: boolean;
}

/* ─── UI State ───────────────────────────────────────── */

export interface ToastItem {
  id: string;
  message: string;
  type: "info" | "success" | "error" | "warning";
}

/* ─── Walter Brain (Canon Memory) — kept from before ── */

export interface WalterCharacter {
  id: string;
  name: string;
  description: string;
  behavior: string;
  voiceTraits: string;
  relationships: string;
  typicalUses: string;
}

export interface WalterLocation {
  id: string;
  name: string;
  description: string;
  commonShots: string;
}

export interface WalterLoreRule {
  id: string;
  category: "tone" | "metaphysical" | "theme" | "continuity";
  rule: string;
}

export interface ArchivedEpisode {
  id: string;
  episodeNumber: number;
  title: string;
  premise: string;
  tone: string;
  characters: string[];
  locations: string[];
  keyMoments: string;
  createdAt: number;
}

export interface WalterBrain {
  characters: WalterCharacter[];
  locations: WalterLocation[];
  loreRules: WalterLoreRule[];
  archivedEpisodes: ArchivedEpisode[];
}

/* ─── Arc Template (kept from before) ────────────────── */

export interface ArcTemplate {
  id: string;
  name: string;
  description: string;
  beats: { label: string; description: string; color: string; order: number }[];
}
