"use client";

import { memo, useCallback, useState, useRef, useEffect } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import {
  buildCharacterDescription,
  buildCharacterViewPrompt,
  synthesizeContextLens,
  hasContextData,
  type CharacterIdentity,
  type CharacterAttributes,
  type ContextLensInput,
} from '@/lib/ideation/engine/conceptlab/characterPrompts';
import {
  generateWithNanoBanana,
  generateWithGeminiRef,
  generateWithImagen4,
  type GeneratedImage,
  type GeminiImageModel,
} from '@/lib/ideation/engine/conceptlab/imageGenApi';
import { resolveNodeInfluences } from '@/lib/ideation/engine/conceptlab/resolveInfluences';
import { getGlobalSettings } from '@/lib/globalSettings';
import { createProcessingAnimator } from '@/lib/processingAnimation';
import { IMAGE_GEN_MODELS, MULTIMODAL_MODELS, PRESET_KEY, loadPreset } from './ModelSettingsNode';
import type { PresetData } from './ModelSettingsNode';
import type { ViewHubToggles } from './ImageViewHubNode';
import { DEFAULT_VIEW_HUB_TOGGLES } from './ImageViewHubNode';
import { NODE_TOOLTIPS } from './nodeTooltips';
import { devLog, devWarn } from '@/lib/devLog';
import './CharacterNodes.css';

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

const MAIN_VIEWER_TYPES = new Set(['charMainViewer', 'charViewer', 'charImageViewer']);

const ASPECT_RATIOS = [
  { value: '9:16', label: 'Portrait 9:16' },
  { value: '1:1', label: 'Square 1:1' },
  { value: '16:9', label: 'Landscape 16:9' },
  { value: '3:4', label: 'Portrait 3:4' },
  { value: '4:3', label: 'Landscape 4:3' },
];

