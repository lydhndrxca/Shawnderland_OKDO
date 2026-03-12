"use client";

import { useCallback, useState, useRef, useMemo, useEffect } from 'react';
import type { NodeProps } from '@xyflow/react';
import { Handle, Position, useReactFlow, useStore } from '@xyflow/react';
import { Image, Video, FileText, X, ChevronDown, ChevronUp, Copy, Download } from 'lucide-react';
import { createGeminiProvider } from '@/lib/ideation/engine/provider/geminiProvider';
import type { MediaPart } from '@/lib/ideation/engine/provider/types';
import type { SeedMediaItem } from '@/lib/ideation/state/sessionTypes';
import { z } from 'zod';
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
    'You are NOT analyzing images — you are art-directing the IDEA/CONCEPT itself.\n\n'
  );
}

/* ── Phase 1: Normalize ──────────────────────────────────────────── */

function buildNormalizePrompt(description: string, docTexts: string[], focus: ADFocus): string {
  const cfg = AD_FOCUS_CONFIG[focus];
  let prompt = '[TASK:ad-normalize]\n\n' + roleBlock(focus) +
    '## Task — NORMALIZE\n' +
    'Break down this concept from a ' + cfg.label.toLowerCase() + ' design perspective. ' +
    'Identify what\'s actually being asked, what\'s assumed, and what\'s unknown.\n\n';
  if (description) prompt += '## The Concept\n' + description + '\n\n';
  if (docTexts.length > 0) prompt += '## Reference Material\n' + docTexts.join('\n---\n') + '\n\n';
  prompt +=
    'Return JSON:\n' +
    '{ "summary": "2-3 sentence distillation of what this concept IS from a ' + cfg.label.toLowerCase() + ' design perspective",\n' +
    '  "assumptions": ["things being assumed about the ' + cfg.label.toLowerCase() + ' direction that haven\'t been stated"],\n' +
    '  "unknowns": ["critical unknowns that would change the ' + cfg.label.toLowerCase() + ' direction if answered differently"],\n' +
    '  "focusedBrief": "A sharp 2-3 sentence brief that a ' + cfg.label.toLowerCase() + ' design team could work from" }\n';
  return prompt;
}

/* ── Phase 2: Diverge ────────────────────────────────────────────── */

