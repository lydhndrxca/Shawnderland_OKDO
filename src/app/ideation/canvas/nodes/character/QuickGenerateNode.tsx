"use client";

import { memo, useCallback, useState, useRef, useEffect } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import {
  ATTRIBUTE_GROUPS,
  buildCharacterDescription,
  buildCharacterViewPrompt,
  synthesizeContextLens,
  hasContextData,
  type CharacterIdentity,
  type CharacterAttributes,
  type ContextLensInput,
} from '@/lib/ideation/engine/conceptlab/characterPrompts';
import { generateText, generateWithNanoBanana, generateWithImagen4, generateWithGeminiRef } from '@/lib/ideation/engine/conceptlab/imageGenApi';
import type { GeneratedImage, GeminiImageModel } from '@/lib/ideation/engine/conceptlab/imageGenApi';
import { getGlobalSettings } from '@/lib/globalSettings';
import { createProcessingAnimator } from '@/lib/processingAnimation';
import { IMAGE_GEN_MODELS } from './ModelSettingsNode';
import { NODE_TOOLTIPS } from './nodeTooltips';
import { devLog, devWarn } from '@/lib/devLog';
import './CharacterNodes.css';

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

const VIEWER_NODE_TYPES: Record<string, string> = {
  charMainViewer: 'main',
  charViewer: 'main',
  charImageViewer: 'main',
  charFrontViewer: 'front',
  charBackViewer: 'back',
  charSideViewer: 'side',
};

const ATTR_KEYS = ATTRIBUTE_GROUPS.map((g) => g.key);

const CREATIVE_PROMPT = `You are a world-class character designer for film, games, and animation. Invent a UNIQUE, compelling, original character from scratch. Be creative — avoid generic or obvious choices. Mix unexpected influences.

Return ONLY a JSON object with this exact structure (no markdown, no backticks):
{
  "name": "character name",
  "age": "specific age description (e.g. 'Late 30s', 'Early 20s')",
  "race": "ethnicity/race",
  "gender": "gender",
  "build": "body type description",
  "description": "2-3 sentence character concept — who they are, what they do, what makes them interesting",
  ${ATTR_KEYS.map((k) => `"${k}": "detailed description of their ${k}"`).join(',\n  ')}
}

Every field must be filled with specific, vivid, visual detail. Don't use generic terms — describe exact colors, materials, wear patterns, and style details. Make the character feel like they have a real life and history.`;

function fireAndForgetSave(image: GeneratedImage, viewName: string, charName: string) {
  const outputDir = getGlobalSettings().outputDir;
  if (!outputDir) return;
  fetch('/api/character-save', {
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
  }).catch((e) => devWarn('[quick-gen save]', e));
}

function getModelSettingsFromGraph(
  getNode: ReturnType<typeof useReactFlow>['getNode'],
  getEdges: ReturnType<typeof useReactFlow>['getEdges'],
  startId: string,
): { apiId: string; label: string; aspectRatio: string; isImagen: boolean } {
  const edges = getEdges();
  const visited = new Set<string>();
  const queue = [startId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    const outgoing = edges.filter((e) => e.source === current);
    for (const e of outgoing) {
      const target = getNode(e.target);
      if (!target || visited.has(target.id)) continue;
      if (target.type === 'charGenerate') {
        const d = target.data as Record<string, unknown>;
        const modelId = (d.imageGenModelId as string) ?? IMAGE_GEN_MODELS[0].id;
        const aspectRatio = (d.aspectRatio as string) ?? '9:16';
        const def = IMAGE_GEN_MODELS.find((m) => m.id === modelId) ?? IMAGE_GEN_MODELS[0];
        return { apiId: def.apiId, label: def.label, aspectRatio, isImagen: def.apiId.startsWith('imagen-') };
      }
      queue.push(target.id);
    }
  }

  const def = IMAGE_GEN_MODELS[0];
  return { apiId: def.apiId, label: def.label, aspectRatio: '9:16', isImagen: def.apiId.startsWith('imagen-') };
}

interface ContextResult {
  bibleContext: string;
  lockConstraints: string;
  costumeBrief: string;
  fusionBrief: string;
  envBrief: string;
  styleText: string;
  styleImages: GeneratedImage[];
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

function gatherContextFromGraph(
  startId: string,
  getNode: ReturnType<typeof useReactFlow>['getNode'],
  getEdges: ReturnType<typeof useReactFlow>['getEdges'],
): ContextResult {
  const edges = getEdges();
  const visited = new Set<string>();
  const hubDisabled = new Set<string>();
  const queue = [startId];
  const result: ContextResult = { bibleContext: '', lockConstraints: '', costumeBrief: '', fusionBrief: '', envBrief: '', styleText: '', styleImages: [] };

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
        if (parts.length > 0) result.bibleContext = parts.join('\n');
      }

