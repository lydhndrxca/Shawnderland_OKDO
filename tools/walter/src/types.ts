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

/* ─── Core Entities ───────────────────────────────────── */

export interface Shot {
  id: string;
  beatId: string;
  title: string;
  description: string;
  dialogue: string;
  voiceOver: string;
  shotType: ShotType;
  cameraMove: CameraMove;
  transition: TransitionType;
  durationSec: number;
  thumbnailUrl: string;
  audioNote: string;
  sfxNote: string;
  order: number;
  visualDescription: string;
  narration: string;
  onScreenText: string;
  soundNotes: string;
  purpose: string;
  characters: string[];
  location: string;
}

export interface Beat {
  id: string;
  label: string;
  description: string;
  color: string;
  order: number;
  startMs: number;
  endMs: number;
  breakdown: string;
  storyGoal: string;
  tone: string;
}

export interface ArcTemplate {
  id: string;
  name: string;
  description: string;
  beats: Omit<Beat, "id" | "startMs" | "endMs" | "breakdown" | "storyGoal" | "tone">[];
}

/* ─── Tone & Constraints ──────────────────────────────── */

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
  | "wistful";

export const TONE_OPTIONS: { id: ToneMood; label: string; emoji: string }[] = [
  { id: "mysterious", label: "Mysterious", emoji: "?" },
  { id: "eerie", label: "Eerie", emoji: "~" },
  { id: "melancholy", label: "Melancholy", emoji: "-" },
  { id: "funny", label: "Funny", emoji: "!" },
  { id: "surreal", label: "Surreal", emoji: "*" },
  { id: "warm", label: "Warm", emoji: "+" },
  { id: "uncanny", label: "Uncanny", emoji: "%" },
  { id: "ominous", label: "Ominous", emoji: "#" },
  { id: "curious", label: "Curious", emoji: "&" },
  { id: "playful", label: "Playful", emoji: "^" },
  { id: "bittersweet", label: "Bittersweet", emoji: "/" },
  { id: "wistful", label: "Wistful", emoji: "..." },
];

export interface EpisodeConstraints {
  allowedCharacters: string[];
  allowedLocations: string[];
  easyToFilm: boolean;
  shotDensity: "low" | "normal" | "high";
  narrationHeavy: boolean;
  dialogueHeavy: boolean;
}

export const DEFAULT_CONSTRAINTS: EpisodeConstraints = {
  allowedCharacters: [],
  allowedLocations: [],
  easyToFilm: false,
  shotDensity: "normal",
  narrationHeavy: false,
  dialogueHeavy: false,
};

/* ─── Premise Concept ─────────────────────────────────── */

export interface PremiseConcept {
  id: string;
  title: string;
  premise: string;
  tone: string;
  characters: string[];
  whyItFitsWalter: string;
}

/* ─── Project ─────────────────────────────────────────── */

export interface WalterProject {
  id: string;
  name: string;
  description: string;
  arcTemplateId: string;
  beats: Beat[];
  shots: Shot[];
  aspectRatio: "16:9" | "9:16" | "1:1" | "4:5";
  fps: number;
  createdAt: number;
  updatedAt: number;
  storyOverview: string;
  tone: ToneMood | "";
  runtimePresetId: string;
  steeringPrompt: string;
  constraints: EpisodeConstraints;
  selectedPremise: PremiseConcept | null;
}

/* ─── UI State Types ──────────────────────────────────── */

export type TabId = "episode" | "storyboard" | "timeline" | "ideation" | "export";

export interface ToastItem {
  id: string;
  message: string;
  type: "info" | "success" | "error" | "warning";
}

export interface IdeaCard {
  id: string;
  text: string;
  operator: string;
  starred: boolean;
  stage: "diverge" | "expand";
  parentId?: string;
}

/* ─── Walter Brain (Canon Memory) ─────────────────────── */

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

/* ─── Wizard Step ─────────────────────────────────────── */

export type WizardStep = "title" | "tone" | "arc" | "steering" | "premises" | "confirm";
