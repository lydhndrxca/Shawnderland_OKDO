"use client";

export { default as WritingRoomShell } from "./WritingShell";

export const WRITING_ROOM_REGISTRY = {
  id: "writing-room",
  name: "AI Writing Room",
  tagline: "Multi-agent collaborative writing",
  description:
    "Assemble an AI writing room with distinct creative personas. Brainstorm, develop, and refine game scripts, character backstories, world lore, marketing copy, and more through structured creative rounds.",
  icon: "pen-tool",
  href: "/writing-room",
  features: [
    "Multi-agent writing room",
    "8 creative personas",
    "7-round development",
    "Summary & transcript export",
  ],
  profiles: ["work", "personal"] as ("work" | "personal")[],
} as const;
