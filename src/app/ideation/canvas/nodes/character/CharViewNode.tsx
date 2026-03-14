"use client";

import { memo, useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Handle, Position, NodeResizer, useReactFlow, useStore } from '@xyflow/react';
import { ImageContextMenu } from '@/components/ImageContextMenu';
import { generateWithGeminiRef, restoreImageQuality, GEMINI_IMAGE_MODELS, type GeneratedImage, type GeminiImageModel } from '@/lib/ideation/engine/conceptlab/imageGenApi';
import { registerRequest, unregisterRequest } from '@/lib/activeRequests';
import { synthesizeContextLens, hasContextData, type ContextLensInput } from '@/lib/ideation/engine/conceptlab/characterPrompts';
import { NODE_TOOLTIPS } from './nodeTooltips';
import { devLog, devWarn } from '@/lib/devLog';
import './CharacterNodes.css';

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

type ViewKey = 'main' | 'front' | 'back' | 'side' | 'custom';

const VIEW_CONFIG: Record<ViewKey, { label: string; color: string; compactW: number; compactH: number }> = {
  main:   { label: 'Main Stage',  color: '#00bfa5', compactW: 180, compactH: 240 },
  front:  { label: 'Front View',  color: '#42a5f5', compactW: 150, compactH: 200 },
  back:   { label: 'Back View',   color: '#ab47bc', compactW: 150, compactH: 200 },
  side:   { label: 'Side View',   color: '#ff7043', compactW: 150, compactH: 200 },
  custom: { label: 'Custom View', color: '#7e57c2', compactW: 150, compactH: 200 },
};

const EDIT_PREFIX = 'VISUAL EDIT TASK (KEEP EXACT FRAMING — do NOT zoom in):\nPreserve 100% of the existing design, only apply the following modification:\n';
const EDIT_SUFFIX = `\nApply ONLY the above modification. Do NOT change anything else.
CRITICAL FRAMING RULE: Maintain the EXACT same camera distance, zoom level, and framing as the source image. The character must occupy the same area of the frame — do NOT zoom in, do NOT crop tighter, do NOT push the camera closer. If the source shows full body head-to-toe, the output MUST also show full body head-to-toe with the same amount of space above the head and below the feet. NEVER cut off the feet or head. The output image must have the IDENTICAL field of view as the input.
Background: Solid flat neutral grey. No floor, no shadows, no environment. Do NOT render any text or labels.`;

const CONTEXT_NODE_TYPES = new Set(['charBible', 'charPreservationLock', 'costumeDirector', 'charStyleFusion', 'envPlacement', 'contextHub']);

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

interface UpstreamContext {
  text: string;
  styleText: string;
  styleImages: GeneratedImage[];
  contextLens: ContextLensInput;
}

function gatherUpstreamContext(
  nodeId: string,
  getNode: (id: string) => { id: string; type?: string; data: Record<string, unknown> } | undefined,
  getEdges: () => Array<{ source: string; target: string }>,
): UpstreamContext {
  const edges = getEdges();
  const visited = new Set<string>();
  const hubDisabled = new Set<string>();
  const queue = [nodeId];
  let bibleContext = '';
  let lockConstraints = '';
  let costumeBrief = '';
  let fusionBrief = '';
  let envBrief = '';
  let styleText = '';
  const styleImages: GeneratedImage[] = [];

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

      if (node.type === 'charGate') {
        const gateEnabled = (node.data as Record<string, unknown>).enabled;
        if (gateEnabled === false) continue;
      }
      if ((node.data as Record<string, unknown>)._sleeping) {
        queue.push(neighbor);
        continue;
      }

      if (node.type === 'contextHub') {
        const nd = node.data as Record<string, unknown>;
        if (nd.hubActive === false) continue;
        const ht = nd.hubToggles as Record<string, boolean> | undefined;
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

      if (hubDisabled.has(node.type ?? '')) {
        continue;
      }

      if (node.type === 'charBible') {
        const d = node.data;
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
        if (parts.length > 0) bibleContext = parts.join('\n');
      }

      if (node.type === 'charPreservationLock') {
        const d = node.data;
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
        if (negs) constraints.push(...negs.map((n: string) => `MUST AVOID: ${n}`));
        if (constraints.length > 0) lockConstraints = constraints.join('\n');
      }

      if (node.type === 'costumeDirector') {
        const brief = buildCostumeBriefFromData(node.data);
        if (brief) costumeBrief = brief;
      }

      if (node.type === 'charStyleFusion') {
        if (node.data.fusionBrief) fusionBrief = node.data.fusionBrief as string;
      }

      if (node.type === 'envPlacement') {
        if (node.data.envBrief) envBrief = node.data.envBrief as string;
      }

      if (node.type === 'charStyle') {
        if (node.data.styleText) styleText = node.data.styleText as string;
        const imgs = node.data.styleImages as GeneratedImage[] | undefined;
        if (imgs?.length) styleImages.push(...imgs);
      }

      queue.push(neighbor);
    }
  }

  const blocks: string[] = [];
  if (bibleContext) blocks.push(`## CHARACTER CONTEXT\n${bibleContext}`);
  if (costumeBrief) blocks.push(`## COSTUME DIRECTION\n${costumeBrief}`);
  if (fusionBrief) blocks.push(`## STYLE FUSION\n${fusionBrief}`);
  if (envBrief) blocks.push(`## ENVIRONMENT\n${envBrief}`);
  if (lockConstraints) blocks.push(`## PRESERVATION CONSTRAINTS (MANDATORY — VIOLATING THESE IS FAILURE)\n${lockConstraints}`);
  const effectiveStyleText = styleText.trim()
    || (styleImages.length > 0 ? 'Match the visual style shown in the style reference image(s). Replicate the exact rendering technique, color palette, and artistic approach.' : '');
  if (effectiveStyleText) blocks.push(`## ART STYLE\nRender in this style: ${effectiveStyleText}`);
  return {
    text: blocks.join('\n\n'),
    styleText: effectiveStyleText,
    styleImages,
    contextLens: { bibleContext, costumeBrief, fusionBrief, envBrief, lockConstraints },
  };
}


const RENDER_STYLE_BLOCK = `
RENDERING STYLE — PHOTOREALISTIC CHARACTER SHEET:
• Render this as a PHOTOREALISTIC character reference sheet. Clean, high-fidelity, detailed rendering with natural skin texture, real fabric weave, and physically accurate materials.
• Lighting: soft, even studio lighting. Neutral color grading. No dramatic cinematic lighting, no lens flares, no bloom, no volumetric fog.
• The character must look like a high-resolution photograph of a real person/costume, NOT a painting, illustration, concept art, or digital art.
• Match the character's exact design details (body type, face, hair, clothing, materials, colors, accessories) from the reference image.
• Do NOT stylize, do NOT add painterly brush strokes, do NOT use cel-shading or cartoon rendering. This must look photographic.`;

const NO_TEXT_RULE = 'ZERO TEXT IN IMAGE: Do NOT render any text, titles, labels, letters, numbers, hex codes, color codes, logos, captions, annotations, watermarks, or headers anywhere in the image. The image must contain ONLY the character on a plain background — absolutely nothing written or printed.';

const FULL_BODY_RULE = 'Show the COMPLETE character from the very top of the head (including all hair and headwear) down to the very bottom of the feet (including shoe soles). Leave generous padding above the head and below the feet. If the character is tall, zoom out to fit — NEVER crop the head or feet. This is a full-body character sheet, not a portrait.';

