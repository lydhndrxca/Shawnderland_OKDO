"use client";

import { memo, useCallback, useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import {
  EXTRACT_ATTRIBUTES_PROMPT,
  ATTRIBUTE_GROUPS,
  BUILD_OPTIONS,
  AGE_OPTIONS,
  RACE_OPTIONS,
  GENDER_OPTIONS,
  CHARACTER_STYLE_NOTES,
  VIEW_REQUESTS,
  hasContextData,
  buildContextExtractionPrefix,
  buildContextAttrExtractionPrefix,
  type ContextLensInput,
} from '@/lib/ideation/engine/conceptlab/characterPrompts';
import {
  generateText,
  generateWithGeminiRef,
  type GeneratedImage,
  type TextModelId,
} from '@/lib/ideation/engine/conceptlab/imageGenApi';
import TextModelSelector from '@/components/TextModelSelector';
import type { ViewHubToggles } from './ImageViewHubNode';
import { DEFAULT_VIEW_HUB_TOGGLES } from './ImageViewHubNode';
import { NODE_TOOLTIPS } from './nodeTooltips';
import { devLog } from '@/lib/devLog';
import './CharacterNodes.css';

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

const DESCRIBE_IMAGE_PROMPT = `You are a forensic-level character appearance analyst. Study this image with extreme precision and write a DETAILED head-to-toe description that another artist could use to recreate this EXACT character.

STRUCTURE your description in this exact order:

1. FACE & HEAD: Exact skin tone (not just "pale" — specify undertone), eye color and any unusual qualities (e.g. milky, glowing, heterochromia), eyebrow shape/color, lip color/shape, facial marks/scars/tattoos, makeup details. Hair: exact color (platinum blonde vs ash blonde vs silver-white), length, texture (straight/wavy/curly), styling, parting.

2. NECK & UPPER BODY: Necklaces/chokers (exact pendant shapes, materials, chain type), visible tattoos/marks/scars on chest/neck (describe symbol, size, placement precisely), collar details.

3. TORSO CLOTHING: Layer by layer from outermost to innermost. For EACH layer specify: garment type, exact material (leather, velvet, cotton, mesh), color, construction details (buttons, zippers, lacing, studs — count/pattern/placement), fit (tight, loose, cropped), and condition.

4. ARMS & HANDS: Sleeve details, gloves or bare hands, rings (which fingers, material, design), bracelets, watches, arm tattoos.

5. LOWER BODY: Skirt/pants type, material, length, shape (A-line, pencil, high-low hem). Underneath layers: stockings/tights/fishnets (material, color, opacity). Specify if legs are bare.

6. FOOTWEAR: Boot/shoe type, height (ankle, mid-calf, knee-high), material, color, closure (laces, zippers, buckles), sole type, condition.

RULES:
- Be SPECIFIC not generic. "Black studded leather jacket with three rows of silver dome studs along each sleeve" NOT "studded leather jacket".
- Name exact colors: "milky white with no visible iris" NOT "light eyes".
- If something is UNIQUE or DISTINCTIVE (unusual eyes, tattoos, specific jewelry), emphasize it prominently.
- Body build MUST use one of: ${BUILD_OPTIONS.join(', ')}.
- If any body part is cropped/hidden, extrapolate confidently from the visible style. Never say "not visible".
- Do NOT describe pose, actions, background, or setting.
- Return ONLY the description text, no JSON or formatting.`;

function bestMatch(value: string, options: string[]): string {
  if (!value) return '';
  const v = value.toLowerCase().trim();
  const exact = options.find((o) => o.toLowerCase() === v);
  if (exact) return exact;
  const contains = options.find((o) => o.toLowerCase().includes(v) || v.includes(o.toLowerCase()));
  if (contains) return contains;
  const firstWord = v.split(/[\s,()/]+/)[0];
  const partial = options.find((o) => o.toLowerCase().startsWith(firstWord));
  if (partial) return partial;
  return value;
}

function buildCostumeBriefFromData(d: Record<string, unknown>): string {
  const lines: string[] = [];
  const styles = d.costumeStyles as string[] | undefined;
  const custom = d.costumeCustomStyles as string | undefined;
  if (styles?.length || custom?.trim()) {
    const all = [...(styles ?? [])];
    if (custom?.trim()) all.push(custom.trim());
    lines.push(`Style influences: ${all.join(', ')}`);
  }
  const origins = d.costumeOrigin as string[] | undefined;
  if (origins?.length) lines.push(`Costume design: ${origins.join(', ')}`);
  const mats = d.costumeMaterials as string[] | undefined;
  if (mats?.length) lines.push(`Materials: ${mats.join(', ')}`);
  const colors: string[] = [];
  if (d.costumePrimaryColor) colors.push(`primary: ${d.costumePrimaryColor}`);
  if (d.costumeSecondaryColor) colors.push(`secondary: ${d.costumeSecondaryColor}`);
  if (d.costumeAccentColor) colors.push(`accent: ${d.costumeAccentColor}`);
  if (d.costumeHardwareColor) {
    const hwDetails = d.costumeHwDetails as string[] | undefined;
    colors.push(`${d.costumeHardwareColor} for ${hwDetails?.length ? hwDetails.join(', ') : 'metal parts'}`);
  }
  if (colors.length) lines.push(`Color palette: ${colors.join('; ')}`);
  if (d.costumeTextureRule) {
    lines.push('Material choices should be a mixture of hard and soft, shiny, matte and satin that will remain richly textured no matter what the lighting condition.');
  }
  if (d.costumeNotes) lines.push(`Direction: ${d.costumeNotes}`);
  const result = d.costumeResult as { overallVision?: string; points?: { title: string; direction: string }[] } | undefined;
  if (result?.overallVision) lines.push(`Costume vision: ${result.overallVision}`);
  if (result?.points?.length) {
    lines.push('Costume directions:');
    result.points.forEach((p, i) => lines.push(`  ${i + 1}. ${p.title}: ${p.direction}`));
  }
  return lines.join('\n');
}

interface ContentRef {
  image: GeneratedImage;
  callout: string;
}

interface ExtractContext {
  lens: ContextLensInput;
  styleText: string;
  styleImages: GeneratedImage[];
  contentRefs: ContentRef[];
}

function gatherExtractContext(
  startId: string,
  getNode: ReturnType<typeof useReactFlow>['getNode'],
  getEdges: ReturnType<typeof useReactFlow>['getEdges'],
): ExtractContext {
  const edges = getEdges();
  const visited = new Set<string>();
  const hubDisabled = new Set<string>();
  const queue = [startId];
  const lens: ContextLensInput = {};
  let styleText = '';
  const styleImages: GeneratedImage[] = [];
  const contentRefs: ContentRef[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);

    for (const e of edges) {
      let neighbor: string | null = null;
      if (e.source === current) neighbor = e.target;
      else if (e.target === current) neighbor = e.source;
      if (!neighbor || visited.has(neighbor)) continue;

      const node = getNode(neighbor);
      if (!node) continue;
      const d = node.data as Record<string, unknown>;

      if (d._sleeping) { queue.push(neighbor); continue; }
      if (node.type === 'charGate' && d.enabled === false) continue;

      if (node.type === 'contextHub') {
        if (d.hubActive === false) continue;
        const ht = d.hubToggles as Record<string, boolean> | undefined;
        if (ht) {
          if (ht.bible === false) hubDisabled.add('charBible');
          if (ht.lock === false) hubDisabled.add('charPreservationLock');
          if (ht.costume === false) hubDisabled.add('costumeDirector');
          if (ht.styleFusion === false) hubDisabled.add('charStyleFusion');
          if (ht.environment === false) hubDisabled.add('envPlacement');
        }
        queue.push(neighbor);
        continue;
      }

      if (hubDisabled.has(node.type ?? '')) continue;

      if (node.type === 'charBible') {
        const parts: string[] = [];
        if (d.characterName) parts.push(`Character: ${d.characterName}`);
        if (d.roleArchetype) parts.push(`Role: ${d.roleArchetype}`);
        if (d.backstory) parts.push(`Backstory: ${d.backstory}`);
        if (d.worldContext) parts.push(`World: ${d.worldContext}`);
        if (d.designIntent) parts.push(`Design intent: ${d.designIntent}`);
        const dirs = d.directors as string[] | undefined;
        if (dirs?.length) parts.push(`Production style: ${dirs.join('. ')}`);
        if (d.customDirector) parts.push(`Production note: ${d.customDirector}`);
        const tones = d.toneTags as string[] | undefined;
        if (tones?.length) parts.push(`Tone: ${tones.join(', ')}`);
        if (parts.length > 0) lens.bibleContext = parts.join('\n');
      }

      if (node.type === 'charPreservationLock') {
        const toggles = d.lockToggles as Record<string, boolean> | undefined;
        const negs = d.lockNegatives as string[] | undefined;
        const constraints: string[] = [];
        if (negs) constraints.push(...negs.map((n: string) => `MUST AVOID: ${n}`));
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
        if (constraints.length > 0) lens.lockConstraints = constraints.join('\n');
      }

      if (node.type === 'costumeDirector') {
        const brief = buildCostumeBriefFromData(d);
        if (brief) lens.costumeBrief = brief;
      }
      if (node.type === 'charStyleFusion') {
        if (d.fusionBrief) lens.fusionBrief = d.fusionBrief as string;
      }
      if (node.type === 'envPlacement') {
        if (d.envBrief) lens.envBrief = d.envBrief as string;
      }

      if (node.type === 'charStyle') {
        const mode = (d.styleMode as string) || 'images';
        if (mode === 'text' || mode === 'both') {
          if (d.styleText) styleText = d.styleText as string;
        }
        if (mode === 'images' || mode === 'both') {
          const imgs = d.styleImages as GeneratedImage[] | undefined;
          if (imgs?.length) styleImages.push(...imgs);
        }
      }

      if (node.type === 'charRefCallout') {
        const callout = (d.calloutText as string) || 'incorporate this item';
        let foundImage: GeneratedImage | null = null;
        for (const re of edges.filter((re) => re.target === neighbor)) {
          const refSrc = getNode(re.source);
          if (!refSrc) continue;
          const rd = refSrc.data as Record<string, unknown>;
          if (rd.editedImage) { foundImage = rd.editedImage as GeneratedImage; break; }
          if (rd.generatedImage) { foundImage = rd.generatedImage as GeneratedImage; break; }
          if (rd.imageBase64) { foundImage = { base64: rd.imageBase64 as string, mimeType: (rd.mimeType as string) || 'image/png' }; break; }
        }
        if (foundImage) contentRefs.push({ image: foundImage, callout });
      }

      queue.push(neighbor);
    }
  }
  return { lens, styleText, styleImages, contentRefs };
}

