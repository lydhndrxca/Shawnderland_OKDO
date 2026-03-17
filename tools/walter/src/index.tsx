"use client";

export { default as WalterShell } from "./WalterShell";

export const WALTER_REGISTRY = {
  id: "walter",
  name: "W_w_W Story Generator",
  tagline: "Collaborative AI episode planning",
  description:
    "Plan, write, and stage Walter episodes with a multi-agent AI writing room. Walk onto set with a complete production plan.",
  icon: "clapperboard",
  href: "/walter",
  features: [
    "Multi-agent writing room",
    "Producer orchestration",
    "3-screen workflow",
    "Canon-aware AI",
    "One-sheet export",
  ],
  profiles: ["personal"] as ("work" | "personal")[],
} as const;
