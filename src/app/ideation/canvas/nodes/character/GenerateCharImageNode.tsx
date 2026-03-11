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
  generateWithImagen4,
  generateWithGeminiRef,
  type GeneratedImage,
} from '@/lib/ideation/engine/conceptlab/imageGenApi';
import { resolveNodeInfluences } from '@/lib/ideation/engine/conceptlab/resolveInfluences';
import { getGlobalSettings } from '@/lib/globalSettings';
import { createProcessingAnimator } from '@/lib/processingAnimation';
import { NODE_TOOLTIPS } from './nodeTooltips';
import './CharacterNodes.css';

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

const MAIN_VIEWER_TYPES = new Set(['charMainViewer', 'charViewer', 'charImageViewer']);

/* ── Text-to-Image model options ── */
interface ImagenModelDef {
  id: string;
  label: string;
  timeEstimate: string;
  supports2K: boolean;
  maxRes: Record<string, string>;
}

const IMAGEN_MODELS: ImagenModelDef[] = [
  {
    id: 'imagen-4.0-generate-001',
    label: 'Imagen 4',
    timeEstimate: '~15-25s',
    supports2K: true,
    maxRes: { '1:1': '2048×2048', '9:16': '1536×2816', '16:9': '2816×1536', '3:4': '1792×2560', '4:3': '2560×1792' },
  },
  {
    id: 'imagen-4.0-ultra-generate-001',
    label: 'Imagen 4 Ultra',
    timeEstimate: '~30-60s',
    supports2K: true,
    maxRes: { '1:1': '2048×2048', '9:16': '1536×2816', '16:9': '2816×1536', '3:4': '1792×2560', '4:3': '2560×1792' },
  },
  {
    id: 'imagen-4.0-fast-generate-001',
    label: 'Imagen 4 Fast',
    timeEstimate: '~5-10s',
    supports2K: false,
    maxRes: { '1:1': '1024×1024', '9:16': '768×1408', '16:9': '1408×768', '3:4': '896×1280', '4:3': '1280×896' },
  },
];

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

  console.log(`[gatherInputs] ${incoming.length} incoming edge(s) to node ${nodeId}`);
  for (const e of incoming) {
    const src = getNode(e.source);
    if (!src?.data) { console.log(`[gatherInputs] edge ${e.id}: source ${e.source} has no data`); continue; }
    const d = src.data as Record<string, unknown>;
    console.log(`[gatherInputs] edge ${e.id}: source type="${src.type}", keys=[${Object.keys(d).join(', ')}]`);

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
      console.log(`[gatherInputs] Style node found — styleText="${(d.styleText as string || '').slice(0, 30)}", styleImages=${imgs ? imgs.length : 'undefined'}, hasBase64=${imgs?.[0]?.base64 ? 'yes(' + imgs[0].base64.length + ')' : 'no'}`);
      if (imgs && imgs.length > 0) styleImages.push(...imgs);
    } else if (src.type === 'charRefCallout') {
      const callout = (d.calloutText as string) || 'incorporate this item';
      const refEdges = edges.filter((re) => re.target === src.id);
      let foundImage: GeneratedImage | null = null;
      for (const re of refEdges) {
        const refSrc = getNode(re.source);
        if (!refSrc?.data) continue;
        const rd = refSrc.data as Record<string, unknown>;
        const rImg = rd.generatedImage as GeneratedImage | undefined;
        if (rImg?.base64) { foundImage = rImg; break; }
        if (rd.imageBase64) { foundImage = { base64: rd.imageBase64 as string, mimeType: (rd.mimeType as string) || 'image/png' }; break; }
      }
      if (foundImage) {
        contentRefs.push({ image: foundImage, callout });
      }
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

  // Extract parallel arrays for backward compat
  const refImages = contentRefs.map((r) => r.image);
  const callouts = contentRefs.map((r) => r.callout);

  return { identity, description, attributes, pose, styleText, styleImages, refImages, callouts, contentRefs, projectName, outputDir };
}

/** Find only main-stage viewer nodes downstream (through gates). */
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