      if (node.type === 'charPreservationLock') {
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
        if (constraints.length > 0) result.lockConstraints = constraints.join('\n');
      }

      if (node.type === 'costumeDirector') {
        const brief = buildCostumeBriefFromData(d);
        if (brief) result.costumeBrief = brief;
      }
      if (node.type === 'charStyleFusion') {
        if (d.fusionBrief) result.fusionBrief = d.fusionBrief as string;
      }
      if (node.type === 'envPlacement') {
        if (d.envBrief) result.envBrief = d.envBrief as string;
      }
      if (node.type === 'charStyle') {
        if (d.styleText) result.styleText = d.styleText as string;
        const imgs = d.styleImages as GeneratedImage[] | undefined;
        if (imgs?.length) result.styleImages.push(...imgs);
      }

      queue.push(neighbor);
    }
  }
  return result;
}

function QuickGenerateNodeInner({ id, data, selected }: Props) {
  const { setNodes, setEdges, getNode, getEdges } = useReactFlow();
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const cancelledRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const getConnectedNodeIds = useCallback(() => {
    const edges = getEdges();
    const targets = new Set<string>();
    for (const e of edges) {
      if (e.source === id) targets.add(e.target);
      if (e.target === id) targets.add(e.source);
    }
    return targets;
  }, [id, getEdges]);

  const findDownstreamByType = useCallback((targetTypes: Set<string>) => {
    const edges = getEdges();
    const found: string[] = [];
    const visited = new Set<string>();
    const queue = [id];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      const outgoing = edges.filter((e) => e.source === current);
      for (const e of outgoing) {
        const target = getNode(e.target);
        if (!target || visited.has(target.id)) continue;
        if (target.type === 'charGate') {
          const gd = target.data as Record<string, unknown>;
          if (!(gd.enabled as boolean ?? true)) continue;
        }
        if (targetTypes.has(target.type ?? '')) found.push(target.id);
        queue.push(target.id);
      }
    }
    return found;
  }, [id, getNode, getEdges]);

  const pushData = useCallback(
    (identity: CharacterIdentity, attributes: CharacterAttributes, description: string, charName?: string): number => {
      const connected = getConnectedNodeIds();
      let pushed = 0;
      setNodes((nds) =>
        nds.map((n) => {
          if (!connected.has(n.id)) return n;
          if (n.type === 'charIdentity') {
            pushed++;
            return { ...n, data: { ...n.data, identity, name: charName ?? '' } };
          }
          if (n.type === 'charDescription') {
            pushed++;
            return { ...n, data: { ...n.data, description } };
          }
          if (n.type === 'charAttributes') {
            pushed++;
            const d = n.data as Record<string, unknown>;
            const existingAttrs = (d.attributes as CharacterAttributes) ?? {};
            const merged = {
              ...attributes,
              pose: existingAttrs.pose || 'Pose — relaxed A-stance, hands at sides',
            };
            return { ...n, data: { ...n.data, attributes: merged } };
          }
          return n;
        }),
      );
      return pushed;
    },
    [getConnectedNodeIds, setNodes],
  );

  const generateCharacter = useCallback(async () => {
    setStatus('AI is inventing a character…');
    const raw = await generateText(CREATIVE_PROMPT);
    if (!mountedRef.current || cancelledRef.current) return null;

    let parsed: Record<string, string>;
    try {
      const jsonStr = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) parsed = JSON.parse(match[0]);
      else throw new Error('Could not parse AI response as JSON');
    }

    const identity: CharacterIdentity = {
      age: parsed.age || 'Mid 30s',
      race: parsed.race || 'Mixed',
      gender: parsed.gender || 'Male',
      build: parsed.build || 'Athletic',
    };

    const attributes: CharacterAttributes = {};
    for (const key of ATTR_KEYS) {
      attributes[key] = parsed[key] || '';
    }

    const description = parsed.description || '';
    const name = parsed.name || '';

    return { identity, attributes, description, name };
  }, []);

  const runDescriptionOnly = useCallback(async () => {
    if (generating) return;
    cancelledRef.current = false;
    setGenerating(true);
    setError(null);
    setLastResult(null);
    const anim = createProcessingAnimator(setNodes, setEdges, getEdges);
    try {
      anim.markNodes([id], true);
      anim.markEdgesFrom(id, true);

      const result = await generateCharacter();
      if (!result || !mountedRef.current || cancelledRef.current) return;

      const { identity, attributes, description, name } = result;
      setStatus('Filling out connected nodes…');

      attributes.pose = 'Relaxed A-stance, hands at sides';
      const pushed = pushData(identity, attributes, description, name);
      const summary = `${name || identity.gender}, ${identity.age}, ${identity.race}`;
      setLastResult(pushed > 0
        ? `Created: ${summary} → pushed to ${pushed} node(s)`
        : `Created: ${summary} — connect Identity/Description/Attributes nodes`);
      setStatus('');
    } catch (e) {
      if (cancelledRef.current) return;
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.toLowerCase().includes('cancel') || msg.toLowerCase().includes('abort')) return;
      console.error('[QuickGen] error:', e);
      if (mountedRef.current) setError(msg);
      setStatus('');
    } finally {
      if (mountedRef.current) setGenerating(false);
      anim.clearAll();
    }
  }, [generating, id, pushData, generateCharacter, setNodes, setEdges, getEdges]);

  const runDescriptionAndImage = useCallback(async () => {
    if (generating) return;
    cancelledRef.current = false;
    setGenerating(true);
    setError(null);
    setLastResult(null);
    const anim = createProcessingAnimator(setNodes, setEdges, getEdges);
    try {
      anim.markNodes([id], true);
      anim.markEdgesFrom(id, true);

      const result = await generateCharacter();
      if (!result || !mountedRef.current || cancelledRef.current) return;

      const { identity, attributes, description, name } = result;
      attributes.pose = 'Relaxed A-stance, hands at sides';
      setStatus('Pushing to connected nodes…');
      pushData(identity, attributes, description, name);

      if (!mountedRef.current || cancelledRef.current) return;

      const modelSettings = getModelSettingsFromGraph(getNode, getEdges, id);
      setStatus(`Generating character image (${modelSettings.label})…`);
      devLog(`[QuickGen] Using ${modelSettings.label} (${modelSettings.apiId}), aspect: ${modelSettings.aspectRatio}`);

      const generateNodeIds = findDownstreamByType(new Set(['charGenerate']));
      anim.markNodes(generateNodeIds, true);

      const mainViewerTypes = new Set(['charMainViewer', 'charViewer', 'charImageViewer']);
      const viewerNodeIds = findDownstreamByType(new Set(Object.keys(VIEWER_NODE_TYPES)));
      const mainViewerIds = new Set<string>();
      for (const vId of viewerNodeIds) {
        const vNode = getNode(vId);
        if (vNode && mainViewerTypes.has(vNode.type ?? '')) mainViewerIds.add(vId);
      }

      setNodes((nds) =>
        nds.map((n) =>
          mainViewerIds.has(n.id) ? { ...n, data: { ...n.data, generating: true } } : n,
        ),
      );

      const ctx = gatherContextFromGraph(id, getNode, getEdges);
      const ctxLens: ContextLensInput = {
        bibleContext: ctx.bibleContext,
        costumeBrief: ctx.costumeBrief,
        fusionBrief: ctx.fusionBrief,
        envBrief: ctx.envBrief,
        lockConstraints: ctx.lockConstraints,
      };

      let synthIdentity = identity;
      let synthDescription = description;
      let synthAttributes = attributes;

      if (hasContextData(ctxLens)) {
        setStatus('Applying context lens...');
        console.log('%c[QuickGen] Running context lens synthesis...', 'color: #ff9800; font-weight: bold');
        try {
          const synth = await synthesizeContextLens(identity, attributes, description, ctxLens);
          synthIdentity = synth.identity;
          synthDescription = synth.description;
          synthAttributes = synth.attributes;
        } catch (e) {
          devWarn('[QuickGen] Context lens synthesis failed, using raw inputs:', e);
        }
      }

      const hasStyleOverride = ctx.styleText.trim().length > 0 || ctx.styleImages.length > 0;
      const effectiveStyleText = ctx.styleText.trim()
        || (ctx.styleImages.length > 0 ? 'Match the visual style shown in the style reference image(s). Replicate the exact rendering technique, color palette, and artistic approach.' : undefined);
      const charDesc = buildCharacterDescription(synthIdentity, synthAttributes, synthDescription, hasStyleOverride ? effectiveStyleText : undefined);
      let fullPrompt = buildCharacterViewPrompt('main', charDesc, hasStyleOverride ? effectiveStyleText : undefined);

      console.log(`%c[QuickGen] Context lens: ${hasContextData(ctxLens) ? 'applied' : 'skipped (no context)'}`, 'color: #4caf50; font-weight: bold');

      let images: GeneratedImage[];
      if (ctx.styleImages.length > 0) {
        const styleAnalysis = `STYLE ANALYSIS INSTRUCTIONS — study the STYLE REFERENCE image(s) and replicate:
1. GEOMETRY, PROPORTIONS, RENDERING, EDGES, COLOR PALETTE, TEXTURE, RESOLUTION/FIDELITY
CRITICAL: The output MUST be visually indistinguishable in style from the reference. Do NOT default to generic photorealism.
Do NOT include any characters or scenes from the style reference — ONLY replicate the visual style.

Generate a NEW character in the EXACT same visual style:

${fullPrompt}`;
        console.log(`%c[QuickGen] PATH: Multimodal with ${ctx.styleImages.length} style ref imgs, aspect=${modelSettings.aspectRatio}`, 'color: #ff9800; font-weight: bold');
        images = await generateWithGeminiRef(styleAnalysis, ctx.styleImages, modelSettings.apiId as GeminiImageModel, modelSettings.aspectRatio);
      } else if (modelSettings.isImagen) {
        console.log(`%c[QuickGen] PATH: Imagen 4 text-only`, 'color: #2196f3; font-weight: bold');
        images = await generateWithImagen4(fullPrompt, modelSettings.aspectRatio, 1, modelSettings.apiId);
      } else {
        console.log(`%c[QuickGen] PATH: Nano Banana text-only`, 'color: #9c27b0; font-weight: bold');
        images = await generateWithNanoBanana(fullPrompt, modelSettings.aspectRatio, 1, modelSettings.apiId);
      }
      if (!mountedRef.current || cancelledRef.current) return;
      const mainImage = images[0] as GeneratedImage;

      anim.markNodes(viewerNodeIds, true);

      setNodes((nds) =>
        nds.map((n) => {
          if (generateNodeIds.includes(n.id)) {
            return { ...n, data: { ...n.data, generatedImage: mainImage, characterDescription: charDesc } };
          }
          if (mainViewerIds.has(n.id)) {
            return { ...n, data: { ...n.data, generatedImage: mainImage, generating: false, _orthoTrigger: Date.now() } };
          }
          return n;
        }),
      );

      const charName = name || `${identity.race}_${identity.gender}`;
      fireAndForgetSave(mainImage, 'main_stage', charName);

      const summary = `${name || identity.gender}, ${identity.age}, ${identity.race}`;
      setLastResult(`Created: ${summary} + image → ${mainViewerIds.size} viewer(s)`);
      setStatus('');
    } catch (e) {
      if (cancelledRef.current) return;
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.toLowerCase().includes('cancel') || msg.toLowerCase().includes('abort')) return;
      console.error('[QuickGen+Image] error:', e);
      if (mountedRef.current) setError(msg);
      setStatus('');
    } finally {
      if (mountedRef.current) setGenerating(false);
      const allViewerIds = findDownstreamByType(new Set(Object.keys(VIEWER_NODE_TYPES)));
      const mvTypes = new Set(['charMainViewer', 'charViewer', 'charImageViewer']);
      const mvIds = new Set<string>();
      for (const vId of allViewerIds) {
        const vNode = getNode(vId);
        if (vNode && mvTypes.has(vNode.type ?? '')) mvIds.add(vId);
      }
      if (mvIds.size > 0) {
        setNodes((nds) =>
          nds.map((n) =>
            mvIds.has(n.id) ? { ...n, data: { ...n.data, generating: false } } : n,
          ),
        );
      }
      anim.clearAll();
    }
  }, [generating, id, pushData, generateCharacter, findDownstreamByType, getNode, setNodes, setEdges, getEdges]);

  return (
    <div className={`char-node ${selected ? 'selected' : ''} ${generating ? 'char-node-processing' : ''}`}
      title={NODE_TOOLTIPS.charQuickGen}>
      <div className="char-node-header" style={{ background: '#ffa726' }}>
        Quick Generate
      </div>
      <div className="char-node-body">
        <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>
          AI invents a unique character from scratch — fills out Identity, Description, and all Attributes.
        </p>
        <div className="char-quickgen-options">
          <button className="char-btn nodrag" onClick={runDescriptionOnly} disabled={generating}>
            {generating ? status || 'Working…' : 'Quick Generate Description'}
          </button>
          <button className="char-btn primary nodrag" onClick={runDescriptionAndImage} disabled={generating}>
            {generating ? status || 'Working…' : 'Quick Generate Description + Image'}
          </button>
        </div>
        {generating && status && (
          <div className="char-progress">{status}</div>
        )}
        {error && (
          <div className="char-error" style={{ whiteSpace: 'pre-wrap', maxHeight: 100, overflow: 'auto', fontSize: 10 }}>
            {error}
          </div>
        )}
        {lastResult && !generating && !error && (
          <div style={{ fontSize: 10, color: '#69f0ae', padding: '4px 0' }}>
            {lastResult}
          </div>
        )}
      </div>

      <Handle type="target" position={Position.Left} id="input" className="char-handle" style={{ top: '50%' }} />
      <Handle type="source" position={Position.Right} id="output" className="char-handle" style={{ top: '50%' }} />
    </div>
  );
}

export default memo(QuickGenerateNodeInner);
