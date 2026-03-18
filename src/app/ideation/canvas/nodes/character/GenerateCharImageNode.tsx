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
import { IMAGE_GEN_MODELS, MULTIMODAL_MODELS, PRESET_KEY, loadPreset, IMG_TO_MULTIMODAL_API } from './modelData';
import type { PresetData } from './modelData';
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
      const mode = (d.styleMode as string) || 'images';
      const hasText = !!(d.styleText as string)?.trim();
      const imgs = d.styleImages as GeneratedImage[] | undefined;
      const hasImgs = !!(imgs && imgs.length > 0);

      const useText = mode === 'text' || mode === 'both'
        || (mode === 'images' && !hasImgs && hasText);
      const useImgs = mode === 'images' || mode === 'both'
        || (mode === 'text' && !hasText && hasImgs);

      if (useText && hasText) styleText = (d.styleText as string).trim();
      if (useImgs && hasImgs) styleImages.push(...imgs!);
    } else if (src.type === 'charRefCallout') {
      const callout = (d.calloutText as string) || 'incorporate this item';
      const refEdges = edges.filter((re) => re.target === src.id);
      devLog(`[gatherInputs] RefCallout "${callout}" — ${refEdges.length} incoming edges to callout node`);
      let foundImage: GeneratedImage | null = null;
      for (const re of refEdges) {
        const refSrc = getNode(re.source);
        if (!refSrc?.data) continue;
        const rd = refSrc.data as Record<string, unknown>;
        const hasEdited = !!(rd.editedImage as GeneratedImage | undefined)?.base64;
        const hasGenerated = !!(rd.generatedImage as GeneratedImage | undefined)?.base64;
        const hasBase64 = !!rd.imageBase64;
        devLog(`[gatherInputs]   → RefCallout source type="${refSrc.type}", editedImage=${hasEdited}, generatedImage=${hasGenerated}, imageBase64=${hasBase64}`);
        if (hasEdited) { foundImage = rd.editedImage as GeneratedImage; break; }
        if (hasGenerated) { foundImage = rd.generatedImage as GeneratedImage; break; }
        if (hasBase64) { foundImage = { base64: rd.imageBase64 as string, mimeType: (rd.mimeType as string) || 'image/png' }; break; }
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
  try { localStorage.setItem(PRESET_KEY, JSON.stringify(data)); } catch { /* quota */ }
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

  const [orthoToggles, setOrthoToggles] = useState<{ front: boolean; back: boolean; side: boolean }>({
    front: (data?.orthoFront as boolean) ?? true,
    back: (data?.orthoBack as boolean) ?? true,
    side: (data?.orthoSide as boolean) ?? true,
  });

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
        || (styleImages.length > 0 ? 'EXACTLY match the visual style shown in the style reference image(s). Replicate the precise rendering technique, color palette, line quality, shading method, and artistic medium. The output must look like it was created by the same artist using the same tools.' : undefined);
      const desc = buildCharacterDescription(synthIdentity, synthAttributes, synthDescription, hasStyleOverride ? effectiveStyleText : undefined);

      const influenceBlock = resolveNodeInfluences(
        id,
        getNode as (id: string) => { id: string; type?: string; data: Record<string, unknown> } | undefined,
        getEdges as () => { source: string; target: string }[],
      );

      let fullPrompt = buildCharacterViewPrompt('main', desc, hasStyleOverride ? effectiveStyleText : undefined) + influenceBlock;

      const mainStageMMApiId = (IMG_TO_MULTIMODAL_API[imgDef.apiId] ?? 'gemini-flash-image') as GeminiImageModel;
      const mainStageMMLabel = MULTIMODAL_MODELS.find((m) => m.apiId === mainStageMMApiId)?.label ?? mainStageMMApiId;
      const hasTextOnlyStyle = hasStyleOverride && styleImages.length === 0 && contentRefs.length === 0;

      const genMode = contentRefs.length > 0
          ? `${mainStageMMLabel} + ${contentRefs.length} content ref`
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

      const viewerIds = findDownstreamViewersAndHub(id, getNode, getEdges).mainViewerIds;
      let viewerGenCount = 1;
      console.log(`%c[Generate] Looking for genCount in ${viewerIds.length} main viewer(s): ${viewerIds.join(', ')}`, 'color: #ff9800');
      for (const vid of viewerIds) {
        const vn = getNode(vid);
        if (vn?.data) {
          const raw = (vn.data as Record<string, unknown>).genCount;
          const gc = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
          console.log(`%c[Generate]   viewer ${vid} (${vn.type}): raw genCount=${JSON.stringify(raw)}, parsed=${gc}`, 'color: #ff9800');
          if (!isNaN(gc) && gc >= 1) { viewerGenCount = gc; break; }
        }
      }
      console.log(`%c[Generate] Final viewerGenCount = ${viewerGenCount}`, 'color: #ff9800; font-weight: bold');

      const VARIATION_DIRECTIVES = [
        'confident expression, weight shifted to left foot, one hand relaxed at side',
        'neutral expression, weight centered, arms naturally at sides',
        'intense focused gaze, weight on right foot, slight lean forward',
        'relaxed expression, weight shifted back, one hand in pocket',
        'determined look, squared shoulders, hands loosely clasped',
        'calm steady gaze, contrapposto stance, one arm bent',
        'thoughtful expression, head tilted slightly, weight on back foot',
        'alert expression, feet staggered, arms loose and ready',
      ];

      const doGenerate = async (variationIdx?: number): Promise<GeneratedImage[]> => {
      let variationLine = '';
      if (variationIdx != null) {
        const directive = VARIATION_DIRECTIVES[variationIdx % VARIATION_DIRECTIVES.length];
        variationLine = `\nVARIATION: ${directive}. Keep the same character, same outfit, same view angle.\n`;
      }

      let result: GeneratedImage[];

      if (contentRefs.length > 0) {
        const imageLines: string[] = [];
        contentRefs.forEach((ref, i) => {
          imageLines.push(`• Image ${i + 1}: CONTENT REFERENCE — "${ref.callout}".`);
        });
        const imageIndexing = `IMAGE LAYOUT:\n${imageLines.join('\n')}`;
        const calloutSection = `\nContent refs: ${contentRefs.map((ref, i) => `Image ${i + 1} — "${ref.callout}": character MUST ${calloutVerb(ref.callout)} this item.`).join(' ')}`;
        const prompt = `${imageIndexing}${calloutSection}${variationLine}\n\nGenerate this character:\n\n${fullPrompt}`;

        console.log(`%c[Generate] Multimodal + ${contentRefs.length} content refs (${mainStageMMLabel}), aspect=${aspectRatio}`, 'color: #ff9800; font-weight: bold');
        result = await generateWithGeminiRef(prompt, refImages, mainStageMMApiId, aspectRatio);
      } else if (imgDef.apiId.startsWith('imagen-')) {
        console.log(`%c[Generate] Imagen 4 text-only (${imgDef.label})`, 'color: #2196f3; font-weight: bold');
        result = await generateWithImagen4(fullPrompt + variationLine, aspectRatio, 1, imgDef.apiId);
      } else {
        console.log(`%c[Generate] Nano Banana text-only (${imgDef.label})`, 'color: #9c27b0; font-weight: bold');
        result = await generateWithNanoBanana(fullPrompt + variationLine, aspectRatio, 1, imgDef.apiId);
      }

      return result;
      }; // end doGenerate

      const count = Math.max(1, viewerGenCount);
      let gallery: GeneratedImage[];
      if (count > 1) {
        setProgress(`Generating ${count} images…`);
        const settled = await Promise.allSettled(
          Array.from({ length: count }, (_, i) => doGenerate(i)),
        );
        gallery = settled
          .filter((r): r is PromiseFulfilledResult<GeneratedImage[]> => r.status === 'fulfilled')
          .map((r) => r.value[0])
          .filter(Boolean);
        if (gallery.length === 0) throw new Error('All generation attempts failed');
      } else {
        const result = await doGenerate();
        gallery = result.slice(0, 1);
      }

      const mainImage = gallery[0];
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

      const { mainViewerIds, viewHubToggles: hubToggles } = findDownstreamViewersAndHub(id, getNode, getEdges);
      const mergedToggles: ViewHubToggles = {
        ...hubToggles,
        main: true,
        front: orthoToggles.front,
        back: orthoToggles.back,
        side: orthoToggles.side,
      };
      const triggerTimestamp = Date.now();

      if (mainViewerIds.length > 0) {
        anim.markNodes(mainViewerIds, true);
        for (const vid of mainViewerIds) anim.markEdgesTo(vid, true);
        setNodes((nds) =>
          nds.map((n) =>
            mainViewerIds.includes(n.id)
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    generatedImage: mainImage,
                    imageGallery: gallery,
                    _orthoTrigger: triggerTimestamp,
                    _viewHubToggles: mergedToggles,
                  },
                }
              : n,
          ),
        );
      }

      const enabledOrthos = (['front', 'back', 'side', 'custom'] as const).filter((k) => mergedToggles[k]);
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
  }, [id, getNode, getEdges, setNodes, setEdges, imgDef, mmDef, aspectRatio, orthoToggles]);

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
            background: '#00bfa5', border: '1px solid #00bfa5',
            borderRadius: 4, color: '#000', cursor: generating ? 'default' : 'pointer',
            opacity: generating ? 0.5 : 1, transition: 'all 0.15s',
          }}>
          {generating ? 'Generating...' : 'Generate Main Stage Image'}
        </button>

        {/* Auto-generate ortho toggles */}
        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
          {([
            { key: 'front' as const, label: 'Front', color: '#42a5f5' },
            { key: 'back' as const, label: 'Back', color: '#ab47bc' },
            { key: 'side' as const, label: 'Side', color: '#ff7043' },
          ]).map(({ key, label, color }) => {
            const active = orthoToggles[key];
            return (
              <button
                key={key}
                type="button"
                className="nodrag"
                disabled={generating}
                onClick={() => {
                  const next = { ...orthoToggles, [key]: !active };
                  setOrthoToggles(next);
                  persist({ orthoFront: next.front, orthoBack: next.back, orthoSide: next.side });
                }}
                style={{
                  flex: 1, height: 24, padding: 0, fontSize: 9, fontWeight: 600,
                  background: active ? color : 'transparent',
                  border: `1px solid ${active ? color : '#555'}`,
                  borderRadius: 3,
                  color: active ? '#000' : '#777',
                  cursor: generating ? 'default' : 'pointer',
                  opacity: generating ? 0.5 : 1,
                  transition: 'all 0.15s',
                }}
              >
                {label} View
              </button>
            );
          })}
        </div>

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
