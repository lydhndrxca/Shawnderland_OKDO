"use client";

import { memo, useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { Handle, Position, useReactFlow, useStore } from '@xyflow/react';
import { createGeminiProvider } from '@/lib/ideation/engine/provider/geminiProvider';
import type { MediaPart } from '@/lib/ideation/engine/provider/types';
import type { GeneratedImage } from '@/lib/ideation/engine/conceptlab/imageGenApi';
import { z } from 'zod';
import '../character/CharacterNodes.css';

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

/* ── Style Influence Tags ── */
const STYLE_INFLUENCES = [
  'Heavy metal', 'Punk rock', 'Industrial', 'Gothic', 'Art nouveau',
  'Techwear', 'Rockabilly', 'Outlaw biker', 'Pro wrestling', 'Streetwear',
  'High fashion', 'Military surplus', 'Thrift store DIY', 'Cyberpunk',
  'Noir', 'Western', 'Samurai', 'Victorian', 'Afrofuturism', 'Brutalism',
  'Anti-establishment', 'Blood magic', 'Racing leathers', 'Demolition derby',
];

/* ── Costume Origin / Source ── */
const ORIGIN_OPTIONS = [
  { key: 'custom-fabrication', label: 'Custom fabrication' },
  { key: 'hardware-thrift', label: 'Hardware store + thrift store' },
  { key: 'found-assembled', label: 'Found / scavenged / assembled' },
  { key: 'military-surplus', label: 'Military surplus modified' },
  { key: 'haute-couture', label: 'Haute couture / designer' },
  { key: 'stage-performance', label: 'Stage / performance costume' },
  { key: 'ceremonial', label: 'Ritual / ceremonial garments' },
];

/* ── Material Options ── */
const MATERIALS = [
  { key: 'leatherMatte', label: 'Leather — matte' },
  { key: 'leatherPatent', label: 'Leather — patent' },
  { key: 'leatherDistressed', label: 'Leather — distressed' },
  { key: 'satin', label: 'Satin / silk' },
  { key: 'metalBronze', label: 'Metal hardware — bronze' },
  { key: 'metalChrome', label: 'Metal hardware — chrome' },
  { key: 'metalBlackened', label: 'Metal hardware — blackened steel' },
  { key: 'canvas', label: 'Canvas / denim' },
  { key: 'mesh', label: 'Mesh / lace' },
  { key: 'vinyl', label: 'Vinyl / PVC' },
  { key: 'fur', label: 'Fur / feather' },
  { key: 'rubber', label: 'Rubber / neoprene' },
  { key: 'wool', label: 'Wool / knit' },
  { key: 'chainmail', label: 'Chainmail / armor plate' },
];

/* ── Hardware Colors ── */
const HARDWARE_COLORS = ['bronze', 'chrome', 'gold', 'blackened', 'copper', 'pewter', 'gunmetal'];

/* ── Hardware Details (what the metal is used for) ── */
const HARDWARE_DETAILS = [
  'buckles', 'snaps', 'zippers', 'rivets', 'grommets', 'chains',
  'studs', 'clasps', 'armor plates', 'trim / edging',
];

/* ── Gauntlet Schemas ── */
const NormSchema = z.object({ brief: z.string(), assumptions: z.array(z.string()) });
const DivergeSchema = z.object({ ideas: z.array(z.object({ angle: z.string(), idea: z.string() })) });
const CritiqueSchema = z.object({ survivors: z.array(z.object({ angle: z.string(), idea: z.string(), improved: z.string(), score: z.number() })) });
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

type Phase = 'idle' | 'normalize' | 'diverge' | 'critique' | 'converge' | 'commit' | 'done';
const PHASE_LABELS: Record<string, string> = {
  normalize: '1/5 — Analyzing costume brief',
  diverge: '2/5 — Brainstorming 15+ costume directions',
  critique: '3/5 — Critiquing & refining ideas',
  converge: '4/5 — Ranking & selecting top 5',
  commit: '5/5 — Polishing final directions',
};

/* ── Build structured prompt from form state ── */
function buildCostumeBrief(
  styles: Set<string>,
  customStyles: string,
  materials: Set<string>,
  primaryColor: string,
  secondaryColor: string,
  accentColor: string,
  hardwareColor: string,
  hwDetails: Set<string>,
  costumeOrigin: Set<string>,
  textureRule: boolean,
  additionalNotes: string,
): string {
  const lines: string[] = [];

  if (styles.size > 0 || customStyles.trim()) {
    const all = [...styles];
    if (customStyles.trim()) all.push(customStyles.trim());
    lines.push(`Style influences: ${all.join(', ')}`);
  }

  const origins = ORIGIN_OPTIONS.filter((o) => costumeOrigin.has(o.key)).map((o) => o.label);
  if (origins.length > 0) lines.push(`Costume origin: ${origins.join(', ')}`);

  const mats = MATERIALS.filter((m) => materials.has(m.key)).map((m) => m.label);
  if (mats.length > 0) lines.push(`Materials: ${mats.join(', ')}`);

  const colors: string[] = [];
  if (primaryColor.trim()) colors.push(`primary: ${primaryColor}`);
  if (secondaryColor.trim()) colors.push(`secondary: ${secondaryColor}`);
  if (accentColor.trim()) colors.push(`accent: ${accentColor}`);
  if (hardwareColor) {
    const detailList = [...hwDetails];
    colors.push(`${hardwareColor} for ${detailList.length > 0 ? detailList.join(', ') : 'metal parts'}`);
  }
  if (colors.length > 0) lines.push(`Color palette: ${colors.join('; ')}`);

  if (textureRule) lines.push('Material choices should be a mixture of hard and soft, shiny, matte and satin that will remain richly textured no matter what the lighting condition.');
  if (additionalNotes.trim()) lines.push(`Additional direction: ${additionalNotes.trim()}`);

  return lines.join('\n');
}

function buildBibleContext(d: Record<string, unknown>): string {
  const parts: string[] = [];
  if (d.characterName) parts.push(`Character: ${d.characterName}`);
  if (d.roleArchetype) parts.push(`Role: ${d.roleArchetype}`);
  if (d.backstory) parts.push(`Backstory: ${d.backstory}`);
  if (d.worldContext) parts.push(`World: ${d.worldContext}`);
  if (d.designIntent) parts.push(`Design intent: ${d.designIntent}`);
  const dirs = d.directors as string[] | undefined;
  if (dirs?.length) parts.push(`Production style: ${dirs.join('. ')}`);
  if (d.customDirector) parts.push(`Additional production note: ${d.customDirector}`);
  const tones = d.toneTags as string[] | undefined;
  if (tones?.length) parts.push(`Tone: ${tones.join(', ')}`);
  return parts.join('\n');
}

/* ── Gather upstream context (Bible, Lock, etc.) ── */
function gatherUpstream(
  nodeId: string,
  getNode: ReturnType<typeof useReactFlow>['getNode'],
  getEdges: ReturnType<typeof useReactFlow>['getEdges'],
) {
  const edges = getEdges();
  let bibleContext = '';
  let lockConstraints = '';
  let fusionBrief = '';
  const images: { base64: string; mimeType: string }[] = [];

  function resolveThrough(sourceId: string): Array<{ type?: string; data: Record<string, unknown> }> {
    const n = getNode(sourceId);
    if (!n?.data) return [];
    const d = n.data as Record<string, unknown>;
    if (n.type === 'charGate') {
      if (d.enabled === false) return [];
      const upstream = edges.filter((ue) => ue.target === sourceId);
      const results: Array<{ type?: string; data: Record<string, unknown> }> = [];
      for (const ue of upstream) results.push(...resolveThrough(ue.source));
      return results;
    }
    if (d._sleeping) {
      const upstream = edges.filter((ue) => ue.target === sourceId);
      const results: Array<{ type?: string; data: Record<string, unknown> }> = [];
      for (const ue of upstream) results.push(...resolveThrough(ue.source));
      return results;
    }
    return [{ type: n.type, data: d }];
  }

  for (const e of edges) {
    if (e.target !== nodeId) continue;
    const resolved = resolveThrough(e.source);
    for (const { type: srcType, data: d } of resolved) {

    if (srcType === 'charBible') {
      bibleContext = buildBibleContext(d);
    }

    if (srcType === 'charPreservationLock') {
      const toggles = d.lockToggles as Record<string, boolean> | undefined;
      const negs = d.lockNegatives as string[] | undefined;
      const constraints: string[] = [];
      if (toggles) {
        if (toggles.keepFace) constraints.push('Do NOT change the face');
        if (toggles.keepHair) constraints.push('Do NOT change the hairstyle');
        if (toggles.keepHairColor) constraints.push('Do NOT change the hair color');
        if (toggles.keepPose) constraints.push('Do NOT change the pose');
        if (toggles.keepBodyType) constraints.push('Do NOT change the body type or build');
        if (toggles.keepCameraAngle) constraints.push('Do NOT change the camera angle');
        if (toggles.keepLighting) constraints.push('Do NOT change the lighting');
        if (toggles.keepBackground) constraints.push('Do NOT change the background');
      }
      if (negs) constraints.push(...negs.map((neg: string) => `MUST AVOID: ${neg}`));
      lockConstraints = constraints.join('\n');
    }

    if (srcType === 'charStyleFusion') {
      fusionBrief = (d.fusionBrief as string) || '';
    }

    const img = d.generatedImage as GeneratedImage | undefined;
    if (img?.base64) images.push(img);
    else if (typeof d.imageBase64 === 'string' && d.imageBase64) {
      images.push({ base64: d.imageBase64, mimeType: (d.mimeType as string) || 'image/png' });
    }
    } // end inner for (resolved)
  } // end outer for (edges)

  return { bibleContext, lockConstraints, fusionBrief, images };
}

function CostumeDirectorNodeInner({ id, data, selected }: Props) {
  const { setNodes, getNode, getEdges } = useReactFlow();
  const localEdit = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  /* ── Form state ── */
  const [styles, setStyles] = useState<Set<string>>(() => new Set((data?.costumeStyles as string[]) ?? []));
  const [customStyles, setCustomStyles] = useState((data?.costumeCustomStyles as string) ?? '');
  const [materials, setMaterials] = useState<Set<string>>(() => new Set((data?.costumeMaterials as string[]) ?? []));
  const [primaryColor, setPrimaryColor] = useState((data?.costumePrimaryColor as string) ?? '');
  const [secondaryColor, setSecondaryColor] = useState((data?.costumeSecondaryColor as string) ?? '');
  const [accentColor, setAccentColor] = useState((data?.costumeAccentColor as string) ?? '');
  const [hardwareColor, setHardwareColor] = useState((data?.costumeHardwareColor as string) ?? '');
  const [hwDetails, setHwDetails] = useState<Set<string>>(() => new Set((data?.costumeHwDetails as string[]) ?? []));
  const [costumeOrigin, setCostumeOrigin] = useState<Set<string>>(() => new Set((data?.costumeOrigin as string[]) ?? []));
  const [textureRule, setTextureRule] = useState<boolean>((data?.costumeTextureRule as boolean) ?? true);
  const [additionalNotes, setAdditionalNotes] = useState((data?.costumeNotes as string) ?? '');
  const [minimized, setMinimized] = useState(false);

  /* ── Gauntlet state ── */
  const [phase, setPhase] = useState<Phase>('idle');
  const [result, setResult] = useState<FinalResult | null>((data?.costumeResult as FinalResult) ?? null);
  const [error, setError] = useState<string | null>(null);

  const persist = useCallback(
    (updates: Record<string, unknown>) => {
      localEdit.current = true;
      setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...updates } } : n)));
    },
    [id, setNodes],
  );

  const persistForm = useCallback(() => {
    persist({
      costumeStyles: [...styles],
      costumeCustomStyles: customStyles,
      costumeMaterials: [...materials],
      costumePrimaryColor: primaryColor,
      costumeSecondaryColor: secondaryColor,
      costumeAccentColor: accentColor,
      costumeHardwareColor: hardwareColor,
      costumeHwDetails: [...hwDetails],
      costumeOrigin: [...costumeOrigin],
      costumeTextureRule: textureRule,
      costumeNotes: additionalNotes,
    });
  }, [persist, styles, customStyles, materials, primaryColor, secondaryColor, accentColor, hardwareColor, hwDetails, costumeOrigin, textureRule, additionalNotes]);

  /* ── Run 5-phase costume gauntlet ── */
  const handleRun = useCallback(async () => {
    setError(null);
    setResult(null);
    try {
      const provider = createGeminiProvider(undefined, 'standard');
      const brief = buildCostumeBrief(styles, customStyles, materials, primaryColor, secondaryColor, accentColor, hardwareColor, hwDetails, costumeOrigin, textureRule, additionalNotes);
      const { bibleContext, lockConstraints, fusionBrief, images } = gatherUpstream(id, getNode, getEdges);

      const fullContext = [
        bibleContext && `## CHARACTER CONTEXT\n${bibleContext}`,
        fusionBrief && `## STYLE FUSION\n${fusionBrief}`,
        brief && `## COSTUME BRIEF\n${brief}`,
        lockConstraints && `## PRESERVATION CONSTRAINTS (MUST OBEY)\n${lockConstraints}`,
      ].filter(Boolean).join('\n\n');

      const mp: MediaPart[] | undefined = images.length > 0
        ? images.map((img) => ({ inlineData: { data: img.base64, mimeType: img.mimeType } }))
        : undefined;

      const ROLE = 'Use your special talent as a legendary Hollywood costume designer. You think about fabric as storytelling, silhouette as character psychology, and every seam as intentional narrative. Material choices should be a mixture of hard and soft, shiny, matte and satin that will remain richly textured no matter what the lighting condition. Focus: COSTUME DESIGN for a blockbuster movie.\n\n';

      setPhase('normalize');
      const norm = await provider.generateStructured({
        schema: NormSchema,
        prompt: ROLE + `## Task — NORMALIZE\nBreak down this costume concept. Identify what's being asked, what's assumed, and what's unknown.\n\n${fullContext}\n\nReturn JSON: { "brief": "2-3 sentence distillation", "assumptions": ["things assumed"] }`,
        mediaParts: mp,
      });

      if (!mountedRef.current) return;
      setPhase('diverge');
      const div = await provider.generateStructured({
        schema: DivergeSchema,
        prompt: ROLE + `## Normalized Brief\n${norm.brief}\n\n## Assumptions\n${norm.assumptions.map((a: string) => '- ' + a).join('\n')}\n\n${lockConstraints ? `## CONSTRAINTS\n${lockConstraints}\n\n` : ''}## Task — DIVERGE\nBrainstorm 15 raw costume design ideas across silhouette, material, color, hardware, texture, cultural reference, narrative symbolism, and practical wearability.\n\nReturn JSON: { "ideas": [{ "angle": "label", "idea": "1-2 sentences" }] }\nExactly 15.`,
      });

      if (!mountedRef.current) return;
      setPhase('critique');
      const block = div.ideas.map((o: { angle: string; idea: string }, i: number) => `${i + 1}. **${o.angle}**: ${o.idea}`).join('\n');
      const crit = await provider.generateStructured({
        schema: CritiqueSchema,
        prompt: ROLE + `## Your 15 Raw Ideas\n${block}\n\n${lockConstraints ? `## CONSTRAINTS\n${lockConstraints}\n\n` : ''}## Task — CRITIQUE\nRate every idea 1-10 on originality + actionability. Keep (7+), kill (1-4), mutate (5-6). For mutated, provide improved version. Be ruthless.\n\nReturn JSON: { "survivors": [{ "angle": "", "idea": "", "improved": "", "score": 0 }] }\nOnly return ideas scored 5+.`,
      });

      if (!mountedRef.current) return;
      setPhase('converge');
      const survivors = crit.survivors.sort((a: { score: number }, b: { score: number }) => b.score - a.score).slice(0, 5);

      setPhase('commit');
      const top5 = survivors.map((s: { angle: string; improved: string; idea: string }) => `- **${s.angle}**: ${s.improved || s.idea}`).join('\n');
      const final = await provider.generateStructured({
        schema: CommitSchema,
        prompt: ROLE + `## Top 5 Costume Directions\n${top5}\n\n${fullContext ? `## Original Context\n${fullContext}\n\n` : ''}## Task — COMMIT\nPolish these into 5 final actionable costume directions. Each must be specific enough for a costume fabrication team.\n\nReturn JSON: { "overallVision": "2-3 sentence vision", "points": [{ "title": "punchy title", "direction": "2-3 sentence specific direction", "rationale": "why this works", "reference": "real-world reference" }] }`,
      });

      if (!mountedRef.current) return;
      setResult(final);
      setPhase('done');
      persist({ costumeResult: final });
    } catch (e) {
      if (mountedRef.current) {
        setError(e instanceof Error ? e.message : String(e));
        setPhase('idle');
      }
    }
  }, [id, styles, customStyles, materials, primaryColor, secondaryColor, accentColor, hardwareColor, hwDetails, costumeOrigin, textureRule, additionalNotes, getNode, getEdges, persist]);

  const toggleStyle = useCallback((s: string) => {
    setStyles((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s); else next.add(s);
      return next;
    });
  }, []);

  const toggleMaterial = useCallback((key: string) => {
    setMaterials((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  const isBusy = phase !== 'idle' && phase !== 'done';

  return (
    <div className={`char-node ${selected ? 'selected' : ''}`} style={{ minWidth: 380, maxWidth: 'none', width: '100%' }}
      title="Costume Director — Structured costume design with style, material, and color inputs. Runs a 5-phase gauntlet to produce actionable costume directions.">
      <div className="char-node-header" style={{ background: '#ad1457', cursor: 'pointer' }} onClick={() => setMinimized((m) => !m)}>
        <span>Costume Director</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {result && <span style={{ fontSize: 9, background: 'rgba(0,0,0,0.2)', padding: '1px 6px', borderRadius: 8 }}>5 directions</span>}
          <span style={{ fontSize: 10, opacity: 0.7 }}>{minimized ? '\u25BC' : '\u25B2'}</span>
        </span>
      </div>

      {minimized && (
        <div className="char-node-body" style={{ padding: '4px 10px' }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            {styles.size} styles, {materials.size} materials{result ? ' — 5 directions ready' : ''}
          </span>
        </div>
      )}

      {!minimized && (
        <div className="char-node-body" style={{ gap: 10 }}>

          {/* ── Style Influences ── */}
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#e91e63', marginBottom: 4 }}>
              Style Influences
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {STYLE_INFLUENCES.map((s) => (
                <button
                  key={s}
                  className="nodrag"
                  onClick={() => { toggleStyle(s); setTimeout(persistForm, 0); }}
                  style={{
                    fontSize: 10, padding: '3px 8px', borderRadius: 12,
                    border: `1px solid ${styles.has(s) ? 'rgba(233,30,99,0.5)' : 'rgba(255,255,255,0.1)'}`,
                    background: styles.has(s) ? 'rgba(233,30,99,0.15)' : 'rgba(255,255,255,0.03)',
                    color: styles.has(s) ? '#f48fb1' : 'var(--text-muted)',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
            <input
              className="char-input nodrag"
              value={customStyles}
              onChange={(e) => { setCustomStyles(e.target.value); setTimeout(persistForm, 0); }}
              placeholder="Custom styles (comma-separated)..."
              style={{ width: '100%', fontSize: 10, marginTop: 4 }}
            />
          </div>

          {/* ── Materials ── */}
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#e91e63', marginBottom: 4 }}>
              Material Palette
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {MATERIALS.map((m) => (
                <button
                  key={m.key}
                  className="nodrag"
                  onClick={() => { toggleMaterial(m.key); setTimeout(persistForm, 0); }}
                  style={{
                    fontSize: 10, padding: '3px 8px', borderRadius: 12,
                    border: `1px solid ${materials.has(m.key) ? 'rgba(233,30,99,0.5)' : 'rgba(255,255,255,0.1)'}`,
                    background: materials.has(m.key) ? 'rgba(233,30,99,0.15)' : 'rgba(255,255,255,0.03)',
                    color: materials.has(m.key) ? '#f48fb1' : 'var(--text-muted)',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Costume Origin ── */}
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#e91e63', marginBottom: 4 }}>
              Costume Origin
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {ORIGIN_OPTIONS.map((o) => (
                <button key={o.key} className="nodrag"
                  onClick={() => { setCostumeOrigin((prev) => { const next = new Set(prev); if (next.has(o.key)) next.delete(o.key); else next.add(o.key); return next; }); setTimeout(persistForm, 0); }}
                  style={{
                    fontSize: 10, padding: '3px 8px', borderRadius: 12,
                    border: `1px solid ${costumeOrigin.has(o.key) ? 'rgba(233,30,99,0.5)' : 'rgba(255,255,255,0.1)'}`,
                    background: costumeOrigin.has(o.key) ? 'rgba(233,30,99,0.15)' : 'rgba(255,255,255,0.03)',
                    color: costumeOrigin.has(o.key) ? '#f48fb1' : 'var(--text-muted)',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Color Palette ── */}
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#e91e63', marginBottom: 4 }}>
              Color Palette
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
              <div>
                <span style={{ fontSize: 9, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>Primary</span>
                <input className="char-input nodrag" value={primaryColor} onChange={(e) => { setPrimaryColor(e.target.value); setTimeout(persistForm, 0); }}
                  placeholder="e.g. black, deep crimson" style={{ width: '100%', fontSize: 10 }} />
              </div>
              <div>
                <span style={{ fontSize: 9, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>Secondary</span>
                <input className="char-input nodrag" value={secondaryColor} onChange={(e) => { setSecondaryColor(e.target.value); setTimeout(persistForm, 0); }}
                  placeholder="e.g. dark grey, indigo" style={{ width: '100%', fontSize: 10 }} />
              </div>
              <div>
                <span style={{ fontSize: 9, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>Accent</span>
                <input className="char-input nodrag" value={accentColor} onChange={(e) => { setAccentColor(e.target.value); setTimeout(persistForm, 0); }}
                  placeholder="e.g. hints of red" style={{ width: '100%', fontSize: 10 }} />
              </div>
              <div>
                <span style={{ fontSize: 9, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>Hardware Color</span>
                <select className="char-select nodrag" value={hardwareColor} onChange={(e) => { setHardwareColor(e.target.value); setTimeout(persistForm, 0); }}
                  style={{ width: '100%', fontSize: 10 }}>
                  <option value="">— select —</option>
                  {HARDWARE_COLORS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            {hardwareColor && (
              <div style={{ marginTop: 4 }}>
                <span style={{ fontSize: 9, color: 'var(--text-muted)', display: 'block', marginBottom: 3 }}>Hardware for...</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                  {HARDWARE_DETAILS.map((d) => {
                    const active = hwDetails.has(d);
                    return (
                      <button key={d} className="nodrag"
                        onClick={() => { setHwDetails((prev) => { const next = new Set(prev); if (next.has(d)) next.delete(d); else next.add(d); return next; }); setTimeout(persistForm, 0); }}
                        style={{
                          fontSize: 9, padding: '2px 7px', borderRadius: 10,
                          border: `1px solid ${active ? 'rgba(233,30,99,0.4)' : 'rgba(255,255,255,0.08)'}`,
                          background: active ? 'rgba(233,30,99,0.12)' : 'rgba(255,255,255,0.02)',
                          color: active ? '#f48fb1' : 'var(--text-muted)',
                          cursor: 'pointer', transition: 'all 0.15s',
                        }}>
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── Texture Rule ── */}
          <label className="nodrag" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={textureRule} onChange={() => { setTextureRule((p) => !p); setTimeout(persistForm, 0); }}
              style={{ accentColor: '#e91e63', width: 14, height: 14 }} />
            <span style={{ fontSize: 10, color: textureRule ? '#f48fb1' : 'var(--text-muted)' }}>
              Ensure rich texture reads across all lighting conditions
            </span>
          </label>

          {/* ── Additional Notes ── */}
          <div>
            <span style={{ fontSize: 9, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>Additional Direction</span>
            <textarea
              className="char-textarea nodrag nowheel"
              value={additionalNotes}
              onChange={(e) => { setAdditionalNotes(e.target.value); setTimeout(persistForm, 0); }}
              placeholder="Any extra costume direction..."
              rows={2}
              style={{ width: '100%', fontSize: 10 }}
            />
          </div>

          {/* ── Run Button ── */}
          <button
            className="char-btn nodrag"
            onClick={handleRun}
            disabled={isBusy}
            style={{
              width: '100%', height: 34, fontSize: 12, fontWeight: 700,
              background: isBusy ? 'rgba(233,30,99,0.1)' : 'rgba(233,30,99,0.2)',
              borderColor: 'rgba(233,30,99,0.4)', color: '#e91e63',
            }}
          >
            {isBusy ? PHASE_LABELS[phase] || 'Processing...' : 'Run Costume Gauntlet'}
          </button>
          {error && <div className="char-error">{error}</div>}

          {/* ── Results ── */}
          {result && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
              <div style={{
                background: 'rgba(233,30,99,0.06)', border: '1px solid rgba(233,30,99,0.15)',
                borderRadius: 6, padding: '8px 10px', fontSize: 11, lineHeight: 1.5, color: '#ccc',
              }}>
                <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#e91e63', marginBottom: 4 }}>
                  Overall Vision
                </div>
                {result.overallVision}
              </div>
              {result.points.map((p, i) => (
                <div key={i} style={{
                  background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 6, padding: '8px 10px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 800, color: '#e91e63',
                      background: 'rgba(233,30,99,0.12)', width: 20, height: 20, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>{i + 1}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{p.title}</span>
                  </div>
                  <p style={{ fontSize: 11, color: '#ccc', margin: 0, lineHeight: 1.5 }}>{p.direction}</p>
                  <p style={{ fontSize: 10, color: '#888', margin: '4px 0 0', lineHeight: 1.4 }}>
                    <strong>Why:</strong> {p.rationale}
                  </p>
                  <p style={{ fontSize: 10, color: '#888', margin: '2px 0 0', lineHeight: 1.4, fontStyle: 'italic' }}>
                    Ref: {p.reference}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Handle type="target" position={Position.Left} id="input" className="char-handle" style={{ top: '50%' }} />
      <Handle type="source" position={Position.Right} id="costume-out" className="char-handle" style={{ top: '50%' }} />
    </div>
  );
}

export default memo(CostumeDirectorNodeInner);
