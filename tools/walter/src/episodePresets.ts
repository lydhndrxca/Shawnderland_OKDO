export interface EpisodePreset {
  id: string;
  label: string;
  durationSec: number;
  shotRange: [number, number];
  description: string;
}

export const EPISODE_PRESETS: EpisodePreset[] = [
  {
    id: "micro-moment",
    label: "Micro Moment",
    durationSec: 12,
    shotRange: [2, 3],
    description: "8-15s — single beat, one image, one feeling",
  },
  {
    id: "mini-reel",
    label: "Mini Reel",
    durationSec: 22,
    shotRange: [3, 5],
    description: "15-30s — quick moment with a small twist",
  },
  {
    id: "short-scene",
    label: "Short Scene",
    durationSec: 38,
    shotRange: [5, 8],
    description: "30-45s — setup + payoff arc",
  },
  {
    id: "standard-reel",
    label: "Standard Reel",
    durationSec: 52,
    shotRange: [8, 12],
    description: "45-60s — full mini-story with rising action",
  },
  {
    id: "full-episode",
    label: "Full Walter Episode",
    durationSec: 82,
    shotRange: [12, 18],
    description: "75-90s — complete narrative with character depth",
  },
];

export const WALTER_CONTEXT = `
You are writing for "Weeping Willows Walter" — a miniature stop-motion-style
Instagram Reels series. 28 episodes have already been produced and analyzed.

The WALTER BRAIN section below contains the COMPLETE canonical history —
characters, locations, world rules, and all 28 existing episodes. Treat it as
the single source of truth. New episodes must feel like they belong in this
existing body of work.

CRITICAL CREATIVE RULES (derived from real episode analysis):
- Walter's world is a MINIATURE DIORAMA that behaves as if real. Characters
  are small figures but emotions are genuine. The artifice is visible but
  never breaks the spell.
- Deadpan + whimsy — like Wes Anderson directing a Pixar short.
- Visual storytelling first. No dialogue-heavy exposition. Sound and music
  carry emotional weight. Silences matter.
- Each episode leaves the viewer with a small emotional resonance — not a
  lesson, but a feeling.
- Night is the dominant time. Blue-tinted dark exteriors with dramatic
  theatrical lighting. Daylight episodes use pastel colors.
- A giant hand occasionally appears — placing objects, moving figures. This
  is accepted without question. Scale breaks (real objects among miniatures)
  are intentional.
- Music is almost always melancholic instrumental — strings, piano, organ.
  Sometimes whimsical, sometimes eerie. Always matched to episode mood.
- Episodes are 30s–4min, most commonly 60–90s. Pacing is always deliberate.
- Title cards: handwritten-style font, slight glow, over the miniature scene.
  Format: "Weeping Willows Walter" + episode subtitle.

INSTAGRAM REEL CONVENTIONS:
- Hook in the first 1-2 seconds (visual or audio hook)
- Vertical framing (9:16 primary)
- Pacing that rewards re-watches — plant a detail early that pays off late
- End on a beat that makes people want to share or comment
- Music/sound design is critical — note audio cues for every scene
`.trim();

export const NARRATIVE_ARC_TEMPLATES = [
  {
    id: "quiet-reveal",
    label: "Quiet Observation \u2192 Strange Reveal",
    description: "Slow build from mundane to magical. Walter notices something in his routine that shouldn't be there.",
  },
  {
    id: "escalation",
    label: "Small Problem \u2192 Odd Escalation \u2192 Resolution",
    description: "A tiny issue compounds absurdly until Walter finds an unexpected solution.",
  },
  {
    id: "mystery-unease",
    label: "Mystery \u2192 Partial Answer \u2192 Lingering Unease",
    description: "Something unexplained appears. Walter investigates but the answer only raises more questions.",
  },
  {
    id: "surreal-intrusion",
    label: "Slice of Life \u2192 Surreal Intrusion",
    description: "An ordinary day is interrupted by something impossible. Walter adapts without questioning it.",
  },
  {
    id: "poetic-ending",
    label: "Walter Thought \u2192 Poetic Ending",
    description: "An internal journey. Walter contemplates something and the world reflects his feelings back.",
  },
  {
    id: "rusty-driven",
    label: "Rusty-Driven Episode",
    description: "Rusty leads the narrative. Walter follows. The dog's instincts take them somewhere unexpected.",
  },
  {
    id: "neighbor-interrupt",
    label: "Neighbor Interruption",
    description: "Walter's plans are disrupted by the neighbor. Conflict becomes connection (or not).",
  },
  {
    id: "cliffhanger",
    label: "Cliffhanger Fragment",
    description: "An episode that starts mid-action or ends unresolved, creating anticipation for more.",
  },
] as const;

export type NarrativeArcId = (typeof NARRATIVE_ARC_TEMPLATES)[number]["id"];
