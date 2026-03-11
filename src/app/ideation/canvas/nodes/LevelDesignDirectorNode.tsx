"use client";

import { useCallback, useState, useRef, useMemo } from 'react';
import type { NodeProps } from '@xyflow/react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Image, Video, FileText, X, ChevronDown, ChevronUp, Copy, Download } from 'lucide-react';
import { createGeminiProvider } from '@/lib/ideation/engine/provider/geminiProvider';
import type { MediaPart } from '@/lib/ideation/engine/provider/types';
import type { SeedMediaItem } from '@/lib/ideation/state/sessionTypes';
import { z } from 'zod';
import './LevelDesignDirectorNode.css';

/* ── Pipeline phase types ─────────────────────────────────────────── */

type PipelinePhase = 'idle' | 'normalize' | 'diverge' | 'critique' | 'expand' | 'converge' | 'commit' | 'done';

const PHASE_LABELS: Record<Exclude<PipelinePhase, 'idle' | 'done'>, { step: string; desc: string }> = {
  normalize:  { step: '1/6', desc: 'Breaking down the level — identifying layout assumptions & unknowns' },
  diverge:    { step: '2/6', desc: 'Brainstorming 15+ raw layout observations across multiple angles' },
  critique:   { step: '3/6', desc: 'Critiquing every observation — killing generic advice, mutating mediocre points' },
  expand:     { step: '4/6', desc: 'Deep-diving survivors — adding geometry specifics & implementation detail' },
  converge:   { step: '5/6', desc: 'Scoring & ranking — selecting the 5 strongest layout directions' },
  commit:     { step: '6/6', desc: 'Polishing final directions into actionable level design feedback' },
};

/* ── Schemas ─────────────────────────────────────────────────────── */

const NormalizeSchema = z.object({
  summary: z.string(),
  assumptions: z.array(z.string()),
  unknowns: z.array(z.string()),
  focusedBrief: z.string(),
});

const DivergeSchema = z.object({
  observations: z.array(z.object({
    angle: z.string(),
    note: z.string(),
    lens: z.string(),
  })),
});

const CritiqueSchema = z.object({
  critiqued: z.array(z.object({
    angle: z.string(),
    note: z.string(),
    score: z.number(),
    verdict: z.string(),
    improved: z.string(),
  })),
});

const ExpandSchema = z.object({
  expanded: z.array(z.object({
    angle: z.string(),
    direction: z.string(),
    specifics: z.string(),
    risks: z.string(),
    impact: z.string(),
  })),
});

const ConvergeSchema = z.object({
  ranked: z.array(z.object({
    angle: z.string(),
    direction: z.string(),
    specifics: z.string(),
    noveltyScore: z.number(),
    actionabilityScore: z.number(),
    craftScore: z.number(),
    impactScore: z.number(),
    totalScore: z.number(),
  })),
});

const CommitSchema = z.object({
  overallVision: z.string(),
  points: z.array(z.object({
    title: z.string(),
    direction: z.string(),
    rationale: z.string(),
    reference: z.string(),
  })),
});
type FinalResult = z.infer<typeof CommitSchema>;

/* ── Genre definitions ───────────────────────────────────────────── */

type LDGenre =
  | 'fps_arena' | 'fps_br' | 'tps' | 'moba'
  | 'rpg_openworld' | 'platformer' | 'horror'
  | 'racing' | 'fighting' | 'rts'
  | 'stealth' | 'metroidvania' | 'soulslike';

interface GenreConfig {
  label: string;
  context: string;
  lensAngles: string;
}

