import { generateText } from "@/lib/ideation/engine/conceptlab/imageGenApi";
import { WALTER_CONTEXT, type EpisodePreset } from "./episodePresets";
import type { ArcTemplate } from "./types";

// ── Types ──

export interface EpisodeConcept {
  title: string;
  logline: string;
  emotionalHook: string;
  keyTwist: string;
  visualStyle: string;
}

export interface ConceptScore {
  hookStrength: number;
  emotionalArc: number;
  visualPotential: number;
  pacing: number;
  overall: number;
  notes: string;
}

export interface ScoredConcept extends EpisodeConcept {
  score: ConceptScore;
  recommended: boolean;
}

export interface SceneBreakdown {
  beatLabel: string;
  beatColor: string;
  title: string;
  description: string;
  durationSec: number;
}

export interface DetailedScene extends SceneBreakdown {
  shotType: string;
  cameraMove: string;
  transition: string;
  dialogue: string;
  voiceOver: string;
  audioNote: string;
  sfxNote: string;
}

// ── Helpers ──

function parseJson<T>(raw: string): T {
  let cleaned = raw.trim();
  const fenceStart = cleaned.indexOf("```");
  if (fenceStart >= 0) {
    const afterFence = cleaned.indexOf("\n", fenceStart);
    const fenceEnd = cleaned.lastIndexOf("```");
    if (afterFence >= 0 && fenceEnd > afterFence) {
      cleaned = cleaned.slice(afterFence + 1, fenceEnd).trim();
    }
  }
  return JSON.parse(cleaned);
}

function arcBeatsDescription(arc: ArcTemplate): string {
  if (arc.beats.length === 0) return "No predefined beats — create a custom structure.";
  return arc.beats.map((b, i) => `${i + 1}. ${b.label}: ${b.description}`).join("\n");
}

// ── Phase 1: IDEATE ──

export async function ideate(
  idea: string,
  preset: EpisodePreset,
  arc: ArcTemplate,
): Promise<EpisodeConcept[]> {
  const prompt = `${WALTER_CONTEXT}

You are brainstorming episode concepts for a Walter Instagram Reel.

USER'S IDEA: "${idea}"
FORMAT: ${preset.label} (${preset.durationSec}s, ${preset.shotRange[0]}-${preset.shotRange[1]} shots)
NARRATIVE ARC: ${arc.name} — ${arc.description}
ARC BEATS:
${arcBeatsDescription(arc)}

Generate exactly 4 distinct episode concepts that explore DIFFERENT angles of this idea.
Each concept should be a genuinely different take — not minor variations.

Push for surprising, non-obvious interpretations. One concept should be safe and solid.
One should be bold and unexpected. One should be emotionally resonant. One should be
visually spectacular.

Respond with ONLY a JSON array (no markdown, no explanation):
[
  {
    "title": "Episode title",
    "logline": "One-sentence summary of what happens",
    "emotionalHook": "What emotional beat hooks the viewer",
    "keyTwist": "The surprising turn or reveal",
    "visualStyle": "Dominant visual approach (lighting, color, framing)"
  }
]`;

  const raw = await generateText(prompt);
  return parseJson<EpisodeConcept[]>(raw);
}

// ── Phase 2: CRITIQUE ──

export async function critique(
  concepts: EpisodeConcept[],
  preset: EpisodePreset,
): Promise<ScoredConcept[]> {
  const conceptList = concepts
    .map((c, i) => `CONCEPT ${i + 1}: "${c.title}"\nLogline: ${c.logline}\nHook: ${c.emotionalHook}\nTwist: ${c.keyTwist}\nVisual: ${c.visualStyle}`)
    .join("\n\n");

  const prompt = `${WALTER_CONTEXT}

You are a creative director evaluating episode concepts for a Walter Instagram Reel.
FORMAT: ${preset.label} (${preset.durationSec}s)

CONCEPTS TO EVALUATE:
${conceptList}

Score each concept on these criteria (1-10 scale):
- hookStrength: How well does it grab attention in the first 2 seconds?
- emotionalArc: How satisfying is the emotional journey in ${preset.durationSec} seconds?
- visualPotential: How compelling is this to watch as animation?
- pacing: Can this story be told well in ${preset.durationSec}s without feeling rushed or slow?
- overall: Overall quality as a Walter episode

Also provide a brief note (1-2 sentences) on each concept's biggest strength and risk.
Mark exactly ONE concept as "recommended" (the best overall pick).

Respond with ONLY a JSON array (no markdown):
[
  {
    "conceptIndex": 0,
    "hookStrength": 8,
    "emotionalArc": 7,
    "visualPotential": 9,
    "pacing": 7,
    "overall": 8,
    "notes": "Strong visual hook but the twist might need more setup time.",
    "recommended": true
  }
]`;

  const raw = await generateText(prompt);
  const scores = parseJson<Array<{
    conceptIndex: number;
    hookStrength: number;
    emotionalArc: number;
    visualPotential: number;
    pacing: number;
    overall: number;
    notes: string;
    recommended: boolean;
  }>>(raw);

  return concepts.map((concept, i) => {
    const s = scores.find((sc) => sc.conceptIndex === i) ?? scores[i];
    return {
      ...concept,
      score: {
        hookStrength: s?.hookStrength ?? 5,
        emotionalArc: s?.emotionalArc ?? 5,
        visualPotential: s?.visualPotential ?? 5,
        pacing: s?.pacing ?? 5,
        overall: s?.overall ?? 5,
        notes: s?.notes ?? "",
      },
      recommended: s?.recommended ?? false,
    };
  });
}