interface ContentRef {
  image: GeneratedImage;
  callout: string;
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

function gatherInputs(
  nodeId: string,
  getNode: ReturnType<typeof useReactFlow>['getNode'],
  getEdges: ReturnType<typeof useReactFlow>['getEdges'],
) {
  const edges = getEdges();
  const incoming = edges.filter((e) => e.target === nodeId);

  let identity: CharacterIdentity = { age: '', race: '', gender: '', build: '' };
  let description = '';
  let attributes: CharacterAttributes = {};
  let pose = '';
  let styleText = '';
  const styleImages: GeneratedImage[] = [];
  const contentRefs: ContentRef[] = [];
  let projectName = '';
  let outputDir = '';
  let bibleContext = '';
  let lockConstraints = '';
  let costumeBrief = '';
  let fusionBrief = '';
  let envBrief = '';

  function resolveGate(sourceId: string): Array<{ node: ReturnType<typeof getNode>; data: Record<string, unknown> }> {
    const n = getNode(sourceId);
    if (!n?.data) return [];
    const d = n.data as Record<string, unknown>;
    if (n.type === 'charGate') {
      if (d.enabled === false) return [];
      const upstream = edges.filter((e) => e.target === sourceId);
      const results: Array<{ node: ReturnType<typeof getNode>; data: Record<string, unknown> }> = [];
      for (const ue of upstream) results.push(...resolveGate(ue.source));
      return results;
    }
    if (n.type === 'contextHub') {
      if (d.hubActive === false) return [];
      const toggles = d.hubToggles as Record<string, boolean> | undefined;
      const upstream = edges.filter((e) => e.target === sourceId);
      const results: Array<{ node: ReturnType<typeof getNode>; data: Record<string, unknown> }> = [];
      for (const ue of upstream) {
        const resolved = resolveGate(ue.source);
        for (const r of resolved) {
          if (!r.node || !toggles) { results.push(r); continue; }
          const t = (r.node as { type?: string }).type ?? '';
          if (t === 'charBible' && toggles.bible === false) continue;
          if (t === 'charPreservationLock' && toggles.lock === false) continue;
          if (t === 'costumeDirector' && toggles.costume === false) continue;
          if (t === 'charStyleFusion' && toggles.styleFusion === false) continue;
          if (t === 'envPlacement' && toggles.environment === false) continue;
          results.push(r);
        }
      }
      return results;
    }
    if (d._sleeping) {
      const upstream = edges.filter((e) => e.target === sourceId);
      const results: Array<{ node: ReturnType<typeof getNode>; data: Record<string, unknown> }> = [];
      for (const ue of upstream) results.push(...resolveGate(ue.source));
      return results;
    }
    return [{ node: n, data: d }];
  }

  const resolvedSources: Array<{ node: NonNullable<ReturnType<typeof getNode>>; data: Record<string, unknown> }> = [];
  for (const e of incoming) {
    const resolved = resolveGate(e.source);
    for (const r of resolved) {
      if (r.node) resolvedSources.push({ node: r.node as NonNullable<ReturnType<typeof getNode>>, data: r.data });
    }
  }

  console.log(`%c[gatherInputs] ${incoming.length} incoming edge(s) → ${resolvedSources.length} resolved sources`, 'color: #00bcd4; font-weight: bold');
  for (const { node: src, data: d } of resolvedSources) {
    const keyHighlights = Object.keys(d).filter(k => !k.startsWith('_') && d[k] !== '' && d[k] !== undefined && d[k] !== null);
    console.log(`  → type="${src.type}" | non-empty keys: [${keyHighlights.join(', ')}]`);

    if (src.type === 'charIdentity') {
      const id = d.identity as CharacterIdentity | undefined;
      if (id) identity = id;
      if (d.name) description = `${d.name as string}: ${description}`;
    } else if (src.type === 'charDescription') {
      if (d.description) description += (d.description as string);
    } else if (src.type === 'charAttributes') {
      if (d.attributes) attributes = { ...attributes, ...(d.attributes as CharacterAttributes) };
    } else if (src.type === 'charPose') {
      if (d.pose) pose = d.pose as string;
    } else if (src.type === 'charStyle') {
      if (d.styleText) styleText = d.styleText as string;
      const imgs = d.styleImages as GeneratedImage[] | undefined;
      if (imgs && imgs.length > 0) styleImages.push(...imgs);
    } else if (src.type === 'charRefCallout') {
      const callout = (d.calloutText as string) || 'incorporate this item';
      const refEdges = edges.filter((re) => re.target === src.id);
      devLog(`[gatherInputs] RefCallout "${callout}" — ${refEdges.length} incoming edges to callout node`);
      let foundImage: GeneratedImage | null = null;
      for (const re of refEdges) {
        const refSrc = getNode(re.source);
        if (!refSrc?.data) continue;
        const rd = refSrc.data as Record<string, unknown>;
        devLog(`[gatherInputs]   → RefCallout source type="${refSrc.type}", hasGeneratedImage=${!!(rd.generatedImage as { base64?: string })?.base64}, hasImageBase64=${!!rd.imageBase64}`);
        const rImg = rd.generatedImage as GeneratedImage | undefined;
        if (rImg?.base64) { foundImage = rImg; break; }
        if (rd.imageBase64) { foundImage = { base64: rd.imageBase64 as string, mimeType: (rd.mimeType as string) || 'image/png' }; break; }
      }
      if (foundImage) {
        devLog(`[gatherInputs]   ✓ RefCallout image found (${(foundImage.base64.length / 1024).toFixed(0)}KB), callout="${callout}"`);
        contentRefs.push({ image: foundImage, callout });
      } else {
        devWarn(`[gatherInputs]   ✗ RefCallout image NOT found for "${callout}"`);
      }
    } else if (src.type === 'charBible') {
      const parts: string[] = [];
      if (d.characterName) parts.push(`Character: ${d.characterName as string}`);
      if (d.roleArchetype) parts.push(`Role: ${d.roleArchetype as string}`);
      if (d.backstory) parts.push(`Backstory: ${d.backstory as string}`);
      if (d.worldContext) parts.push(`World: ${d.worldContext as string}`);
      if (d.designIntent) parts.push(`Design intent: ${d.designIntent as string}`);
      const dirs = d.directors as string[] | undefined;
      if (dirs?.length) parts.push(`Production style: ${dirs.join('. ')}`);
      if (d.customDirector) parts.push(`Production note: ${d.customDirector as string}`);
      const tones = d.toneTags as string[] | undefined;
      if (tones?.length) parts.push(`Tone: ${tones.join(', ')}`);
      if (parts.length > 0) bibleContext = parts.join('\n');
    } else if (src.type === 'charPreservationLock') {
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
      if (negs) constraints.push(...negs.map((n) => `MUST AVOID: ${n}`));
      if (constraints.length > 0) lockConstraints = constraints.join('\n');
    } else if (src.type === 'costumeDirector') {
      const brief = buildCostumeBriefFromData(d);
      if (brief) costumeBrief = brief;
    } else if (src.type === 'charStyleFusion') {
      if (d.fusionBrief) fusionBrief = d.fusionBrief as string;
    } else if (src.type === 'envPlacement') {
      if (d.envBrief) envBrief = d.envBrief as string;
    } else if (src.type === 'charProject') {
      if (d.projectName) projectName = d.projectName as string;
      if (d.outputDir) outputDir = d.outputDir as string;
    } else if (src.type === 'charModelSettings') {
      // Model settings are handled separately now — ignore
    } else {
      const img = d.generatedImage as GeneratedImage | undefined;
      const callout = (d.calloutText as string) || '';
      if (img?.base64) {
        if (callout) {
          contentRefs.push({ image: img, callout });
        } else {
          contentRefs.push({ image: img, callout: 'use this as reference' });
        }
      } else if (d.imageBase64) {
        const fallbackImg = { base64: d.imageBase64 as string, mimeType: (d.mimeType as string) || 'image/png' };
        contentRefs.push({ image: fallbackImg, callout: callout || 'use this as reference' });
      }
    }
  }

  const refImages = contentRefs.map((r) => r.image);
  const callouts = contentRefs.map((r) => r.callout);

  return { identity, description, attributes, pose, styleText, styleImages, refImages, callouts, contentRefs, projectName, outputDir, bibleContext, lockConstraints, costumeBrief, fusionBrief, envBrief };
}

const VIEW_KEY_BY_NODE_TYPE: Record<string, keyof ViewHubToggles> = {
  charMainViewer: 'main',
  charViewer: 'main',
  charImageViewer: 'main',
  charFrontViewer: 'front',
  charBackViewer: 'back',
  charSideViewer: 'side',
  charCustomView: 'custom',
};

function findDownstreamViewersAndHub(
  nodeId: string,
  getNode: ReturnType<typeof useReactFlow>['getNode'],
  getEdges: ReturnType<typeof useReactFlow>['getEdges'],
): { mainViewerIds: string[]; allViewerIds: string[]; viewHubToggles: ViewHubToggles } {
  const edges = getEdges();
  const mainViewerIds: string[] = [];
  const allViewerIds: string[] = [];
  let viewHubToggles: ViewHubToggles = { ...DEFAULT_VIEW_HUB_TOGGLES };
  const visited = new Set<string>();
  const queue = [nodeId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);

    const outgoing = edges.filter((e) => e.source === current);
    for (const e of outgoing) {
      const target = getNode(e.target);
      if (!target || visited.has(target.id)) continue;

      if (target.type === 'charGate') {
        const gateData = target.data as Record<string, unknown>;
        if (!(gateData.enabled as boolean ?? true)) continue;
      }

      if (target.type === 'imageViewHub') {
        const d = target.data as Record<string, unknown>;
        viewHubToggles = { ...DEFAULT_VIEW_HUB_TOGGLES, ...((d.viewHubToggles as Partial<ViewHubToggles>) ?? {}) };
      }

      const viewKey = VIEW_KEY_BY_NODE_TYPE[target.type ?? ''];
      if (viewKey) {
        allViewerIds.push(target.id);
        if (MAIN_VIEWER_TYPES.has(target.type ?? '')) {
          mainViewerIds.push(target.id);
        }
      }

      queue.push(target.id);
    }
  }
  return { mainViewerIds, allViewerIds, viewHubToggles };
}