function buildDivergePrompt(brief: string, assumptions: string[], focus: ADFocus): string {
  const cfg = AD_FOCUS_CONFIG[focus];
  return (
    '[TASK:ad-diverge]\n\n' + roleBlock(focus) +
    '## Normalized Brief\n' + brief + '\n\n' +
    '## Known Assumptions\n' + assumptions.map((a) => '- ' + a).join('\n') + '\n\n' +
    '## Task — DIVERGE\n' +
    'Brainstorm 15 raw ' + cfg.label.toLowerCase() + ' design observations across these angles:\n' +
    cfg.lensAngles + '\n' +
    'Generate QUANTITY. Be wild, be specific, be unexpected. Bad ideas are fine — they get killed later.\n\n' +
    'Return JSON:\n' +
    '{ "observations": [{ "angle": "short label", "note": "1-2 sentence observation", "lens": "which angle this came from" }] }\n' +
    'Exactly 15. No generic filler.\n'
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
    '- **keep** (score 7+): Strong as-is.\n' +
    '- **kill** (score 1-4): Too generic, too obvious, or just commentary. Dead.\n' +
    '- **mutate** (score 5-6): Has a kernel of something but needs to be twisted into something sharper.\n\n' +
    'For mutated observations, provide the IMPROVED version. Be ruthless — if a junior ' +
    cfg.label.toLowerCase() + ' designer would say it, kill it.\n\n' +
    'Return JSON:\n' +
    '{ "critiqued": [{ "angle": "label", "note": "original", "score": 1-10, "verdict": "keep|kill|mutate", ' +
    '"improved": "if mutated, the better version; if kept, repeat original; if killed, empty string" }] }\n' +
    'All 15 entries. No mercy.\n'
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
    '- **direction**: The specific, detailed art direction (3-4 sentences)\n' +
    '- **specifics**: Exact implementation details — what changes, what gets added/removed\n' +
    '- **risks**: What could go wrong if this direction is taken poorly\n' +
    '- **impact**: What this changes about the audience\'s experience\n\n' +
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
    '- **novelty**: How surprising/unexpected is this direction?\n' +
    '- **actionability**: Can a ' + cfg.label.toLowerCase() + ' designer act on this immediately?\n' +
    '- **craft**: Is this grounded in real ' + cfg.label.toLowerCase() + ' design principles?\n' +
    '- **impact**: Would this meaningfully change the audience experience?\n\n' +
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
    '- **title**: Punchy 3-5 word title\n' +
    '- **direction**: 2-3 sentences of specific, actionable ' + cfg.label.toLowerCase() + ' direction\n' +
    '- **rationale**: Why this matters — what principle or precedent supports it\n' +
    '- **reference**: A specific film, show, game, or creative work that exemplifies this\n\n' +
    'Also write an **overallVision** — one paragraph tying all 5 into a unified ' +
    cfg.label.toLowerCase() + ' design philosophy.\n\n' +
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

const AD_FOCUS_OPTIONS: ADFocus[] = ['character', 'environment', 'props'];

const UPSTREAM_IMAGE_TYPES = new Set([
  'charMainViewer', 'charViewer', 'charImageViewer',
  'charFrontViewer', 'charBackViewer', 'charSideViewer', 'charCustomView',
  'charGenerate', 'imageOutput', 'imageReference', 'detachedViewer',
]);

export default function ArtDirectorNode({ id, selected }: NodeProps) {
  const { setNodes, getNode, getEdges } = useReactFlow();

  const [description, setDescription] = useState('');
  const [media, setMedia] = useState<SeedMediaItem[]>([]);
  const [focus, setFocus] = useState<ADFocus>('character');
  const [result, setResult] = useState<FinalResult | null>(null);
  const [phase, setPhase] = useState<PipelinePhase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const resultRef = useRef<HTMLDivElement>(null);
  const lastUpstreamSigRef = useRef<string | null>(null);

  const upstreamImageSig = useStore(
    useCallback(
      (s: { nodeLookup: Map<string, { type?: string; data: Record<string, unknown> }>; edges: Array<{ source: string; target: string }> }) => {
        for (const e of s.edges) {
          if (e.target !== id) continue;
          const src = s.nodeLookup.get(e.source);
          if (!src) continue;
          if (UPSTREAM_IMAGE_TYPES.has(src.type ?? '')) {
            const img = src.data?.generatedImage as { base64?: string } | undefined;
            if (img?.base64) return img.base64.slice(0, 64);
          }
        }
        return null;
      },
      [id],
    ),
  );

  useEffect(() => {
    if (!upstreamImageSig) return;
    if (lastUpstreamSigRef.current === upstreamImageSig) return;
    lastUpstreamSigRef.current = upstreamImageSig;

    const edges = getEdges();
    for (const e of edges) {
      if (e.target !== id) continue;
      const src = getNode(e.source);
      if (!src?.data) continue;
      if (!UPSTREAM_IMAGE_TYPES.has(src.type ?? '')) continue;
      const d = src.data as Record<string, unknown>;
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
        break;
      }
    }
  }, [upstreamImageSig, id, getNode, getEdges]);

  const hasInput = description.trim().length > 0 || media.length > 0;

  /* ── Persist media/text/focus to node.data for session save ── */
  const syncNodeData = useCallback((desc: string, med: SeedMediaItem[], f?: ADFocus) => {
    setNodes((nds) => nds.map((n) =>
      n.id === id ? { ...n, data: { ...n.data, description: desc, media: med, focus: f ?? focus } } : n,
    ));
  }, [id, setNodes, focus]);

  /* ── Media handling (same patterns as SeedNode) ── */
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
        n.id === id ? { ...n, data: { ...n.data, artDirectionResult: final, artDirectionFocus: focus } } : n,
      ));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase('idle');
    }
  }, [description, media, focus]);


  /* ── Export helpers ── */
  const markdownExport = useMemo(() => {
    if (!result) return '';
    let md = `# Art Direction Feedback\n\n## Overall Vision\n\n${result.overallVision}\n\n---\n\n`;
    result.points.forEach((p, i) => {
      md += `## ${i + 1}. ${p.title}\n\n`;
      md += `**Direction:** ${p.direction}\n\n`;
      md += `**Rationale:** ${p.rationale}\n\n`;
      md += `**Reference:** ${p.reference}\n\n---\n\n`;
    });
    return md;
  }, [result]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(markdownExport);
  }, [markdownExport]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([markdownExport], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'art-direction-feedback.md';
    a.click();
    URL.revokeObjectURL(url);
  }, [markdownExport]);

  return (
    <div className={`artdir-node ${selected ? 'selected' : ''} ${result ? 'has-result' : ''}`}>
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
              onClick={() => { setFocus(f); syncNodeData(description, media, f); }}
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
            onChange={(e) => { setDescription(e.target.value); syncNodeData(e.target.value, media); }}
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
            <button
              className="artdir-run-btn nodrag"
              onClick={handleRun}
              disabled={!hasInput}
            >
              🎬 Run Art Direction
            </button>
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

      {/* Results */}
      {result && phase === 'done' && (
        <div className="artdir-results nodrag nowheel" ref={resultRef}>
          {/* Overall vision */}
          <div
            className="artdir-vision"
            onClick={() => setExpanded(!expanded)}
          >
            <div className="artdir-vision-header">
              Overall Vision
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </div>
            <div className="artdir-vision-text">{result.overallVision}</div>
          </div>

          {expanded && (
            <div className="artdir-points">
              {result.points.map((p, i) => (
                <div key={i} className="artdir-point">
                  <div className="artdir-point-number">{i + 1}</div>
                  <div className="artdir-point-content">
                    <div className="artdir-point-title">{p.title}</div>
                    <div
                      className="artdir-point-direction"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(p.direction) }}
                    />
                    <div className="artdir-point-rationale">
                      <span className="artdir-point-label">Why it matters:</span>{' '}
                      {p.rationale}
                    </div>
                    <div className="artdir-point-reference">
                      <span className="artdir-point-label">Reference:</span>{' '}
                      {p.reference}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="artdir-actions nodrag">
            <button className="artdir-action-btn" onClick={handleCopy}>
              <Copy size={12} /> Copy
            </button>
            <button className="artdir-action-btn" onClick={handleDownload}>
              <Download size={12} /> Download .md
            </button>
            <button className="artdir-action-btn artdir-rerun-btn" onClick={handleRun}>
              🎬 Re-run
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
