import type { ToolRegistryEntry } from "./types";

export const TOOLS: ToolRegistryEntry[] = [
  {
    id: "sprite-lab",
    name: "AI Sprite Lab",
    tagline: "Game art, automated",
    description:
      "Create sprites, pixel art, animations, tilesets, and more with AI-powered tools built for game developers.",
    icon: "palette",
    href: "/sprite-lab",
    baseUrl: process.env.NEXT_PUBLIC_SPRITE_LAB_URL || "http://localhost:4001",
    accentColor: "var(--color-tool-sprite)",
    accentDim: "var(--color-tool-sprite-dim)",
    features: [
      "Sprite extraction",
      "Pixel art",
      "AI generation",
      "Tileset forge",
      "SFX editor",
    ],
    startCommand: "cd AI-Sprite-Lab && run.bat",
    mode: "web",
  },
  {
    id: "ideation",
    name: "ShawnderMind",
    tagline: "Ideas, amplified",
    description:
      "An 8-stage AI ideation pipeline that takes a seed thought and grows it into a fully realized concept with critique, expansion, and convergence.",
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
  },
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
  },
  {
    id: "concept-lab",
    name: "AI ConceptLab",
    tagline: "Concepts, visualized",
    description:
      "Node-based AI image generation with workspaces for general creation, multiview orthographics, character design, and weapon design.",
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
  },
  {
    id: "tool-editor",
    name: "Tool Editor",
    tagline: "Design tools, visually",
    description:
      "A visual editor for designing node-based tools. Drag in nodes, windows, and frames — customize inputs, outputs, dropdowns — and export an AI-readable spec.",
    icon: "wrench",
    href: "/tool-editor",
    baseUrl: "",
    accentColor: "var(--color-tool-editor, #ff7043)",
    accentDim: "var(--color-tool-editor-dim, rgba(255, 112, 67, 0.2))",
    features: [
      "Node templates",
      "Window panels",
      "UI frame builder",
      "Export to AI spec",
    ],
    startCommand: "",
    mode: "web",
  },
  {
    id: "walter",
    name: "Walter Storyboarding",
    tagline: "Stories, structured",
    description:
      "Arc-guided short-form video storyboarding with narrative templates, timeline editing, audio, and CapCut-ready export.",
    icon: "clapperboard",
    href: "/walter",
    baseUrl: "",
    accentColor: "var(--color-tool-walter)",
    accentDim: "var(--color-tool-walter-dim)",
    features: [
      "Arc templates",
      "Shot storyboards",
      "Timeline editor",
      "Video export",
    ],
    startCommand: "cd Walter_Storyboarding && run.bat",
    mode: "electron-only",
  },
];

export function getTool(id: string): ToolRegistryEntry | undefined {
  return TOOLS.find((t) => t.id === id);
}
