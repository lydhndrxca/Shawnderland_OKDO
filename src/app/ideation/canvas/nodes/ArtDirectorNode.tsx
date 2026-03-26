"use client";

import { useCallback, useState, useRef, useEffect, useMemo } from 'react';
import type { NodeProps } from '@xyflow/react';
import { Handle, Position, useReactFlow, useStore } from '@xyflow/react';
import { Image, Video, FileText, X } from 'lucide-react';
import { createGeminiProvider } from '@/lib/ideation/engine/provider/geminiProvider';
import type { MediaPart } from '@/lib/ideation/engine/provider/types';
import type { SeedMediaItem } from '@/lib/ideation/state/sessionTypes';
import { z } from 'zod';
import { getAllPersonas } from '@tools/writing-room/agents';
import { createSessionFromExternal } from '@tools/writing-room/bridge';
import type { ChatAttachment } from '@tools/writing-room/types';
import './ArtDirectorNode.css';

/* ── Pipeline phase types ─────────────────────────────────────────── */

type PipelinePhase = 'idle' | 'normalize' | 'diverge' | 'critique' | 'expand' | 'converge' | 'commit' | 'done';

const PHASE_LABELS: Record<Exclude<PipelinePhase, 'idle' | 'done'>, { step: string; desc: string }> = {
  normalize:  { step: '1/6', desc: 'Breaking down the concept — surfacing assumptions & unknowns' },
  diverge:    { step: '2/6', desc: 'Brainstorming 15+ raw observations across multiple angles' },
  critique:   { step: '3/6', desc: 'Critiquing every observation — killing the weak, mutating the mediocre' },
  expand:     { step: '4/6', desc: 'Deep-diving survivors — adding specifics & implementation detail' },
  converge:   { step: '5/6', desc: 'Scoring & ranking — selecting the 5 strongest directions' },
  commit:     { step: '6/6', desc: 'Polishing final directions into actionable art direction' },
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

/* ── Focus modes ─────────────────────────────────────────────────── */

type ADFocus = 'character' | 'environment' | 'props';

const AD_FOCUS_CONFIG: Record<ADFocus, { label: string; roleExtra: string; lensAngles: string }> = {
  character: {
    label: 'Character',
    roleExtra:
      'You specialize in character design and performance. You think about silhouette language, ' +
      'costume as storytelling, how physicality communicates backstory, character archetypes ' +
      'and how to subvert them, the relationship between a character\'s inner life and their ' +
      'external presentation, and what makes an audience connect with or fear a character on sight.',
    lensAngles:
      '- Silhouette & readability — would you recognize this character in shadow?\n' +
      '- Costume as narrative — what does every garment choice SAY about them?\n' +
      '- Physicality & body language — how should they move, stand, occupy space?\n' +
      '- Archetype subversion — where is this character cliché and how to break it?\n' +
      '- Emotional design — what should the audience feel the INSTANT they see this character?\n' +
      '- Contradiction & complexity — where is the tension between who they appear to be and who they are?\n' +
      '- Evolution potential — how should the design change as the character arcs?\n' +
      '- Cultural & historical resonance — what visual language is being borrowed and is it earned?\n',
  },
  environment: {
    label: 'Environment',
    roleExtra:
      'You specialize in production design and world-building. You think about how spaces tell stories, ' +
      'the psychology of architectural choices, how environments create mood before a single word is spoken, ' +
      'the narrative function of scale, the way light behaves in different spaces, and how to make an ' +
      'audience feel they could step into a world and smell it.',
    lensAngles:
      '- Spatial storytelling — what does the environment COMMUNICATE before anyone speaks?\n' +
      '- Scale & power dynamics — how does the space make its inhabitants feel big, small, trapped, free?\n' +
      '- Lived-in quality — does this world feel inhabited or like a set? What details create history?\n' +
      '- Atmosphere & mood — what emotional temperature does the space create?\n' +
      '- Navigation & flow — how does the space guide the eye and movement through it?\n' +
      '- Environmental contradiction — where can tension between beauty and danger, safety and threat exist?\n' +
      '- Cultural worldbuilding — what does the architecture, wear patterns, and spatial hierarchy reveal about the society?\n' +
      '- Transition & transformation — how should this environment change across the narrative?\n',
  },
  props: {
    label: 'Props',
    roleExtra:
      'You specialize in prop design and object storytelling. You understand that the right prop can ' +
      'carry more narrative weight than a page of dialogue. You think about hero props vs. background ' +
      'dressing, how objects reveal character, the tactile and material qualities that make props feel ' +
      'real, the difference between functional design and narrative design, and how a single object ' +
      'can become iconic.',
    lensAngles:
      '- Narrative weight — which objects actually MATTER to the story and which are dressing?\n' +
      '- Character revelation — what does this object say about who owns it, uses it, made it?\n' +
      '- Material truth — does this feel like something that exists in the real world? What is it made of and why?\n' +
      '- Iconography potential — could this object become the image people remember? How to push it there?\n' +
      '- Functionality vs. design — does it look cool but make no sense, or does form follow function?\n' +
      '- History & wear — what story does the object\'s condition tell? Is it new, ancient, modified, repaired?\n' +
      '- Scale & interaction — how does a character physically interact with this object and what does that reveal?\n' +
      '- Symbolic resonance — what does this object MEAN beyond its literal function?\n',
  },
};

/* ── Shared role preamble ─────────────────────────────────────────── */

function roleBlock(focus: ADFocus): string {
  const cfg = AD_FOCUS_CONFIG[focus];
  return (
    '## Role\n' +
    'You are a legendary Hollywood production art director with 30 years of experience. ' +
    cfg.roleExtra + '\n' +
    'Focus: **' + cfg.label.toUpperCase() + ' DESIGN**. Every response must be through this lens.\n' +
    'You are NOT analyzing images — you are art-directing the IDEA/CONCEPT itself.\n\n' +
    '## ANTI-CLICHÉ RULES (MANDATORY — VIOLATING THESE IS FAILURE)\n' +
    'AI models constantly fall back on the same "profound contrast" tropes. You MUST avoid ALL of these:\n' +
    '- ❌ Juxtaposing innocence against hardness (teddy bears, music boxes, children\'s shoes, dolls, lockets with photos)\n' +
    '- ❌ "Mismatched armor" or deliberately worn/broken gear to show vulnerability\n' +
    '- ❌ A single delicate/precious/mundane object that "reveals their hidden softness"\n' +
    '- ❌ Religious iconography or crosses as shorthand for moral complexity\n' +
    '- ❌ Battle-worn items with sentimental hand-stitched repairs\n' +
    '- ❌ Flowers/nature growing from destruction or decay\n' +
    '- ❌ Any variation of "what if the tough character had something gentle?"\n' +
    '- ❌ Generic "weathering tells a story" observations\n' +
    '- ❌ Suggesting the character carry/wear something from a lost loved one\n' +
    '- ❌ Any prop/detail whose only purpose is symbolic contrast\n\n' +
    'These are the LAZY choices. A junior designer suggests teddy bears. You are better than that.\n' +
    'Your directions must emerge from reading THIS SPECIFIC CHARACTER\'S design language — their actual ' +
    'garments, posture, proportions, material choices, wear patterns — and asking "what is this person\'s ' +
    'LIFE like?" Not what Hollywood shorthand would signal depth, but what would actually be TRUE for ' +
    'someone who looks like this, lives like this, moves like this.\n\n'
  );
}

/* ── Phase 1: Normalize ──────────────────────────────────────────── */

function buildNormalizePrompt(description: string, docTexts: string[], focus: ADFocus): string {
  const cfg = AD_FOCUS_CONFIG[focus];
  let prompt = '[TASK:ad-normalize]\n\n' + roleBlock(focus) +
    '## Task — NORMALIZE\n' +
    'FIRST: Study everything provided (image, text, reference material). Before you do anything else, ' +
    'build a mental model of WHO this character is based on what you can actually SEE and READ:\n' +
    '- What does their clothing/gear tell you about their daily life, economic status, profession?\n' +
    '- What do their posture, expression, and body language reveal about their personality?\n' +
    '- What wear patterns, modifications, or personal touches suggest about their history?\n' +
    '- What world do they inhabit based on the visual evidence?\n\n' +
    'THEN break down the concept from a ' + cfg.label.toLowerCase() + ' design perspective. ' +
    'Your summary MUST include your inferred backstory — this grounds everything that follows. ' +
    'Do NOT skip the character reading. Generic briefs produce generic results.\n\n';
  if (description) prompt += '## The Concept\n' + description + '\n\n';
  if (docTexts.length > 0) prompt += '## Reference Material\n' + docTexts.join('\n---\n') + '\n\n';
  prompt +=
    'Return JSON:\n' +
    '{ "summary": "3-4 sentences: what this concept IS + your inferred backstory for this character based on visual/textual evidence. Be specific — names, occupations, world details you deduce.",\n' +
    '  "assumptions": ["things being assumed about the ' + cfg.label.toLowerCase() + ' direction that haven\'t been stated — include assumptions about the character\'s story"],\n' +
    '  "unknowns": ["critical unknowns that would change the ' + cfg.label.toLowerCase() + ' direction if answered differently"],\n' +
    '  "focusedBrief": "A sharp 3-4 sentence brief that includes WHO this person is (inferred), what their world is like, and what ' + cfg.label.toLowerCase() + ' design direction would serve their story" }\n';
  return prompt;
}

/* ── Phase 2: Diverge ────────────────────────────────────────────── */

function buildDivergePrompt(brief: string, assumptions: string[], focus: ADFocus): string {
  const cfg = AD_FOCUS_CONFIG[focus];
  return (
    '[TASK:ad-diverge]\n\n' + roleBlock(focus) +
    '## Normalized Brief (includes inferred backstory)\n' + brief + '\n\n' +
    '## Known Assumptions\n' + assumptions.map((a) => '- ' + a).join('\n') + '\n\n' +
    '## Task — DIVERGE\n' +
    'Brainstorm 15 raw ' + cfg.label.toLowerCase() + ' design observations across these angles:\n' +
    cfg.lensAngles + '\n' +
    'CRITICAL GROUNDING RULES:\n' +
    '- Every observation MUST reference a SPECIFIC element you can see in the character\'s current design ' +
    '(a specific garment, a material choice, a posture detail, a color relationship, a proportion).\n' +
    '- Every observation MUST connect to the inferred backstory from the normalize phase. ' +
    'Ask: "Given who this person appears to be, what would ACTUALLY make sense for them?"\n' +
    '- Do NOT suggest adding objects/props that exist purely for symbolic value. If you suggest ' +
    'something new, it must be something this person would ACTUALLY own, carry, or wear given their life.\n' +
    '- Push the design forward by finding what\'s ALREADY interesting about this character and amplifying it, ' +
    'rather than bolting on external symbolism.\n' +
    '- Prefer observations about RELATIONSHIPS between existing elements (how the jacket relates to the boots, ' +
    'how the posture contradicts the clothing, how the color palette tells a story) over suggestions to add new things.\n\n' +
    'Generate QUANTITY. Be wild, be specific, be unexpected. Bad ideas are fine — they get killed later.\n\n' +
    'Return JSON:\n' +
    '{ "observations": [{ "angle": "short label", "note": "1-2 sentence observation that references specific visible elements", "lens": "which angle this came from" }] }\n' +
    'Exactly 15. No generic filler. No teddy bears. No music boxes. No sentimental trinkets.\n'
  );
}

/* ── Phase 3: Critique ───────────────────────────────────────────── */

function buildCritiquePrompt(observations: { angle: string; note: string; lens: string }[], focus: ADFocus): string {
  const cfg = AD_FOCUS_CONFIG[focus];
  const block = observations.map((o, i) => `${i + 1}. [${o.lens}] **${o.angle}**: ${o.note}`).join('\n');
  return (
    '[TASK:ad-critique]\n\n' + roleBlock(focus) +
    '## Your 15 Raw Observations\n' + block + '\n\n' +
    '## Task — CRITIQUE & SALVAGE\n' +
    'Rate EVERY observation 1-10 on originality + actionability. Then for each:\n' +
    '- **keep** (score 7+): Strong, specific to THIS character, and actionable.\n' +
    '- **kill** (score 1-4): Too generic, too obvious, is just commentary, or falls into an AI cliché pattern. Dead.\n' +
    '- **mutate** (score 5-6): Has a kernel of something but needs to be twisted into something sharper.\n\n' +
    'AUTOMATIC KILL criteria (score 1, verdict "kill", no exceptions):\n' +
    '- Any suggestion involving sentimental objects (teddy bears, music boxes, lockets, children\'s items, dolls)\n' +
    '- Any "tough exterior hides soft interior" observation\n' +
    '- Any suggestion to add a prop/detail whose primary purpose is symbolic contrast\n' +
    '- Any observation that could apply to literally any character (test: replace the character and would the observation still work? If yes → KILL)\n' +
    '- Any observation that is just restating what\'s already visible without pushing it somewhere new\n' +
    '- Any suggestion about "weathering tells a story" or "each scratch has a history"\n\n' +
    'For mutated observations, provide the IMPROVED version that is SPECIFIC to this character\'s ' +
    'inferred life and world. Be ruthless — if it feels like an AI wrote it, kill it.\n\n' +
    'Return JSON:\n' +
    '{ "critiqued": [{ "angle": "label", "note": "original", "score": 1-10, "verdict": "keep|kill|mutate", ' +
    '"improved": "if mutated, the better version; if kept, repeat original; if killed, empty string" }] }\n' +
    'All 15 entries. No mercy. You should be killing at least 5-7 of these.\n'
  );
}

/* ── Phase 4: Expand ─────────────────────────────────────────────── */

function buildExpandPrompt(survivors: { angle: string; improved: string }[], focus: ADFocus): string {
  const cfg = AD_FOCUS_CONFIG[focus];
  const block = survivors.map((s, i) => `${i + 1}. **${s.angle}**: ${s.improved}`).join('\n');
  return (
    '[TASK:ad-expand]\n\n' + roleBlock(focus) +
    '## Surviving Observations (post-critique)\n' + block + '\n\n' +
    '## Task — EXPAND (Deep Dive)\n' +
    'For each survivor, expand it into a full ' + cfg.label.toLowerCase() + ' direction with:\n' +
    '- **direction**: The specific, detailed art direction (3-4 sentences). Must name specific garments, ' +
    'materials, colors, or proportions from the current design. "Change the jacket" is not specific enough — ' +
    '"Replace the matte nylon shell of the bomber with a waxed canvas that shows oil darkening at the cuffs" is.\n' +
    '- **specifics**: Exact implementation details — what changes, what gets added/removed, with material and color callouts\n' +
    '- **risks**: What could go wrong if this direction is taken poorly — be honest about when this tips into cliché\n' +
    '- **impact**: What this changes about the audience\'s understanding of THIS SPECIFIC CHARACTER — not generic "audience experience"\n\n' +
    'Return JSON:\n' +
    '{ "expanded": [{ "angle": "label", "direction": "...", "specifics": "...", "risks": "...", "impact": "..." }] }\n'
  );
}

/* ── Phase 5: Converge ───────────────────────────────────────────── */

function buildConvergePrompt(expanded: { angle: string; direction: string; specifics: string; impact: string }[], focus: ADFocus): string {
  const cfg = AD_FOCUS_CONFIG[focus];
  const block = expanded.map((e, i) =>
    `${i + 1}. **${e.angle}**\n   Direction: ${e.direction}\n   Specifics: ${e.specifics}\n   Impact: ${e.impact}`
  ).join('\n\n');
  return (
    '[TASK:ad-converge]\n\n' + roleBlock(focus) +
    '## Expanded Directions\n' + block + '\n\n' +
    '## Task — CONVERGE (Score & Rank)\n' +
    'Score each on four axes (1-10 each):\n' +
    '- **novelty**: How surprising/unexpected is this direction? Would another AI suggest this? (If yes, score low)\n' +
    '- **actionability**: Can a ' + cfg.label.toLowerCase() + ' designer act on this immediately with specific changes?\n' +
    '- **craft**: Is this grounded in real ' + cfg.label.toLowerCase() + ' design principles AND specific to this character?\n' +
    '- **impact**: Would this meaningfully change the audience experience in a way unique to THIS character\'s story?\n\n' +
    'SCORING PENALTY: If a direction could apply to any generic "tough character" or "mysterious character," ' +
    'cap its novelty and impact scores at 3. The direction must be INSEPARABLE from this specific character.\n\n' +
    'Calculate totalScore (sum of 4). Return ALL entries sorted by totalScore descending. ' +
    'The top 5 will be the final selections.\n\n' +
    'Return JSON:\n' +
    '{ "ranked": [{ "angle": "label", "direction": "...", "specifics": "...", ' +
    '"noveltyScore": N, "actionabilityScore": N, "craftScore": N, "impactScore": N, "totalScore": N }] }\n'
  );
}

/* ── Phase 6: Commit ─────────────────────────────────────────────── */

function buildCommitPrompt(top5: { angle: string; direction: string; specifics: string }[], focus: ADFocus): string {
  const cfg = AD_FOCUS_CONFIG[focus];
  const block = top5.map((t, i) =>
    `${i + 1}. **${t.angle}**\n   ${t.direction}\n   Specifics: ${t.specifics}`
  ).join('\n\n');
  return (
    '[TASK:ad-commit]\n\n' + roleBlock(focus) +
    '## The 5 Winners (post-gauntlet)\n' + block + '\n\n' +
    '## Task — COMMIT (Final Polish)\n' +
    'These 5 directions survived normalization, divergent brainstorming, ruthless critique, ' +
    'deep expansion, and competitive scoring. Now polish each into presentation-ready art direction.\n\n' +
    'For each, create:\n' +
    '- **title**: Punchy 3-5 word title that feels specific to THIS character (not a generic tagline)\n' +
    '- **direction**: 2-3 sentences of specific, actionable ' + cfg.label.toLowerCase() + ' direction. ' +
    'Must reference specific elements of the current design by name (garments, materials, colors, proportions).\n' +
    '- **rationale**: Why this matters FOR THIS CHARACTER\'S STORY specifically — connect it to the ' +
    'inferred backstory, not to abstract design principles. What does this direction reveal about who they are?\n' +
    '- **reference**: A specific film, show, game, or creative work where a SIMILAR character-specific ' +
    'design choice was made effectively. Explain briefly what was done and why it worked for THAT character. ' +
    'Do NOT just name-drop a film — explain the specific design decision.\n\n' +
    'Also write an **overallVision** — one paragraph tying all 5 into a unified ' +
    cfg.label.toLowerCase() + ' design philosophy that is rooted in this character\'s inferred world and story. ' +
    'This should read like a creative director\'s brief, not a generic mission statement.\n\n' +
    'Return JSON:\n' +
    '{ "overallVision": "...", "points": [{ "title": "...", "direction": "...", "rationale": "...", "reference": "..." }] }\n' +
    'Exactly 5 points. These survived the gauntlet — make every word count. ' +
    'Final check: would swapping in a different character break these directions? If not, they\'re too generic. Rewrite.\n'
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

/* ── Component ───────────────────────────────────────────────────── */

const AD_FOCUS_OPTIONS: ADFocus[] = ['character', 'environment', 'props'];

const UPSTREAM_IMAGE_TYPES = new Set([
  'charMainViewer', 'charViewer', 'charImageViewer',
  'charFrontViewer', 'charBackViewer', 'charSideViewer', 'charCustomView',
  'charGenerate', 'imageOutput', 'imageReference', 'detachedViewer',
  'propMainViewer', 'propFrontViewer', 'propBackViewer', 'propSideViewer', 'propTopViewer',
]);

export default function ArtDirectorNode({ id, data, selected }: NodeProps) {
  const { setNodes, getNode, getEdges } = useReactFlow();

  const [description, setDescription] = useState('');
  const [media, setMedia] = useState<SeedMediaItem[]>([]);
  const [focus, setFocus] = useState<ADFocus>(((data as Record<string, unknown>)?.focus as ADFocus) || 'character');
  const [result, setResult] = useState<FinalResult | null>(null);
  const [phase, setPhase] = useState<PipelinePhase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [showWrPicker, setShowWrPicker] = useState(false);
  const [wrAgents, setWrAgents] = useState<string[]>(['preset-producer', 'preset-art-director', 'preset-costume-designer']);
  const [wrSent, setWrSent] = useState(false);
  const lastUpstreamSigRef = useRef<string | null>(null);

  const upstreamImageSig = useStore(
    useCallback(
      (s: { nodeLookup: Map<string, { type?: string; data: Record<string, unknown> }>; edges: Array<{ source: string; target: string }> }) => {
        function traceSig(nid: string, depth: number): string | null {
          if (depth > 10) return null;
          for (const e of s.edges) {
            if (e.target !== nid) continue;
            const src = s.nodeLookup.get(e.source);
            if (!src) continue;
            if (src.data?._sleeping) {
              const r = traceSig(e.source, depth + 1);
              if (r) return r;
              continue;
            }
            if (UPSTREAM_IMAGE_TYPES.has(src.type ?? '')) {
              const img = src.data?.generatedImage as { base64?: string } | undefined;
              if (img?.base64) return img.base64.slice(0, 64);
            }
          }
          return null;
        }
        return traceSig(id, 0);
      },
      [id],
    ),
  );

  useEffect(() => {
    if (!upstreamImageSig) return;
    if (lastUpstreamSigRef.current === upstreamImageSig) return;
    lastUpstreamSigRef.current = upstreamImageSig;

    const edges = getEdges();
    function traceImage(nid: string, depth: number): boolean {
      if (depth > 10) return false;
      for (const e of edges) {
        if (e.target !== nid) continue;
        const src = getNode(e.source);
        if (!src?.data) continue;
        const d = src.data as Record<string, unknown>;
        if (d._sleeping) {
          if (traceImage(src.id, depth + 1)) return true;
          continue;
        }
        if (!UPSTREAM_IMAGE_TYPES.has(src.type ?? '')) continue;
        const img = d.generatedImage as { base64?: string; mimeType?: string } | undefined;
        if (img?.base64) {
          const item: SeedMediaItem = {
            type: 'image',
            base64: img.base64,
            mimeType: (img.mimeType as string) || 'image/png',
            fileName: 'upstream-character',
          };
          setMedia((prev) => {
            const filtered = prev.filter((m) => m.fileName !== 'upstream-character');
            return [item, ...filtered];
          });
          return true;
        }
      }
      return false;
    }
    traceImage(id, 0);
  }, [upstreamImageSig, id, getNode, getEdges]);

  const hasInput = description.trim().length > 0 || media.length > 0;

  /* ── Persist media/text/focus to node.data for session save ── */
  useEffect(() => {
    setNodes((nds) => nds.map((n) =>
      n.id === id ? { ...n, data: { ...n.data, description, media, focus } } : n,
    ));
  }, [id, setNodes, description, media, focus]);

  /* ── Media handling (same patterns as SeedNode) ── */
  const addMedia = useCallback((item: SeedMediaItem) => {
    setMedia((prev) => [...prev, item]);
  }, []);

  const removeMedia = useCallback((idx: number) => {
    setMedia((prev) => prev.filter((_, i) => i !== idx));
  }, []);

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
            addMedia({ type: 'image', base64: parts[1], mimeType: mime, fileName: 'pasted-image' });
          };
          reader.readAsDataURL(blob);
          return;
        }
      }
    } catch { /* clipboard access may fail */ }
  }, [addMedia]);


  /* ── Run the full 6-phase ideation gauntlet ── */
  const handleRun = useCallback(async () => {
    setError(null);
    setResult(null);
    try {
      const provider = createGeminiProvider(undefined, 'standard');
      const mediaParts = buildMediaParts(media);
      const mp = mediaParts.length > 0 ? mediaParts : undefined;
      const docTexts = getDocTexts(media);

      // Phase 1: Normalize
      setPhase('normalize');
      const normalized = await provider.generateStructured({
        schema: NormalizeSchema,
        prompt: buildNormalizePrompt(description, docTexts, focus),
        mediaParts: mp,
      });

      // Phase 2: Diverge
      setPhase('diverge');
      const diverged = await provider.generateStructured({
        schema: DivergeSchema,
        prompt: buildDivergePrompt(normalized.focusedBrief, normalized.assumptions, focus),
      });

      // Phase 3: Critique & Salvage
      setPhase('critique');
      const critiqued = await provider.generateStructured({
        schema: CritiqueSchema,
        prompt: buildCritiquePrompt(diverged.observations, focus),
      });

      // Filter survivors (keep + mutate, skip killed)
      const survivors = critiqued.critiqued
        .filter((c) => c.verdict !== 'kill' && c.improved)
        .map((c) => ({ angle: c.angle, improved: c.improved }));

      if (survivors.length === 0) {
        setError('The critique phase killed all observations — the concept may need more specificity. Try adding more detail.');
        setPhase('idle');
        return;
      }

      // Phase 4: Expand
      setPhase('expand');
      const expanded = await provider.generateStructured({
        schema: ExpandSchema,
        prompt: buildExpandPrompt(survivors, focus),
      });

      // Phase 5: Converge
      setPhase('converge');
      const converged = await provider.generateStructured({
        schema: ConvergeSchema,
        prompt: buildConvergePrompt(expanded.expanded, focus),
      });

      // Take top 5 by score
      const top5 = converged.ranked
        .sort((a, b) => b.totalScore - a.totalScore)
        .slice(0, 5);

      // Phase 6: Commit
      setPhase('commit');
      const final = await provider.generateStructured({
        schema: CommitSchema,
        prompt: buildCommitPrompt(top5, focus),
      });

      setResult(final);
      setPhase('done');
      setNodes((nds) => nds.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, artDirectionResult: final, artDirectionFocus: focus, artDirectionText: description } } : n,
      ));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase('idle');
    }
  }, [description, media, focus]);

  /* ── Writing Room integration ────────────────────────── */
  const allPersonas = useMemo(() => {
    try { return getAllPersonas(); } catch { return []; }
  }, []);

  const toggleWrAgent = useCallback((agentId: string) => {
    setWrAgents((prev) => prev.includes(agentId) ? prev.filter((a) => a !== agentId) : [...prev, agentId]);
  }, []);

  const handleSendToWritingRoom = useCallback(() => {
    const imageAttachments: ChatAttachment[] = [];
    for (const m of media) {
      if (m.type === 'image' && m.base64) {
        imageAttachments.push({ type: 'image', mimeType: m.mimeType, base64: m.base64, fileName: m.fileName });
      }
    }

    const edges = getEdges();
    for (const e of edges) {
      if (e.target !== id) continue;
      const src = getNode(e.source);
      if (!src?.data) continue;
      const d = src.data as Record<string, unknown>;
      const img = d.generatedImage as { base64?: string; mimeType?: string } | undefined;
      if (img?.base64) {
        imageAttachments.push({ type: 'image', mimeType: img.mimeType || 'image/png', base64: img.base64, fileName: 'design-image.png' });
      }
    }

    const prompt = [
      `VISUAL CRITIQUE SESSION — ${AD_FOCUS_CONFIG[focus].label} Design`,
      '',
      `The creator wants honest feedback on this ${focus} design.`,
      '',
      'CREATOR\'S DIRECTION (HIGHEST PRIORITY):',
      description || '(No specific direction provided — give general critique)',
      '',
      'Your job: critique this honestly. If it\'s good, say so. If it\'s bad, say so.',
      'Give specific, actionable feedback. Generate alternative visual concepts when you have concrete ideas to propose.',
    ].join('\n');

    createSessionFromExternal({
      title: `${AD_FOCUS_CONFIG[focus].label} Design Review`,
      writingType: 'art-direction',
      prompt,
      selectedAgentIds: wrAgents,
      imageAttachments,
    });

    setWrSent(true);
    setShowWrPicker(false);

    const nav = (window as unknown as Record<string, unknown>).__workspaceNavigate as ((path: string) => void) | undefined;
    if (nav) nav('/writing-room');
  }, [id, description, media, focus, wrAgents, getNode, getEdges]);


  return (
    <div className={`artdir-node ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Left} className="artdir-handle" />
      <Handle type="source" position={Position.Right} className="artdir-handle" />

      {/* Header */}
      <div className="artdir-header">
        <span className="artdir-label">Art Director</span>
        <span className="artdir-badge">{AD_FOCUS_CONFIG[focus].label}</span>
      </div>

      {/* Focus selector */}
      {phase !== 'done' && (
        <div className="artdir-focus-bar nodrag">
          {AD_FOCUS_OPTIONS.map((f) => (
            <button
              key={f}
              className={`artdir-focus-btn ${f === focus ? 'active' : ''}`}
              onClick={() => { setFocus(f); }}
            >
              {AD_FOCUS_CONFIG[f].label}
            </button>
          ))}
        </div>
      )}

      {/* Input section — always visible when no result */}
      {phase !== 'done' && (
        <div className="artdir-input-section">
          <textarea
            className="artdir-text-input nodrag nowheel"
            value={description}
            onChange={(e) => { setDescription(e.target.value); }}
            placeholder="Describe your concept, idea, or creative brief — the Art Director will give you 5 points of creative direction…"
            spellCheck={false}
            rows={3}
          />

          <div className="artdir-media-bar nodrag">
            <button className="artdir-media-btn" onClick={handleImageUpload} title="Upload image">
              <Image size={13} /> <span>Image</span>
            </button>
            <button className="artdir-media-btn" onClick={handleVideoUpload} title="Upload video">
              <Video size={13} /> <span>Video</span>
            </button>
            <button className="artdir-media-btn" onClick={handleDocUpload} title="Upload document">
              <FileText size={13} /> <span>Doc</span>
            </button>
            <button className="artdir-media-btn" onClick={handlePaste} title="Paste from clipboard">
              <span style={{ fontSize: '12px' }}>📋</span> <span>Paste</span>
            </button>
          </div>

          {media.length > 0 && (
            <div className="artdir-media-list nodrag nowheel">
              {media.map((m, i) => (
                <div key={i} className="artdir-media-item">
                  <span className="artdir-media-icon">
                    {m.type === 'image' ? <Image size={12} /> : m.type === 'video' ? <Video size={12} /> : <FileText size={12} />}
                  </span>
                  <span className="artdir-media-name" title={m.fileName}>{m.fileName}</span>
                  {m.type === 'image' && m.base64 && (
                    <img className="artdir-media-thumb" src={`data:${m.mimeType};base64,${m.base64}`} alt={m.fileName} />
                  )}
                  <button className="artdir-media-remove" onClick={() => removeMedia(i)} title="Remove">
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {phase === 'idle' && (
            <>
              <button
                className="artdir-run-btn nodrag"
                onClick={handleRun}
                disabled={!hasInput}
              >
                🎬 Run Art Direction
              </button>

              {!wrSent ? (
                <button
                  className="artdir-run-btn nodrag"
                  onClick={() => setShowWrPicker(!showWrPicker)}
                  style={{ background: '#4f46e5', marginTop: 4 }}
                >
                  💬 Send to Writing Room for Feedback
                </button>
              ) : (
                <button
                  className="artdir-run-btn nodrag"
                  onClick={() => {
                    const nav = (window as unknown as Record<string, unknown>).__workspaceNavigate as ((path: string) => void) | undefined;
                    if (nav) nav('/writing-room');
                  }}
                  style={{ background: '#16a34a', marginTop: 4 }}
                >
                  ✅ Go to Writing Room
                </button>
              )}

              {showWrPicker && (
                <div className="artdir-wr-picker nodrag nowheel">
                  <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 6, color: '#a5b4fc' }}>
                    Who should review this?
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
                    {allPersonas.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => toggleWrAgent(p.id)}
                        style={{
                          fontSize: 10,
                          padding: '2px 6px',
                          borderRadius: 4,
                          border: '1px solid',
                          borderColor: wrAgents.includes(p.id) ? '#6366f1' : '#444',
                          background: wrAgents.includes(p.id) ? 'rgba(99,102,241,0.2)' : 'transparent',
                          color: wrAgents.includes(p.id) ? '#a5b4fc' : '#999',
                          cursor: 'pointer',
                        }}
                      >
                        {p.avatar} {p.name}
                      </button>
                    ))}
                  </div>
                  <button
                    className="artdir-run-btn"
                    onClick={handleSendToWritingRoom}
                    disabled={wrAgents.length === 0}
                    style={{ background: '#4f46e5', fontSize: 11, padding: '5px 10px' }}
                  >
                    Send for Review ({wrAgents.length} agents)
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Loading states — full 6-phase gauntlet */}
      {phase !== 'idle' && phase !== 'done' && (
        <div className="artdir-loading">
          <div className="artdir-spinner" />
          <div className="artdir-loading-text">
            <span className="artdir-loading-phase">Phase {PHASE_LABELS[phase].step}</span>
            {PHASE_LABELS[phase].desc}
          </div>
        </div>
      )}

      {error && <div className="artdir-error">{error}</div>}

      {/* Done — results are shown in the downstream Art Direction Output node */}
      {result && phase === 'done' && (
        <div className="artdir-done-bar nodrag">
          <span className="artdir-done-label">✅ {result.points.length} directions ready — connect to Art Direction Output</span>
          <button className="artdir-rerun-btn" onClick={() => { setResult(null); setPhase('idle'); }}>
            🎬 Re-run
          </button>
        </div>
      )}
    </div>
  );
}