const GENRE_CONFIG: Record<LDGenre, GenreConfig> = {
  fps_arena: {
    label: 'FPS (Arena)',
    context:
      'An arena FPS map where spatial layout, corridor topology, and room proportions define ' +
      'the competitive experience. Think Quake, Unreal Tournament, Halo multiplayer maps.',
    lensAngles:
      '- Sightline geometry — where do long, medium, and short sightlines exist and how does the layout control them?\n' +
      '- Flow topology — does the layout loop, branch, or dead-end? How many viable rotation paths exist?\n' +
      '- Verticality in layout — how many elevation layers exist? Are ramps, stairs, and drops well-distributed?\n' +
      '- Room-to-corridor ratio — is there a healthy mix of open arenas and tight connectors?\n' +
      '- Chokepoint placement — where do the narrowest passages sit in the layout and do they create natural friction points?\n' +
      '- Symmetry vs. asymmetry — is the layout mirrored, rotational, or asymmetric? What does that do to pathing?\n' +
      '- Cover density & spacing — how is cover distributed across the floorplan? Are there barren killzones?\n' +
      '- Dead zones — are there layout areas with no strategic reason to visit?\n',
  },
  fps_br: {
    label: 'Battle Royale',
    context:
      'A battle royale map where POI layout, terrain topology, and the spatial relationship ' +
      'between landmarks define how the map reads. Think Fortnite, Apex Legends, Warzone maps.',
    lensAngles:
      '- POI spacing & distribution — how are points of interest distributed across the map? Are there empty deserts between them?\n' +
      '- Terrain topology — how do hills, valleys, ridges, and flat areas shape the macro layout?\n' +
      '- Rotation corridors — what natural pathways connect major areas? Are there terrain-forced bottlenecks?\n' +
      '- Landmark readability — can distinct areas be identified by silhouette and shape from a distance?\n' +
      '- Cover terrain between POIs — is the open space between landmarks a bare field or does terrain provide natural cover?\n' +
      '- Elevation map — where are the high ground positions and how does the terrain funnel toward or away from them?\n' +
      '- Edge vs. center layout — how does the map\'s geometry differ at the edges versus the center?\n' +
      '- POI interior layout — are building footprints and interior floorplans varied or cookie-cutter?\n',
  },
  tps: {
    label: 'Third-Person Shooter',
    context:
      'A third-person shooter where the spatial layout must account for the wider camera ' +
      'perspective, cover geometry, and room-to-corridor proportions. Think Gears of War, Uncharted.',
    lensAngles:
      '- Cover geometry placement — where are waist-high and full-height cover objects placed in the floorplan?\n' +
      '- Room proportions for camera — are rooms wide enough that the third-person camera doesn\'t fight the walls?\n' +
      '- Flanking lane layout — does the layout provide parallel paths and side routes around every major position?\n' +
      '- Arena vs. corridor balance — how does the level alternate between open engagement spaces and tight connectors?\n' +
      '- Elevation layering — are there catwalks, balconies, and ground-floor layers that create depth in the layout?\n' +
      '- Corridor width — are passages wide enough for the camera perspective or do they feel claustrophobic?\n' +
      '- Transition spaces — how does the layout guide players from one arena to the next? Are connectors interesting or just hallways?\n' +
      '- Line-of-sight breaks — are there enough pillars, walls, and partial cover to break long open stretches?\n',
  },
  moba: {
    label: 'MOBA',
    context:
      'A MOBA map where lane topology, jungle pathing layout, and the spatial arrangement of ' +
      'objectives define the strategic playing field. Think League of Legends, Dota 2 maps.',
    lensAngles:
      '- Lane topology — how do the lanes connect the bases? What shapes do they form (straight, curved, staggered)?\n' +
      '- Jungle corridor layout — how do the paths between lanes wind and branch? Are there dead-ends or loops?\n' +
      '- Chokepoint distribution — where are the narrowest passages and how do they relate to key map positions?\n' +
      '- Objective terrain — what does the terrain look like around major objectives? Open bowl, tight pit, multi-entrance?\n' +
      '- Map symmetry — is the layout mirrored, rotationally symmetric, or asymmetric? How does that affect lane identity?\n' +
      '- Elevation topology — where are raised/lowered areas and how do they divide the map into zones?\n' +
      '- Brush/fog placement — where are vision-blocking elements placed in the layout?\n' +
      '- Base approach geometry — how many entrances lead to each base and what shape are the approach corridors?\n',
  },
  rpg_openworld: {
    label: 'RPG (Open World)',
    context:
      'An open-world map where the spatial arrangement of landmarks, terrain composition, and ' +
      'path networks define the exploration experience. Think Elden Ring, Skyrim, BotW, Witcher 3.',
    lensAngles:
      '- Landmark placement — are points of interest visible from each other to create sight-line breadcrumbing?\n' +
      '- Path network topology — do roads and trails form a readable network or a confusing web?\n' +
      '- Terrain composition — how do mountains, rivers, forests, and open fields partition the world?\n' +
      '- POI density gradient — does the density of things to find change across the map in an intentional way?\n' +
      '- Natural barriers — do terrain features like cliffs, water, and dense forest create readable zone boundaries?\n' +
      '- Vertical terrain layering — does the world use caves, cliffsides, and elevated paths to create depth?\n' +
      '- Hub-and-spoke layout — do major settlements sit at the center of surrounding content?\n' +
      '- Negative space — are there intentionally empty stretches that serve a pacing purpose?\n',
  },
  platformer: {
    label: 'Platformer',
    context:
      'A platformer level where platform placement, gap spacing, obstacle arrangement, and the ' +
      'spatial rhythm of the layout define the experience. Think Mario, Celeste, Rayman.',
    lensAngles:
      '- Platform spacing & arrangement — how are platforms distributed? Are gaps consistent or varied in a pattern?\n' +
      '- Vertical layout — does the level go up, down, sideways, or a mix? What shape does the path trace?\n' +
      '- Obstacle rhythm — is there a spatial pattern to hazard placement (tight-tight-rest-tight) or is it random?\n' +
      '- Path width — how wide are the safe areas? Are there generous landing zones or pixel-perfect platforms?\n' +
      '- Branching paths — does the layout offer multiple routes or is it strictly linear?\n' +
      '- Visual readability of geometry — can the player see where to go next from their current position?\n' +
      '- Rest areas — are there flat, safe spaces between challenge sections for pacing?\n' +
      '- Secret geometry — are hidden paths and areas tucked into the layout in discoverable ways?\n',
  },
  horror: {
    label: 'Horror / Survival',
    context:
      'A horror level where corridor layout, room proportions, dead-end placement, and the ' +
      'spatial psychology of the floorplan create dread. Think Resident Evil, Silent Hill, Dead Space.',
    lensAngles:
      '- Corridor proportions — are halls narrow enough to feel oppressive? Where do they widen and why?\n' +
      '- Dead-end placement — where do dead-ends exist in the layout and do they create trap anxiety?\n' +
      '- Room shape variety — are rooms all rectangular or do irregular shapes create disorientation?\n' +
      '- Safe room placement in layout — where do safe areas sit relative to dangerous stretches? How far apart?\n' +
      '- One-way gates & shortcuts — does the layout fold back on itself or is it strictly linear?\n' +
      '- Sightline control — where can the player see far ahead and where is vision blocked by turns and corners?\n' +
      '- Ceiling height variation — do some spaces feel crushing while others feel exposed and vulnerable?\n' +
      '- Backtrack loop layout — if the player must revisit areas, how does the path topology change on return?\n',
  },
  racing: {
    label: 'Racing',
    context:
      'A racing track where the layout of turns, straights, elevation changes, and track width ' +
      'define the driving line. Think Forza, Mario Kart, Gran Turismo track design.',
    lensAngles:
      '- Turn sequence — what pattern of corners does the layout follow? Hairpin-chicane-sweeper variety?\n' +
      '- Straight length & placement — where are the straights and how do they set up the next corner?\n' +
      '- Track width variation — where does the track widen or narrow and what does that do to the racing line?\n' +
      '- Elevation profile — where are uphills, downhills, and crests in the layout?\n' +
      '- Alternate path geometry — if there are shortcuts or splits, how do the paths diverge and rejoin?\n' +
      '- Apex visibility — can a driver see the apex of the next turn from the approach?\n' +
      '- Runoff area layout — how much room exists outside the racing line for mistakes?\n' +
      '- Circuit topology — is the track a simple loop, figure-8, point-to-point, or more complex?\n',
  },
  fighting: {
    label: 'Fighting',
    context:
      'A fighting game stage where the arena boundaries, floor shape, and platform layout define ' +
      'the spatial playing field. Think Street Fighter, Tekken, Smash Bros stage design.',
    lensAngles:
      '- Arena dimensions — how wide and deep is the stage? Does it feel cramped or spacious?\n' +
      '- Boundary shape — are the edges walls, ledges, or open? What shape is the playable area?\n' +
      '- Platform placement (if applicable) — where do platforms sit and how do they divide the space?\n' +
      '- Floor geometry — is the ground flat, sloped, or multi-tiered?\n' +
      '- Stage depth — is there meaningful z-axis in the layout or is it purely 2D?\n' +
      '- Corner geometry — what happens at the edges? Do walls create corner traps?\n' +
      '- Visual ground clarity — is the playable surface clearly readable against the background?\n' +
      '- Transition zones — if the stage has multiple areas, how are they spatially connected?\n',
  },
  rts: {
    label: 'Strategy / RTS',
    context:
      'An RTS map where the terrain layout, expansion site placement, and chokepoint geography ' +
      'define the strategic playing field. Think StarCraft, Age of Empires maps.',
    lensAngles:
      '- Starting position layout — where are bases placed relative to each other and to the map center?\n' +
      '- Expansion site distribution — how are secondary and tertiary locations arranged on the map?\n' +
      '- Chokepoint geography — where do narrow passes exist and how do they segment the map into zones?\n' +
      '- Terrain elevation — where are high-ground plateaus, ramps, and lowlands in the layout?\n' +
      '- Map symmetry — is the layout rotationally symmetric, mirrored, or asymmetric?\n' +
      '- Path network between bases — how many distinct routes connect opposing starting positions?\n' +
      '- Open field vs. enclosed terrain — how does the map alternate between wide-open areas and terrain-blocked corridors?\n' +
      '- Island/peninsula layout — are there isolated terrain features that create unique positional value?\n',
  },
  stealth: {
    label: 'Stealth',
    context:
      'A stealth level where the floorplan layout, room connectivity, cover placement, and ' +
      'alternate route topology define infiltration possibilities. Think Hitman, Dishonored, MGS.',
    lensAngles:
      '- Route multiplicity — how many distinct spatial paths exist through the level?\n' +
      '- Observation perches — where can a player see into areas before entering? Are there balconies, windows, grates?\n' +
      '- Vertical route availability — does the layout offer above-and-below paths (vents, rooftops, crawlspaces)?\n' +
      '- Cover object distribution — how is cover placed through the floorplan? Are there cover deserts?\n' +
      '- Room connectivity — how many entrances/exits does each room have? Are there rooms with only one way in?\n' +
      '- Corridor vs. open space ratio — does the layout alternate between tight corridors and open areas?\n' +
      '- Shadow geometry — where do the layout\'s overhangs, alcoves, and recesses create dark spots?\n' +
      '- Shortcut topology — are there hidden connections that reward exploration of the floorplan?\n',
  },
  metroidvania: {
    label: 'Metroidvania',
    context:
      'A metroidvania map where room-to-room connectivity, the overall map topology, and how ' +
      'zones interconnect define the exploration layout. Think Hollow Knight, Metroid, Castlevania: SotN.',
    lensAngles:
      '- Room connectivity graph — how many exits does each room have? Are there hub rooms vs. dead-ends?\n' +
      '- Zone boundary layout — how do distinct areas of the map border each other? Shared walls, tunnels, elevators?\n' +
      '- Shortcut loop topology — where do later shortcuts fold the map back on itself?\n' +
      '- Vertical map composition — how does the map use stacked layers and shafts?\n' +
      '- Gate placement — where are impassable barriers positioned in the map layout?\n' +
      '- Hub-and-spoke vs. linear — does the map radiate from central hubs or progress linearly?\n' +
      '- Room shape variety — are rooms tall shafts, wide arenas, tight corridors, or irregular shapes?\n' +
      '- Map density — how tightly packed are rooms or are there large single-room areas?\n',
  },
  soulslike: {
    label: 'Souls-like',
    context:
      'A souls-like level where the interconnected layout, shortcut topology, and how the ' +
      'spatial structure loops back on itself define mastery. Think Dark Souls, Elden Ring.',
    lensAngles:
      '- Loop topology — where does the layout connect back to earlier areas? How many loops exist?\n' +
      '- Shortcut placement — where are one-way doors, elevator shortcuts, and ladder connections in the layout?\n' +
      '- Path branching — where does the layout split into optional and critical paths?\n' +
      '- Elevation profile — how does the level use vertical stacking, cliffs, and drops?\n' +
      '- Rest point spacing — how far apart are safe areas in the layout, measured by path distance?\n' +
      '- Corridor-to-arena ratio — how does the layout alternate between tight passages and open boss/encounter spaces?\n' +
      '- Side path visibility — can the player see optional paths from the main route?\n' +
      '- Dead-end vs. loop — do branches end in dead-ends or eventually loop back to the critical path?\n',
  },
};

