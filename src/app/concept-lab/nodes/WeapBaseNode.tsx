"use client";

import { memo, useCallback, useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import {
  WEAPON_COMPONENT_FIELDS,
  buildWeaponPrompt,
  EXTRACT_WEAPON_PROMPT,
  buildEnhancePrompt,
  type WeaponComponents,
} from '@/lib/ideation/engine/conceptlab/weaponPrompts';
import {
  generateWithImagen4,
  generateWithGeminiRef,
  generateText,
  type GeneratedImage,
} from '@/lib/ideation/engine/conceptlab/imageGenApi';
import { resolveNodeInfluences } from '@/lib/ideation/engine/conceptlab/resolveInfluences';
import { ImageContextMenu } from '@/components/ImageContextMenu';
import './ConceptLabNodes.css';

interface WeapBaseNodeProps {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

function parseJsonFromText(text: string): Record<string, unknown> {
  const cleaned = text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
  return JSON.parse(cleaned) as Record<string, unknown>;
}

function WeapBaseNodeInner({ id, data, selected }: WeapBaseNodeProps) {
  const { setNodes, getNode, getEdges } = useReactFlow();

  const [editInstructions, setEditInstructions] = useState(
    (data.editInstructions as string) ?? '',
  );
  const [description, setDescription] = useState(
    (data.description as string) ?? '',
  );
  const [images, setImages] = useState<GeneratedImage[]>(
    (data.generatedImages as GeneratedImage[]) ?? [],
  );
  const [viewIdx, setViewIdx] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const persistData = useCallback(
    (updates: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, ...updates } } : n,
        ),
      );
    },
    [id, setNodes],
  );

  const getConnectedComponents = useCallback((): {
    components: WeaponComponents;
    finish: string;
    condition: string;
  } => {
    const edges = getEdges() as Array<{ target: string; targetHandle?: string; source: string }>;
    const compEdge = edges.find(
      (e) => e.target === id && e.targetHandle === 'comp-in',
    );
    if (!compEdge) return { components: {}, finish: '', condition: '' };
    const src = getNode(compEdge.source);
    const d = (src?.data ?? {}) as Record<string, unknown>;
    const components = (d.components as WeaponComponents) ?? {};
    const finish = String(d.materialFinish ?? d.finish ?? '');
    const finishCustom = String(d.materialFinishCustom ?? '');
    const condition = String(d.condition ?? '');
    const conditionCustom = String(d.conditionCustom ?? '');
    return {
      components,
      finish: finishCustom.trim() || finish,
      condition: conditionCustom.trim() || condition,
    };
  }, [id, getNode, getEdges]);

  const getRefImage = useCallback((): GeneratedImage | null => {
    const edges = getEdges() as Array<{ target: string; targetHandle?: string; source: string }>;
    const refEdge = edges.find(
      (e) => e.target === id && e.targetHandle === 'ref-image',
    );
    if (!refEdge) return null;
    const src = getNode(refEdge.source);
    const d = (src?.data ?? {}) as Record<string, unknown>;
    const gen = d.generatedImage as { base64?: string; mimeType?: string } | undefined;
    if (gen?.base64 && gen?.mimeType)
      return { base64: gen.base64, mimeType: gen.mimeType };
    const b64 = d.imageBase64 as string | undefined;
    const mime = d.mimeType as string | undefined;
    if (b64 && mime) return { base64: b64, mimeType: mime };
    const imgs = d.generatedImages as GeneratedImage[] | undefined;
    if (imgs?.length) return imgs[0];
    return null;
  }, [id, getNode, getEdges]);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setError(null);
    try {
      const { components, finish, condition } = getConnectedComponents();
      const basePrompt = buildWeaponPrompt(
        components,
        [editInstructions, description].filter(Boolean).join('\n\n'),
        finish,
        condition,
      );
      const influenceBlock = resolveNodeInfluences(
        id,
        getNode as (nid: string) => { id: string; type?: string; data: Record<string, unknown> } | undefined,
        getEdges as () => Array<{ source: string; target: string }>,
      );
      const fullPrompt = basePrompt + influenceBlock;

      const refImg = getRefImage();
      const result = refImg
        ? await generateWithGeminiRef(fullPrompt, refImg)
        : await generateWithImagen4(fullPrompt, '16:9', 1);

      setImages(result);
      setViewIdx(0);
      persistData({
        generatedImages: result,
        description,
        editInstructions,
        generatedImage: result[0],
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  }, [
    id,
    editInstructions,
    description,
    getConnectedComponents,
    getRefImage,
    getNode,
    getEdges,
    persistData,
  ]);

  const handleQuickGenerate = useCallback(async () => {
    setGenerating(true);
    setError(null);
    try {
      const randomPrompt =
        'A unique, creative firearm design with distinctive character. Photorealistic weapon render, soft studio lighting, neutral grey background. No text or watermarks. 16:9 aspect ratio.';
      const influenceBlock = resolveNodeInfluences(
        id,
        getNode as (nid: string) => { id: string; type?: string; data: Record<string, unknown> } | undefined,
        getEdges as () => Array<{ source: string; target: string }>,
      );
      const result = await generateWithImagen4(
        randomPrompt + influenceBlock,
        '16:9',
        1,
      );
      setImages(result);
      setViewIdx(0);
      persistData({ generatedImages: result, generatedImage: result[0] });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  }, [id, getNode, getEdges, persistData]);

  const handleExtract = useCallback(async () => {
    if (!images.length) return;
    setGenerating(true);
    setError(null);
    try {
      const text = await generateText(EXTRACT_WEAPON_PROMPT, images[viewIdx]);
      const json = parseJsonFromText(text);
      if (json.description) {
        setDescription(String(json.description));
        persistData({ description: String(json.description) });
      }
      const newComps: WeaponComponents = {};
      for (const f of WEAPON_COMPONENT_FIELDS) {
        const key = f.toLowerCase();
        if (json[key]) newComps[f] = String(json[key]);
      }
      const edges = getEdges() as Array<{ target: string; targetHandle?: string; source: string }>;
      const compEdge = edges.find(
        (e) => e.target === id && e.targetHandle === 'comp-in',
      );
      if (compEdge) {
        setNodes((nds) =>
          nds.map((n) =>
            n.id === compEdge.source
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    components: newComps,
                    materialFinish: json.materialFinish,
                    condition: json.condition,
                  },
                }
              : n,
          ),
        );
      } else {
        persistData({
          components: newComps,
          materialFinish: json.materialFinish,
          condition: json.condition,
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  }, [images, viewIdx, id, getEdges, setNodes, persistData]);

  const handleEnhance = useCallback(async () => {
    const desc = description.trim() || editInstructions.trim();
    if (!desc) return;
    setGenerating(true);
    setError(null);
    try {
      const text = await generateText(buildEnhancePrompt(desc));
      const json = parseJsonFromText(text);
      if (json.description) setDescription(String(json.description));
      const newComps: WeaponComponents = {};
      for (const f of WEAPON_COMPONENT_FIELDS) {
        const key = f.toLowerCase();
        if (json[key]) newComps[f] = String(json[key]);
      }
      persistData({
        components: newComps,
        materialFinish: json.materialFinish,
        condition: json.condition,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  }, [description, editInstructions, persistData]);

  const handleReset = useCallback(() => {
    setEditInstructions('');
    setDescription('');
    setImages([]);
    setViewIdx(0);
    setError(null);
    persistData({
      editInstructions: '',
      description: '',
      generatedImages: [],
      generatedImage: undefined,
    });
  }, [persistData]);

  return (
    <div className={`cl-node ${selected ? 'selected' : ''}`}>
      <div
        className="cl-node-header"
        style={{ background: '#ff6d00' }}
      >
        Weapon Generator
      </div>
      <div className="cl-node-body">
        <div className="cl-field" style={{ alignItems: 'flex-start' }}>
          <label className="cl-field-label wide">Edit Instructions</label>
          <div style={{ flex: 1, minWidth: 0 }}>
            <textarea
              className="cl-textarea nodrag nowheel"
              rows={4}
            value={editInstructions}
            onChange={(e) => {
              setEditInstructions(e.target.value);
              persistData({ editInstructions: e.target.value });
            }}
            placeholder="Additional instructions for generation..."
            />
          </div>
        </div>
        <div className="cl-field" style={{ alignItems: 'flex-start' }}>
          <label className="cl-field-label wide">Description</label>
          <div style={{ flex: 1, minWidth: 0 }}>
          <textarea
            className="cl-textarea nodrag nowheel"
            rows={2}
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              persistData({ description: e.target.value });
            }}
            placeholder="Weapon concept / description..."
            />
          </div>
        </div>
        <div className="cl-btn-row">
          <button
            className="cl-btn primary nodrag"
            onClick={(e) => {
              e.stopPropagation();
              handleGenerate();
            }}
            disabled={generating}
          >
            {generating ? 'Generating...' : 'Generate'}
          </button>
          <button
            className="cl-btn nodrag"
            onClick={(e) => {
              e.stopPropagation();
              handleExtract();
            }}
            disabled={generating || !images.length}
          >
            Extract Attributes
          </button>
          <button
            className="cl-btn nodrag"
            onClick={(e) => {
              e.stopPropagation();
              handleEnhance();
            }}
            disabled={generating}
          >
            Enhance Description
          </button>
          <button
            className="cl-btn nodrag"
            onClick={(e) => {
              e.stopPropagation();
              handleQuickGenerate();
            }}
            disabled={generating}
          >
            Quick Generate
          </button>
          <button
            className="cl-btn nodrag"
            onClick={(e) => {
              e.stopPropagation();
              handleReset();
            }}
          >
            Reset
          </button>
        </div>
        {generating && <div className="cl-progress">Creating weapon...</div>}
        {error && <div className="cl-error">{error}</div>}
        {images.length > 0 && (
          <>
            <ImageContextMenu
              image={images[viewIdx]}
              alt="weapon"
            >
              <img
                src={`data:${images[viewIdx].mimeType};base64,${images[viewIdx].base64}`}
                alt="Generated weapon"
                className="cl-preview"
              />
            </ImageContextMenu>
            <div className="cl-gallery-nav">
              <button
                className="nodrag"
                onClick={(e) => {
                  e.stopPropagation();
                  setViewIdx((i) => (i - 1 + images.length) % images.length);
                }}
              >
                &lt;
              </button>
              <span>
                {viewIdx + 1}/{images.length}
              </span>
              <button
                className="nodrag"
                onClick={(e) => {
                  e.stopPropagation();
                  setViewIdx((i) => (i + 1) % images.length);
                }}
              >
                &gt;
              </button>
            </div>
          </>
        )}
      </div>
      <Handle
        type="target"
        position={Position.Left}
        id="comp-in"
        className="cl-handle"
        style={{ top: '40%' }}
      />
      <Handle
        type="target"
        position={Position.Left}
        id="ref-image"
        className="cl-handle"
        style={{ top: '60%' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="image-out"
        className="cl-handle"
      />
    </div>
  );
}

export default memo(WeapBaseNodeInner);
