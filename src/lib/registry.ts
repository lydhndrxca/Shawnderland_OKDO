import type { ToolRegistryEntry } from "./types";

export const TOOLS: ToolRegistryEntry[] = [
  // ── 1. AI ConceptLab ──────────────────────────────────────────────
  {
    id: "concept-lab",
    name: "AI ConceptLab",
    tagline: "AI-powered character & asset design",
    description:
      "Design characters, weapons, and assets on a node-based canvas. Generate images with Imagen 4, create multi-view turnarounds, extract attributes from references, and iterate with AI-driven creative direction.",
    icon: "lightbulb",
    href: "/concept-lab",
    baseUrl:
      process.env.NEXT_PUBLIC_CONCEPT_LAB_URL || "http://localhost:5174",
    accentColor: "var(--color-tool-concept)",
    accentDim: "var(--color-tool-concept-dim)",
    features: [
      "Image generation",
      "Multiview renders",
      "Character design",
      "Weapon design",
    ],
    startCommand: 'cd "AI ConceptLab" && npm run dev:web',
    mode: "web",
    profiles: ["work", "personal"],
  },
  // ── 2. AI Ideation Pipeline ────────────────────────────────────────
  {
    id: "ideation",
    name: "AI Ideation Pipeline - Experimentation",
    tagline: "Structured AI brainstorming",
    description:
      "An 8-stage AI ideation pipeline on an interactive node canvas. Feed in a seed idea and watch it grow through divergence, critique, expansion, and convergence into a fully realized concept.",
    icon: "brain",
    href: "/ideation",
    baseUrl:
      process.env.NEXT_PUBLIC_SHAWNDERMIND_URL || "http://localhost:5173",
    accentColor: "var(--color-tool-mind)",
    accentDim: "var(--color-tool-mind-dim)",
    features: [
      "Idea pipeline",
      "AI critique",
      "Diverge & converge",
      "Artifact export",
    ],
    startCommand: "cd ShawnderMind && npm run dev:web",
    mode: "web",
    profiles: ["work", "personal"],
  },
  // ── 3. Gemini Studio (hidden — accessed only via direct URL) ────────
  {
    id: "gemini-studio",
    name: "Gemini Studio",
    tagline: "Raw Gemini creation tools",
    description:
      "Node-based access to Google's AI models for image and text generation. Build reusable prompt chains, reference images, and generate with Imagen 4, Gemini 3 Pro, Veo, and more.",
    icon: "sparkles",
    href: "/gemini-studio",
    baseUrl: "",
    accentColor: "var(--color-tool-gemini, #a78bfa)",
    accentDim: "var(--color-tool-gemini-dim, rgba(167, 139, 250, 0.2))",
    features: [
      "All image models",
      "Video generation",
      "Reference-based editing",
      "Right-click export",
    ],
    startCommand: "",
    mode: "web",
    profiles: ["work", "personal"],
    hidden: true,
  },
  // ── 4. AI Writing Room ─────────────────────────────────────────────
  {
    id: "writing-room",
    name: "AI Writing Room",
    tagline: "Multi-agent collaborative writing",
    description:
      "Assemble an AI writing room with distinct creative personas. Brainstorm, develop, and refine game scripts, character backstories, world lore, marketing copy, and more through structured creative rounds.",
    icon: "pen-tool",
    href: "/writing-room",
    baseUrl: "",
    accentColor: "var(--color-tool-writing-room)",
    accentDim: "var(--color-tool-writing-room-dim)",
    features: [
      "Multi-agent writing room",
      "8 creative personas",
      "7-round development",
      "Summary & transcript export",
    ],
    startCommand: "",
    mode: "web",
    profiles: ["work", "personal"],
  },
  // ── 5. W_W_W (personal-only) ────────────────────────────────────────
  // Toggle visibility: set profiles to ["personal"] (visible in Personal/All)
  // or set hidden: true to hide everywhere.
  {
    id: "walter",
    name: "W_w_W Story Generator",
    tagline: "Collaborative AI episode planning",
    description:
      "Plan, write, and stage W_w_W episodes with a multi-agent AI writing room. Walk onto set with a complete production plan.",
    icon: "clapperboard",
    href: "/walter",
    baseUrl: "",
    accentColor: "var(--color-tool-walter)",
    accentDim: "var(--color-tool-walter-dim)",
    features: [
      "Multi-agent writing room",
      "Producer orchestration",
      "3-screen workflow",
      "Canon-aware AI",
      "One-sheet export",
    ],
    startCommand: "",
    mode: "web",
    profiles: ["personal"],
  },
  // ── 6. AI UI Lab (WIP) ──────────────────────────────────────────────
  {
    id: "ui-lab",
    name: "AI UI Lab",
    tagline: "UI elements, generated",
    description:
      "Generate game UI assets, extract style specs from images, plan layouts, and remove UI overlays — all powered by Gemini.",
    icon: "layout",
    href: "/ui-lab",
    baseUrl: process.env.NEXT_PUBLIC_UI_LAB_URL || "http://localhost:4003",
    accentColor: "var(--color-tool-ui)",
    accentDim: "var(--color-tool-ui-dim)",
    features: [
      "UI generation",
      "Spec extraction",
      "Layout planning",
      "Overlay removal",
    ],
    startCommand: "cd AI_UI_Lab/service && run.bat",
    mode: "web",
    profiles: ["work"],
    status: "wip",
  },
];

export function getTool(id: string): ToolRegistryEntry | undefined {
  return TOOLS.find((t) => t.id === id);
}