const GENRE_OPTIONS: LDGenre[] = [
  'fps_arena', 'fps_br', 'tps', 'moba',
  'rpg_openworld', 'platformer', 'horror',
  'racing', 'fighting', 'rts',
  'stealth', 'metroidvania', 'soulslike',
];

/* ── Shared role preamble ─────────────────────────────────────────── */

function roleBlock(genre: LDGenre): string {
  const cfg = GENRE_CONFIG[genre];
  return (
    '## Role\n' +
    'You are a veteran AAA level layout designer with 25 years of experience. Your expertise ' +
    'is purely LAYOUT — floorplans, topology, geometry, room proportions, corridor widths, ' +
    'sightline geometry, elevation profiles, and path networks. You do NOT comment on game ' +
    'mechanics, combat, AI, loot, abilities, weapons, or systems.\n' +
    '## Genre: ' + cfg.label.toUpperCase() + '\n' + cfg.context + '\n\n'
  );
}

/* ── Phase 1: Normalize ──────────────────────────────────────────── */

function buildNormalizePrompt(description: string, docTexts: string[], genre: LDGenre): string {
  const cfg = GENRE_CONFIG[genre];
  let prompt = '[TASK:ld-normalize]\n\n' + roleBlock(genre) +
    '## Task — NORMALIZE\n' +
    'Break down this level from a pure LAYOUT perspective. What is the spatial composition ' +
    'trying to do? What layout assumptions are baked in? What unknowns would change the design?\n\n';
  if (description) prompt += '## Description / Context\n' + description + '\n\n';
  if (docTexts.length > 0) prompt += '## Documents\n' + docTexts.join('\n---\n') + '\n\n';
  prompt +=
    'If a screenshot/video is attached, read the actual geometry — the corridors, rooms, paths, elevation.\n\n' +
    'Return JSON:\n' +
    '{ "summary": "2-3 sentence distillation of the level layout — what is the spatial composition doing?",\n' +
    '  "assumptions": ["layout assumptions baked into this design"],\n' +
    '  "unknowns": ["critical unknowns that would change the layout direction if answered differently"],\n' +
    '  "focusedBrief": "A sharp 2-3 sentence brief a level designer could work from — LAYOUT ONLY" }\n';
  return prompt;
}

