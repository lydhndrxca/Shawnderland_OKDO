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
  | "tracking";

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
}

export interface Beat {
  id: string;
  label: string;
  description: string;
  color: string;
  order: number;
}

export interface ArcTemplate {
  id: string;
  name: string;
  description: string;
  beats: Omit<Beat, "id">[];
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
}
