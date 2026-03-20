"use client";

import { memo, useCallback, useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import {
  EXTRACT_PROP_ATTRIBUTES_PROMPT,
  PROP_ATTRIBUTE_GROUPS,
  PROP_TYPE_OPTIONS,
  SETTING_OPTIONS,
  CONDITION_OPTIONS,
  SCALE_OPTIONS,
  PROP_VIEW_REQUESTS,
  LOCK_DESIGN_BLOCK,
} from '@/lib/ideation/engine/conceptlab/propPrompts';
import {
  generateText,
  generateWithGeminiRef,
  type GeneratedImage,
  type TextModelId,
} from '@/lib/ideation/engine/conceptlab/imageGenApi';
import { registerRequest, unregisterRequest } from '@/lib/activeRequests';
import TextModelSelector from '@/components/TextModelSelector';
import '../character/CharacterNodes.css';
import './PropLabNodes.css';

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

function bestMatch(value: string, options: string[]): string {
  if (!value) return '';
  const v = value.toLowerCase().trim();
  const exact = options.find((o) => o.toLowerCase() === v);
  if (exact) return exact;
  const contains = options.find((o) => o.toLowerCase().includes(v) || v.includes(o.toLowerCase()));
  if (contains) return contains;
  return value;
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

const DESCRIBE_PROP_PROMPT = `You are a forensic-level prop/object analyst for AAA game environment art. Study this image with extreme precision and write a DETAILED description that another artist could use to recreate this EXACT prop.

STRUCTURE:
1. OVERALL FORM: Shape, silhouette, proportions, scale estimation
2. PRIMARY MATERIAL: Exact material with finish detail, color, texture
3. SECONDARY MATERIALS: Hardware, fasteners, trim, accents
4. SURFACE CONDITION: Wear patterns, damage, dirt, patina — be specific about location
5. FUNCTIONAL ELEMENTS: Moving parts, mechanisms, interfaces
6. DECORATIVE DETAIL: Markings, labels, ornament, engravings
7. COLOR PALETTE: Dominant and accent colors with relationships

RULES:
- Be SPECIFIC: "brushed aluminum with directional grain, cool grey, 220 grit scratch pattern" NOT "metal surface"
- If something is partially hidden, extrapolate from visible style
- Do NOT describe background or setting
- Return ONLY the description text`;

const MAIN_VIEWER_TYPES = new Set(['propMainViewer']);

function findDownstreamMainViewers(
  startId: string,
  getNode: ReturnType<typeof useReactFlow>['getNode'],
  getEdges: ReturnType<typeof useReactFlow>['getEdges'],
): string[] {
  const edges = getEdges();
  const visited = new Set<string>();
  const queue = [startId];
  const mainIds: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    for (const e of edges) {
      const target = e.source === current ? e.target : null;
      if (!target || visited.has(target)) continue;
      const node = getNode(target);
      if (!node) continue;
      if (MAIN_VIEWER_TYPES.has(node.type ?? '')) mainIds.push(target);
      queue.push(target);
    }
  }
  return mainIds;
}

function PropExtractAttrsNodeInner({ id, data, selected }: Props) {
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

          if (n.type === 'propIdentity') {
            const locks = (nd.lockedAttrs as Record<string, boolean>) ?? {};
            const existing = (nd.identity as Record<string, string>) ?? {};
            updates.identity = {
              propType: locks.propType ? existing.propType : bestMatch(json.propType ?? '', PROP_TYPE_OPTIONS),
              setting: locks.setting ? existing.setting : bestMatch(json.setting ?? '', SETTING_OPTIONS),
              condition: locks.condition ? existing.condition : bestMatch(json.condition ?? '', CONDITION_OPTIONS),
              scale: locks.scale ? existing.scale : bestMatch(json.scale ?? '', SCALE_OPTIONS),
            };
          } else if (n.type === 'propDescription') {
            updates.description = description;
          } else if (n.type === 'propAttributes') {
            const locks = (nd.lockedAttrs as Record<string, boolean>) ?? {};
            const existing = (nd.attributes as Record<string, string>) ?? {};
            const merged = { ...existing };
            for (const g of PROP_ATTRIBUTE_GROUPS) {
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

  const doExtract = useCallback(async (img: GeneratedImage) => {
    const hint = userHint.trim();
    const hintBlock = hint ? `\n\nUSER GUIDANCE: ${hint}\n` : '';

    setStatus('Describing prop...');
    const description = await generateText(DESCRIBE_PROP_PROMPT + hintBlock, img, textModel);

    setStatus('Extracting attributes...');
    const attrPrompt = `${EXTRACT_PROP_ATTRIBUTES_PROMPT}\n\nPROP DESCRIPTION:\n${description.trim()}`;
    const attrText = await generateText(attrPrompt, img, textModel);

    const combined = `Description:\n${description.trim()}\n\nAttributes:\n${attrText}`;
    setResultText(combined);
    setNodes((nds) =>
      nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, resultText: combined } } : n)),
    );

    const json = JSON.parse(attrText.replace(/```json?\n?/g, '').replace(/```/g, '').trim());
    pushToDownstream(description.trim(), json);

    return description.trim();
  }, [id, userHint, textModel, setNodes, pushToDownstream]);

  const handleExtract = useCallback(async () => {
    const img = findUpstreamImage(id, getNode, getEdges);
    if (!img) { setError('Connect an image source first.'); return; }
    setGenerating(true);
    setError(null);
    try {
      await doExtract(img);
      setStatus('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus('');
    } finally {
      setGenerating(false);
    }
  }, [id, getNode, getEdges, doExtract]);

  const handleRecreate = useCallback(async () => {
    const img = findUpstreamImage(id, getNode, getEdges);
    if (!img) { setError('Connect an image source first.'); return; }
    setGenerating(true);
    setError(null);
    const session = registerRequest();
    try {
      const cleanDescription = await doExtract(img);

      const mainIds = findDownstreamMainViewers(id, getNode, getEdges);
      if (mainIds.length > 0) {
        setNodes((nds) => nds.map((n) => mainIds.includes(n.id) ? { ...n, data: { ...n.data, generating: true } } : n));
      }

      setStatus('Recreating prop reference...');

      const recreatePrompt = `You are looking at a prop/object reference image. Your task is to RECREATE this EXACT prop as a clean, isolated game-asset reference render.

WHAT TO PRESERVE (copy from the source image):
- The EXACT same object: shape, silhouette, proportions, scale
- The EXACT same materials: every surface, finish, texture, color, patina, wear pattern
- The EXACT same details: functional elements, decorative markings, hardware, damage, dirt

WHAT TO CHANGE (standardize for the asset pipeline):
- BACKGROUND: Solid flat neutral grey only — no environment, no floor, no shadows
- FRAMING: ${PROP_VIEW_REQUESTS.main}
- LIGHTING: Completely flat, shadowless, uniform ambient illumination ONLY — like an overcast light-tent. NO directional light, NO cast shadows, NO specular highlights, NO rim light, NO ambient occlusion baked in. The prop must be evenly lit for in-engine relighting.

${LOCK_DESIGN_BLOCK}

PROP DESCRIPTION (extracted from the source — follow this precisely):
${cleanDescription}

ZERO TEXT — do NOT render any text, letters, numbers, logos, labels, or watermarks anywhere in the image.

FINAL CHECK: The output prop must be IMMEDIATELY recognizable as the same object from the source image. Every material, every scratch, every detail must match.`;

      const results = await generateWithGeminiRef(recreatePrompt, [img]);
      if (session.signal.aborted) throw new Error('Cancelled');
      const recreatedMain = results[0];
      if (!recreatedMain) throw new Error('No image returned from recreation');

      const triggerTimestamp = Date.now();
      if (mainIds.length > 0) {
        setNodes((nds) =>
          nds.map((n) => mainIds.includes(n.id)
            ? { ...n, data: { ...n.data, generatedImage: recreatedMain, _orthoTrigger: triggerTimestamp, _orthoToggles: { front: true, back: true, side: true, top: true } } }
            : n),
        );
      }

      setStatus('');
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.toLowerCase().includes('cancel') && !msg.toLowerCase().includes('abort')) {
        setError(msg);
      }
      setStatus('');
    } finally {
      unregisterRequest(session);
      setGenerating(false);
      const cleanupIds = findDownstreamMainViewers(id, getNode, getEdges);
      if (cleanupIds.length > 0) {
        setNodes((nds) => nds.map((n) => cleanupIds.includes(n.id) ? { ...n, data: { ...n.data, generating: false } } : n));
      }
    }
  }, [id, getNode, getEdges, setNodes, doExtract]);

  const isRecreating = generating && status.includes('Recreating');

  return (
    <div className={`char-node ${selected ? 'selected' : ''}`}>
      <div className="char-node-header" style={{ background: '#ffab40', gap: 6 }}>
        <span>Extract Prop Attributes</span>
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
          placeholder="Optional: focus on material details, ignore background elements..."
          rows={2}
          style={{ fontSize: 11, minHeight: 36 }}
        />
        <div style={{ display: 'flex', gap: 4 }}>
          <button className="char-btn primary nodrag" onClick={handleExtract} disabled={generating} style={{ flex: 1 }}>
            {generating && !isRecreating ? 'Extracting\u2026' : 'Extract'}
          </button>
          <button
            className="char-btn nodrag"
            onClick={handleRecreate}
            disabled={generating}
            title="Extract attributes AND recreate the prop as a clean reference — Gemini sees the original image while generating"
            style={{ flex: 1, background: '#e91e63', color: '#fff', fontWeight: 600 }}
          >
            {isRecreating ? 'Recreating\u2026' : 'Extract + Recreate'}
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

export default memo(PropExtractAttrsNodeInner);