/* ── Phase 2: Diverge ────────────────────────────────────────────── */

function buildDivergePrompt(brief: string, assumptions: string[], genre: LDGenre): string {
  const cfg = GENRE_CONFIG[genre];
  return (
    '[TASK:ld-diverge]\n\n' + roleBlock(genre) +
    '## Normalized Brief\n' + brief + '\n\n' +
    '## Known Layout Assumptions\n' + assumptions.map((a) => '- ' + a).join('\n') + '\n\n' +
    '## Task — DIVERGE\n' +
    'Brainstorm 15 raw layout observations through these angles:\n' +
    cfg.lensAngles + '\n' +
    'Be BRUTALLY SPECIFIC about geometry. "The level looks good" is useless. ' +
    '"The central corridor is too long and straight with no geometry breaks" is useful.\n' +
    'Generate QUANTITY. Bad observations get killed later. No mechanics talk.\n\n' +
    'Return JSON:\n' +
    '{ "observations": [{ "angle": "short label", "note": "1-2 sentence layout observation", "lens": "which angle" }] }\n' +
    'Exactly 15.\n'
  );
}

/* ── Phase 3: Critique ───────────────────────────────────────────── */

function buildCritiquePrompt(observations: { angle: string; note: string; lens: string }[], genre: LDGenre): string {
  const cfg = GENRE_CONFIG[genre];
  const block = observations.map((o, i) => `${i + 1}. [${o.lens}] **${o.angle}**: ${o.note}`).join('\n');
  return (
    '[TASK:ld-critique]\n\n' + roleBlock(genre) +
    '## Your 15 Raw Observations\n' + block + '\n\n' +
    '## Task — CRITIQUE & SALVAGE\n' +
    'Rate EVERY observation 1-10 on originality + actionability. Then for each:\n' +
    '- **keep** (7+): Strong layout feedback as-is.\n' +
    '- **kill** (1-4): Too generic, drifted into mechanics, or vague. Dead.\n' +
    '- **mutate** (5-6): Has a kernel — twist it into sharper, more specific geometry feedback.\n\n' +
    'Kill criteria:\n' +
    '- Did it drift into mechanics/combat/systems? KILL.\n' +
    '- Would a junior LD say this after glancing at the map? KILL.\n' +
    '- Is this generic advice for any ' + cfg.label + ' map? KILL.\n' +
    '- Could a designer NOT act on this by moving geometry in 30 minutes? KILL.\n\n' +
    'Return JSON:\n' +
    '{ "critiqued": [{ "angle": "label", "note": "original", "score": 1-10, "verdict": "keep|kill|mutate", ' +
    '"improved": "if mutated, the better version; if kept, repeat original; if killed, empty string" }] }\n' +
    'All 15 entries. No mercy.\n'
  );
}

