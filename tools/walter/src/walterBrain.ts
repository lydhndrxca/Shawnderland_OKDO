import type { WalterBrain, WalterCharacter, WalterLocation, WalterLoreRule, ArchivedEpisode } from "./types";
import { EPISODES } from "./lore/episodes";

const LS_BRAIN_KEY = "walter-brain";

/* ─── Seed Characters ─────────────────────────────────── */

const SEED_CHARACTERS: WalterCharacter[] = [
  {
    id: "char-walter",
    name: "Walter",
    description: "Small, earnest, slightly anxious miniature figure. The protagonist of every episode. Lives in a suburban diorama world called Weeping Willows.",
    behavior: "Observes the world with quiet curiosity. Means well but plans spiral. Often stands alone in contemplative moments. Rarely speaks — his presence conveys emotion. When he does speak, it's calm and reflective.",
    voiceTraits: "Usually silent. When his name is called, it comes from an unseen narrator or off-screen voice. Occasionally has inner monologue delivered via calm, reflective voiceover.",
    relationships: "Companion to Rusty (dog). Has multiple dogs (Comet, Chowbie, Coco). Knows neighbors including Sam. Connected to his environment in an almost spiritual way.",
    typicalUses: "Central to every episode. Often standing in the yard, walking the street, or positioned in dramatic lighting against the house. Home improvement, midnight snacking, observing celestial events.",
  },
  {
    id: "char-rusty",
    name: "Rusty",
    description: "Walter's loyal dog companion. Small, scrappy, always nearby. Adds warmth and groundedness to surreal situations. One of several dogs — the primary one.",
    behavior: "Follows Walter everywhere. Reacts to strange events with simple dog logic. Sometimes leads Walter into unexpected situations. Provides emotional anchor. Barks to communicate.",
    voiceTraits: "Non-verbal. Communicates through body language, tail wags, head tilts, barking.",
    relationships: "Walter's closest companion. Part of a pack that includes Comet, Chowbie, and Coco. Sometimes leads, sometimes follows.",
    typicalUses: "Rusty-driven episodes. Scenes where Walter needs grounding. Comic relief through simple reactions to surreal events. Parades, snow play, midnight adventures.",
  },
  {
    id: "char-sam",
    name: "Sam",
    description: "A recurring character who interacts with Walter, sometimes urging him to go to bed or stop his antics. Possibly a neighbor or housemate.",
    behavior: "Practical, grounding presence. Tells Walter to come inside, go to bed, or stop doing something. Creates gentle conflict. Sometimes dismissive of Walter's concerns.",
    voiceTraits: "Direct, sometimes exasperated. Clear voice that contrasts with Walter's quietness.",
    relationships: "Close to Walter — possibly neighbor, roommate, or family. Their dynamic is playfully oppositional.",
    typicalUses: "Neighbor interruption episodes. Nighttime scenes. Christmas episode. Creates deadlines and stakes for Walter's adventures.",
  },
  {
    id: "char-dogs",
    name: "The Dogs (Comet, Chowbie, Coco)",
    description: "Walter's pack of miniature dogs beyond Rusty. Each has a distinct personality. They appear in parades and special occasions.",
    behavior: "Each has unique quirks. They're introduced during Walter's birthday with fanfare. They populate the yard and add life to the miniature world.",
    voiceTraits: "Barks, whines, and body language only.",
    relationships: "Part of Walter's extended family. Rusty is the primary, others appear for special moments.",
    typicalUses: "Birthday episodes, parades, group scenes. Adding life and warmth to the miniature world.",
  },
];

/* ─── Seed Locations ──────────────────────────────────── */

