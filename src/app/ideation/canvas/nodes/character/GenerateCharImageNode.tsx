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
  const refImages: GeneratedImage[] = [];
  const callouts: string[] = [];
  let projectName = '';
  let outputDir = '';

  for (const e of incoming) {
    const src = getNode(e.source);
    if (!src?.data) continue;
    const d = src.data as Record<string, unknown>;

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
      if (imgs) styleImages.push(...imgs);
    } else if (src.type === 'charRefCallout') {
      if (d.calloutText) callouts.push(d.calloutText as string);
      const img = d.generatedImage as GeneratedImage | undefined;
      if (img?.base64) refImages.push(img);
      else if (d.imageBase64) refImages.push({ base64: d.imageBase64 as string, mimeType: (d.mimeType as string) || 'image/png' });
    } else if (src.type === 'charProject') {
      if (d.projectName) projectName = d.projectName as string;
      if (d.outputDir) outputDir = d.outputDir as string;
    } else {
      const img = d.generatedImage as GeneratedImage | undefined;
      if (img?.base64) refImages.push(img);
      else if (d.imageBase64) refImages.push({ base64: d.imageBase64 as string, mimeType: (d.mimeType as string) || 'image/png' });
      if (d.calloutText) callouts.push(d.calloutText as string);
    }
  }

  return { identity, description, attributes, pose, styleText, styleImages, refImages, callouts, projectName, outputDir };
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
  const [images, setImages] = useState<GeneratedImage[]>(
    (data?.generatedImages as GeneratedImage[]) ?? [],
  );
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);
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
      const { identity, attributes, styleText, styleImages, callouts, projectName, outputDir } = inputs;
      let { description, pose } = inputs;

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
      if (styleText) fullPrompt += `\n\n[STYLE OVERRIDE]\n${styleText}`;
      if (callouts.length > 0) fullPrompt += '\n\nReference image callouts:\n' + callouts.join('\n');

      setProgress(`Generating main image (${currentModelDef.label}, ${selectedAspectRatio}, ${currentMaxRes})...`);
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, generating: true } } : n)),
      );

      let result: GeneratedImage[];
      if (styleImages.length > 0) {
        const stylePrompt = fullPrompt + '\n\nMatch the visual style of the provided reference image(s) as closely as possible.';
        result = await generateWithGeminiRef(stylePrompt, styleImages[0]);
      } else {
        result = await generateWithImagen4(fullPrompt, selectedAspectRatio, 1, selectedModel);
      }
      const mainImage = result[0];
      setImages(result);

      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === id) {
            return {
              ...n,
              data: {
                ...n.data,
                generatedImages: result,
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
        .then((r) => { if (!r.ok) console.warn('[auto-save] main image:', r.error); });

      // Push main image ONLY to main-stage viewers.
      // Front/back/side/custom CharViewNodes auto-generate their own perspectives
      // when they detect the Main Stage image change (concurrent, independent).
      const mainViewerIds = findDownstreamMainViewers(id, getNode, getEdges);
      if (mainViewerIds.length > 0) {
        anim.markNodes(mainViewerIds, true);
        for (const vid of mainViewerIds) anim.markEdgesTo(vid, true);
        setNodes((nds) =>
          nds.map((n) =>
            mainViewerIds.includes(n.id)
              ? { ...n, data: { ...n.data, generatedImage: mainImage } }
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
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, generating: false } } : n)),
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
        {images.length > 0 && !generating && (
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
