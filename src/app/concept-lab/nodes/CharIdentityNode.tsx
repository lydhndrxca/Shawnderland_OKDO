"use client";

import { memo, useCallback, useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import {
  AGE_OPTIONS,
  RACE_OPTIONS,
  GENDER_OPTIONS,
  BUILD_OPTIONS,
  ATTRIBUTE_GROUPS,
  buildCharacterDescription,
  buildCharacterViewPrompt,
  EXTRACT_ATTRIBUTES_PROMPT,
  type CharacterIdentity,
  type CharacterAttributes,
} from '@/lib/ideation/engine/conceptlab/characterPrompts';
import {
  generateWithImagen4,
  generateText,
  type GeneratedImage,
} from '@/lib/ideation/engine/conceptlab/imageGenApi';
import { resolveNodeInfluences } from '@/lib/ideation/engine/conceptlab/resolveInfluences';
import { ImageContextMenu } from '@/components/ImageContextMenu';
import './ConceptLabNodes.css';

interface CharIdentityNodeProps {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

function getConnectedAttributes(
  nodeId: string,
  getNode: (id: string) => { id: string; type?: string; data: Record<string, unknown> } | undefined,
  getEdges: () => { source: string; target: string; targetHandle?: string }[],
): CharacterAttributes {
  const edges = getEdges();
  const attrEdges = edges.filter((e) => e.target === nodeId && e.targetHandle === 'attr-in');
  for (const e of attrEdges) {
    const src = getNode(e.source);
    if (src?.type === 'charAttributes' && src.data?.attributes) {
      return src.data.attributes as CharacterAttributes;
    }
  }
  return {};
}

function getRefImage(
  nodeId: string,
  getNode: (id: string) => { id: string; type?: string; data: Record<string, unknown> } | undefined,
  getEdges: () => { source: string; target: string; targetHandle?: string }[],
): GeneratedImage | null {
  const edges = getEdges();
  const refEdges = edges.filter((e) => e.target === nodeId && e.targetHandle === 'ref-image');
  for (const e of refEdges) {
    const src = getNode(e.source);
    if (!src?.data) continue;
    const img = src.data.generatedImage as GeneratedImage | undefined;
    if (img?.base64) return img;
    const b64 = src.data.imageBase64 as string | undefined;
    if (b64) return { base64: b64, mimeType: (src.data.mimeType as string) || 'image/png' };
  }
  return null;
}

function CharIdentityNodeInner({ id, data, selected }: CharIdentityNodeProps) {
  const { setNodes, getNode, getEdges } = useReactFlow();

  const [name, setName] = useState((data?.name as string) ?? '');
  const [identity, setIdentity] = useState<CharacterIdentity>({
    age: (data?.identity as CharacterIdentity)?.age ?? '',
    race: (data?.identity as CharacterIdentity)?.race ?? '',
    gender: (data?.identity as CharacterIdentity)?.gender ?? '',
    build: (data?.identity as CharacterIdentity)?.build ?? '',
  });
  const [description, setDescription] = useState((data?.description as string) ?? '');
  const [images, setImages] = useState<GeneratedImage[]>(
    (data?.generatedImages as GeneratedImage[]) ?? [],
  );
  const [viewIdx, setViewIdx] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connectedAttrs = getConnectedAttributes(id, getNode as (id: string) => { id: string; type?: string; data: Record<string, unknown> } | undefined, getEdges as () => { source: string; target: string; targetHandle?: string }[]);
  const localAttrs = (data?.attributes as CharacterAttributes) ?? {};
  const attributes = Object.keys(connectedAttrs).length ? connectedAttrs : localAttrs;
  const refImage = getRefImage(id, getNode as (id: string) => { id: string; type?: string; data: Record<string, unknown> } | undefined, getEdges as () => { source: string; target: string; targetHandle?: string }[]);

  const persistData = useCallback(
    (updates: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...updates } } : n)),
      );
    },
    [id, setNodes],
  );

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setError(null);
    try {
      const desc = buildCharacterDescription(identity, attributes, description);
      const influenceBlock = resolveNodeInfluences(
        id,
        getNode as (id: string) => { id: string; type?: string; data: Record<string, unknown> } | undefined,
        getEdges as () => { source: string; target: string }[],
      );
      const fullPrompt = buildCharacterViewPrompt('main', desc) + influenceBlock;
      const result = await generateWithImagen4(fullPrompt, '9:16', 1);
      setImages(result);
      setViewIdx(0);
      persistData({ generatedImages: result, characterDescription: desc, generatedImage: result[0] });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  }, [identity, attributes, description, id, getNode, getEdges, persistData]);

  const handleQuickGenerate = useCallback(async () => {
    setGenerating(true);
    setError(null);
    try {
      const desc = buildCharacterDescription(identity, attributes, description);
      const influenceBlock = resolveNodeInfluences(
        id,
        getNode as (id: string) => { id: string; type?: string; data: Record<string, unknown> } | undefined,
        getEdges as () => { source: string; target: string }[],
      );
      const fullPrompt = buildCharacterViewPrompt('main', desc) + influenceBlock;
      const result = await generateWithImagen4(fullPrompt, '9:16', 1);
      setImages(result);
      setViewIdx(0);
      persistData({ generatedImages: result, characterDescription: desc, generatedImage: result[0] });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  }, [identity, attributes, description, id, getNode, getEdges, persistData]);

  const handleExtract = useCallback(async () => {
    const img = images[viewIdx] ?? refImage;
    if (!img) return;
    setGenerating(true);
    setError(null);
    try {
      const text = await generateText(EXTRACT_ATTRIBUTES_PROMPT, img);
      const json = JSON.parse(text.replace(/```json?\n?/g, '').replace(/```/g, '').trim());
      const newIdentity = { age: json.age ?? '', race: json.race ?? '', gender: json.gender ?? '', build: json.build ?? '' };
      setIdentity(newIdentity);
      const newAttrs: CharacterAttributes = {};
      for (const g of ATTRIBUTE_GROUPS) {
        if (json[g.key]) newAttrs[g.key] = json[g.key];
      }
      persistData({ identity: newIdentity, attributes: newAttrs });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  }, [images, viewIdx, refImage, persistData]);

  const handleEnhance = useCallback(async () => {
    if (!description.trim()) return;
    setGenerating(true);
    setError(null);
    try {
      const prompt = `Enhance and expand this character description for image generation. Keep the same tone and style. Return ONLY the enhanced description, no preamble:\n\n${description}`;
      const enhanced = await generateText(prompt);
      const v = enhanced.trim();
      setDescription(v);
      persistData({ description: v });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  }, [description, persistData]);

  const handleRandomize = useCallback(() => {
    const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
    const next = { age: pick(AGE_OPTIONS), race: pick(RACE_OPTIONS), gender: pick(GENDER_OPTIONS), build: pick(BUILD_OPTIONS) };
    setIdentity(next);
    persistData({ identity: next });
  }, [persistData]);

  const handleReset = useCallback(() => {
    setName('');
    setIdentity({ age: '', race: '', gender: '', build: '' });
    setDescription('');
    setImages([]);
    setViewIdx(0);
    setError(null);
    persistData({ name: '', identity: {}, description: '', generatedImages: [], characterDescription: undefined, generatedImage: undefined });
  }, [persistData]);

  const currentImage = images[viewIdx];

  return (
    <div className={`cl-node ${selected ? 'selected' : ''}`}>
      <div className="cl-node-header" style={{ background: '#7c4dff' }}>
        Character Identity
      </div>
      <div className="cl-node-body">
        <div className="cl-field">
          <span className="cl-field-label">Name</span>
          <input
            className="cl-input nodrag"
            value={name}
            onChange={(e) => { setName(e.target.value); persistData({ name: e.target.value }); }}
            placeholder="Character name..."
          />
        </div>
        <div className="cl-field">
          <span className="cl-field-label">Age</span>
          <select
            className="cl-select nodrag"
            value={identity.age}
            onChange={(e) => { const v = e.target.value; setIdentity((p) => ({ ...p, age: v })); persistData({ identity: { ...identity, age: v } }); }}
          >
            <option value="">—</option>
            {AGE_OPTIONS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>
        <div className="cl-field">
          <span className="cl-field-label">Race</span>
          <select
            className="cl-select nodrag"
            value={identity.race}
            onChange={(e) => { const v = e.target.value; setIdentity((p) => ({ ...p, race: v })); persistData({ identity: { ...identity, race: v } }); }}
          >
            <option value="">—</option>
            {RACE_OPTIONS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>
        <div className="cl-field">
          <span className="cl-field-label">Gender</span>
          <select
            className="cl-select nodrag"
            value={identity.gender}
            onChange={(e) => { const v = e.target.value; setIdentity((p) => ({ ...p, gender: v })); persistData({ identity: { ...identity, gender: v } }); }}
          >
            <option value="">—</option>
            {GENDER_OPTIONS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>
        <div className="cl-field">
          <span className="cl-field-label">Build</span>
          <select
            className="cl-select nodrag"
            value={identity.build}
            onChange={(e) => { const v = e.target.value; setIdentity((p) => ({ ...p, build: v })); persistData({ identity: { ...identity, build: v } }); }}
          >
            <option value="">—</option>
            {BUILD_OPTIONS.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </div>
        <div className="cl-field">
          <span className="cl-field-label wide">Description</span>
          <textarea
            className="cl-textarea nodrag nowheel"
            value={description}
            onChange={(e) => { const v = e.target.value; setDescription(v); persistData({ description: v }); }}
            placeholder="Brief character concept..."
            rows={3}
          />
        </div>
        <div className="cl-btn-row">
          <button className="cl-btn primary nodrag" onClick={handleGenerate} disabled={generating}>
            {generating ? 'Generating...' : 'Generate'}
          </button>
          <button className="cl-btn nodrag" onClick={handleExtract} disabled={generating || (!images.length && !refImage)}>
            Extract Attributes
          </button>
          <button className="cl-btn nodrag" onClick={handleEnhance} disabled={generating || !description.trim()}>
            Enhance Description
          </button>
          <button className="cl-btn nodrag" onClick={handleRandomize} disabled={generating}>
            Randomize
          </button>
          <button className="cl-btn nodrag" onClick={handleQuickGenerate} disabled={generating}>
            Quick Generate
          </button>
          <button className="cl-btn nodrag" onClick={handleReset} disabled={generating}>
            Reset
          </button>
        </div>
        {generating && <div className="cl-progress">Processing...</div>}
        {error && <div className="cl-error">{error}</div>}
        {currentImage && (
          <>
            <ImageContextMenu image={currentImage} alt={name || 'character'}>
              <img
                src={`data:${currentImage.mimeType};base64,${currentImage.base64}`}
                alt={name || 'Generated character'}
                className="cl-preview"
              />
            </ImageContextMenu>
            {images.length > 1 && (
              <div className="cl-gallery-nav">
                <button className="nodrag" onClick={() => setViewIdx((i) => (i - 1 + images.length) % images.length)}>&lt;</button>
                <span>{viewIdx + 1}/{images.length}</span>
                <button className="nodrag" onClick={() => setViewIdx((i) => (i + 1) % images.length)}>&gt;</button>
              </div>
            )}
          </>
        )}
      </div>
      <Handle type="target" position={Position.Left} id="attr-in" className="cl-handle" style={{ top: '30%' }} />
      <Handle type="target" position={Position.Left} id="ref-image" className="cl-handle" style={{ top: '50%' }} />
      <Handle type="source" position={Position.Right} id="image-out" className="cl-handle" style={{ top: '40%' }} />
      <Handle type="source" position={Position.Right} id="identity-out" className="cl-handle" style={{ top: '60%' }} />
    </div>
  );
}

export default memo(CharIdentityNodeInner);