function findUpstreamImage(
  nodeId: string,
  getNode: ReturnType<typeof useReactFlow>['getNode'],
  getEdges: ReturnType<typeof useReactFlow>['getEdges'],
): GeneratedImage | null {
  const edges = getEdges();
  const incoming = edges.filter((e) => e.target === nodeId);
  for (const e of incoming) {
    const src = getNode(e.source);
    if (!src?.data) continue;
    const d = src.data as Record<string, unknown>;
    const img = d.generatedImage as GeneratedImage | undefined;
    if (img?.base64) return img;
    const edited = d.editedImage as GeneratedImage | undefined;
    if (edited?.base64) return edited;
    const bulk = d._bulkImages as GeneratedImage[] | undefined;
    if (bulk && bulk.length > 0 && bulk[0].base64) return bulk[0];
    const b64 = d.imageBase64 as string | undefined;
    if (b64) return { base64: b64, mimeType: (d.mimeType as string) || 'image/png' };
  }
  return null;
}

const MAIN_VIEWER_TYPES = new Set(['charMainViewer', 'charViewer', 'charImageViewer']);

function ExtractAttributesNodeInner({ id, data, selected }: Props) {
  const { setNodes, getNode, getEdges } = useReactFlow();
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [resultText, setResultText] = useState((data?.resultText as string) ?? '');
  const [userHint, setUserHint] = useState((data?.userHint as string) ?? '');
  const [textModel, setTextModel] = useState<TextModelId>((data?.textModel as TextModelId) ?? 'fast');

  const pushToDownstream = useCallback(
    (description: string, json: Record<string, string>) => {
      const edges = getEdges();
      const outgoing = edges.filter((e) => e.source === id);

      setNodes((nds) =>
        nds.map((n) => {
          const outEdge = outgoing.find((e) => e.target === n.id);
          if (!outEdge) return n;

          const nd = n.data as Record<string, unknown>;
          const updates: Record<string, unknown> = {};

          if (n.type === 'charIdentity') {
            const locks = (nd.lockedAttrs as Record<string, boolean>) ?? {};
            const existing = (nd.identity as Record<string, string>) ?? {};
            updates.identity = {
              age: locks.age ? existing.age : bestMatch(json.age ?? '', AGE_OPTIONS),
              race: locks.race ? existing.race : bestMatch(json.race ?? '', RACE_OPTIONS),
              gender: locks.gender ? existing.gender : bestMatch(json.gender ?? '', GENDER_OPTIONS),
              build: locks.build ? existing.build : bestMatch(json.build ?? '', BUILD_OPTIONS),
            };
          } else if (n.type === 'charDescription') {
            updates.description = description;
          } else if (n.type === 'charAttributes') {
            const locks = (nd.lockedAttrs as Record<string, boolean>) ?? {};
            const existing = (nd.attributes as Record<string, string>) ?? {};
            const merged = { ...existing };
            for (const g of ATTRIBUTE_GROUPS) {
              if (json[g.key] && !locks[g.key]) merged[g.key] = json[g.key];
            }
            updates.attributes = merged;
          }

          if (Object.keys(updates).length === 0) return n;
          return { ...n, data: { ...nd, ...updates } };
        }),
      );
    },
    [id, getEdges, setNodes],
  );

  const findDownstreamViewers = useCallback(() => {
    const edges = getEdges();
    const visited = new Set<string>();
    const queue = [id];
    const mainIds: string[] = [];
    let viewHubToggles: ViewHubToggles = { ...DEFAULT_VIEW_HUB_TOGGLES };

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      for (const e of edges) {
        const target = e.source === current ? e.target : null;
        if (!target || visited.has(target)) continue;
        const node = getNode(target);
        if (!node) continue;
        const t = node.type ?? '';

        if (t === 'charGate') {
          const gateData = node.data as Record<string, unknown>;
          if (!(gateData.enabled as boolean ?? true)) continue;
        }

        if (t === 'imageViewHub') {
          const d = node.data as Record<string, unknown>;
          viewHubToggles = { ...DEFAULT_VIEW_HUB_TOGGLES, ...((d.viewHubToggles as Partial<ViewHubToggles>) ?? {}) };
        }

        if (MAIN_VIEWER_TYPES.has(t) || t === 'charGenerate') {
          mainIds.push(target);
        }
        queue.push(target);
      }
    }
    return { mainIds, viewHubToggles };
  }, [id, getNode, getEdges]);

  const handleExtract = useCallback(async () => {
    const img = findUpstreamImage(id, getNode, getEdges);
    if (!img) {
      setError('Connect an image source (ImageReference or generated image) first.');
      return;
    }
    setGenerating(true);
    setError(null);
    setStatus('Describing character...');
    try {
      const hint = userHint.trim();

      // Parse user exclusion terms upfront — used for prompt AND post-processing
      const excludeTerms: string[] = [];
      if (hint) {
        const patterns = [
          /\b(?:no|ignore|remove|without|exclude|skip|drop|omit)\s+(?:the\s+)?(.+)/gi,
        ];
        for (const pat of patterns) {
          let m: RegExpExecArray | null;
          while ((m = pat.exec(hint)) !== null) {
            const raw = m[1].toLowerCase().split(/[,;&]+/).map((t) => t.trim()).filter(Boolean);
            excludeTerms.push(...raw);
          }
        }
      }

      // Place user override BEFORE the main instruction so the AI processes it first
      const excludeList = excludeTerms.length > 0
        ? `ITEMS TO COMPLETELY EXCLUDE (pretend they do not exist in the image): ${excludeTerms.join(', ')}\n`
        : '';

      const descHintBlock = hint
        ? `⚠️ MANDATORY USER OVERRIDE — HIGHEST PRIORITY:\n${excludeList}${hint}\nIf the user says to ignore/exclude/remove any item, that item MUST NOT appear ANYWHERE in your description. Write as if it does not exist. Do not mention it even indirectly.\n\n`
        : '';

      const attrHintBlock = hint
        ? `\n\n⚠️ MANDATORY USER OVERRIDE — HIGHEST PRIORITY (overrides "no none values" rule):\n${excludeList}${hint}\nIf the user says "no [item]", "ignore [item]", "remove [item]", "without [item]", or "exclude [item]", you MUST set ANY field that would describe that item to "none". For example: "no tool belt" → "waist": "none", "handprop": "none". "no hat" → "headwear": "none". This overrides everything else.`
        : '';

      const ctx = gatherExtractContext(id, getNode, getEdges);
      const ctxLens = ctx.lens;
      const hasCtx = hasContextData(ctxLens);
      const ctxDescPrefix = hasCtx ? buildContextExtractionPrefix(ctxLens) : '';
      const ctxAttrSuffix = hasCtx ? buildContextAttrExtractionPrefix(ctxLens) : '';

      console.log(`%c[ExtractAttributes] Context hub: ${hasCtx ? 'ON' : 'OFF'}, bible: ${!!ctxLens.bibleContext}, costume: ${!!ctxLens.costumeBrief}, fusion: ${!!ctxLens.fusionBrief}, env: ${!!ctxLens.envBrief}, lock: ${!!ctxLens.lockConstraints}, styleText: ${!!ctx.styleText}, styleImgs: ${ctx.styleImages.length}`, 'color: #4caf50; font-weight: bold');
      if (hasCtx) setStatus('Describing character through context lens...');

      // Step 1: image → prose description
      // If context hub is ON, the AI sees the image AND the creative direction together
      const description = await generateText(descHintBlock + ctxDescPrefix + DESCRIBE_IMAGE_PROMPT, img, textModel);

      let cleanDescription = description;
      if (excludeTerms.length > 0) {
        const sentences = description.split(/(?<=[.!?])\s+/);
        cleanDescription = sentences
          .filter((sentence) => {
            const lower = sentence.toLowerCase();
            return !excludeTerms.some((term) => lower.includes(term));
          })
          .join(' ');
      }

      setStatus('Extracting identity and attributes...');

      const attrPrompt = `${EXTRACT_ATTRIBUTES_PROMPT}${attrHintBlock}${ctxAttrSuffix}\n\nCHARACTER DESCRIPTION:\n${cleanDescription}`;
      const attrText = await generateText(attrPrompt, img, textModel);

      const combined = `Description:\n${cleanDescription}\n\nAttributes:\n${attrText}`;
      setResultText(combined);
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, resultText: combined } } : n)),
      );

      const json = JSON.parse(attrText.replace(/```json?\n?/g, '').replace(/```/g, '').trim());

      if (excludeTerms.length > 0) {
        for (const key of Object.keys(json)) {
          const val = (json[key] ?? '').toLowerCase();
          for (const term of excludeTerms) {
            if (val.includes(term)) {
              json[key] = 'none';
              break;
            }
          }
        }
      }

      if (hasCtx) {
        console.log('%c[ExtractAttributes] Context-aware extraction complete — outfit reimagined through creative lens', 'color: #ff9800; font-weight: bold');
      }

      pushToDownstream(cleanDescription, json);
      setStatus('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus('');
    } finally {
      setGenerating(false);
    }
  }, [id, getNode, getEdges, setNodes, pushToDownstream, userHint, textModel]);

  const handleRecreate = useCallback(async () => {
    const img = findUpstreamImage(id, getNode, getEdges);
    if (!img) {
      setError('Connect an image source (ImageReference or generated image) first.');
      return;
    }
    setGenerating(true);
    setError(null);
    setStatus('Describing character…');
    try {
      const hint = userHint.trim();

      const excludeTerms: string[] = [];
      if (hint) {
        const patterns = [/\b(?:no|ignore|remove|without|exclude|skip|drop|omit)\s+(?:the\s+)?(.+)/gi];
        for (const pat of patterns) {
          let m: RegExpExecArray | null;
          while ((m = pat.exec(hint)) !== null) {
            excludeTerms.push(...m[1].toLowerCase().split(/[,;&]+/).map((t) => t.trim()).filter(Boolean));
          }
        }
      }

      const excludeList = excludeTerms.length > 0
        ? `ITEMS TO COMPLETELY EXCLUDE (pretend they do not exist in the image): ${excludeTerms.join(', ')}\n`
        : '';
      const descHintBlock = hint
        ? `⚠️ MANDATORY USER OVERRIDE — HIGHEST PRIORITY:\n${excludeList}${hint}\nIf the user says to ignore/exclude/remove any item, that item MUST NOT appear ANYWHERE in your description.\n\n`
        : '';
      const attrHintBlock = hint
        ? `\n\n⚠️ MANDATORY USER OVERRIDE — HIGHEST PRIORITY (overrides "no none values" rule):\n${excludeList}${hint}\nIf the user says "no [item]", "ignore [item]", "remove [item]", "without [item]", or "exclude [item]", you MUST set ANY field that would describe that item to "none".`
        : '';

      const ctx = gatherExtractContext(id, getNode, getEdges);
      const ctxLens = ctx.lens;
      const hasCtx = hasContextData(ctxLens);
      const ctxDescPrefix = hasCtx ? buildContextExtractionPrefix(ctxLens) : '';
      const ctxAttrSuffix = hasCtx ? buildContextAttrExtractionPrefix(ctxLens) : '';

      console.log(`%c[ExtractAttributes:Recreate] style: text=${!!ctx.styleText}, imgs=${ctx.styleImages.length}, contentRefs=${ctx.contentRefs.length}`, 'color: #ff9800; font-weight: bold');
      if (hasCtx) setStatus('Describing character through context lens…');

      const contentRefOverrides = ctx.contentRefs.map((r) => r.callout).filter(Boolean);

      const description = await generateText(descHintBlock + ctxDescPrefix + DESCRIBE_IMAGE_PROMPT, img, textModel);

      let cleanDescription = description;
      if (excludeTerms.length > 0) {
        cleanDescription = description
          .split(/(?<=[.!?])\s+/)
          .filter((s) => !excludeTerms.some((t) => s.toLowerCase().includes(t)))
          .join(' ');
      }

      if (contentRefOverrides.length > 0) {
        cleanDescription += `\n\n⚠️ REFERENCE CALLOUT OVERRIDES (these take priority over extracted description above):\n${contentRefOverrides.map((c) => `- ${c}`).join('\n')}`;
      }

      setStatus('Extracting identity and attributes…');

      const attrPrompt = `${EXTRACT_ATTRIBUTES_PROMPT}${attrHintBlock}${ctxAttrSuffix}\n\nCHARACTER DESCRIPTION:\n${cleanDescription}`;
      const attrText = await generateText(attrPrompt, img, textModel);

      const combined = `Description:\n${cleanDescription}\n\nAttributes:\n${attrText}`;
      setResultText(combined);
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, resultText: combined } } : n)),
      );

      const json = JSON.parse(attrText.replace(/```json?\n?/g, '').replace(/```/g, '').trim());

      if (excludeTerms.length > 0) {
        for (const key of Object.keys(json)) {
          const val = (json[key] ?? '').toLowerCase();
          for (const term of excludeTerms) {
            if (val.includes(term)) { json[key] = 'none'; break; }
          }
        }
      }

      pushToDownstream(cleanDescription, json);

      const { mainIds, viewHubToggles } = findDownstreamViewers();

      if (mainIds.length > 0) {
        setNodes((nds) =>
          nds.map((n) => mainIds.includes(n.id)
            ? { ...n, data: { ...n.data, generating: true } }
            : n),
        );
      }

      setStatus('Recreating main view…');
      devLog('[ExtractAttributes] Recreate: sending original image + description to Gemini for visual recreation');

      const hasStyleOverride = !!(ctx.styleText || ctx.styleImages.length > 0);
      const styleBlock = hasStyleOverride
        ? `\nRENDERING STYLE — CRITICAL:\nYou MUST render this character in the following art style. This overrides the default photorealistic rendering.\n${ctx.styleText ? `Style description: ${ctx.styleText}\n` : ''}${ctx.styleImages.length > 0 ? 'Study the STYLE REFERENCE image(s) provided and replicate their EXACT visual technique, color palette, line quality, shading approach, and artistic medium. The output must be visually indistinguishable in style from the reference(s).\n' : ''}`
        : CHARACTER_STYLE_NOTES;

      const contentRefBlock = ctx.contentRefs.length > 0
        ? `\n\n⚠️ CONTENT REFERENCE INSTRUCTIONS — MANDATORY, DO NOT SKIP:\n${ctx.contentRefs.map((ref, i) => {
          const imgIdx = 1 + ctx.styleImages.length + 1 + i;
          return `• Image ${imgIdx} — "${ref.callout}": The character MUST incorporate the specific item/object shown in this image. Preserve its design, shape, and colors.`;
        }).join('\n')}\nALL content reference item(s) MUST appear in the final image. These OVERRIDE any contradicting attributes from the extraction (e.g., if extraction says "clean-shaven" but a reference callout shows a beard, the character MUST have the beard).`
        : '';

      let recreatePrompt = `You are looking at a character reference image. Your task is to RECREATE this EXACT character as a clean, full-body character reference sheet.

WHAT TO PRESERVE (copy from the source image):
- The EXACT same person: face, age, skin tone, build, hair, expression, scars, tattoos, facial hair
- The EXACT same outfit: every garment, accessory, prop, color, material, pattern, condition, wear, and damage
- The EXACT same vibe and character energy — if they look battle-worn, the recreation is battle-worn; if elegant, the recreation is elegant

WHAT TO CHANGE (standardize for the reference sheet):
- POSE: Relaxed standing A-stance, slight 3/4 to camera, arms at sides
- BACKGROUND: Flat solid neutral grey only — no environment, no floor, no shadows
- FRAMING: Full body head to shoe soles, character fills ~65% of frame height with grey padding above and below
- LIGHTING: Soft, even studio photography lighting, neutral color temperature

${styleBlock}

${VIEW_REQUESTS.main}

CHARACTER DESCRIPTION (extracted from the source — follow this precisely):
${cleanDescription}
${contentRefBlock}

ZERO TEXT — do NOT render any text, letters, numbers, logos, labels, or watermarks anywhere in the image.

FINAL CHECK: The output character must be IMMEDIATELY recognizable as the same person wearing the same outfit from the source image. If a viewer couldn't tell it's the same character, you have failed.`;

      const allRefImages: GeneratedImage[] = [img];
      if (ctx.styleImages.length > 0) allRefImages.push(...ctx.styleImages);
      const contentRefImages = ctx.contentRefs.map((r) => r.image);
      if (contentRefImages.length > 0) allRefImages.push(...contentRefImages);

      const imageLabelParts: string[] = ['Image 1 is the CHARACTER REFERENCE (recreate this character).'];
      if (ctx.styleImages.length > 0) {
        const sStart = 2;
        const sEnd = 1 + ctx.styleImages.length;
        imageLabelParts.push(`Images ${sStart}–${sEnd} are STYLE REFERENCES — replicate their visual style EXACTLY. Do NOT copy characters or scenes from style refs.`);
      }
      if (contentRefImages.length > 0) {
        const cStart = 1 + ctx.styleImages.length + 1;
        ctx.contentRefs.forEach((ref, i) => {
          imageLabelParts.push(`Image ${cStart + i} is a CONTENT REFERENCE — "${ref.callout}".`);
        });
      }
      if (allRefImages.length > 1) {
        recreatePrompt += `\n\nIMAGE LAYOUT: ${imageLabelParts.join(' ')}`;
      }

      const mainResults = await generateWithGeminiRef(recreatePrompt, allRefImages);
      const recreatedMain = mainResults[0];
      if (!recreatedMain) throw new Error('No image returned from recreation');

      const triggerTimestamp = Date.now();
      if (mainIds.length > 0) {
        setNodes((nds) =>
          nds.map((n) => mainIds.includes(n.id)
            ? { ...n, data: { ...n.data, generatedImage: recreatedMain, _orthoTrigger: triggerTimestamp, _viewHubToggles: viewHubToggles } }
            : n),
        );
        devLog(`[ExtractAttributes] Main view pushed to ${mainIds.length} node(s) with ortho trigger`);
      }

      const enabledOrthos = (['front', 'back', 'side', 'custom'] as const).filter((k) => viewHubToggles[k]);
      if (enabledOrthos.length > 0) {
        setStatus(`Done! Auto-generating ${enabledOrthos.join(', ')} views…`);
      }

      devLog('[ExtractAttributes] Recreate complete — ortho views will auto-generate via CharViewNode');
      setStatus('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus('');
    } finally {
      setGenerating(false);
      const cleanupIds = findDownstreamViewers().mainIds;
      if (cleanupIds.length > 0) {
        setNodes((nds) =>
          nds.map((n) => cleanupIds.includes(n.id)
            ? { ...n, data: { ...n.data, generating: false } }
            : n),
        );
      }
    }
  }, [id, getNode, getEdges, setNodes, pushToDownstream, findDownstreamViewers, userHint, textModel]);

  return (
    <div className={`char-node ${selected ? 'selected' : ''}`} title={NODE_TOOLTIPS.charExtractAttrs}>
      <div className="char-node-header" style={{ background: '#ffab40', gap: 6 }}>
        <span>Extract Attributes</span>
        <TextModelSelector value={textModel} onChange={(m) => { setTextModel(m); setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, textModel: m } } : n)); }} disabled={generating} />
      </div>
      <div className="char-node-body">
        <textarea
          className="char-textarea nodrag nopan nowheel"
          value={userHint}
          onChange={(e) => {
            const v = e.target.value;
            setUserHint(v);
            setNodes((nds) =>
              nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, userHint: v } } : n)),
            );
          }}
          placeholder="Optional: focus on armor details, ignore background, treat hair as blonde..."
          rows={2}
          style={{ fontSize: 11, minHeight: 36 }}
        />
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="char-btn primary nodrag" onClick={handleExtract} disabled={generating} style={{ flex: 1 }}>
            {generating && !status?.includes('Recreating') ? 'Extracting…' : 'Extract'}
          </button>
          <button
            className="char-btn nodrag"
            onClick={handleRecreate}
            disabled={generating}
            title="Extract attributes AND recreate the character as a clean reference — Gemini sees the original image while generating"
            style={{ flex: 1, background: '#e91e63', color: '#fff', fontWeight: 600 }}
          >
            {generating && status?.includes('Recreating') ? 'Recreating…' : 'Extract + Recreate'}
          </button>
        </div>
        {generating && status && <div className="char-progress">{status}</div>}
        {error && <div className="char-error">{error}</div>}
        {resultText && (
          <div className="char-scroll-area nodrag nowheel" style={{ maxHeight: 200 }}>
            <pre style={{ fontSize: 10, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', margin: 0 }}>
              {resultText.slice(0, 1000)}
            </pre>
          </div>
        )}
      </div>

      <Handle type="target" position={Position.Left} id="image-in" className="char-handle" style={{ top: '50%' }} />
      <Handle type="source" position={Position.Right} id="output" className="char-handle" style={{ top: '50%' }} />
    </div>
  );
}

export default memo(ExtractAttributesNodeInner);