const SEED_LOCATIONS: WalterLocation[] = [
  {
    id: "loc-front-yard",
    name: "Front Yard",
    description: "Walter's small suburban front yard in Weeping Willows. Grass, walkway, sometimes littered with debris. The primary outdoor stage. Predominantly shot at night with dramatic theatrical lighting, but also seen in daylight with pastel colors.",
    commonShots: "Wide establishing shot of house + yard. Medium shot of Walter standing. Low-angle looking up at the house. Close-up of yard details. Dog parades across the yard.",
  },
  {
    id: "loc-house-exterior",
    name: "House Exterior",
    description: "Walter's suburban house in Weeping Willows. The house itself is a character — looming, familiar, sometimes ominous. Has shutters that Walter installed. Windows light up. Garage door features prominently.",
    commonShots: "Wide shot showing full facade. Medium shot of garage door with Walter's shadow. Close-up of windows, door, shutters. The house with new shutters after home improvement.",
  },
  {
    id: "loc-trailer",
    name: "Trailer / Mobile Home",
    description: "A trailer or mobile home near Walter's property. Sometimes appears as a delivery (placed by a giant hand). Represents arrivals, returns, and the edge of Walter's world.",
    commonShots: "Giant hand placing trailer. Close-up of trailer door opening. Porch steps with figure observing. Lit windows against dark exterior.",
  },
  {
    id: "loc-truck",
    name: "The Truck",
    description: "A white truck that appears in the background and as a delivery vehicle (Curtis Co. delivery truck). A recurring visual element that grounds the miniature world in suburban reality.",
    commonShots: "Background element in wide shots. Delivery truck arriving. Close-up of truck details. Walter near the truck.",
  },
  {
    id: "loc-street",
    name: "Street / Neighborhood",
    description: "The residential street and broader neighborhood. Street lamps create pools of light. Usually empty. Used for midnight adventures, badger encounters, and establishing the wider world.",
    commonShots: "Long shot down the street. Walter walking along it. Streetlights creating atmosphere. Neighbors emerging from houses.",
  },
  {
    id: "loc-trees",
    name: "Trees / Landscape",
    description: "Weeping willows and other trees around the property. Silhouetted branches create texture. The landscape includes hills, miniature vegetation, and sky backdrops with clouds.",
    commonShots: "Silhouette shots through branches. Moon through tree branches. Wide landscape establishing shots. Pastel-colored daytime landscapes.",
  },
  {
    id: "loc-christmas-village",
    name: "Christmas Village",
    description: "A seasonal variant of Walter's world decorated for Christmas. Snow-covered, with a sleigh, snowman, and festive lighting. Used for holiday episodes.",
    commonShots: "Wide shot of snow-covered village. Walter catching snowflakes. Snowman building. Sleigh in the yard.",
  },
];

/* ─── Seed Lore Rules ─────────────────────────────────── */

const SEED_LORE_RULES: WalterLoreRule[] = [
  { id: "lore-tone-1", category: "tone", rule: "Walter's world is deadpan + whimsical — like Wes Anderson directing a Pixar short. The emotional core is always sincere even when the situation is absurd." },
  { id: "lore-tone-2", category: "tone", rule: "No dialogue-heavy exposition. Visual storytelling first. Show, don't tell. Sound and music carry emotional weight." },
  { id: "lore-tone-3", category: "tone", rule: "Each episode should leave the viewer with a small emotional resonance — not a lesson, but a feeling." },
  { id: "lore-tone-4", category: "tone", rule: "Slow, deliberate pacing. Silences matter. Let shots breathe. The miniature scale amplifies stillness." },
  { id: "lore-tone-5", category: "tone", rule: "Music is almost always melancholic instrumental — strings, piano, organ. Sometimes whimsical, sometimes eerie. Music mood and episode mood are always aligned." },
  { id: "lore-meta-1", category: "metaphysical", rule: "The world is a miniature diorama that behaves as if it's real. Characters are small figures, but their emotions are genuine. The artifice is visible but never breaks the spell." },
  { id: "lore-meta-2", category: "metaphysical", rule: "A giant hand occasionally appears — placing objects, moving figures. This is accepted without question. The hand represents the creator/director intervening in the world." },
  { id: "lore-meta-3", category: "metaphysical", rule: "Night is the dominant time. Exterior scenes are almost always dark with dramatic, theatrical lighting. Blue-tinted color grading is the default. Daylight episodes use pastel colors." },
  { id: "lore-meta-4", category: "metaphysical", rule: "Scale breaks are part of the aesthetic — a real power drill in the background, a giant cookie, a hand placing a trailer. These surreal scale juxtapositions are intentional." },
  { id: "lore-theme-1", category: "theme", rule: "Trying your best and it going sideways. Plans unravel. Effort doesn't guarantee outcome. But the trying matters." },
  { id: "lore-theme-2", category: "theme", rule: "Finding wonder in routine. The everyday contains hidden magic. A walk, a shadow, a silence — these hold stories." },
  { id: "lore-theme-3", category: "theme", rule: "Small acts of kindness in a chaotic world. Connection between characters (even brief, wordless connection) is precious." },
  { id: "lore-theme-4", category: "theme", rule: "The gap between expectation and reality. What Walter thinks will happen vs what does happen. Comedy and pathos live in this gap." },
  { id: "lore-theme-5", category: "theme", rule: "Home improvement as metaphor — building shutters, tending the yard, shaping dreams. Physical work on the house reflects internal growth." },
  { id: "lore-cont-1", category: "continuity", rule: "The series is called 'Weeping Willows Walter.' Episodes are self-contained but exist in a shared continuity with seasons." },
  { id: "lore-cont-2", category: "continuity", rule: "Walter always returns to his yard. The yard is home base. Episodes end with Walter in or near the yard." },
  { id: "lore-cont-3", category: "continuity", rule: "The aesthetic is 9:16 vertical, dark/moody or pastel-bright lighting, handwritten-style title cards, melancholic to whimsical instrumental music." },
  { id: "lore-cont-4", category: "continuity", rule: "Title cards appear as styled text overlays — handwritten font, slight glow, appearing over the miniature scene. Format: 'Weeping Willows Walter' + episode subtitle." },
  { id: "lore-cont-5", category: "continuity", rule: "Episodes range from 30 seconds to 4+ minutes. Most common range is 60-90 seconds. Pacing is always deliberate — never rushed." },
];

