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

=== PRODUCTION REALITY — READ CAREFULLY ===
This is a REAL PHYSICAL MINIATURE DIORAMA filmed with a real camera.
Characters are SMALL PLASTIC/RESIN FIGURES. They CANNOT move on their own.

HOW MOVEMENT WORKS:
- The creator physically repositions figures by hand between shots.
- Characters are POSED FIGURES. They do not move on their own.
- "Character movement" = a new shot with the figure repositioned by hand.
- Stop-motion sequences (multiple repositioned frames) are possible.
- The GIANT HAND (the creator's real hand) sometimes appears on camera,
  placing objects or repositioning figures. This is a deliberate creative choice.
- Characters do NOT: walk, turn, extend hands, gesture, sit down, stand up,
  look around, hold objects, pick things up, carry things, or perform any
  action autonomously. They are POSED.
- Figures have FIXED MOLDED HANDS. They cannot grip, hold, carry, or
  manipulate objects. If a prop needs to be "with" a character, it is
  PLACED NEXT TO the figure by the creator's hand, or glued/balanced in
  position before the shot. Describe props as "positioned beside,"
  "placed at feet," or "resting against" — never "held by."

WHAT A SHOT ACTUALLY IS:
- A composed frame of the diorama with figures in a specific position.
- The CAMERA CAN: zoom, pan, tilt, dolly, slide, track, and pull focus.
  Camera movement is a real and powerful tool — use it deliberately.
- Slow zooms, pans across the diorama, dolly-ins for emphasis, and pull-
  focus between foreground/background are all available and encouraged.
- INTERESTING AND CREATIVE SHOT TYPES ARE ENCOURAGED. Think beyond static
  wide shots: macro detail inserts, through-object framing, low-angle hero
  shots, overhead reveals, rack-focus shifts, slow tracking moves past set
  pieces, reflections in tiny windows, silhouette compositions, split-depth
  shots with miniature foreground elements. The miniature scale opens up
  camera techniques that full-scale sets cannot achieve — exploit this.
- Lighting changes between shots are practical (moving real light sources).
- Describe where figures are POSITIONED and what the CAMERA DOES,
  not what the characters are "doing."

FIGURES ARE COMPLETELY STATIC IN EVERY SHOT. They do NOT:
- kneel, look up, look down, turn, extend hands, reach, gesture, sit,
  stand, crouch, lean, wave, shrug, nod, point, or perform ANY action.
- A figure is in ONE fixed pose per shot. Period.

HOW TO IMPLY ACTION THROUGH EDITING (this is how real filmmakers do it):
- "Walter looks at the sky" = Shot of Walter's face (static) → CUT TO → shot
  of the sky. The edit implies he's looking at it.
- "Walter notices something" = Wide shot with Walter in frame → CUT TO →
  close-up of the thing → CUT TO → close-up of Walter's face. The sequence
  implies awareness.
- "Walter approaches the door" = Shot 1: Walter positioned in yard → Shot 2:
  Walter repositioned at the door. The cut implies movement.
- "Walter is scared" = Close-up of Walter's face (his fixed expression reads
  differently in context) + audio (tense music, silence) + lighting (shadows).
  Emotion comes from CONTEXT, not from the figure changing expression.

SHOT DESCRIPTIONS MUST USE PRODUCTION LANGUAGE:
- "Walter positioned facing the house" NOT "Walter walks toward the house"
- "Rusty placed beside Walter" NOT "Rusty trots up to Walter"
- "Walter repositioned at the yard edge" NOT "Walter moves to the yard edge"
- "Close-up of Walter's face, then cut to the sky" NOT "Walter looks up"
- "The hand places a letter on the doorstep" NOT "A letter appears"
- "Letter placed at Walter's feet" NOT "Walter holds a letter"
- "Lantern positioned beside Walter" NOT "Walter carries a lantern"

=== CREATIVE RULES (from 28 episodes of real production) ===
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
- The giant hand occasionally appears — placing objects, repositioning figures.
  This is accepted without question. Scale breaks (real objects among
  miniatures) are intentional. Maximum once per episode — make it count.
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

export const WALTER_CONTEXT_SHORT = `You are writing for "Weeping Willows Walter" — a miniature diorama Instagram Reels series.
CRITICAL CONSTRAINTS: Characters are STATIC POSED FIGURES. They cannot walk, hold, gesture, or move. Movement = repositioning between shots by the creator's hand. Props are PLACED BESIDE figures, never held. Describe frames as compositions, not actions. Camera movement IS available (zoom, pan, dolly, rack focus). All effects practical (fog, lighting, glow props). Set is ~3ft × 2ft miniature diorama.`.trim();

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
