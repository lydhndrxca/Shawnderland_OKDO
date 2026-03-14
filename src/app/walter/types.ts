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
}

export interface ArcTemplate {
  id: string;
  name: string;
  description: string;
  beats: Omit<Beat, "id" | "startMs" | "endMs" | "breakdown">[];
}

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
}

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