/* ─── Build Archived Episodes from Real Analysis ──────── */

function buildArchivedEpisodes(): ArchivedEpisode[] {
  return EPISODES.map((ep) => ({
    id: `ep-${String(ep.num).padStart(2, "0")}`,
    episodeNumber: ep.num,
    title: ep.title,
    premise: ep.premise,
    tone: ep.tone,
    characters: ep.characters,
    locations: ep.locations,
    keyMoments: ep.distinctive,
    createdAt: Date.now(),
  }));
}

/* ─── Default Brain ───────────────────────────────────── */

function createDefaultBrain(): WalterBrain {
  return {
    characters: SEED_CHARACTERS,
    locations: SEED_LOCATIONS,
    loreRules: SEED_LORE_RULES,
    archivedEpisodes: buildArchivedEpisodes(),
  };
}

/* ─── Persistence ─────────────────────────────────────── */

function loadBrain(): WalterBrain {
  try {
    const raw = localStorage.getItem(LS_BRAIN_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as WalterBrain;
      if (parsed.archivedEpisodes?.length >= EPISODES.length) return parsed;
    }
  } catch { /* fallthrough */ }
  const fresh = createDefaultBrain();
  saveBrain(fresh);
  return fresh;
}

function saveBrain(brain: WalterBrain) {
  localStorage.setItem(LS_BRAIN_KEY, JSON.stringify(brain));
}

let brain: WalterBrain = loadBrain();

/* ─── Public API ──────────────────────────────────────── */

export function getBrain(): WalterBrain {
  return brain;
}

export function updateBrain(partial: Partial<WalterBrain>) {
  brain = { ...brain, ...partial };
  saveBrain(brain);
}


export function resetBrain() {
  brain = createDefaultBrain();
  saveBrain(brain);
}

/**
 * Light context for per-turn prompts: characters, locations, lore rules only.
 * ~3K chars — no episode history, audio signatures, or production notes.
 */
export function buildBrainContextLight(): string {
  const chars = brain.characters
    .map((c) => `- ${c.name}: ${c.description} | ${c.behavior}`)
    .join("\n");

  const locs = brain.locations
    .map((l) => `- ${l.name}: ${l.description}`)
    .join("\n");

  const lore = brain.loreRules
    .map((r) => `- [${r.category}] ${r.rule}`)
    .join("\n");

  return `=== WALTER CANON (${brain.archivedEpisodes.length} episodes produced) ===
CHARACTERS: ${chars}
LOCATIONS: ${locs}
WORLD RULES: ${lore}
=== END CANON ===`;
}

/**
 * Relevant context: light base + 3-5 episodes matched by tone/characters/locations.
 */