/* ── Phase 4: Expand ─────────────────────────────────────────────── */

function buildExpandPrompt(survivors: { angle: string; improved: string }[], genre: LDGenre): string {
  const block = survivors.map((s, i) => `${i + 1}. **${s.angle}**: ${s.improved}`).join('\n');
  return (
    '[TASK:ld-expand]\n\n' + roleBlock(genre) +
    '## Surviving Observations (post-critique)\n' + block + '\n\n' +
    '## Task — EXPAND (Deep Dive)\n' +
    'For each survivor, expand into a full layout direction with:\n' +
    '- **direction**: Detailed spatial direction (3-4 sentences) — exactly what geometry changes\n' +
    '- **specifics**: Where in the level, what gets moved/added/removed, precise geometry changes\n' +
    '- **risks**: What could go wrong with this layout change\n' +
    '- **impact**: How this changes the spatial experience for the player\n\n' +
    'LAYOUT ONLY. No mechanics.\n\n' +
    'Return JSON:\n' +
    '{ "expanded": [{ "angle": "label", "direction": "...", "specifics": "...", "risks": "...", "impact": "..." }] }\n'
  );
}

/* ── Phase 5: Converge ───────────────────────────────────────────── */

function buildConvergePrompt(expanded: { angle: string; direction: string; specifics: string; impact: string }[], genre: LDGenre): string {
  const cfg = GENRE_CONFIG[genre];
  const block = expanded.map((e, i) =>
    `${i + 1}. **${e.angle}**\n   Direction: ${e.direction}\n   Specifics: ${e.specifics}\n   Impact: ${e.impact}`
  ).join('\n\n');
  return (
    '[TASK:ld-converge]\n\n' + roleBlock(genre) +
    '## Expanded Layout Directions\n' + block + '\n\n' +
    '## Task — CONVERGE (Score & Rank)\n' +
    'Score each on four axes (1-10):\n' +
    '- **novelty**: How unexpected/non-obvious is this layout observation?\n' +
    '- **actionability**: Can a LD move geometry in the editor to address this immediately?\n' +
    '- **craft**: Is this grounded in real ' + cfg.label + ' level layout principles?\n' +
    '- **impact**: Would this geometry change meaningfully improve the spatial experience?\n\n' +
    'Calculate totalScore (sum of 4). Return ALL entries sorted by totalScore descending.\n\n' +
    'Return JSON:\n' +
    '{ "ranked": [{ "angle": "label", "direction": "...", "specifics": "...", ' +
    '"noveltyScore": N, "actionabilityScore": N, "craftScore": N, "impactScore": N, "totalScore": N }] }\n'
  );
}