const PERSPECTIVE_PROMPTS: Record<'front' | 'back' | 'side', string> = {
  front: `${NO_TEXT_RULE}

CRITICAL: This must be a PHOTOREALISTIC image — like a high-resolution photograph, NOT an illustration, painting, or concept art.

Recompose the provided character reference into a dead-center orthographic front view.

Camera: locked at exactly 0 degrees azimuth, orthographic or 200mm+ telephoto lens, zero perspective distortion, chest height, centered on the character's midline. The left and right halves must be perfectly symmetrical in frame. No 3/4 turn, no yaw, no rotation — if you can see the character's ear or the side of their jaw, you have rotated too far.

Pose: neutral A-pose, arms 30 degrees from body, palms forward, fingers relaxed, feet shoulder-width, weight even, head facing straight at camera, eyes forward.

Visible elements: face (dead-on), chest, stomach, belt/buckle, front of both arms, both hands, front of both legs, tops of both shoes/boots, all front-facing gear, pouches, holsters, zippers, buttons, patches.

Preserve 100% of the character's design from the reference — body type, face, hair, skin tone, every garment, accessory, color, material, and wear detail. Change nothing except the viewing angle.
${RENDER_STYLE_BLOCK}
${FULL_BODY_RULE}
Background: solid flat neutral grey. No floor, no shadows, no environment.`,

  back: `${NO_TEXT_RULE}

CRITICAL: This must be a PHOTOREALISTIC image — like a high-resolution photograph, NOT an illustration, painting, or concept art.

Recompose the provided character reference into a dead-center orthographic rear view.

Camera: locked at exactly 180 degrees azimuth (dead-center rear), orthographic or 200mm+ telephoto lens, zero perspective distortion, chest height, centered on the character's midline. Only the back is visible — the face must be completely hidden. The left and right halves of the back must be perfectly symmetrical. No 3/4 turn, no yaw, no rotation.

Pose: neutral A-pose, arms 30 degrees from body, palms facing away from camera, fingers relaxed, feet shoulder-width, weight even, head facing directly away.

Visible elements: back of head/hair, back of neck, shoulder blades, spine line, back of jacket/shirt, back of belt, rear pockets, back of both arms, back of both legs, heels of shoes/boots, any backpack, cape, quiver, or rear-mounted equipment.

Preserve 100% of the character's design from the reference. Extrapolate rear details consistent with the design language. Change nothing except the viewing angle.
${RENDER_STYLE_BLOCK}
${FULL_BODY_RULE}
Background: solid flat neutral grey. No floor, no shadows, no environment.`,

  side: `${NO_TEXT_RULE}

CRITICAL: This must be a PHOTOREALISTIC image — like a high-resolution photograph, NOT an illustration, painting, or concept art.

Recompose the provided character reference into a pure left-side orthographic profile view.

Camera: locked at exactly 90 degrees azimuth (pure left side), orthographic or 200mm+ telephoto lens, zero perspective distortion, chest height. The character's nose points to the right edge of the frame, the back of their head points left. This must be a clean silhouette profile — only one ear (the left ear) should be visible. If you can see both eyes or any of the chest/back surface, you are doing a 3/4 view which is wrong. This must be a true 90-degree side profile.

Pose: neutral standing, arms slightly away from body so the arm silhouette is visible, feet shoulder-width, one foot slightly ahead for natural stance, head in profile facing screen-right.

Visible elements: left profile of face (forehead, nose, lips, chin), left ear, left shoulder, left arm, side silhouette of torso, left hip, left leg, side profile of all gear and clothing layers.

Preserve 100% of the character's design from the reference. Extrapolate side details consistent with the design language. Change nothing except the viewing angle.
${RENDER_STYLE_BLOCK}
${FULL_BODY_RULE}
Background: solid flat neutral grey. No floor, no shadows, no environment.`,
};

const CUSTOM_PROMPT_EXAMPLE = PERSPECTIVE_PROMPTS.front;

interface HistorySnapshot {
  image: GeneratedImage;
  label: string;
  timestamp: string;
}

/** Scans all nodes to find the Main Stage viewer and returns its current image. */
function getMainStageImage(
  selfId: string,
  getNodes: () => Array<{ id: string; type?: string; data: Record<string, unknown> }>,
): GeneratedImage | null {
  const nodes = getNodes();
  for (const n of nodes) {
    if (n.id === selfId) continue;
    const resolvedView = NODE_TYPE_TO_VIEW[n.type ?? ''] ?? (n.data as Record<string, unknown>)?.viewKey;
    if (resolvedView !== 'main') continue;
    const d = n.data as Record<string, unknown>;
    const img = d.generatedImage as GeneratedImage | undefined;
    if (img?.base64) return img;
  }
  return null;
}

function getUpstreamImage(
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

    if (src.type === 'charGate') {
      if (!(d.enabled as boolean ?? true)) return null;
      const gateEdges = getEdges().filter((ge) => ge.target === src.id);
      for (const ge of gateEdges) {
        const gSrc = getNode(ge.source);
        if (!gSrc?.data) continue;
        const gd = gSrc.data as Record<string, unknown>;
        const img = gd.generatedImage as GeneratedImage | undefined;
        if (img?.base64) return img;
        if (gd.imageBase64) return { base64: gd.imageBase64 as string, mimeType: (gd.mimeType as string) || 'image/png' };
      }
      continue;
    }

    if (d._sleeping) {
      const result = getUpstreamImage(src.id, getNode, getEdges);
      if (result) return result;
      continue;
    }

    const img = d.generatedImage as GeneratedImage | undefined;
    if (img?.base64) return img;
    if (d.imageBase64) return { base64: d.imageBase64 as string, mimeType: (d.mimeType as string) || 'image/png' };
  }
  return null;
}

function getMultimodalModelFromGraph(
  getNodes: () => Array<{ id: string; type?: string; data: Record<string, unknown> }>,
): GeminiImageModel | null {
  const nodes = getNodes();
  for (const n of nodes) {
    if (n.type !== 'charModelSettings' && n.type !== 'charGenerate') continue;
    const apiId = n.data?.multimodalApiId as string | undefined;
    if (apiId) return apiId as GeminiImageModel;
  }
  return null;
}

function getAspectRatioFromGraph(
  getNodes: () => Array<{ id: string; type?: string; data: Record<string, unknown> }>,
): string {
  const nodes = getNodes();
  for (const n of nodes) {
    if (n.type !== 'charModelSettings' && n.type !== 'charGenerate') continue;
    const ar = n.data?.aspectRatio as string | undefined;
    if (ar) return ar;
  }
  return '9:16';
}

const NODE_TYPE_TO_VIEW: Record<string, ViewKey> = {
  charMainViewer: 'main',
  charViewer: 'main',
  charImageViewer: 'main',
  charFrontViewer: 'front',
  charBackViewer: 'back',
  charSideViewer: 'side',
  charCustomView: 'custom',
};

/** Builds the prompt for a given view, handling custom prompts from node data. */
function buildViewPrompt(viewKey: ViewKey, data: Record<string, unknown>): string | null {
  if (viewKey === 'main') return null;

  if (viewKey === 'custom') {
    const useText = (data?.useText as boolean) ?? true;
    const viewPrompt = (data?.viewPrompt as string) ?? '';
    if (!useText || !viewPrompt.trim()) return null;
    return NO_TEXT_RULE + '\n\n' + viewPrompt.trim() + '\n' + RENDER_STYLE_BLOCK + '\n' + FULL_BODY_RULE + '\nBackground: solid flat neutral grey. No floor, no shadows, no environment.';
  }

  return PERSPECTIVE_PROMPTS[viewKey as 'front' | 'back' | 'side'];
}