function GenerateCharImageNodeInner({ id, data, selected }: Props) {
  const { setNodes, setEdges, getNode, getEdges } = useReactFlow();
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [hasImage, setHasImage] = useState(!!data?.generatedImage);
  const mountedRef = useRef(true);

  const [selectedModel, setSelectedModel] = useState<string>(
    (data?.selectedModel as string) ?? 'imagen-4.0-generate-001',
  );
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<string>(
    (data?.selectedAspectRatio as string) ?? '9:16',
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const persistSetting = useCallback((updates: Record<string, unknown>) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...updates } } : n,
      ),
    );
  }, [id, setNodes]);

  const currentModelDef = IMAGEN_MODELS.find((m) => m.id === selectedModel) ?? IMAGEN_MODELS[0];
  const currentMaxRes = currentModelDef.maxRes[selectedAspectRatio] ?? 'auto';

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setError(null);
    setProgress('Gathering inputs...');
    const anim = createProcessingAnimator(setNodes, setEdges, getEdges);

    try {
      anim.markNodes([id], true);
      anim.markEdgesFrom(id, true);

      const inputs = gatherInputs(id, getNode, getEdges);
      const { identity, attributes, styleText, styleImages, contentRefs, projectName, outputDir } = inputs;
      let { description, pose } = inputs;

      const refImages = contentRefs.map((r) => r.image);
      const callouts = contentRefs.map((r) => r.callout);

      console.log(`[GenerateCharImage] Inputs — style imgs: ${styleImages.length}, content refs: ${contentRefs.length} [${callouts.join('; ')}], styleText: "${styleText.slice(0, 50)}", desc: ${description.length} chars`);
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

      const genMode = styleImages.length > 0
        ? `Gemini + ${styleImages.length} style ref${contentRefs.length > 0 ? ` + ${contentRefs.length} content ref` : ''}`
        : contentRefs.length > 0
          ? `Gemini + ${contentRefs.length} content ref`
          : `${currentModelDef.label}, ${selectedAspectRatio}, ${currentMaxRes}`;
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

      // Helper: classify callout intent for more explicit AI instructions
      function calloutVerb(text: string): string {
        const t = text.toLowerCase();
        if (t.includes('hold') || t.includes('carry') || t.includes('grip')) return 'be holding';
        if (t.includes('wear') || t.includes('put on') || t.includes('dress')) return 'be wearing';
        if (t.includes('ride') || t.includes('sit on') || t.includes('mount')) return 'be riding/sitting on';
        if (t.includes('stand on') || t.includes('stand in')) return 'be standing on/in';
        return 'have';
      }

      let result: GeneratedImage[];
      if (styleImages.length > 0 || contentRefs.length > 0) {
        const allRefImages = [...styleImages, ...refImages];
        const styleDesc = styleText ? `The user describes the target style as: "${styleText}". Use this description to further guide your style analysis. ` : '';

        // Build image layout with precise numbering
        const imageLines: string[] = [];
        styleImages.forEach((_, i) => {
          imageLines.push(`• Image ${i + 1}: STYLE REFERENCE — extract ONLY the art style. Do NOT copy characters, objects, or scene from this image.`);
        });
        contentRefs.forEach((ref, i) => {
          const imgIdx = styleImages.length + i + 1;
          imageLines.push(`• Image ${imgIdx}: CONTENT REFERENCE — "${ref.callout}" — The character MUST ${calloutVerb(ref.callout)} the specific item/object shown in this image.`);
        });
        const imageIndexing = `IMAGE LAYOUT — I am providing ${allRefImages.length} image(s) in this order:\n${imageLines.join('\n')}`;

        // Build mandatory content reference instructions
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
        result = await generateWithGeminiRef(prompt, allRefImages);
      } else {
        result = await generateWithImagen4(fullPrompt, selectedAspectRatio, 1, selectedModel);
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
                aspectRatio: selectedAspectRatio,
              },
            };
          }
          return n;
        }),
      );

      autoSaveImage(mainImage, 'main_stage', projectName, outputDir || undefined)
        .then((r) => { if (!r.ok) console.warn('[auto-save]', r.error); });

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
  }, [id, getNode, getEdges, setNodes, setEdges, selectedModel, selectedAspectRatio, currentModelDef, currentMaxRes]);

  return (
    <div className={`char-node ${selected ? 'selected' : ''} ${generating ? 'char-node-processing' : ''}`}
      title={NODE_TOOLTIPS.charGenerate}>
      <div className="char-node-header" style={{ background: '#e91e63' }}>
        Generate Character Image
      </div>
      <div className="char-node-body">
        {/* ── Model Selector ── */}
        <div style={{ marginBottom: 6 }}>
          <label style={{ fontSize: 10, color: '#aaa', display: 'block', marginBottom: 2 }}>Model</label>
          <select
            className="nodrag nowheel"
            value={selectedModel}
            onChange={(e) => { setSelectedModel(e.target.value); persistSetting({ selectedModel: e.target.value }); }}
            disabled={generating}
            style={{
              width: '100%',
              padding: '5px 6px',
              fontSize: 11,
              background: '#1a1a2e',
              color: '#eee',
              border: '1px solid #444',
              borderRadius: 4,
            }}
          >
            {IMAGEN_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label} — {m.maxRes[selectedAspectRatio] ?? 'auto'} — {m.timeEstimate}
              </option>
            ))}
          </select>
        </div>

        {/* ── Aspect Ratio ── */}
        <div style={{ marginBottom: 6 }}>
          <label style={{ fontSize: 10, color: '#aaa', display: 'block', marginBottom: 2 }}>Aspect Ratio</label>
          <select
            className="nodrag nowheel"
            value={selectedAspectRatio}
            onChange={(e) => { setSelectedAspectRatio(e.target.value); persistSetting({ selectedAspectRatio: e.target.value }); }}
            disabled={generating}
            style={{
              width: '100%',
              padding: '5px 6px',
              fontSize: 11,
              background: '#1a1a2e',
              color: '#eee',
              border: '1px solid #444',
              borderRadius: 4,
            }}
          >
            {ASPECT_RATIOS.map((ar) => (
              <option key={ar.value} value={ar.value}>
                {ar.label}
              </option>
            ))}
          </select>
        </div>

        {/* ── Max Resolution Info ── */}
        <div style={{ fontSize: 9, color: '#888', marginBottom: 8, textAlign: 'center' }}>
          Output: {currentMaxRes}{currentModelDef.supports2K ? ' (2K mode)' : ''}
        </div>

        <button type="button" className="char-btn primary nodrag" onClick={handleGenerate} disabled={generating}>
          {generating ? 'Generating...' : 'Generate Character Image'}
        </button>
        {generating && <div className="char-progress">{progress || 'Creating character...'}</div>}
        {error && <div className="char-error">{error}</div>}
        {hasImage && !generating && (
          <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center' }}>
            Image sent to Main Stage — ortho views auto-generate
          </div>
        )}
      </div>

      <Handle type="target" position={Position.Left} id="input" className="char-handle" style={{ top: '50%' }} />
      <Handle type="source" position={Position.Right} id="image-out" className="char-handle" style={{ top: '50%' }} />
    </div>
  );
}

export default memo(GenerateCharImageNodeInner);