/* ── Phase 6: Commit ─────────────────────────────────────────────── */

function buildCommitPrompt(top5: { angle: string; direction: string; specifics: string }[], genre: LDGenre): string {
  const cfg = GENRE_CONFIG[genre];
  const block = top5.map((t, i) =>
    `${i + 1}. **${t.angle}**\n   ${t.direction}\n   Specifics: ${t.specifics}`
  ).join('\n\n');
  return (
    '[TASK:ld-commit]\n\n' + roleBlock(genre) +
    '## The 5 Winners (post-gauntlet)\n' + block + '\n\n' +
    '## Task — COMMIT (Final Polish)\n' +
    'These 5 layout directions survived normalization, divergent brainstorming, ruthless critique, ' +
    'deep expansion, and competitive scoring. Polish each into presentation-ready feedback.\n\n' +
    'For each:\n' +
    '- **title**: Punchy 3-5 word title\n' +
    '- **direction**: 2-3 sentences of specific, actionable layout/geometry changes\n' +
    '- **rationale**: What spatial design principle supports this change\n' +
    '- **reference**: A specific game map known for this kind of layout quality\n\n' +
    'Also write an **overallVision** — one paragraph on the spatial philosophy for this level.\n' +
    'LAYOUT ONLY. No mechanics.\n\n' +
    'Return JSON:\n' +
    '{ "overallVision": "...", "points": [{ "title": "...", "direction": "...", "rationale": "...", "reference": "..." }] }\n' +
    'Exactly 5 points. These survived the gauntlet — make every word count.\n'
  );
}

/* ── Helpers ──────────────────────────────────────────────────────── */

function buildMediaParts(media: SeedMediaItem[]): MediaPart[] {
  const parts: MediaPart[] = [];
  for (const m of media) {
    if ((m.type === 'image' || m.type === 'video') && m.base64) {
      parts.push({ inlineData: { mimeType: m.mimeType, data: m.base64 } });
    }
  }
  return parts;
}

function getDocTexts(media: SeedMediaItem[]): string[] {
  return media
    .filter((m) => m.type === 'document' && m.textContent)
    .map((m) => `[${m.fileName}]\n${m.textContent!}`);
}