function CharViewNodeInner({ id, data, selected }: Props) {
  const { getNode, getNodes, getEdges, setNodes } = useReactFlow();

  const nodeType = getNode(id)?.type ?? '';
  const viewKey: ViewKey = NODE_TYPE_TO_VIEW[nodeType] ?? (data?.viewKey as ViewKey) ?? 'main';
  const cfg = VIEW_CONFIG[viewKey] ?? VIEW_CONFIG.main;
  const isMain = viewKey === 'main';
  const isCustom = viewKey === 'custom';
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [compact, setCompact] = useState(false);
  const preCollapseSize = useRef<{ w: number; h: number } | null>(null);
  const [localImage, setLocalImage] = useState<GeneratedImage | null>(
    (data?.localImage as GeneratedImage) ?? null,
  );
  const isPanning = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const fileRef = useRef<HTMLInputElement>(null);
  const angleRefFileRef = useRef<HTMLInputElement>(null);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [imgRes, setImgRes] = useState<{ w: number; h: number } | null>(null);

  // ── Custom view state ──
  const [customLabel, setCustomLabel] = useState<string>((data?.customLabel as string) ?? '');
  const [editingLabel, setEditingLabel] = useState(false);
  const [viewPrompt, setViewPrompt] = useState<string>((data?.viewPrompt as string) ?? '');
  const [useText, setUseText] = useState<boolean>((data?.useText as boolean) ?? true);
  const [useImage, setUseImage] = useState<boolean>((data?.useImage as boolean) ?? false);
  const [angleRefImage, setAngleRefImage] = useState<GeneratedImage | null>(
    (data?.angleRefImage as GeneratedImage) ?? null,
  );
  const [showCustomConfig, setShowCustomConfig] = useState(isCustom);

  // Read angle reference image from a node connected to the "angle-ref" handle
  const connectedAngleRefSelector = useCallback(
    (state: { nodes: Array<{ id: string; type?: string; data: Record<string, unknown> }>; edges: Array<{ source: string; target: string; targetHandle?: string | null }> }) => {
      if (!isCustom) return null;
      const refEdge = state.edges.find((e) => e.target === id && e.targetHandle === 'angle-ref');
      if (!refEdge) return null;
      const src = state.nodes.find((n) => n.id === refEdge.source);
      if (!src?.data) return null;
      const d = src.data as Record<string, unknown>;
      const img = d.generatedImage as GeneratedImage | undefined;
      if (img?.base64) return img.base64.slice(0, 120);
      const b64 = d.imageBase64 as string | undefined;
      if (b64) return b64.slice(0, 120);
      return null;
    },
    [isCustom, id],
  );
  const connectedAngleRefSig = useStore(connectedAngleRefSelector);

  const connectedAngleRef = useMemo<GeneratedImage | null>(() => {
    if (!isCustom || !connectedAngleRefSig) return null;
    const edges = getEdges();
    const refEdge = edges.find((e: { target: string; targetHandle?: string | null }) => e.target === id && e.targetHandle === 'angle-ref');
    if (!refEdge) return null;
    const src = getNode(refEdge.source);
    if (!src?.data) return null;
    const d = src.data as Record<string, unknown>;
    const img = d.generatedImage as GeneratedImage | undefined;
    if (img?.base64) return img;
    const b64 = d.imageBase64 as string | undefined;
    if (b64) return { base64: b64, mimeType: (d.mimeType as string) || 'image/png' };
    return null;
  }, [isCustom, connectedAngleRefSig, id, getNode, getEdges]);

  const effectiveAngleRef = connectedAngleRef ?? angleRefImage;

  // Sync state when node data changes externally (e.g. session restore)
  useEffect(() => {
    const restoredLocal = (data?.localImage as GeneratedImage) ?? null;
    const restoredAngle = (data?.angleRefImage as GeneratedImage) ?? null;
    if (restoredLocal?.base64 && restoredLocal.base64.slice(0, 40) !== localImage?.base64?.slice(0, 40)) {
      setLocalImage(restoredLocal);
    } else if (!restoredLocal && localImage) {
      setLocalImage(null);
    }
    if (restoredAngle?.base64 && restoredAngle.base64.slice(0, 40) !== angleRefImage?.base64?.slice(0, 40)) {
      setAngleRefImage(restoredAngle);
    } else if (!restoredAngle && angleRefImage) {
      setAngleRefImage(null);
    }
  }, [data?.localImage, data?.angleRefImage]); // eslint-disable-line react-hooks/exhaustive-deps

  // Init custom view prompt with example on first mount
  const customInitRef = useRef(false);
  useEffect(() => {
    if (!isCustom || customInitRef.current) return;
    customInitRef.current = true;
    if (!viewPrompt) {
      setViewPrompt(CUSTOM_PROMPT_EXAMPLE);
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, viewPrompt: CUSTOM_PROMPT_EXAMPLE, useText: true, useImage: false } } : n,
        ),
      );
    }
  }, [isCustom, viewPrompt, id, setNodes]);

  // Persist custom view data changes
  const persistCustomData = useCallback((updates: Record<string, unknown>) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...updates } } : n,
      ),
    );
  }, [id, setNodes]);

  // ── Main Stage image (reactive subscription for non-main views) ──
  const mainStageSelector = useCallback(
    (state: { nodes: Array<{ id: string; type?: string; data: Record<string, unknown> }> }) => {
      if (isMain) return null;
      for (const n of state.nodes) {
        if (n.id === id) continue;
        const resolved = NODE_TYPE_TO_VIEW[n.type ?? ''] ?? (n.data?.viewKey as string);
        if (resolved !== 'main') continue;
        const img = n.data?.generatedImage as GeneratedImage | undefined;
        if (img?.base64) return img.base64.slice(0, 120);
      }
      return null;
    },
    [isMain, id],
  );
  const mainStageSig = useStore(mainStageSelector);

  const mainStageImage = useMemo<GeneratedImage | null>(() => {
    if (isMain || !mainStageSig) return null;
    return getMainStageImage(id, getNodes as () => Array<{ id: string; type?: string; data: Record<string, unknown> }>);
  }, [isMain, mainStageSig, id, getNodes]);

  // ── Image display ──
  const upstreamSigSelector = useCallback(
    (state: { nodes: Array<{ id: string; type?: string; data: Record<string, unknown> }>; edges: Array<{ source: string; target: string }> }) => {
      function traceUpstream(nodeId: string, depth: number): string | null {
        if (depth > 10) return null;
        const incoming = state.edges.filter((e) => e.target === nodeId);
        for (const e of incoming) {
          const src = state.nodes.find((n) => n.id === e.source);
          if (!src?.data) continue;
          const d = src.data as Record<string, unknown>;
          if ((src.type === 'charGate') && !(d.enabled as boolean ?? true)) return '__gate_off__';
          if (src.type === 'charGate') {
            const gateIn = state.edges.filter((ge) => ge.target === src.id);
            for (const ge of gateIn) {
              const gSrc = state.nodes.find((n) => n.id === ge.source);
              if (!gSrc?.data) continue;
              const gd = gSrc.data as Record<string, unknown>;
              const img = gd.generatedImage as GeneratedImage | undefined;
              if (img?.base64) return img.base64.slice(0, 120);
            }
            continue;
          }
          if (d._sleeping) {
            const result = traceUpstream(src.id, depth + 1);
            if (result) return result;
            continue;
          }
          const img = d.generatedImage as GeneratedImage | undefined;
          if (img?.base64) return img.base64.slice(0, 120);
        }
        return null;
      }
      return traceUpstream(id, 0);
    },
    [id],
  );
  const upstreamSig = useStore(upstreamSigSelector);

  const upstreamImage = useMemo<GeneratedImage | null>(() => {
    if (!upstreamSig || upstreamSig === '__gate_off__') return null;
    return getUpstreamImage(id, getNode, getEdges);
  }, [upstreamSig, id, getNode, getEdges]);

  const pushedImage = (data?.generatedImage as GeneratedImage | undefined) ?? null;
  const [editedImage, setEditedImage] = useState<GeneratedImage | null>(null);

  const currentImage = isMain
    ? (editedImage ?? pushedImage ?? upstreamImage ?? localImage)
    : (editedImage ?? pushedImage ?? localImage);

  // Sync upstream → node data (Main Stage only: clears editedImage on new upstream)
  const lastUpstreamSig = useRef<string | null>(null);
  useEffect(() => {
    if (!isMain || !upstreamImage) return;
    const sig = upstreamImage.base64.slice(0, 120);
    if (sig === lastUpstreamSig.current) return;
    lastUpstreamSig.current = sig;
    setEditedImage(null);
    setNodes((nds) =>
      nds.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, generatedImage: upstreamImage } } : n,
      ),
    );
  }, [isMain, upstreamImage, id, setNodes]);

  // Sync displayed image → node data (all views) so external consumers
  // (e.g. Gemini Editor overlay) can always read data.generatedImage.
  const lastSyncedSig = useRef<string | null>(null);
  useEffect(() => {
    if (!currentImage) return;
    const sig = currentImage.base64.slice(0, 120);
    if (sig === lastSyncedSig.current) return;
    const stored = (data?.generatedImage as GeneratedImage | undefined)?.base64?.slice(0, 120);
    if (sig === stored) {
      lastSyncedSig.current = sig;
      return;
    }
    lastSyncedSig.current = sig;
    setNodes((nds) =>
      nds.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, generatedImage: currentImage } } : n,
      ),
    );
  }, [currentImage, data?.generatedImage, id, setNodes]);

  // ── Embedded History (all views) ──
  const initialEntries = (data?.historyEntries as HistorySnapshot[]) ?? [];
  const [historyEntries, setHistoryEntries] = useState<HistorySnapshot[]>(initialEntries);
  const [historyMinimized, setHistoryMinimized] = useState(true);
  const [activeHistIdx, setActiveHistIdx] = useState(-1);
  const lastHistSig = useRef<string>(
    initialEntries.length > 0 ? initialEntries[initialEntries.length - 1].image.base64.slice(0, 100) : '',
  );

  const pushHistory = useCallback((img: GeneratedImage, label: string) => {
    const sig = img.base64.slice(0, 100);
    if (sig === lastHistSig.current) return;
    lastHistSig.current = sig;

    const snap: HistorySnapshot = {
      image: img,
      label,
      timestamp: new Date().toLocaleTimeString(),
    };

    setHistoryEntries((prev) => [...prev, snap]);
    setActiveHistIdx(-1);
  }, []);

  const historyLenRef = useRef(historyEntries.length);
  useEffect(() => {
    if (historyEntries.length === historyLenRef.current) return;
    historyLenRef.current = historyEntries.length;
    setNodes((nds) =>
      nds.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, historyEntries } } : n,
      ),
    );
  }, [historyEntries, id, setNodes]);

  useEffect(() => {
    if (!isMain || !upstreamImage) return;
    pushHistory(upstreamImage, 'Generated character');
  }, [isMain, upstreamImage, pushHistory]);

  useEffect(() => {
    const pending = (data as Record<string, unknown>)?._pendingSnapshot as { image: GeneratedImage; label: string } | undefined;
    if (!pending?.image?.base64) return;

    setNodes((nds) =>
      nds.map((n) => {
        if (n.id !== id) return n;
        const nd = { ...(n.data as Record<string, unknown>) };
        delete nd._pendingSnapshot;
        return { ...n, data: nd };
      }),
    );

    pushHistory(pending.image, pending.label);
  }, [id, data, setNodes, pushHistory]);

  const historyViewImage = activeHistIdx >= 0 ? historyEntries[activeHistIdx]?.image ?? null : null;
  const viewImage = historyViewImage ?? currentImage;

  // ── Auto-generate perspective when Main Stage image arrives (non-main views) ──
  // Only triggers on _orthoTrigger from a fresh generation, NOT from Gemini Editor edits.
  const gateBlocked = upstreamSig === '__gate_off__';
  const referenceImage = isMain ? null : (gateBlocked ? null : (upstreamImage ?? mainStageImage));

  const orthoTriggerSelector = useCallback(
    (state: { nodes: Array<{ id: string; type?: string; data: Record<string, unknown> }> }) => {
      if (isMain) return null;
      for (const n of state.nodes) {
        if (n.id === id) continue;
        const resolved = NODE_TYPE_TO_VIEW[n.type ?? ''] ?? (n.data?.viewKey as string);
        if (resolved !== 'main') continue;
        const trigger = (n.data?._orthoTrigger as number) ?? null;
        if (!trigger) continue;
        const hubToggles = (n.data?._viewHubToggles as Record<string, boolean>) ?? null;
        return JSON.stringify({ t: trigger, h: hubToggles });
      }
      return null;
    },
    [isMain, id],
  );
  const orthoTriggerRaw = useStore(orthoTriggerSelector);
  const orthoTriggerParsed = orthoTriggerRaw ? JSON.parse(orthoTriggerRaw) as { t: number; h: Record<string, boolean> | null } : null;
  const orthoTrigger = orthoTriggerParsed?.t ?? null;
  const viewHubToggles = orthoTriggerParsed?.h ?? null;

  const lastTrigger = useRef<number | null>(null);
  const autoGenSessionRef = useRef<AbortController | null>(null);
  const autoGenMountedRef = useRef(true);
  const [autoGenBusy, setAutoGenBusy] = useState(false);
  useEffect(() => {
    autoGenMountedRef.current = true;
    return () => { autoGenMountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (isMain || !referenceImage) return;
    if (!orthoTrigger || orthoTrigger === lastTrigger.current) return;
    lastTrigger.current = orthoTrigger;

    if (viewHubToggles && viewHubToggles[viewKey] === false) {
      devLog(`[CharView:${viewKey}] Skipping auto-gen — disabled in Image View Hub`);
      return;
    }

    let prompt = buildViewPrompt(viewKey, data);
    if (!prompt) return;

    const orthoCtx = gatherUpstreamContext(
      id,
      getNode as (id: string) => { id: string; type?: string; data: Record<string, unknown> } | undefined,
      getEdges as () => Array<{ source: string; target: string }>,
    );
    if (orthoCtx.styleText || orthoCtx.styleImages.length > 0) {
      prompt = prompt.replace(RENDER_STYLE_BLOCK, `\nRENDERING STYLE: Match the art style from the style reference(s). Preserve character design accuracy while using the referenced visual technique.\n`);
    }
    if (orthoCtx.text) {
      prompt = orthoCtx.text + '\n\n' + prompt;
    }

    // Cancel any in-flight auto-gen before starting new one
    if (autoGenSessionRef.current) {
      autoGenSessionRef.current.abort();
      unregisterRequest(autoGenSessionRef.current);
      autoGenSessionRef.current = null;
    }

    setAutoGenBusy(true);

    devLog(`[CharView:${viewKey}] Auto-generating ${cfg.label} from Main Stage reference...`);

    const session = registerRequest();
    autoGenSessionRef.current = session;

    const baseRefImages: GeneratedImage[] = (() => {
      if (isCustom && useImage && effectiveAngleRef) {
        return [referenceImage, effectiveAngleRef];
      }
      return [referenceImage];
    })();
    const allRefImages = orthoCtx.styleImages.length > 0
      ? [...baseRefImages, ...orthoCtx.styleImages]
      : baseRefImages;
    if (orthoCtx.styleImages.length > 0) {
      const imgCount = baseRefImages.length;
      const styleStart = imgCount + 1;
      prompt += `\n\nIMAGE LAYOUT: Images 1–${imgCount} are CHARACTER REFERENCES. Images ${styleStart}–${imgCount + orthoCtx.styleImages.length} are STYLE REFERENCES — replicate their visual style EXACTLY but do NOT copy any characters or scenes from them.`;
    }

    (async () => {
      try {
        const mmModel = getMultimodalModelFromGraph(getNodes as () => Array<{ id: string; type?: string; data: Record<string, unknown> }>) ?? 'gemini-flash-image';
        const arFromGraph = getAspectRatioFromGraph(getNodes as () => Array<{ id: string; type?: string; data: Record<string, unknown> }>);
        console.log(`%c[CharView:${viewKey}] Auto-gen: ${allRefImages.length} ref imgs (${orthoCtx.styleImages.length} style), aspect=${arFromGraph}`, 'color: #00bcd4; font-weight: bold');
        const results = await generateWithGeminiRef(prompt, allRefImages, mmModel, arFromGraph);
        if (!autoGenMountedRef.current || session.signal.aborted) return;

        const img = results[0];
        if (!img) return;

        devLog(`[CharView:${viewKey}] ✓ Auto-generated ${cfg.label} (${(img.base64.length / 1024).toFixed(0)}KB)`);
        setEditedImage(img);
        setNodes((nds) =>
          nds.map((n) =>
            n.id === id ? { ...n, data: { ...n.data, generatedImage: img } } : n,
          ),
        );
        pushHistory(img, `Auto: ${cfg.label}`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!msg.toLowerCase().includes('cancel') && !msg.toLowerCase().includes('abort')) {
          console.error(`[CharView:${viewKey}] Auto-generate error:`, e);
        }
      } finally {
        if (autoGenSessionRef.current === session) autoGenSessionRef.current = null;
        unregisterRequest(session);
        setAutoGenBusy(false);
      }
    })();
  }, [isMain, isCustom, referenceImage, orthoTrigger, viewKey, cfg, id, setNodes, pushHistory, data, useImage, effectiveAngleRef, viewHubToggles, getNode, getEdges, getNodes]);

  // ── Inline Edit ──
  const [editText, setEditText] = useState('');
  const [editBusy, setEditBusy] = useState(false);
  const [editStatus, setEditStatus] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [editElapsed, setEditElapsed] = useState(0);
  const editModel: GeminiImageModel = getMultimodalModelFromGraph(getNodes as () => Array<{ id: string; type?: string; data: Record<string, unknown> }>) ?? 'gemini-flash-image';
  const editTimerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; clearInterval(editTimerRef.current); };
  }, []);

  const handleEdit = useCallback(async () => {
    const srcImage = viewImage;
    if (!srcImage || !editText.trim() || editBusy) return;

    setEditBusy(true);
    setEditError(null);
    setEditStatus('Sending to API…');
    setEditElapsed(0);

    const t0 = Date.now();
    editTimerRef.current = setInterval(() => {
      if (mountedRef.current) setEditElapsed(Math.floor((Date.now() - t0) / 1000));
    }, 500);

    const session = registerRequest();

    try {
      let prompt: string;
      let refImages: GeneratedImage | GeneratedImage[];

      const upstreamCtx = gatherUpstreamContext(
        id,
        getNode as (id: string) => { id: string; type?: string; data: Record<string, unknown> } | undefined,
        getEdges as () => Array<{ source: string; target: string }>,
      );

      if (isMain) {
        prompt = EDIT_PREFIX + editText.trim() + EDIT_SUFFIX;
        refImages = upstreamCtx.styleImages.length > 0
          ? [srcImage, ...upstreamCtx.styleImages]
          : srcImage;
      } else {
        const mainImg = getMainStageImage(id, getNodes as () => Array<{ id: string; type?: string; data: Record<string, unknown> }>);
        const contextNote = `This is a ${(isCustom ? (customLabel || cfg.label) : cfg.label).toLowerCase()} of the character shown in the first reference image (the main/canonical view).\n`;
        prompt = contextNote + EDIT_PREFIX + editText.trim() + EDIT_SUFFIX;
        const base = mainImg ? [mainImg, srcImage] : [srcImage];
        refImages = upstreamCtx.styleImages.length > 0
          ? [...base, ...upstreamCtx.styleImages]
          : base.length === 1 ? base[0] : base;
      }

      if (upstreamCtx.styleImages.length > 0) {
        const charCount = Array.isArray(refImages) ? refImages.length - upstreamCtx.styleImages.length : 1;
        const styleStart = charCount + 1;
        prompt += `\n\nIMAGE LAYOUT: Images 1–${charCount} are CHARACTER REFERENCES (edit these). Images ${styleStart}–${charCount + upstreamCtx.styleImages.length} are STYLE REFERENCES — maintain this visual style. Do NOT copy characters/scenes from style refs.`;
      }

      if (upstreamCtx.text) {
        prompt = upstreamCtx.text + '\n\n' + prompt;
      }

      prompt += '\n\nFINAL REMINDER: Output must have the IDENTICAL zoom level, camera distance, and field of view as the source image. Do NOT zoom in. Do NOT crop tighter. If the source shows full body head-to-toe, the output MUST also show full body head-to-toe.';

      console.log(`%c[CharView:${viewKey}] Edit: ${Array.isArray(refImages) ? refImages.length : 1} ref imgs (${upstreamCtx.styleImages.length} style)`, 'color: #ff9800; font-weight: bold');
      devLog(`[CharView:${viewKey}] editing image (${Array.isArray(refImages) ? refImages.length + ' images' : (srcImage.base64.length / 1024).toFixed(0) + 'KB'})...`);

      const modelLabel = GEMINI_IMAGE_MODELS[editModel]?.label ?? editModel;
      const editAspect = getAspectRatioFromGraph(getNodes as () => Array<{ id: string; type?: string; data: Record<string, unknown> }>);
      setEditStatus(`Waiting for ${modelLabel}…`);
      const results = await generateWithGeminiRef(prompt, refImages, editModel, editAspect);

      devLog(`[CharView:${viewKey}] API returned. mounted=${mountedRef.current}, aborted=${session.signal.aborted}, results=${results?.length}`);

      if (!mountedRef.current) {
        devWarn(`[CharView:${viewKey}] ⚠ Component unmounted during API call — skipping update`);
        return;
      }
      if (session.signal.aborted) {
        devWarn(`[CharView:${viewKey}] ⚠ Session was cancelled — skipping update`);
        return;
      }

      const img = results[0];
      if (!img) throw new Error('No image returned');

      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      devLog(`[CharView:${viewKey}] ✓ edit complete (${elapsed}s), new image ${(img.base64.length / 1024).toFixed(0)}KB`);
      setEditStatus(`Done in ${elapsed}s ✓`);

      setEditedImage(img);

      setNodes((nds) =>
        nds.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, generatedImage: img } } : n,
        ),
      );

      pushHistory(img, editText.trim().slice(0, 50) || 'Edit');

      if (isMain) {
        const edges = getEdges();
        const historyIds: string[] = [];
        for (const e of edges) {
          const peerId = e.source === id ? e.target : e.target === id ? e.source : null;
          if (!peerId) continue;
          const peer = getNode(peerId);
          if (peer?.type === 'charHistory') historyIds.push(peer.id);
        }
        if (historyIds.length > 0) {
          const snap = { image: img, label: editText.trim().slice(0, 50) || 'Edit' };
          setTimeout(() => {
            setNodes((nds) =>
              nds.map((n) =>
                historyIds.includes(n.id)
                  ? { ...n, data: { ...n.data, _pendingSnapshot: snap } }
                  : n,
              ),
            );
          }, 150);
        }
      }

      setEditText('');
      setTimeout(() => { if (mountedRef.current) setEditStatus(null); }, 3000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const isCancel = msg.toLowerCase().includes('cancelled') || msg.toLowerCase().includes('abort');
      if (isCancel) {
        devLog(`[CharView:${viewKey}] edit cancelled`);
        setEditStatus(null);
      } else {
        console.error(`[CharView:${viewKey}] edit error:`, e);
        if (mountedRef.current) {
          setEditError(msg);
          setEditStatus(null);
        }
      }
    } finally {
      clearInterval(editTimerRef.current);
      unregisterRequest(session);
      if (mountedRef.current) {
        setEditBusy(false);
        setEditElapsed(0);
      }
    }
  }, [viewImage, editText, editBusy, viewKey, id, isMain, isCustom, customLabel, cfg, getNode, getNodes, getEdges, setNodes, pushHistory, editModel]);

  // ── Restore Quality (inline — two-step: describe then regenerate fresh) ──
  const [restoreBusy, setRestoreBusy] = useState(false);
  const handleRestore = useCallback(async () => {
    const srcImage = viewImage;
    if (!srcImage || restoreBusy || editBusy) return;

    setRestoreBusy(true);
    setEditError(null);
    setEditElapsed(0);

    const t0 = Date.now();
    editTimerRef.current = setInterval(() => {
      if (mountedRef.current) setEditElapsed(Math.floor((Date.now() - t0) / 1000));
    }, 500);

    const session = registerRequest();

    try {
      const { image: restored } = await restoreImageQuality(srcImage, {
        onStatus: (msg) => { if (mountedRef.current) setEditStatus(msg); },
      });

      if (!mountedRef.current || session.signal.aborted) return;

      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      setEditStatus(`Restored fresh in ${elapsed}s \u2713`);

      setEditedImage(restored);
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, generatedImage: restored } } : n,
        ),
      );
      pushHistory(restored, `Restore (${elapsed}s)`);
      setTimeout(() => { if (mountedRef.current) setEditStatus(null); }, 4000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.toLowerCase().includes('cancel') && !msg.toLowerCase().includes('abort')) {
        if (mountedRef.current) {
          setEditError(msg);
          setEditStatus(null);
        }
      }
    } finally {
      clearInterval(editTimerRef.current);
      unregisterRequest(session);
      if (mountedRef.current) {
        setRestoreBusy(false);
        setEditElapsed(0);
      }
    }
  }, [viewImage, restoreBusy, editBusy, id, setNodes, pushHistory]);

  // ── Standard handlers ──
  const handleResetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.stopPropagation();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((z) => Math.max(0.1, Math.min(10, z + delta)));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1) {
      e.preventDefault();
      isPanning.current = true;
      lastMouse.current = { x: e.clientX, y: e.clientY };
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning.current) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
  }, []);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (e.button === 1) isPanning.current = false;
  }, []);

  const handlePasteImage = useCallback(
    (img: GeneratedImage) => {
      setLocalImage(img);
      setEditedImage(null);
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id
            ? { ...n, data: { ...n.data, localImage: img, generatedImage: img } }
            : n,
        ),
      );
      pushHistory(img, 'Opened / pasted image');
    },
    [id, setNodes, pushHistory],
  );

  const handleOpenImage = useCallback(() => {
    fileRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        const img: GeneratedImage = { base64, mimeType: file.type || 'image/png' };
        handlePasteImage(img);
      };
      reader.readAsDataURL(file);
    },
    [handlePasteImage],
  );

  // ── Custom view: angle reference image ──
  const handleAngleRefFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        const img: GeneratedImage = { base64, mimeType: file.type || 'image/png' };
        setAngleRefImage(img);
        persistCustomData({ angleRefImage: img });
      };
      reader.readAsDataURL(file);
    },
    [persistCustomData],
  );

  const handleResize = useCallback(
    (_: unknown, params: { width: number; height: number }) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id
            ? { ...n, style: { ...n.style, width: params.width, height: params.height } }
            : n,
        ),
      );
    },
    [id, setNodes],
  );

  const toggleCompact = useCallback(() => {
    const goingCompact = !compact;
    setCompact(goingCompact);
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id !== id) return n;
        if (goingCompact) {
          const curW = (n.style?.width as number) || (viewKey === 'main' ? 600 : 400);
          const curH = (n.style?.height as number) || (viewKey === 'main' ? 820 : 720);
          preCollapseSize.current = { w: curW, h: curH };
          return { ...n, style: { ...n.style, width: curW, height: 42 } };
        }
        const prev = preCollapseSize.current;
        const w = prev?.w ?? (viewKey === 'main' ? 600 : 400);
        const h = prev?.h ?? (viewKey === 'main' ? 820 : 720);
        return { ...n, style: { ...n.style, width: w, height: h } };
      }),
    );
  }, [compact, viewKey, id, setNodes]);

  // ── History navigation ──
  const handleHistoryCurrent = useCallback(() => {
    setActiveHistIdx(-1);
  }, []);

  const handleHistorySelect = useCallback((idx: number) => {
    setActiveHistIdx(idx);
  }, []);

  const handleHistoryBack = useCallback(() => {
    if (activeHistIdx === -1 && historyEntries.length > 0) {
      setActiveHistIdx(historyEntries.length - 1);
    } else if (activeHistIdx > 0) {
      setActiveHistIdx(activeHistIdx - 1);
    }
  }, [activeHistIdx, historyEntries.length]);

  const handleHistoryForward = useCallback(() => {
    if (activeHistIdx >= historyEntries.length - 1) {
      setActiveHistIdx(-1);
    } else if (activeHistIdx >= 0) {
      setActiveHistIdx(activeHistIdx + 1);
    }
  }, [activeHistIdx, historyEntries.length]);

  // ── Manual "Generate View" button for non-main views ──
  const [genBusy, setGenBusy] = useState(false);
  const handleGenerateView = useCallback(async () => {
    if (isMain || genBusy) return;
    const mainImg = getMainStageImage(id, getNodes as () => Array<{ id: string; type?: string; data: Record<string, unknown> }>);
    if (!mainImg) {
      setEditError('No Main Stage image found — generate a character first');
      return;
    }

    const basePrompt = buildViewPrompt(viewKey, data);
    if (!basePrompt) {
      setEditError(isCustom ? 'Enable "Use Text" and enter a view description, or enable "Use Image" and provide/connect a reference.' : 'No prompt available');
      return;
    }

    setGenBusy(true);
    setEditError(null);
    setEditElapsed(0);

    const t0 = Date.now();
    editTimerRef.current = setInterval(() => {
      if (mountedRef.current) setEditElapsed(Math.floor((Date.now() - t0) / 1000));
    }, 500);

    const session = registerRequest();

    try {
      const genCtx = gatherUpstreamContext(
        id,
        getNode as (id: string) => { id: string; type?: string; data: Record<string, unknown> } | undefined,
        getEdges as () => Array<{ source: string; target: string }>,
      );

      const baseRefs: GeneratedImage[] = (() => {
        if (isCustom && useImage && effectiveAngleRef) {
          return [mainImg, effectiveAngleRef];
        }
        return [mainImg];
      })();
      const refImages: GeneratedImage | GeneratedImage[] = genCtx.styleImages.length > 0
        ? [...baseRefs, ...genCtx.styleImages]
        : baseRefs.length === 1 ? baseRefs[0] : baseRefs;

      const userEdit = editText.trim();
      const renderBlock = (genCtx.styleText || genCtx.styleImages.length > 0)
        ? `\nRENDERING STYLE: Match the art style from the style reference(s). Preserve character design accuracy while using the referenced visual technique.\n`
        : RENDER_STYLE_BLOCK;
      let fullPrompt = isCustom && useImage && effectiveAngleRef && !useText
        ? `${NO_TEXT_RULE}\n\nCreate a custom view of this character matching the camera angle and pose shown in the second reference image. Preserve the character's identity from the first reference image exactly.\n${renderBlock}\n${FULL_BODY_RULE}\nBackground: solid flat neutral grey. No floor, no shadows, no environment.`
        : (isCustom && useImage && effectiveAngleRef
          ? basePrompt + '\nUse the second reference image as a guide for the desired camera angle, pose, and framing.'
          : basePrompt);

      if (genCtx.styleText || genCtx.styleImages.length > 0) {
        fullPrompt = fullPrompt.replace(RENDER_STYLE_BLOCK, renderBlock);
      }
      if (genCtx.styleImages.length > 0) {
        const charCount = baseRefs.length;
        const styleStart = charCount + 1;
        fullPrompt += `\n\nIMAGE LAYOUT: Images 1–${charCount} are CHARACTER REFERENCES. Images ${styleStart}–${charCount + genCtx.styleImages.length} are STYLE REFERENCES — replicate their visual style. Do NOT copy characters/scenes from style refs.`;
      }

      if (genCtx.text) {
        fullPrompt = genCtx.text + '\n\n' + fullPrompt;
      }
      if (userEdit) {
        fullPrompt += `\n\nAdditional instructions: ${userEdit}`;
      }

      const modelLabel = GEMINI_IMAGE_MODELS[editModel]?.label ?? editModel;
      const genAspect = getAspectRatioFromGraph(getNodes as () => Array<{ id: string; type?: string; data: Record<string, unknown> }>);
      setEditStatus(`Generating (${modelLabel})…`);
      console.log(`%c[CharView:${viewKey}] Generate: ${Array.isArray(refImages) ? refImages.length : 1} ref imgs (${genCtx.styleImages.length} style), aspect=${genAspect}`, 'color: #00bcd4; font-weight: bold');

      const results = await generateWithGeminiRef(fullPrompt, refImages, editModel, genAspect);

      if (!mountedRef.current || session.signal.aborted) return;
      if (!results[0]) throw new Error('No image returned');

      const img = results[0];
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      setEditStatus(`Done in ${elapsed}s ✓`);
      setEditedImage(img);
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, generatedImage: img } } : n,
        ),
      );
      const histLabel = userEdit
        ? `${viewImage ? 'Regen' : 'Gen'}: ${userEdit.slice(0, 40)}`
        : `${viewImage ? 'Regenerated' : 'Generated'} ${(isCustom ? (customLabel || cfg.label) : cfg.label).toLowerCase()}`;
      pushHistory(img, histLabel);
      if (userEdit) setEditText('');
      setTimeout(() => { if (mountedRef.current) setEditStatus(null); }, 3000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.toLowerCase().includes('cancel') && !msg.toLowerCase().includes('abort')) {
        if (mountedRef.current) setEditError(msg);
      }
      setEditStatus(null);
    } finally {
      clearInterval(editTimerRef.current);
      unregisterRequest(session);
      if (mountedRef.current) {
        setGenBusy(false);
        setEditElapsed(0);
      }
    }
  }, [isMain, isCustom, genBusy, id, cfg, customLabel, data, viewKey, viewImage, editText, getNode, getNodes, getEdges, setNodes, pushHistory, editModel, useText, useImage, effectiveAngleRef]);

  const externalGenerating = (data?.generating as boolean) ?? false;
  const anyBusy = editBusy || genBusy || autoGenBusy || restoreBusy || externalGenerating;

  const tooltipKey = viewKey === 'front' ? 'charFrontViewer'
    : viewKey === 'back' ? 'charBackViewer'
    : viewKey === 'side' ? 'charSideViewer'
    : viewKey === 'custom' ? 'charCustomView'
    : 'charMainViewer';

  const displayLabel = isCustom && customLabel ? customLabel : cfg.label;

  return (
    <div
      className={`char-node char-viewer-node ${selected ? 'selected' : ''} ${compact ? 'char-view-compact' : 'char-view-expanded'} ${anyBusy ? 'char-node-processing' : ''}`}
      style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}
      title={NODE_TOOLTIPS[tooltipKey]}
    >
      <NodeResizer
        isVisible={!!selected && !compact}
        minWidth={200}
        minHeight={200}
        onResize={handleResize}
      />

      {/* ── Header ── */}
      <div className="char-node-header" style={{ background: cfg.color }}>
        {isCustom && editingLabel ? (
          <input
            className="nodrag"
            autoFocus
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            onBlur={() => { setEditingLabel(false); persistCustomData({ customLabel }); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { setEditingLabel(false); persistCustomData({ customLabel }); } }}
            style={{ background: 'rgba(0,0,0,0.3)', border: 'none', color: '#fff', fontSize: 12, fontWeight: 700, padding: '0 4px', width: '60%', borderRadius: 3 }}
          />
        ) : (
          <span
            onDoubleClick={isCustom ? () => setEditingLabel(true) : undefined}
            style={isCustom ? { cursor: 'text' } : undefined}
            title={isCustom ? 'Double-click to rename' : undefined}
          >
            {displayLabel}
          </span>
        )}
        {!isMain && mainStageImage && (
          <span style={{ fontSize: 8, opacity: 0.7, marginLeft: 4 }} title="Linked to Main Stage">🔗</span>
        )}
        {isCustom && (
          <button
            className="char-view-toggle nodrag"
            onClick={() => setShowCustomConfig((v) => !v)}
            title="View configuration"
            style={{ marginLeft: 4, fontSize: 10 }}
          >
            ⚙
          </button>
        )}
        {viewImage && false && (
          <button
            className="char-view-toggle nodrag"
            title="Reserved"
            style={{ fontSize: 11 }}
          >
            ⧉
          </button>
        )}
        <button className="char-view-toggle nodrag" onClick={toggleCompact} title={compact ? 'Expand' : 'Collapse'}>
          {compact ? '\u25BC' : '\u25B2'}
        </button>
      </div>

      {compact && (
        <div className="char-node-body" style={{ padding: '3px 10px' }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted, #888)' }}>
            {viewImage ? (imgRes ? `${imgRes.w}×${imgRes.h}` : 'Image loaded') : 'No image'}
            {historyEntries.length > 0 ? ` · ${historyEntries.length} hist` : ''}
          </span>
        </div>
      )}

      {/* ── Full-size image popup (to the right of the node) ── */}
      {showFullPreview && viewImage && (
        <div className="style-popup-overlay nodrag" onClick={(e) => e.stopPropagation()}>
          <div className="style-popup-window" style={{ maxWidth: 520, maxHeight: 620 }}>
            <button
              type="button"
              className="style-popup-close nodrag"
              onClick={() => setShowFullPreview(false)}
            >
              &times;
            </button>
            <img
              src={`data:${viewImage.mimeType};base64,${viewImage.base64}`}
              alt={displayLabel}
              draggable={false}
              style={{ maxWidth: 500, maxHeight: 580, objectFit: 'contain', display: 'block', borderRadius: 4 }}
            />
            <div className="style-popup-label">{displayLabel}</div>
          </div>
        </div>
      )}

      {/* ── Custom View Configuration (collapsible) ── */}
      {isCustom && showCustomConfig && !compact && (
        <div className="nodrag nowheel" style={{ padding: '6px 8px', borderBottom: '1px solid #333', background: 'rgba(126,87,194,0.08)', fontSize: 11 }}>
          <div style={{ marginBottom: 4, display: 'flex', gap: 6, alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer', color: useText ? '#bb86fc' : '#666' }}>
              <input type="checkbox" checked={useText} onChange={(e) => { setUseText(e.target.checked); persistCustomData({ useText: e.target.checked }); }} />
              Use Text
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer', color: useImage ? '#bb86fc' : '#666' }}>
              <input type="checkbox" checked={useImage} onChange={(e) => { setUseImage(e.target.checked); persistCustomData({ useImage: e.target.checked }); }} />
              Use Image
            </label>
          </div>

          {useText && (
            <textarea
              value={viewPrompt}
              onChange={(e) => { setViewPrompt(e.target.value); persistCustomData({ viewPrompt: e.target.value }); }}
              placeholder="Describe the camera angle, pose, and framing for this custom view..."
              rows={4}
              style={{
                width: '100%',
                background: '#1a1a2e',
                color: '#ddd',
                border: '1px solid #444',
                borderRadius: 4,
                padding: '4px 6px',
                fontSize: 10,
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
            />
          )}

          {useImage && (
            <div style={{ marginTop: 4 }}>
              {connectedAngleRef ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ position: 'relative', width: 40, height: 40 }}>
                    <img
                      src={`data:${connectedAngleRef.mimeType};base64,${connectedAngleRef.base64}`}
                      alt="connected angle ref"
                      style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 3, border: '1px solid #7e57c2' }}
                    />
                  </div>
                  <span style={{ fontSize: 9, color: '#bb86fc' }}>Connected via node</span>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button
                    className="char-btn nodrag"
                    onClick={() => angleRefFileRef.current?.click()}
                    style={{ fontSize: 10, padding: '3px 8px' }}
                  >
                    {angleRefImage ? 'Change Ref Image' : 'Open Angle Reference'}
                  </button>
                  <input ref={angleRefFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAngleRefFile} />
                  {angleRefImage && (
                    <div style={{ position: 'relative', width: 32, height: 32 }}>
                      <img
                        src={`data:${angleRefImage.mimeType};base64,${angleRefImage.base64}`}
                        alt="angle ref"
                        style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 3, border: '1px solid #555' }}
                      />
                      <button
                        onClick={() => { setAngleRefImage(null); persistCustomData({ angleRefImage: null }); }}
                        style={{ position: 'absolute', top: -4, right: -4, width: 14, height: 14, borderRadius: '50%', background: '#f44336', color: '#fff', border: 'none', fontSize: 8, cursor: 'pointer', lineHeight: '14px', padding: 0 }}
                        title="Remove reference image"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              )}
              {!connectedAngleRef && !angleRefImage && (
                <div style={{ fontSize: 9, color: '#888', marginTop: 2 }}>
                  Or connect a node to the bottom &ldquo;Angle Ref&rdquo; handle
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop: 3, fontSize: 9, color: '#888', fontStyle: 'italic' }}>
            {useText && useImage ? 'Text prompt + angle reference image will be used together.'
              : useText ? 'Text prompt only — describe the angle/pose/framing.'
              : useImage ? 'Image only — the reference image angle will be matched.'
              : 'Enable at least one input mode.'}
          </div>
        </div>
      )}

      {!compact && <div
        className="char-viewer-canvas nodrag nowheel"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { isPanning.current = false; }}
        onDoubleClick={handleResetView}
        style={{ flex: 1, overflow: 'hidden', cursor: isPanning.current ? 'grabbing' : 'default' }}
      >
        {viewImage ? (
          <>
            <ImageContextMenu
              image={viewImage}
              alt={displayLabel}
              onPasteImage={handlePasteImage}
              onResetView={handleResetView}
            >
              <img
                key={viewImage.base64.slice(-40)}
                src={`data:${viewImage.mimeType};base64,${viewImage.base64}`}
                alt={displayLabel}
                onClick={() => { if (!isPanning.current) setShowFullPreview(true); }}
                onLoad={(e) => {
                  const img = e.currentTarget;
                  setImgRes({ w: img.naturalWidth, h: img.naturalHeight });
                }}
                style={{
                  transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
                  transition: isPanning.current ? 'none' : 'transform 0.1s',
                  cursor: 'pointer',
                }}
              />
            </ImageContextMenu>
            {imgRes && <span className="char-viewer-res">{imgRes.w}&times;{imgRes.h}</span>}
          </>
        ) : (
          <span className="char-viewer-empty">
            {isMain ? (
              <>No image loaded<br />Connect a source or open a file</>
            ) : mainStageImage ? (
              <>No view generated yet<br />Click &ldquo;Generate View&rdquo; below</>
            ) : (
              <>Waiting for Main Stage<br />Generate a character image first</>
            )}
          </span>
        )}
      </div>}

      {!compact && (
        <>
          <div className="char-viewer-toolbar">
            <button className="char-btn nodrag" onClick={handleOpenImage}>Open IMG</button>
            <button className="char-btn nodrag" onClick={async () => {
              try {
                const items = await navigator.clipboard.read();
                for (const item of items) {
                  const imgType = item.types.find((t) => t.startsWith('image/'));
                  if (imgType) {
                    const blob = await item.getType(imgType);
                    const reader = new FileReader();
                    reader.onload = () => {
                      const url = reader.result as string;
                      const parts = url.split(',');
                      const mime = parts[0].match(/:(.*?);/)?.[1] ?? 'image/png';
                      handlePasteImage({ base64: parts[1], mimeType: mime });
                    };
                    reader.readAsDataURL(blob);
                  }
                }
              } catch { /* clipboard may be unavailable */ }
            }}>Paste IMG</button>
            {viewImage && (
              <button className="char-btn nodrag" onClick={async () => {
                try {
                  const resp = await fetch(`data:${viewImage.mimeType};base64,${viewImage.base64}`);
                  const blob = await resp.blob();
                  await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
                } catch { /* clipboard may be unavailable */ }
              }}>Copy IMG</button>
            )}
            <button className="char-btn nodrag" onClick={handleResetView}>Reset View</button>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
            <span className="char-viewer-zoom-info">{Math.round(zoom * 100)}%</span>
          </div>
          {(!isMain || viewImage) && (
            <div className="char-viewer-toolbar" style={{ justifyContent: 'center' }}>
              {!isMain && (
                <button
                  className="char-btn nodrag"
                  onClick={handleGenerateView}
                  disabled={anyBusy || !mainStageImage}
                  title={mainStageImage ? `Generate ${displayLabel.toLowerCase()} from Main Stage` : 'No Main Stage image yet'}
                  style={{ background: anyBusy ? undefined : cfg.color, color: '#000', fontWeight: 600, flex: 1 }}
                >
                  {genBusy ? `${editElapsed}s…` : viewImage ? 'Regenerate' : 'Generate View'}
                </button>
              )}
              {viewImage && (
                <button
                  className="char-btn nodrag"
                  onClick={handleRestore}
                  disabled={anyBusy}
                  title="Restore quality — AI redraws the image from scratch to remove accumulated artifacts and degradation"
                  style={{
                    background: anyBusy ? undefined : 'linear-gradient(135deg, #00c853, #00e5ff)',
                    color: anyBusy ? undefined : '#000',
                    fontWeight: 600,
                    fontSize: 10,
                    flex: 1,
                  }}
                >
                  {restoreBusy ? `${editElapsed}s\u2026` : 'Restore'}
                </button>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Inline Edit (all views) ── */}
      {!compact && viewImage && (
        <div style={{ padding: '4px 6px 6px', borderTop: '1px solid #333' }} className="nodrag">
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <input
              className="nowheel"
              type="text"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !anyBusy) handleEdit(); }}
              placeholder={isMain ? 'Edit image (e.g. red coat)…' : `Edit ${displayLabel.toLowerCase()} (e.g. switch hands)…`}
              disabled={anyBusy}
              style={{
                flex: 1,
                padding: '5px 8px',
                fontSize: 11,
                background: '#1a1a2e',
                border: '1px solid #444',
                borderRadius: 4,
                color: '#eee',
                outline: 'none',
              }}
            />
            <button
              type="button"
              onClick={handleEdit}
              disabled={anyBusy || !editText.trim()}
              style={{
                padding: '5px 12px',
                fontSize: 11,
                fontWeight: 600,
                background: anyBusy ? '#555' : '#00e5ff',
                color: anyBusy ? '#aaa' : '#000',
                border: 'none',
                borderRadius: 4,
                cursor: anyBusy ? 'default' : 'pointer',
                whiteSpace: 'nowrap',
                minWidth: 52,
              }}
            >
              {editBusy ? `${editElapsed}s` : 'Enter'}
            </button>
          </div>
          {!isMain && !mainStageImage && (
            <div style={{ fontSize: 9, color: '#ff9800', marginTop: 2, opacity: 0.8 }}>
              Edits will work without Main Stage context, but results are better with one.
            </div>
          )}
          {editStatus && (
            <div style={{ fontSize: 10, color: '#00e5ff', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
              {anyBusy && <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', border: '2px solid #00e5ff', borderTopColor: 'transparent', animation: 'char-spin 0.7s linear infinite' }} />}
              {editStatus}
            </div>
          )}
          {editError && (
            <div style={{ fontSize: 10, color: '#f44336', marginTop: 3, maxHeight: 60, overflow: 'auto', padding: '4px 6px', background: 'rgba(244,67,54,0.08)', borderRadius: 3, border: '1px solid rgba(244,67,54,0.2)' }}>
              {editError}
            </div>
          )}
        </div>
      )}

      {/* ── Embedded History (all views) ── */}
      {!compact && (
        <div style={{ borderTop: '1px solid #444', flexShrink: 0, background: '#1a1a2e', position: 'relative', zIndex: 5 }}>
          <div
            className="nodrag"
            onClick={() => setHistoryMinimized((m) => !m)}
            style={{
              padding: '6px 10px',
              background: '#252540',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              userSelect: 'none',
            }}
          >
            <span style={{ fontWeight: 700, fontSize: 11, color: '#ccc', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              History
            </span>
            <span style={{ marginLeft: 'auto', fontSize: 10, opacity: 0.7, color: '#999' }}>
              {historyMinimized ? '\u25BC' : '\u25B2'} {historyEntries.length}
            </span>
          </div>

          {historyMinimized && historyEntries.length > 0 && (() => {
            const latest = historyEntries[historyEntries.length - 1];
            return (
              <div style={{ padding: '4px 6px', background: '#1a1a2e' }}>
                <div className="char-history-entry active" style={{ cursor: 'default' }}>
                  {latest.image && (
                    <img
                      src={`data:${latest.image.mimeType};base64,${latest.image.base64}`}
                      alt={latest.label}
                      className="char-history-thumb"
                    />
                  )}
                  <div className="char-history-info">
                    <span className="char-history-label">{latest.label}</span>
                    <span className="char-history-time">{latest.timestamp}</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {!historyMinimized && (
            <div className="nodrag nowheel" style={{ display: 'flex', flexDirection: 'column', background: '#1a1a2e' }}>
              <div style={{ maxHeight: 220, overflowY: 'auto', padding: '2px 0' }}>
                <div
                  className={`char-history-entry ${activeHistIdx === -1 ? 'active' : ''}`}
                  onClick={handleHistoryCurrent}
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div className="char-history-info" style={{ padding: '4px 0' }}>
                    <span className="char-history-label" style={{ fontWeight: 700 }}>Current</span>
                    <span className="char-history-time">latest state</span>
                  </div>
                </div>

                {[...historyEntries].reverse().map((entry, ri) => {
                  const realIdx = historyEntries.length - 1 - ri;
                  return (
                    <div
                      key={realIdx}
                      className={`char-history-entry ${activeHistIdx === realIdx ? 'active' : ''}`}
                      onClick={() => handleHistorySelect(realIdx)}
                    >
                      {entry.image && (
                        <img
                          src={`data:${entry.image.mimeType};base64,${entry.image.base64}`}
                          alt={entry.label}
                          className="char-history-thumb"
                        />
                      )}
                      <div className="char-history-info">
                        <span className="char-history-label">{entry.label}</span>
                        <span className="char-history-time">{entry.timestamp}</span>
                      </div>
                    </div>
                  );
                })}

                {historyEntries.length === 0 && (
                  <div style={{ padding: '16px 12px', textAlign: 'center', fontSize: 11, color: '#666' }}>
                    No history yet — generate or edit an image to start
                  </div>
                )}
              </div>

              <div className="char-gallery-nav" style={{ justifyContent: 'space-between', padding: '4px 8px', borderTop: '1px solid #333' }}>
                <button
                  className="nodrag"
                  disabled={activeHistIdx <= 0 && activeHistIdx !== -1}
                  onClick={handleHistoryBack}
                >
                  &lt; Back
                </button>
                <span style={{ fontSize: 10 }}>{historyEntries.length} entries</span>
                <button
                  className="nodrag"
                  disabled={activeHistIdx === -1}
                  onClick={handleHistoryForward}
                >
                  Forward &gt;
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <Handle type="target" position={Position.Left} id="input" className="char-handle" style={{ top: '50%' }} />
      <Handle type="source" position={Position.Right} id="output" className="char-handle" style={{ top: '50%' }} />
      {isCustom && (
        <Handle
          type="target"
          position={Position.Bottom}
          id="angle-ref"
          className="char-handle"
          style={{ left: '50%' }}
          title="Angle reference image input"
        />
      )}
    </div>
  );
}

export default memo(CharViewNodeInner);
