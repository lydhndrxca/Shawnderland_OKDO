"use client";

import { memo, useCallback, useMemo, useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import {
  ATTRIBUTE_GROUPS,
  AGE_OPTIONS,
  RACE_OPTIONS,
  GENDER_OPTIONS,
  BUILD_OPTIONS,
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
import './CharacterNode.css';

interface CharacterNodeProps {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

const SECTION_MAP: Record<string, string[]> = {
  Identity: [],
  Clothing: ['headwear', 'outerwear', 'top', 'legwear', 'footwear'],
  Gear: ['gloves', 'facegear', 'utilityrig', 'backcarry', 'handprop'],
  Style: ['accessories', 'coloraccents', 'detailing', 'pose'],
};

function CharacterNodeInner({ id, selected }: CharacterNodeProps) {
  const { setNodes, getNode, getEdges } = useReactFlow();

  const [panelOpen, setPanelOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [identity, setIdentity] = useState<CharacterIdentity>({ age: '', race: '', gender: '', build: '' });
  const [attributes, setAttributes] = useState<CharacterAttributes>({});
  const [customText, setCustomText] = useState<Record<string, string>>({});
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [viewIdx, setViewIdx] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const attrGroupsByKey = useMemo(() => {
    const map: Record<string, typeof ATTRIBUTE_GROUPS[0]> = {};
    for (const g of ATTRIBUTE_GROUPS) map[g.key] = g;
    return map;
  }, []);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setError(null);
    try {
      const desc = buildCharacterDescription(identity, attributes, description);
      const influenceBlock = resolveNodeInfluences(id, getNode as (id: string) => { id: string; type?: string; data: Record<string, unknown> } | undefined, getEdges as () => { source: string; target: string }[]);
      const fullPrompt = buildCharacterViewPrompt('main', desc) + influenceBlock;
      const result = await generateWithImagen4(fullPrompt, '9:16', 1);
      setImages(result);
      setViewIdx(0);
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, generatedImage: result[0], characterDescription: desc } } : n,
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  }, [identity, attributes, description, id, setNodes, getNode, getEdges]);

  const handleExtract = useCallback(async () => {
    if (!images.length) return;
    setGenerating(true);
    setError(null);
    try {
      const text = await generateText(EXTRACT_ATTRIBUTES_PROMPT, images[viewIdx]);
      const json = JSON.parse(text.replace(/```json?\n?/g, '').replace(/```/g, '').trim());
      if (json.age) setIdentity((prev) => ({ ...prev, age: json.age }));
      if (json.race) setIdentity((prev) => ({ ...prev, race: json.race }));
      if (json.gender) setIdentity((prev) => ({ ...prev, gender: json.gender }));
      if (json.build) setIdentity((prev) => ({ ...prev, build: json.build }));
      const newAttrs: CharacterAttributes = {};
      for (const g of ATTRIBUTE_GROUPS) {
        if (json[g.key]) newAttrs[g.key] = json[g.key];
      }
      setAttributes((prev) => ({ ...prev, ...newAttrs }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  }, [images, viewIdx]);

  const handleRandomize = useCallback(() => {
    const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
    setIdentity({
      age: pick(AGE_OPTIONS),
      race: pick(RACE_OPTIONS),
      gender: pick(GENDER_OPTIONS),
      build: pick(BUILD_OPTIONS),
    });
    const newAttrs: CharacterAttributes = {};
    for (const g of ATTRIBUTE_GROUPS) {
      const pool = Math.random() < 0.7 ? g.common : g.rare;
      newAttrs[g.key] = pick(pool);
    }
    setAttributes(newAttrs);
    setCustomText({});
  }, []);

  const setAttr = useCallback((key: string, val: string) => {
    if (val === '__custom__') return;
    setAttributes((prev) => ({ ...prev, [key]: val }));
  }, []);

  const setCustom = useCallback((key: string, val: string) => {
    setCustomText((prev) => ({ ...prev, [key]: val }));
    setAttributes((prev) => ({ ...prev, [key]: val }));
  }, []);

  return (
    <div className={`character-node ${selected ? 'selected' : ''} ${panelOpen ? 'panel-open' : ''}`}>
      {/* Main Body */}
      <div className="char-main">
        <div className="char-header">
          <span>{name || 'Character'}</span>
          <button
            className="char-expand-btn nodrag"
            onClick={() => setPanelOpen((v) => !v)}
            title={panelOpen ? 'Collapse attributes' : 'Expand attributes'}
          >
            {panelOpen ? '◀' : '▶'}
          </button>
        </div>

        <div className="char-body">
          <div className="char-field">
            <label className="char-field-label">Name</label>
            <input
              className="char-input nodrag"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Character name..."
            />
          </div>

          <div className="char-field">
            <label className="char-field-label">Description</label>
            <textarea
              className="char-textarea nodrag nowheel"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief character concept..."
              rows={2}
            />
          </div>

          <div className="char-btn-row">
            <button
              className="char-btn primary nodrag"
              onClick={(e) => { e.stopPropagation(); handleGenerate(); }}
              disabled={generating}
            >
              {generating ? 'Generating...' : 'Generate'}
            </button>
          </div>

          {generating && <div className="char-progress">Creating character...</div>}
          {error && <div className="char-error">{error}</div>}

          {images.length > 0 && (
            <div className="char-gallery">
              <ImageContextMenu image={images[viewIdx]} alt={name || 'character'}>
                <img
                  src={`data:${images[viewIdx].mimeType};base64,${images[viewIdx].base64}`}
                  alt={name || 'Generated character'}
                  className="char-preview"
                />
              </ImageContextMenu>
              {images.length > 1 && (
                <div className="char-nav">
                  <button
                    className="char-nav-btn nodrag"
                    onClick={(e) => { e.stopPropagation(); setViewIdx((i) => (i - 1 + images.length) % images.length); }}
                  >&lt;</button>
                  <span>{viewIdx + 1}/{images.length}</span>
                  <button
                    className="char-nav-btn nodrag"
                    onClick={(e) => { e.stopPropagation(); setViewIdx((i) => (i + 1) % images.length); }}
                  >&gt;</button>
                </div>
              )}
            </div>
          )}
        </div>

        <Handle type="target" position={Position.Left} id="ref-image" className="char-handle" style={{ background: '#7c4dff' }} />
        <Handle type="source" position={Position.Right} id="image-out" className="char-handle" style={{ background: '#7c4dff' }} />
      </div>

      {/* Side Panel */}
      <div className={`char-panel ${panelOpen ? 'open' : ''}`}>
        <div className="char-panel-inner nodrag nowheel">
          {/* Identity */}
          <div className="char-panel-section">Identity</div>
          {([['Age', 'age', AGE_OPTIONS], ['Race', 'race', RACE_OPTIONS], ['Gender', 'gender', GENDER_OPTIONS], ['Build', 'build', BUILD_OPTIONS]] as const).map(([label, key, opts]) => (
            <div key={key} className="char-panel-field">
              <span className="char-panel-label">{label}</span>
              <select
                className="char-panel-select nodrag"
                value={identity[key]}
                onChange={(e) => setIdentity((prev) => ({ ...prev, [key]: e.target.value }))}
              >
                <option value="">—</option>
                {opts.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          ))}

          {/* Attribute Sections */}
          {Object.entries(SECTION_MAP).filter(([s]) => s !== 'Identity').map(([section, keys]) => (
            <div key={section}>
              <div className="char-panel-section">{section}</div>
              {keys.map((k) => {
                const g = attrGroupsByKey[k];
                if (!g) return null;
                const currentVal = attributes[k] ?? '';
                const allOpts = [...g.common, ...g.rare];
                const isCustom = currentVal && !allOpts.includes(currentVal);
                return (
                  <div key={k} className="char-panel-field">
                    <span className="char-panel-label">{g.label}</span>
                    <select
                      className="char-panel-select nodrag"
                      value={isCustom ? '__custom__' : currentVal}
                      onChange={(e) => setAttr(k, e.target.value)}
                    >
                      <option value="">—</option>
                      <optgroup label="Common">
                        {g.common.map((o) => <option key={o} value={o}>{o}</option>)}
                      </optgroup>
                      <optgroup label="Rare">
                        {g.rare.map((o) => <option key={o} value={o}>{o}</option>)}
                      </optgroup>
                      <option value="__custom__">Custom...</option>
                    </select>
                    {isCustom && (
                      <input
                        className="char-panel-custom nodrag"
                        value={customText[k] ?? currentVal}
                        onChange={(e) => setCustom(k, e.target.value)}
                        placeholder={`Custom ${g.label.toLowerCase()}...`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          ))}

          <button className="char-panel-btn nodrag" onClick={handleRandomize} disabled={generating}>
            Randomize All
          </button>
          <button className="char-panel-btn nodrag" onClick={handleExtract} disabled={generating || !images.length}>
            Extract Attributes
          </button>
        </div>
      </div>
    </div>
  );
}

export default memo(CharacterNodeInner);