function renderMarkdown(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^[-•] (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`)
    .replace(/^\d+\.\s(.+)$/gm, '<li>$1</li>')
    .replace(/\n/g, '<br/>');
}

/* ── Component ───────────────────────────────────────────────────── */

export default function LevelDesignDirectorNode({ id, selected }: NodeProps) {
  const { setNodes, addNodes, addEdges, getNode } = useReactFlow();

  const [description, setDescription] = useState('');
  const [media, setMedia] = useState<SeedMediaItem[]>([]);
  const [genre, setGenre] = useState<LDGenre>('fps_arena');
  const [result, setResult] = useState<FinalResult | null>(null);
  const [phase, setPhase] = useState<PipelinePhase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const resultRef = useRef<HTMLDivElement>(null);
  const spawnedRef = useRef(false);

  const hasInput = description.trim().length > 0 || media.length > 0;

  const syncNodeData = useCallback((desc: string, med: SeedMediaItem[], g?: LDGenre) => {
    setNodes((nds) => nds.map((n) =>
      n.id === id ? { ...n, data: { ...n.data, description: desc, media: med, genre: g ?? genre } } : n,
    ));
  }, [id, setNodes, genre]);

  /* ── Media handling ── */
  const addMedia = useCallback((item: SeedMediaItem) => {
    setMedia((prev) => {
      const next = [...prev, item];
      syncNodeData(description, next);
      return next;
    });
  }, [description, syncNodeData]);

  const removeMedia = useCallback((idx: number) => {
    setMedia((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      syncNodeData(description, next);
      return next;
    });
  }, [description, syncNodeData]);

  const handleImageUpload = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const parts = dataUrl.split(',');
        const mime = parts[0].match(/:(.*?);/)?.[1] ?? 'image/png';
        addMedia({ type: 'image', base64: parts[1], mimeType: mime, fileName: file.name });
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }, [addMedia]);

  const handleVideoUpload = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const parts = dataUrl.split(',');
        const mime = parts[0].match(/:(.*?);/)?.[1] ?? 'video/mp4';
        addMedia({ type: 'video', base64: parts[1], mimeType: mime, fileName: file.name });
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }, [addMedia]);

  const handleDocUpload = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,.md,.pdf,.doc,.docx,.csv,.json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        addMedia({ type: 'document', mimeType: file.type || 'text/plain', fileName: file.name, textContent: text });
      };
      reader.readAsText(file);
    };
    input.click();
  }, [addMedia]);

  const handlePaste = useCallback(async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find((t) => t.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = reader.result as string;
            const parts = dataUrl.split(',');
            const mime = parts[0].match(/:(.*?);/)?.[1] ?? 'image/png';
            addMedia({ type: 'image', base64: parts[1], mimeType: mime, fileName: 'pasted-screenshot' });
          };
          reader.readAsDataURL(blob);
          return;
        }
      }
    } catch { /* clipboard access may fail */ }
  }, [addMedia]);

  /* ── Spawn result nodes for each direction point ── */
  const spawnResultNodes = useCallback((points: FinalResult['points']) => {
    const parentNode = getNode(id);
    if (!parentNode) return;
    const baseX = parentNode.position.x + 420;
    const baseY = parentNode.position.y - 100;
    const spacing = 280;

    const sourceImage = media.find((m) => (m.type === 'image' || m.type === 'video') && m.base64);
    const sourceImgData = sourceImage
      ? { base64: sourceImage.base64!, mimeType: sourceImage.mimeType }
      : undefined;

    // Remove previous result nodes from prior runs
    setNodes((nds) => nds.filter((n) => !n.id.startsWith(`${id}-dir-`)));

    const newNodes = points.map((point, i) => ({
      id: `${id}-dir-${i + 1}`,
      type: 'ldDirectionResult',
      position: { x: baseX, y: baseY + i * spacing },
      data: {
        point,
        pointIndex: i + 1,
        sourceImage: sourceImgData,
      },
    }));

    const newEdges = points.map((_, i) => ({
      id: `${id}-edge-dir-${i + 1}`,
      source: id,
      target: `${id}-dir-${i + 1}`,
      type: 'default',
    }));

    setTimeout(() => {
      addNodes(newNodes);
      addEdges(newEdges);
    }, 50);
  }, [id, getNode, media, setNodes, addNodes, addEdges]);

  /* ── Run the full 6-phase ideation gauntlet ── */
  const handleRun = useCallback(async () => {
    setError(null);
    setResult(null);
    spawnedRef.current = false;
    try {
      const provider = createGeminiProvider(undefined, 'standard');
      const mediaParts = buildMediaParts(media);
      const mp = mediaParts.length > 0 ? mediaParts : undefined;
      const docTexts = getDocTexts(media);

      // Phase 1: Normalize
      setPhase('normalize');
      const normalized = await provider.generateStructured({
        schema: NormalizeSchema,
        prompt: buildNormalizePrompt(description, docTexts, genre),
        mediaParts: mp,
      });

      // Phase 2: Diverge
      setPhase('diverge');
      const diverged = await provider.generateStructured({
        schema: DivergeSchema,
        prompt: buildDivergePrompt(normalized.focusedBrief, normalized.assumptions, genre),
      });

      // Phase 3: Critique & Salvage
      setPhase('critique');
      const critiqued = await provider.generateStructured({
        schema: CritiqueSchema,
        prompt: buildCritiquePrompt(diverged.observations, genre),
      });

      const survivors = critiqued.critiqued
        .filter((c) => c.verdict !== 'kill' && c.improved)
        .map((c) => ({ angle: c.angle, improved: c.improved }));

      if (survivors.length === 0) {
        setError('The critique phase killed all observations — the level may need more detail or a screenshot. Try adding specifics.');
        setPhase('idle');
        return;
      }

      // Phase 4: Expand
      setPhase('expand');
      const expanded = await provider.generateStructured({
        schema: ExpandSchema,
        prompt: buildExpandPrompt(survivors, genre),
      });

      // Phase 5: Converge
      setPhase('converge');
      const converged = await provider.generateStructured({
        schema: ConvergeSchema,
        prompt: buildConvergePrompt(expanded.expanded, genre),
      });

      const top5 = converged.ranked
        .sort((a, b) => b.totalScore - a.totalScore)
        .slice(0, 5);

      // Phase 6: Commit
      setPhase('commit');
      const final = await provider.generateStructured({
        schema: CommitSchema,
        prompt: buildCommitPrompt(top5, genre),
      });

      setResult(final);
      setPhase('done');

      if (final.points.length > 0 && !spawnedRef.current) {
        spawnedRef.current = true;
        spawnResultNodes(final.points);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase('idle');
    }
  }, [description, media, genre, spawnResultNodes]);

  /* ── Export helpers ── */
  const markdownExport = useMemo(() => {
    if (!result) return '';
    let md = `# Level Design Feedback (${GENRE_CONFIG[genre].label})\n\n## Overall Vision\n\n${result.overallVision}\n\n---\n\n`;
    result.points.forEach((p, i) => {
      md += `## ${i + 1}. ${p.title}\n\n`;
      md += `**Direction:** ${p.direction}\n\n`;
      md += `**Rationale:** ${p.rationale}\n\n`;
      md += `**Reference:** ${p.reference}\n\n---\n\n`;
    });
    return md;
  }, [result, genre]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(markdownExport);
  }, [markdownExport]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([markdownExport], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'level-design-feedback.md';
    a.click();
    URL.revokeObjectURL(url);
  }, [markdownExport]);

  return (
    <div className={`lvldir-node ${selected ? 'selected' : ''} ${result ? 'has-result' : ''}`}>
      <Handle type="target" position={Position.Left} className="lvldir-handle" />
      <Handle type="source" position={Position.Right} className="lvldir-handle" />

      {/* Header */}
      <div className="lvldir-header">
        <span className="lvldir-label">Level Design Director</span>
        <span className="lvldir-badge">{GENRE_CONFIG[genre].label}</span>
      </div>

      {/* Genre selector */}
      <div className="lvldir-genre-bar nodrag">
        <select
          className="lvldir-genre-select nodrag"
          value={genre}
          onChange={(e) => { const g = e.target.value as LDGenre; setGenre(g); syncNodeData(description, media, g); }}
        >
          {GENRE_OPTIONS.map((g) => (
            <option key={g} value={g}>{GENRE_CONFIG[g].label}</option>
          ))}
        </select>
      </div>

      {/* Input section */}
      {phase !== 'done' && (
        <div className="lvldir-input-section">
          <textarea
            className="lvldir-text-input nodrag nowheel"
            value={description}
            onChange={(e) => { setDescription(e.target.value); syncNodeData(e.target.value, media); }}
            placeholder="Describe the level, paste a screenshot, or upload gameplay footage — the LD Director will analyze how it PLAYS…"
            spellCheck={false}
            rows={3}
          />

          <div className="lvldir-media-bar nodrag">
            <button className="lvldir-media-btn" onClick={handleImageUpload} title="Upload screenshot">
              <Image size={13} /> <span>Screenshot</span>
            </button>
            <button className="lvldir-media-btn" onClick={handleVideoUpload} title="Upload gameplay video">
              <Video size={13} /> <span>Video</span>
            </button>
            <button className="lvldir-media-btn" onClick={handleDocUpload} title="Upload document">
              <FileText size={13} /> <span>Doc</span>
            </button>
            <button className="lvldir-media-btn" onClick={handlePaste} title="Paste screenshot from clipboard">
              <span style={{ fontSize: '12px' }}>📋</span> <span>Paste</span>
            </button>
          </div>

          {media.length > 0 && (
            <div className="lvldir-media-list nodrag nowheel">
              {media.map((m, i) => (
                <div key={i} className="lvldir-media-item">
                  <span className="lvldir-media-icon">
                    {m.type === 'image' ? <Image size={12} /> : m.type === 'video' ? <Video size={12} /> : <FileText size={12} />}
                  </span>
                  <span className="lvldir-media-name" title={m.fileName}>{m.fileName}</span>
                  {m.type === 'image' && m.base64 && (
                    <img className="lvldir-media-thumb" src={`data:${m.mimeType};base64,${m.base64}`} alt={m.fileName} />
                  )}
                  <button className="lvldir-media-remove" onClick={() => removeMedia(i)} title="Remove">
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {phase === 'idle' && (
            <button
              className="lvldir-run-btn nodrag"
              onClick={handleRun}
              disabled={!hasInput}
            >
              🎮 Analyze Level Design
            </button>
          )}
        </div>
      )}

      {/* Loading states — full 6-phase gauntlet */}
      {phase !== 'idle' && phase !== 'done' && (
        <div className="lvldir-loading">
          <div className="lvldir-spinner" />
          <div className="lvldir-loading-text">
            <span className="lvldir-loading-phase">Phase {PHASE_LABELS[phase].step}</span>
            {PHASE_LABELS[phase].desc}
          </div>
        </div>
      )}

      {error && <div className="lvldir-error">{error}</div>}

      {/* Results */}
      {result && phase === 'done' && (
        <div className="lvldir-results nodrag nowheel" ref={resultRef}>
          <div className="lvldir-vision" onClick={() => setExpanded(!expanded)}>
            <div className="lvldir-vision-header">
              Overall Level Design Vision
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </div>
            <div className="lvldir-vision-text">{result.overallVision}</div>
          </div>

          {expanded && (
            <div className="lvldir-points">
              {result.points.map((p, i) => (
                <div key={i} className="lvldir-point">
                  <div className="lvldir-point-number">{i + 1}</div>
                  <div className="lvldir-point-content">
                    <div className="lvldir-point-title">{p.title}</div>
                    <div
                      className="lvldir-point-direction"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(p.direction) }}
                    />
                    <div className="lvldir-point-rationale">
                      <span className="lvldir-point-label">Why it matters:</span>{' '}
                      {p.rationale}
                    </div>
                    <div className="lvldir-point-reference">
                      <span className="lvldir-point-label">Reference:</span>{' '}
                      {p.reference}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="lvldir-actions nodrag">
            <button className="lvldir-action-btn" onClick={handleCopy}>
              <Copy size={12} /> Copy
            </button>
            <button className="lvldir-action-btn" onClick={handleDownload}>
              <Download size={12} /> Download .md
            </button>
            <button className="lvldir-action-btn lvldir-rerun-btn" onClick={handleRun}>
              🎮 Re-run
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