export function buildBrainContextRelevant(opts?: {
  tone?: string;
  characters?: string[];
  locations?: string[];
}): string {
  const base = buildBrainContextLight();
  if (!opts) return base;

  const scored = brain.archivedEpisodes.map((ep) => {
    let score = 0;
    if (opts.tone && ep.tone.toLowerCase().includes(opts.tone.toLowerCase())) score += 2;
    for (const c of opts.characters ?? []) {
      if (ep.characters.some((ec) => ec.toLowerCase().includes(c.toLowerCase()))) score += 1;
    }
    for (const l of opts.locations ?? []) {
      if (ep.locations.some((el) => el.toLowerCase().includes(l.toLowerCase()))) score += 1;
    }
    return { ep, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored.filter((s) => s.score > 0).slice(0, 5);

  if (top.length === 0) return base;

  const epLines = top
    .map((s) => `  Ep${s.ep.episodeNumber}: "${s.ep.title}" — ${s.ep.premise} (tone: ${s.ep.tone})`)
    .join("\n");

  return `${base}

RELEVANT PAST EPISODES:
${epLines}`;
}

/**
 * Build the full canonical context string for AI prompts.
 * This is the LIVING HISTORY — everything that's canon for Walter's world.
 * All 28+ episodes, all characters, all locations, all rules.
 * Use for briefing, parseStoryStructure, and initial round entry only.
 */
export function buildBrainContext(): string {
  const chars = brain.characters
    .map((c) => [
      `- **${c.name}**: ${c.description}`,
      `  Behavior: ${c.behavior}`,
      `  Voice: ${c.voiceTraits}`,
      `  Relationships: ${c.relationships}`,
      `  Typical uses: ${c.typicalUses}`,
    ].join("\n"))
    .join("\n");

  const locs = brain.locations
    .map((l) => [
      `- **${l.name}**: ${l.description}`,
      `  Common shots: ${l.commonShots}`,
    ].join("\n"))
    .join("\n");

  const lore = brain.loreRules
    .map((r) => `- [${r.category}] ${r.rule}`)
    .join("\n");

  const allEps = brain.archivedEpisodes
    .map((e) => `  Ep${e.episodeNumber}: "${e.title}" — ${e.premise} (tone: ${e.tone}, characters: ${e.characters.join(", ")}, locations: ${e.locations.join(", ")})`)
    .join("\n");

  const audioPatterns = EPISODES
    .map((e) => `  Ep${e.num}: ${e.audioSignature}`)
    .join("\n");

  const productionNotes = EPISODES
    .map((e) => `  Ep${e.num} "${e.title}" (${e.durationSec}s): ${e.distinctive}`)
    .join("\n");

  return `
=== WALTER BRAIN — CANONICAL LIVING HISTORY ===
Series: "Weeping Willows Walter"
Episodes analyzed: ${brain.archivedEpisodes.length} (from real Gemini video analysis of existing episodes)
This document is the single source of truth for Walter's world.

CHARACTERS (canon):
${chars}

LOCATIONS (canon):
${locs}

WORLD RULES & LORE:
${lore}

COMPLETE EPISODE HISTORY (all ${brain.archivedEpisodes.length} episodes — this is what has actually been made):
${allEps}

AUDIO/MUSIC SIGNATURES (from real episodes — new episodes should match these patterns):
${audioPatterns}

PRODUCTION TECHNIQUES & WHAT MAKES EACH EPISODE DISTINCTIVE:
${productionNotes}

=== END CANON ===
`.trim();
}

/**
 * Build extended context that additionally includes per-episode detail
 * for shot-level generation. Fetches from the typed index.
 */
export function buildExtendedBrainContext(): string {
  const base = buildBrainContext();

  const detailedEps = EPISODES
    .map((e) => `  Ep${e.num} "${e.title}" (${e.durationSec}s) | tone: ${e.tone} | characters: ${e.characters.join(", ")} | locations: ${e.locations.join(", ")} | audio: ${e.audioSignature} | distinctive: ${e.distinctive}`)
    .join("\n");

  return `${base}

DETAILED EPISODE REFERENCE (for shot-level continuity):
${detailedEps}`;
}

/**
 * Archive a new episode into the brain. Persists to localStorage.
 */
export function addArchivedEpisode(meta: {
  title: string;
  premise: string;
  tone: string;
  characters: string[];
  locations: string[];
  keyMoments: string;
}): ArchivedEpisode {
  const nextNum = brain.archivedEpisodes.length > 0
    ? Math.max(...brain.archivedEpisodes.map((e) => e.episodeNumber)) + 1
    : EPISODES.length + 1;

  const ep: ArchivedEpisode = {
    id: `ep-${nextNum}-${Date.now()}`,
    episodeNumber: nextNum,
    title: meta.title,
    premise: meta.premise,
    tone: meta.tone,
    characters: meta.characters,
    locations: meta.locations,
    keyMoments: meta.keyMoments,
    createdAt: Date.now(),
  };
  brain.archivedEpisodes.push(ep);
  saveBrain(brain);
  return ep;
}

/**
 * Get metadata for a specific episode by number.
 */
export function getEpisodeMeta(num: number) {
  return EPISODES.find((e) => e.num === num);
}

/**
 * Get all episode metadata for browsing/search.
 */
export function getAllEpisodeMeta() {
  return EPISODES;
}
