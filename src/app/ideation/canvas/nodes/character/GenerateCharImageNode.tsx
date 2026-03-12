"use client";

import { memo, useCallback, useState, useRef, useEffect } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import {
  buildCharacterDescription,
  buildCharacterViewPrompt,
  type CharacterIdentity,
  type CharacterAttributes,
} from '@/lib/ideation/engine/conceptlab/characterPrompts';
import {
  generateWithNanoBanana,
  generateWithGeminiRef,
  generateWithImagen4,
  getConfiguredResolution,
  type GeneratedImage,
  type GeminiImageModel,
} from '@/lib/ideation/engine/conceptlab/imageGenApi';
import { resolveNodeInfluences } from '@/lib/ideation/engine/conceptlab/resolveInfluences';
import { getGlobalSettings } from '@/lib/globalSettings';
import { createProcessingAnimator } from '@/lib/processingAnimation';
import { IMAGE_GEN_MODELS, MULTIMODAL_MODELS, IMAGE_RESOLUTIONS, PRESET_KEY, loadPreset } from './ModelSettingsNode';
import type { PresetData } from './ModelSettingsNode';
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
  const mats = d.costumeMaterials as string[] | undefined;
  if (mats?.length) lines.push(`Materials: ${mats.join(', ')}`);
  const colors: string[] = [];
  if (d.costumePrimaryColor) colors.push(`primary: ${d.costumePrimaryColor}`);
  if (d.costumeSecondaryColor) colors.push(`secondary: ${d.costumeSecondaryColor}`);
  if (d.costumeAccentColor) colors.push(`accent: ${d.costumeAccentColor}`);
  if (d.costumeHardwareColor) colors.push(`hardware: ${d.costumeHardwareColor}`);
  if (colors.length) lines.push(`Color palette: ${colors.join('; ')}`);
  if (d.costumeTextureRule) lines.push('Ensure rich texture reads across all lighting conditions.');
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

  devLog(`[gatherInputs] ${incoming.length} incoming edge(s) to node ${nodeId}, ${resolvedSources.length} after gate resolution`);
  for (const { node: src, data: d } of resolvedSources) {
    devLog(`[gatherInputs] source type="${src.type}", keys=[${Object.keys(d).join(', ')}]`);

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

function findDownstreamMainViewers(
  nodeId: string,
  getNode: ReturnType<typeof useReactFlow>['getNode'],
  getEdges: ReturnType<typeof useReactFlow>['getEdges'],
): string[] {
  const edges = getEdges();
  const viewers: string[] = [];
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

      if (MAIN_VIEWER_TYPES.has(target.type ?? '')) {
        viewers.push(target.id);
      }

      queue.push(target.id);
    }
  }
  return viewers;
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
  const [imageResolution, setImageResolution] = useState<string>(
    (data?.imageResolution as string) ?? preset?.imageResolution ?? '2K',
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
      imageResolution,
    });
  }, [imageGenModel, multimodalModel, aspectRatio, imageResolution, imgDef.apiId, mmDef.apiId, persist]);

  const handleSavePreset = useCallback(() => {
    savePreset({ imageGenModelId: imageGenModel, multimodalModelId: multimodalModel, aspectRatio, imageResolution });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [imageGenModel, multimodalModel, aspectRatio, imageResolution]);

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

      devLog(`[GenerateCharImage] Inputs — style imgs: ${styleImages.length}, content refs: ${contentRefs.length} [${callouts.join('; ')}], styleText: "${styleText.slice(0, 50)}", desc: ${description.length} chars`);
      devLog(`[GenerateCharImage] Models — imageGen: ${imgDef.label} (${imgDef.apiId}), multimodal: ${mmDef.label} (${mmDef.apiId}), resolution: ${imageResolution}`);
      setProgress(`Inputs: ${styleImages.length} style img${styleImages.length !== 1 ? 's' : ''}, ${contentRefs.length} content ref${contentRefs.length !== 1 ? 's' : ''}${callouts.length > 0 ? ` (${callouts.join(', ')})` : ''}`);

      if (!pose && attributes.pose) {
        pose = attributes.pose;
      }
      if (pose) {
        attributes.pose = pose;
      }

      const desc = buildCharacterDescription(identity, attributes, description);

      const influenceBlock = resolveNodeInfluences(
        id,
        getNode as (id: string) => { id: string; type?: string; data: Record<string, unknown> } | undefined,
        getEdges as () => { source: string; target: string }[],
      );

      let fullPrompt = buildCharacterViewPrompt('main', desc) + influenceBlock;
      if (styleText) {
        fullPrompt = `ART STYLE: ${styleText}\n\n${fullPrompt}\n\nIMPORTANT: The image MUST be rendered in the art style described above. This style directive takes priority over any default rendering style.`;
      }

      if (bibleContext) fullPrompt = `## CHARACTER BIBLE\n${bibleContext}\n\n${fullPrompt}`;
      if (costumeBrief) fullPrompt += `\n\n## COSTUME DIRECTION\n${costumeBrief}`;
      if (fusionBrief) fullPrompt += `\n\n## STYLE FUSION\n${fusionBrief}`;
      if (envBrief) fullPrompt += `\n\n## ENVIRONMENT\n${envBrief}`;
      if (lockConstraints) fullPrompt += `\n\n## PRESERVATION CONSTRAINTS (MANDATORY — VIOLATING THESE IS FAILURE)\n${lockConstraints}`;

      const genMode = styleImages.length > 0
        ? `${mmDef.label} + ${styleImages.length} style ref${contentRefs.length > 0 ? ` + ${contentRefs.length} content ref` : ''}`
        : contentRefs.length > 0
          ? `${mmDef.label} + ${contentRefs.length} content ref`
          : `${imgDef.label}, ${aspectRatio}, ${imageResolution}`;
      setProgress(`Generating (${genMode})...`);
      const mainViewerIdsEarly = findDownstreamMainViewers(id, getNode, getEdges);
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === id || mainViewerIdsEarly.includes(n.id)) {
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
        const styleDesc = styleText ? `The user describes the target style as: "${styleText}". Use this description to further guide your style analysis. ` : '';

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

        devLog(`[GenerateCharImage] Using multimodal (${mmDef.label}) with ${allRefImages.length} ref images. Prompt length: ${prompt.length}`);
        result = await generateWithGeminiRef(prompt, allRefImages, mmDef.apiId as GeminiImageModel);
      } else if (imgDef.apiId.startsWith('imagen-')) {
        result = await generateWithImagen4(fullPrompt, aspectRatio, 1, imgDef.apiId);
      } else {
        result = await generateWithNanoBanana(fullPrompt, aspectRatio, 1);
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

      const mainViewerIds = findDownstreamMainViewers(id, getNode, getEdges);
      if (mainViewerIds.length > 0) {
        anim.markNodes(mainViewerIds, true);
        for (const vid of mainViewerIds) anim.markEdgesTo(vid, true);
        setNodes((nds) =>
          nds.map((n) =>
            mainViewerIds.includes(n.id)
              ? { ...n, data: { ...n.data, generatedImage: mainImage, _orthoTrigger: Date.now() } }
              : n,
          ),
        );
      }

      setProgress('Done! Ortho views auto-generating...');
      setTimeout(() => { setProgress(''); }, 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
      const mainViewerIdsCleanup = findDownstreamMainViewers(id, getNode, getEdges);
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === id || mainViewerIdsCleanup.includes(n.id)) {
            return { ...n, data: { ...n.data, generating: false } };
          }
          return n;
        }),
      );
      anim.clearAll();
    }
  }, [id, getNode, getEdges, setNodes, setEdges, imgDef, mmDef, aspectRatio, imageResolution]);

  return (
    <div className={`char-node ${selected ? 'selected' : ''} ${generating ? 'char-node-processing' : ''}`}
      title={NODE_TOOLTIPS.charGenerate}>
      <div className="char-node-header" style={{ background: '#e91e63' }}>
        Generate Character Image
      </div>
      <div className="char-node-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

        {/* Image Gen Model */}
        <div>
          <label style={{ fontSize: 10, color: '#aaa', display: 'block', marginBottom: 2, fontWeight: 600 }}>
            Image Generation Model
          </label>
          <span style={{ fontSize: 8, color: '#555', display: 'block', marginBottom: 2 }}>
            Main stage character generation (text-to-image)
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

        {/* Multimodal Model */}
        <div>
          <label style={{ fontSize: 10, color: '#aaa', display: 'block', marginBottom: 2, fontWeight: 600 }}>
            Multimodal Model
          </label>
          <span style={{ fontSize: 8, color: '#555', display: 'block', marginBottom: 2 }}>
            Ortho views, edits, reference-based generation
          </span>
          <select className="nodrag nowheel" value={multimodalModel} disabled={generating}
            onChange={(e) => setMultimodalModel(e.target.value)} style={selectStyle}>
            {MULTIMODAL_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label} — {m.timeEstimate}
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

        {/* Resolution */}
        <div>
          <label style={{ fontSize: 10, color: '#aaa', display: 'block', marginBottom: 2, fontWeight: 600 }}>
            Output Resolution
          </label>
          <div style={{ display: 'flex', gap: 4 }}>
            {IMAGE_RESOLUTIONS.map((r) => (
              <button key={r.value} type="button" className="nodrag"
                onClick={() => setImageResolution(r.value)} disabled={generating}
                style={{
                  flex: 1, padding: '5px 2px', fontSize: 10, fontWeight: imageResolution === r.value ? 700 : 500,
                  borderRadius: 4, cursor: generating ? 'default' : 'pointer',
                  border: imageResolution === r.value ? '1px solid rgba(233,30,99,0.5)' : '1px solid rgba(255,255,255,0.1)',
                  background: imageResolution === r.value ? 'rgba(233,30,99,0.15)' : 'transparent',
                  color: imageResolution === r.value ? '#f48fb1' : '#777',
                  transition: 'all 0.15s',
                }}>
                {r.label}
              </button>
            ))}
          </div>
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
