export interface EpisodePreset {
  id: string;
  label: string;
  durationSec: number;
  shotRange: [number, number];
  description: string;
}

export const EPISODE_PRESETS: EpisodePreset[] = [
  {
    id: "micro",
    label: "Micro Reel",
    durationSec: 18,
    shotRange: [3, 4],
    description: "15-20s — punchy, one-gag or one-reveal format",
  },
  {
    id: "short",
    label: "Short Reel",
    durationSec: 35,
    shotRange: [5, 8],
    description: "30-45s — quick arc with setup + payoff",
  },
  {
    id: "standard",
    label: "Standard Reel",
    durationSec: 60,
    shotRange: [8, 12],
    description: "~60s — full mini-story with rising action",
  },
  {
    id: "full",
    label: "Full Episode",
    durationSec: 80,
    shotRange: [12, 18],
    description: "80-90s — complete narrative with character depth",
  },
];

export const WALTER_CONTEXT = `
You are writing for WALTER — an animated Instagram Reels series.

UNIVERSE:
Walter is a small, earnest, slightly anxious character navigating a surreal
everyday world. He means well but his plans tend to spiral. The world around
him is mundane on the surface but hides absurd, dreamlike surprises — doors
that open to unexpected places, objects that behave wrong, gravity that
forgets the rules.

TONE:
- Deadpan humor meets whimsy — like Wes Anderson directing a Pixar short
- Emotional core is always sincere even when the situation is absurd
- No dialogue-heavy exposition — visual storytelling first
- Each episode should leave the viewer with a small emotional resonance

RECURRING THEMES:
- Trying your best and it going sideways
- Finding wonder in routine
- Small acts of kindness in a chaotic world
- The gap between expectation and reality

INSTAGRAM REEL CONVENTIONS:
- Hook in the first 1-2 seconds (visual or text hook)
- Vertical-friendly framing (9:16 primary, but storyboard in 16:9 for flexibility)
- Pacing that rewards re-watches — plant a detail early that pays off late
- End on a beat that makes people want to share or comment
- Music/sound design is critical — note audio cues for every scene
`.trim();