// ── Phase 4: BREAKDOWN ──

export async function breakdown(
  concept: EpisodeConcept,
  preset: EpisodePreset,
  arc: ArcTemplate,
): Promise<SceneBreakdown[]> {
  const prompt = `${WALTER_CONTEXT}

You are breaking down a Walter episode into timed scenes.

EPISODE: "${concept.title}"
LOGLINE: ${concept.logline}
HOOK: ${concept.emotionalHook}
TWIST: ${concept.keyTwist}
VISUAL STYLE: ${concept.visualStyle}

FORMAT: ${preset.label} — TOTAL DURATION: ${preset.durationSec} seconds
TARGET SHOT COUNT: ${preset.shotRange[0]}-${preset.shotRange[1]} shots

NARRATIVE ARC: ${arc.name}
ARC BEATS:
${arcBeatsDescription(arc)}

Break this episode into ${preset.shotRange[0]}-${preset.shotRange[1]} scenes.
Each scene maps to one arc beat (you may combine beats or split them).
The sum of all scene durations MUST equal exactly ${preset.durationSec} seconds.
Distribute time appropriately — hooks are short (1-3s), climaxes get more time.

Respond with ONLY a JSON array (no markdown):
[
  {
    "beatLabel": "Hook",
    "beatColor": "#f97316",
    "title": "Short scene title",
    "description": "What happens visually in this scene",
    "durationSec": 2
  }
]`;

  const raw = await generateText(prompt);
  return parseJson<SceneBreakdown[]>(raw);
}

// ── Phase 5: DETAIL ──

export async function detailScenes(
  concept: EpisodeConcept,
  scenes: SceneBreakdown[],
  preset: EpisodePreset,
): Promise<DetailedScene[]> {
  const sceneList = scenes
    .map((s, i) => `SCENE ${i + 1} [${s.beatLabel}] "${s.title}" (${s.durationSec}s): ${s.description}`)
    .join("\n");

  const prompt = `${WALTER_CONTEXT}

You are detailing shot-level information for each scene of a Walter episode.

EPISODE: "${concept.title}"
LOGLINE: ${concept.logline}
VISUAL STYLE: ${concept.visualStyle}
FORMAT: ${preset.label} (${preset.durationSec}s)

SCENES:
${sceneList}

For EACH scene, provide detailed shot information. Think like a cinematographer
and sound designer. Every field matters for the final storyboard.

Valid shotType values: wide, medium, close-up, extreme-close-up, over-shoulder, pov, aerial, low-angle, dutch-angle, tracking
Valid cameraMove values: static, pan-left, pan-right, tilt-up, tilt-down, dolly-in, dolly-out, crane-up, crane-down, orbit, handheld, steadicam
Valid transition values: cut, dissolve, fade-in, fade-out, wipe, whip-pan, match-cut, j-cut, l-cut

Respond with ONLY a JSON array (no markdown):
[
  {
    "beatLabel": "Hook",
    "beatColor": "#f97316",
    "title": "Scene title",
    "description": "Detailed visual description of what the camera sees",
    "durationSec": 2,
    "shotType": "close-up",
    "cameraMove": "dolly-in",
    "transition": "cut",
    "dialogue": "Any character dialogue (empty string if none)",
    "voiceOver": "Any narration (empty string if none)",
    "audioNote": "Music cue or atmosphere note",
    "sfxNote": "Sound effects"
  }
]`;

  const raw = await generateText(prompt);
  return parseJson<DetailedScene[]>(raw);
}

// ── Phase 6: REFINE (per-scene) ──

export async function refineScene(
  concept: EpisodeConcept,
  allScenes: DetailedScene[],
  sceneIndex: number,
  userNote: string,
): Promise<DetailedScene> {
  const fullContext = allScenes
    .map((s, i) => `${i === sceneIndex ? ">>> " : ""}SCENE ${i + 1} [${s.beatLabel}] "${s.title}" (${s.durationSec}s): ${s.description}`)
    .join("\n");

  const scene = allScenes[sceneIndex];

  const prompt = `${WALTER_CONTEXT}

You are reworking a single scene within a Walter episode. Keep the full story coherent.

EPISODE: "${concept.title}"
LOGLINE: ${concept.logline}

FULL SCENE LIST (>>> marks the scene to rework):
${fullContext}

CURRENT SCENE DETAILS:
- Title: ${scene.title}
- Description: ${scene.description}
- Shot: ${scene.shotType}, Camera: ${scene.cameraMove}, Transition: ${scene.transition}
- Duration: ${scene.durationSec}s
- Dialogue: ${scene.dialogue || "(none)"}
- VO: ${scene.voiceOver || "(none)"}
- Audio: ${scene.audioNote || "(none)"}
- SFX: ${scene.sfxNote || "(none)"}

USER'S REQUEST: "${userNote}"

Rework this scene based on the user's request. Keep the same duration unless the
request specifically asks to change it. Maintain coherence with surrounding scenes.

Respond with ONLY a JSON object (no markdown):
{
  "beatLabel": "${scene.beatLabel}",
  "beatColor": "${scene.beatColor}",
  "title": "Updated title",
  "description": "Updated visual description",
  "durationSec": ${scene.durationSec},
  "shotType": "...",
  "cameraMove": "...",
  "transition": "...",
  "dialogue": "...",
  "voiceOver": "...",
  "audioNote": "...",
  "sfxNote": "..."
}`;

  const raw = await generateText(prompt);
  return parseJson<DetailedScene>(raw);
}
