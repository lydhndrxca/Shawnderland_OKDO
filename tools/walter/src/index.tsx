"use client";

export { default as WalterShell } from "./WalterShell";

export const WALTER_REGISTRY = {
  id: "walter",
  name: "Walter Storyboarding",
  tagline: "Stories, structured",
  description:
    "Arc-guided short-form video storyboarding with narrative templates, timeline editing, audio, and CapCut-ready export.",
  icon: "clapperboard",
  href: "/walter",
  features: [
    "Arc templates",
    "Shot storyboards",
    "Timeline editor",
    "Video export",
  ],
  profiles: ["personal"] as ("work" | "personal")[],
} as const;