function findDownstreamMainViewers(
  nodeId: string,
  getNode: ReturnType<typeof useReactFlow>['getNode'],
  getEdges: ReturnType<typeof useReactFlow>['getEdges'],
): string[] {
  return findDownstreamViewersAndHub(nodeId, getNode, getEdges).mainViewerIds;
}

async function autoSaveImage(
  image: GeneratedImage,
  viewName: string,
  charName: string,
  outputDirOverride?: string,
): Promise<{ ok: boolean; path?: string; error?: string }> {
  const globalDir = getGlobalSettings().outputDir;
  const outputDir = outputDirOverride || globalDir;
  if (!outputDir) return { ok: false, error: 'No output directory configured' };
  try {
    const res = await fetch('/api/character-save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        base64: image.base64,
        mimeType: image.mimeType,
        charName: charName || 'character',
        viewName,
        outputDir,
        appKey: 'concept-lab',
        contentType: 'characters',
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { ok: false, error: (body as Record<string, string>).error || `HTTP ${res.status}` };
    }
    const body = await res.json() as { path?: string };
    return { ok: true, path: body.path };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

function savePreset(data: PresetData) {
  localStorage.setItem(PRESET_KEY, JSON.stringify(data));
}

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '5px 6px',
  fontSize: 11,
  background: '#1a1a2e',
  color: '#eee',
  border: '1px solid #444',
  borderRadius: 4,
};

function GenerateCharImageNodeInner({ id, data, selected }: Props) {
  const { setNodes, setEdges, getNode, getEdges } = useReactFlow();
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [hasImage, setHasImage] = useState(!!data?.generatedImage);
  const mountedRef = useRef(true);
  const [saved, setSaved] = useState(false);

  const preset = loadPreset();
  const [imageGenModel, setImageGenModel] = useState<string>(
    (data?.imageGenModelId as string) ?? preset?.imageGenModelId ?? IMAGE_GEN_MODELS[0].id,
  );
  const [multimodalModel, setMultimodalModel] = useState<string>(
    (data?.multimodalModelId as string) ?? preset?.multimodalModelId ?? MULTIMODAL_MODELS[0].id,
  );
  const [aspectRatio, setAspectRatio] = useState<string>(
    (data?.aspectRatio as string) ?? preset?.aspectRatio ?? '9:16',
  );

  const imgDef = IMAGE_GEN_MODELS.find((m) => m.id === imageGenModel) ?? IMAGE_GEN_MODELS[0];
  const mmDef = MULTIMODAL_MODELS.find((m) => m.id === multimodalModel) ?? MULTIMODAL_MODELS[0];

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const persist = useCallback((updates: Record<string, unknown>) => {
    setNodes((nds) =>
      nds.map((n) => n.id === id ? { ...n, data: { ...n.data, ...updates } } : n),
    );
  }, [id, setNodes]);

  useEffect(() => {
    persist({
      imageGenModelId: imageGenModel,
      imageGenApiId: imgDef.apiId,
      multimodalModelId: multimodalModel,
      multimodalApiId: mmDef.apiId,
      aspectRatio,
    });
  }, [imageGenModel, multimodalModel, aspectRatio, imgDef.apiId, mmDef.apiId, persist]);

  const handleSavePreset = useCallback(() => {
    savePreset({ imageGenModelId: imageGenModel, multimodalModelId: multimodalModel, aspectRatio });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [imageGenModel, multimodalModel, aspectRatio]);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setError(null);
    setProgress('Gathering inputs...');
    const anim = createProcessingAnimator(setNodes, setEdges, getEdges);

    try {
      anim.markNodes([id], true);
      anim.markEdgesFrom(id, true);

      const inputs = gatherInputs(id, getNode, getEdges);
      const { identity, attributes, styleText, styleImages, contentRefs, projectName, outputDir, bibleContext, lockConstraints, costumeBrief, fusionBrief, envBrief } = inputs;
      let { description, pose } = inputs;

      const refImages = contentRefs.map((r) => r.image);
      const callouts = contentRefs.map((r) => r.callout);

      const ctxParts: string[] = [];
      if (bibleContext) ctxParts.push(`Bible ✓ (${bibleContext.length}ch)`);
      if (lockConstraints) ctxParts.push(`Lock ✓ (${lockConstraints.split('\n').length} rules)`);
      if (costumeBrief) ctxParts.push(`Costume ✓`);
      if (fusionBrief) ctxParts.push(`Fusion ✓`);
      if (envBrief) ctxParts.push(`Env ✓`);
      if (styleText) ctxParts.push(`StyleText ✓`);
      if (styleImages.length) ctxParts.push(`StyleImg ✓ (${styleImages.length})`);
      if (contentRefs.length) ctxParts.push(`Refs ✓ (${contentRefs.length}: ${callouts.join(', ')})`);
      const ctxSummary = ctxParts.length > 0 ? ctxParts.join(' | ') : '⚠ No context gathered';

      devLog(`[GenerateCharImage] Context: ${ctxSummary}`);
      devLog(`[GenerateCharImage] Desc: ${description.length} chars, Identity: ${JSON.stringify(identity)}`);
      devLog(`[GenerateCharImage] Models — imageGen: ${imgDef.label} (${imgDef.apiId}), multimodal: ${mmDef.label} (${mmDef.apiId})`);
      console.log(`%c[Generate] Context gathered: ${ctxSummary}`, 'color: #4caf50; font-weight: bold; font-size: 12px');
      setProgress(`Context: ${ctxSummary}`);

      if (!pose && attributes.pose) {
        pose = attributes.pose;
      }
      if (pose) {
        attributes.pose = pose;
      }

      const ctxLens: ContextLensInput = { bibleContext, costumeBrief, fusionBrief, envBrief, lockConstraints };
      let synthIdentity = identity;
      let synthDescription = description;
      let synthAttributes = attributes;

      if (hasContextData(ctxLens)) {
        setProgress('Applying context lens...');
        console.log('%c[Generate] Running context lens synthesis...', 'color: #ff9800; font-weight: bold');
        try {
          const synth = await synthesizeContextLens(identity, attributes, description, ctxLens);
          synthIdentity = synth.identity;
          synthDescription = synth.description;
          synthAttributes = synth.attributes;
          devLog('[GenerateCharImage] Context lens synthesis complete', { descLen: synthDescription.length, attrKeys: Object.keys(synthAttributes).length });
        } catch (e) {
          devWarn('[GenerateCharImage] Context lens synthesis failed, using raw inputs:', e);
        }
      }

      const hasStyleOverride = styleText.trim().length > 0 || styleImages.length > 0;
      const effectiveStyleText = styleText.trim()
        || (styleImages.length > 0 ? 'Match the visual style shown in the style reference image(s). Replicate the exact rendering technique, color palette, and artistic approach.' : undefined);
      const desc = buildCharacterDescription(synthIdentity, synthAttributes, synthDescription, hasStyleOverride ? effectiveStyleText : undefined);

      const influenceBlock = resolveNodeInfluences(
        id,
        getNode as (id: string) => { id: string; type?: string; data: Record<string, unknown> } | undefined,
        getEdges as () => { source: string; target: string }[],
      );

      let fullPrompt = buildCharacterViewPrompt('main', desc, hasStyleOverride ? effectiveStyleText : undefined) + influenceBlock;

      const genMode = styleImages.length > 0
        ? `${mmDef.label} + ${styleImages.length} style ref${contentRefs.length > 0 ? ` + ${contentRefs.length} content ref` : ''}`
        : contentRefs.length > 0
          ? `${mmDef.label} + ${contentRefs.length} content ref`
          : `${imgDef.label}, ${aspectRatio}`;
      setProgress(`Generating (${genMode})...`);
      const earlyIds = findDownstreamViewersAndHub(id, getNode, getEdges).mainViewerIds;
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === id || earlyIds.includes(n.id)) {
            return { ...n, data: { ...n.data, generating: true } };
          }
          return n;
        }),
      );

      function calloutVerb(text: string): string {
        const t = text.toLowerCase();
        if (t.includes('hold') || t.includes('carry') || t.includes('grip')) return 'be holding';
        if (t.includes('wear') || t.includes('put on') || t.includes('dress')) return 'be wearing';
        if (t.includes('ride') || t.includes('sit on') || t.includes('mount')) return 'be riding/sitting on';
        if (t.includes('stand on') || t.includes('stand in')) return 'be standing on/in';
        if (t.includes('add') || t.includes('include')) return 'incorporate';
        return 'have';
      }

      let result: GeneratedImage[];
      if (styleImages.length > 0 || contentRefs.length > 0) {
        const allRefImages = [...styleImages, ...refImages];
        const styleDesc = effectiveStyleText ? `The user describes the target style as: "${effectiveStyleText}". Use this description to further guide your style analysis. ` : '';

        const imageLines: string[] = [];
        styleImages.forEach((_, i) => {
          imageLines.push(`• Image ${i + 1}: STYLE REFERENCE — extract ONLY the art style. Do NOT copy characters, objects, or scene from this image.`);
        });
        contentRefs.forEach((ref, i) => {
          const imgIdx = styleImages.length + i + 1;
          imageLines.push(`• Image ${imgIdx}: CONTENT REFERENCE — "${ref.callout}" — The character MUST ${calloutVerb(ref.callout)} the specific item/object shown in this image.`);
        });
        const imageIndexing = `IMAGE LAYOUT — I am providing ${allRefImages.length} image(s) in this order:\n${imageLines.join('\n')}`;

        const calloutSection = contentRefs.length > 0
          ? `\n\n⚠️ CONTENT REFERENCE INSTRUCTIONS — MANDATORY, DO NOT SKIP:\n${contentRefs.map((ref, i) => {
  const imgIdx = styleImages.length + i + 1;
  return `• Image ${imgIdx} — "${ref.callout}": The character MUST ${calloutVerb(ref.callout)} the exact item from Image ${imgIdx}. Preserve its design, shape, and colors. Render it in the target art style.`;
}).join('\n')}\nALL ${contentRefs.length} content reference item(s) MUST appear in the final image. This is not optional.`
          : '';

        const hasStyleRefs = styleImages.length > 0;
        const styleAnalysis = hasStyleRefs ? `
STYLE ANALYSIS INSTRUCTIONS — study the STYLE REFERENCE image(s) and identify ALL of these:
1. GEOMETRY: How are shapes constructed? (smooth vs hard edges vs blocky/voxel vs polygonal)
2. PROPORTIONS: Character body proportions (realistic vs chibi vs exaggerated)
3. RENDERING: How are surfaces shaded? (flat color vs gradient vs cel-shaded vs painted)
4. EDGES: Outlines and edges? (thick outlines vs none vs pixelated vs anti-aliased)
5. COLOR PALETTE: Color range and saturation (limited vs full spectrum, muted vs vibrant)
6. TEXTURE: Surface detail? (smooth vs noisy vs hand-painted vs pixel-grid)
7. RESOLUTION/FIDELITY: Abstraction level? (hyper-detailed vs minimalist vs low-fi)` : '';

        const styleRules = hasStyleRefs ? `
CRITICAL STYLE RULES:
- The output MUST be visually indistinguishable in style from the style reference(s).
- Do NOT default to a generic version of the style category. Replicate the SPECIFIC rendering technique shown.
- Do NOT include any characters or scenes from the style reference images — ONLY replicate their visual style.` : '';

        const prompt = `${imageIndexing}
${styleAnalysis}${calloutSection}

${styleDesc}${hasStyleRefs ? 'Now generate a NEW image depicting the following character, rendered in the EXACT same visual style as the style reference(s):' : 'Generate the following character, incorporating all content reference items:'}

${fullPrompt}
${styleRules}
${contentRefs.length > 0 ? `- Every content reference item MUST appear on the character. This is MANDATORY — do not skip any.` : ''}`;

        console.log(`%c[Generate] PATH: Multimodal (${mmDef.label}) — ${styleImages.length} style imgs + ${contentRefs.length} content refs, aspect=${aspectRatio}`, 'color: #ff9800; font-weight: bold');
        devLog(`[GenerateCharImage] Multimodal prompt length: ${prompt.length}`);
        result = await generateWithGeminiRef(prompt, allRefImages, mmDef.apiId as GeminiImageModel, aspectRatio);
      } else if (imgDef.apiId.startsWith('imagen-')) {
        console.log(`%c[Generate] PATH: Imagen 4 text-only (${imgDef.label}) — prompt length: ${fullPrompt.length}`, 'color: #2196f3; font-weight: bold');
        result = await generateWithImagen4(fullPrompt, aspectRatio, 1, imgDef.apiId);
      } else {
        console.log(`%c[Generate] PATH: Nano Banana text-only (${imgDef.label}) — prompt length: ${fullPrompt.length}`, 'color: #9c27b0; font-weight: bold');
        result = await generateWithNanoBanana(fullPrompt, aspectRatio, 1, imgDef.apiId);
      }
      const mainImage = result[0];
      setHasImage(true);

      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === id) {
            return {
              ...n,
              data: {
                ...n.data,
                generatedImage: mainImage,
                characterDescription: desc,
                aspectRatio,
              },
            };
          }
          return n;
        }),
      );

      autoSaveImage(mainImage, 'main_stage', projectName, outputDir || undefined)
        .then((r) => { if (!r.ok) devWarn('[auto-save]', r.error); });

      const { mainViewerIds, viewHubToggles } = findDownstreamViewersAndHub(id, getNode, getEdges);
      const triggerTimestamp = Date.now();

      if (mainViewerIds.length > 0) {
        anim.markNodes(mainViewerIds, true);
        for (const vid of mainViewerIds) anim.markEdgesTo(vid, true);
        setNodes((nds) =>
          nds.map((n) =>
            mainViewerIds.includes(n.id)
              ? { ...n, data: { ...n.data, generatedImage: mainImage, _orthoTrigger: triggerTimestamp, _viewHubToggles: viewHubToggles } }
              : n,
          ),
        );
      }

      const enabledOrthos = (['front', 'back', 'side', 'custom'] as const).filter((k) => viewHubToggles[k]);
      if (enabledOrthos.length > 0) {
        setProgress(`Done! Auto-generating ${enabledOrthos.join(', ')} views...`);
      } else {
        setProgress('Done!');
      }
      setTimeout(() => { setProgress(''); }, 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
      const cleanupIds = findDownstreamViewersAndHub(id, getNode, getEdges).mainViewerIds;
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === id || cleanupIds.includes(n.id)) {
            return { ...n, data: { ...n.data, generating: false } };
          }
          return n;
        }),
      );
      anim.clearAll();
    }
  }, [id, getNode, getEdges, setNodes, setEdges, imgDef, mmDef, aspectRatio]);

  return (
    <div className={`char-node ${selected ? 'selected' : ''} ${generating ? 'char-node-processing' : ''}`}
      title={NODE_TOOLTIPS.charGenerate}>
      <div className="char-node-header" style={{ background: '#e91e63' }}>
        Generate Character Image
      </div>
      <div className="char-node-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

        {/* New Image Model */}
        <div>
          <label style={{ fontSize: 10, color: '#aaa', display: 'block', marginBottom: 2, fontWeight: 600 }}>
            New Image Model
          </label>
          <span style={{ fontSize: 8, color: '#555', display: 'block', marginBottom: 2 }}>
            Creates fresh images from a text description — no reference image needed
          </span>
          <select className="nodrag nowheel" value={imageGenModel} disabled={generating}
            onChange={(e) => setImageGenModel(e.target.value)} style={selectStyle}>
            {IMAGE_GEN_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label} — {m.maxRes[aspectRatio] ?? 'auto'} — {m.timeEstimate}
              </option>
            ))}
          </select>
          <div style={{ fontSize: 8, color: '#666', marginTop: 2 }}>{imgDef.note}</div>
        </div>

        {/* Edit & Reference Model */}
        <div>
          <label style={{ fontSize: 10, color: '#aaa', display: 'block', marginBottom: 2, fontWeight: 600 }}>
            Edit & Reference Model
          </label>
          <span style={{ fontSize: 8, color: '#555', display: 'block', marginBottom: 2 }}>
            For edits, ortho views, and any generation that needs to see an existing image
          </span>
          <select className="nodrag nowheel" value={multimodalModel} disabled={generating}
            onChange={(e) => setMultimodalModel(e.target.value)} style={selectStyle}>
            {MULTIMODAL_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label} — {m.maxRes[aspectRatio] ?? 'auto'} — {m.timeEstimate}
              </option>
            ))}
          </select>
        </div>

        {/* Aspect Ratio */}
        <div>
          <label style={{ fontSize: 10, color: '#aaa', display: 'block', marginBottom: 2, fontWeight: 600 }}>
            Aspect Ratio
          </label>
          <select className="nodrag nowheel" value={aspectRatio} disabled={generating}
            onChange={(e) => setAspectRatio(e.target.value)} style={selectStyle}>
            {ASPECT_RATIOS.map((ar) => (
              <option key={ar.value} value={ar.value}>{ar.label}</option>
            ))}
          </select>
        </div>

        {/* Save Preset */}
        <button type="button" className="nodrag" onClick={handleSavePreset}
          style={{
            width: '100%', height: 26, fontSize: 9, padding: 0,
            background: saved ? 'rgba(105,240,174,0.12)' : 'rgba(233,30,99,0.08)',
            border: saved ? '1px solid rgba(105,240,174,0.3)' : '1px solid rgba(233,30,99,0.2)',
            borderRadius: 4, color: saved ? '#69f0ae' : '#f48fb1',
            fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
          }}>
          {saved ? '✓ Saved as Default' : 'Save as Default Preset'}
        </button>

        {/* Generate Button */}
        <button type="button" className="nodrag" onClick={handleGenerate} disabled={generating}
          style={{
            width: '100%', height: 34, padding: 0, fontSize: 12, fontWeight: 700,
            background: 'var(--accent)', border: '1px solid var(--accent)',
            borderRadius: 4, color: '#fff', cursor: generating ? 'default' : 'pointer',
            opacity: generating ? 0.5 : 1, transition: 'all 0.15s',
          }}>
          {generating ? 'Generating...' : 'Generate Character Image'}
        </button>
        {generating && <div className="char-progress">{progress || 'Creating character...'}</div>}
        {error && <div className="char-error">{error}</div>}
        {hasImage && !generating && (
          <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center' }}>
            Image sent to Main Stage
          </div>
        )}
      </div>

      <Handle type="target" position={Position.Left} id="input" className="char-handle" style={{ top: '50%' }} />
      <Handle type="source" position={Position.Right} id="image-out" className="char-handle" style={{ top: '50%' }} />
    </div>
  );
}

export default memo(GenerateCharImageNodeInner);
