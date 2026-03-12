"use client";

import { memo, useCallback, useState } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import {
  WEAPON_COMPONENT_FIELDS,
  MATERIAL_FINISH_OPTIONS,
  CONDITION_OPTIONS,
  buildWeaponPrompt,
  EXTRACT_WEAPON_PROMPT,
  buildEnhancePrompt,
  type WeaponComponents,
} from '@/lib/ideation/engine/conceptlab/weaponPrompts';
import {
  generateWithNanoBanana,
  generateText,
  type GeneratedImage,
} from '@/lib/ideation/engine/conceptlab/imageGenApi';
import { resolveNodeInfluences } from '@/lib/ideation/engine/conceptlab/resolveInfluences';
import { ImageContextMenu } from '@/components/ImageContextMenu';
import './WeaponNode.css';

interface WeaponNodeProps {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

function WeaponNodeInner({ id, selected }: WeaponNodeProps) {
  const { setNodes, getNode, getEdges } = useReactFlow();

  const [panelOpen, setPanelOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [components, setComponents] = useState<WeaponComponents>({});
  const [finish, setFinish] = useState('');
  const [condition, setCondition] = useState('');
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [viewIdx, setViewIdx] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setComp = useCallback((field: string, val: string) => {
    setComponents((prev) => ({ ...prev, [field]: val }));
  }, []);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setError(null);
    try {
      const basePrompt = buildWeaponPrompt(components, description, finish, condition);
      const influenceBlock = resolveNodeInfluences(id, getNode as (id: string) => { id: string; type?: string; data: Record<string, unknown> } | undefined, getEdges as () => { source: string; target: string }[]);
      const fullPrompt = basePrompt + influenceBlock;
      const result = await generateWithNanoBanana(fullPrompt, '16:9', 1);
      setImages(result);
      setViewIdx(0);
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, generatedImage: result[0], weaponDescription: description } } : n,
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  }, [components, description, finish, condition, id, setNodes, getNode, getEdges]);

  const handleExtract = useCallback(async () => {
    if (!images.length) return;
    setGenerating(true);
    setError(null);
    try {
      const text = await generateText(EXTRACT_WEAPON_PROMPT, images[viewIdx]);
      const json = JSON.parse(text.replace(/```json?\n?/g, '').replace(/```/g, '').trim());
      if (json.description) setDescription(json.description);
      const newComps: WeaponComponents = {};
      for (const f of WEAPON_COMPONENT_FIELDS) {
        const key = f.toLowerCase();
        if (json[key]) newComps[f] = json[key];
      }
      setComponents((prev) => ({ ...prev, ...newComps }));
      if (json.materialFinish) setFinish(json.materialFinish);
      if (json.condition) setCondition(json.condition);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  }, [images, viewIdx]);

  const handleEnhance = useCallback(async () => {
    if (!description.trim()) return;
    setGenerating(true);
    setError(null);
    try {
      const prompt = buildEnhancePrompt(description);
      const text = await generateText(prompt);
      const json = JSON.parse(text.replace(/```json?\n?/g, '').replace(/```/g, '').trim());
      if (json.description) setDescription(json.description);
      const newComps: WeaponComponents = {};
      for (const f of WEAPON_COMPONENT_FIELDS) {
        const key = f.toLowerCase();
        if (json[key]) newComps[f] = json[key];
      }
      setComponents((prev) => ({ ...prev, ...newComps }));
      if (json.materialFinish) setFinish(json.materialFinish);
      if (json.condition) setCondition(json.condition);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  }, [description]);

  return (
    <div className={`weapon-node ${selected ? 'selected' : ''} ${panelOpen ? 'panel-open' : ''}`}>
      {/* Main Body */}
      <div className="weap-main">
        <div className="weap-header">
          <span>{name || 'Weapon'}</span>
          <button
            className="weap-expand-btn nodrag"
            onClick={() => setPanelOpen((v) => !v)}
            title={panelOpen ? 'Collapse components' : 'Expand components'}
          >
            {panelOpen ? '◀' : '▶'}
          </button>
        </div>

        <div className="weap-body">
          <div className="weap-field">
            <label className="weap-field-label">Name</label>
            <input
              className="weap-input nodrag"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Weapon name..."
            />
          </div>

          <div className="weap-field">
            <label className="weap-field-label">Description</label>
            <textarea
              className="weap-textarea nodrag nowheel"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Weapon concept description..."
              rows={2}
            />
          </div>

          <div className="weap-btn-row">
            <button
              className="weap-btn primary nodrag"
              onClick={(e) => { e.stopPropagation(); handleGenerate(); }}
              disabled={generating}
            >
              {generating ? 'Generating...' : 'Generate'}
            </button>
            <button
              className="weap-btn nodrag"
              onClick={(e) => { e.stopPropagation(); handleEnhance(); }}
              disabled={generating || !description.trim()}
              title="AI expands your description into a detailed concept"
            >
              Enhance
            </button>
          </div>

          {generating && <div className="weap-progress">Creating weapon...</div>}
          {error && <div className="weap-error">{error}</div>}

          {images.length > 0 && (
            <div className="weap-gallery">
              <ImageContextMenu image={images[viewIdx]} alt={name || 'weapon'}>
                <img
                  src={`data:${images[viewIdx].mimeType};base64,${images[viewIdx].base64}`}
                  alt={name || 'Generated weapon'}
                  className="weap-preview"
                />
              </ImageContextMenu>
              {images.length > 1 && (
                <div className="weap-nav">
                  <button
                    className="weap-nav-btn nodrag"
                    onClick={(e) => { e.stopPropagation(); setViewIdx((i) => (i - 1 + images.length) % images.length); }}
                  >&lt;</button>
                  <span>{viewIdx + 1}/{images.length}</span>
                  <button
                    className="weap-nav-btn nodrag"
                    onClick={(e) => { e.stopPropagation(); setViewIdx((i) => (i + 1) % images.length); }}
                  >&gt;</button>
                </div>
              )}
            </div>
          )}
        </div>

        <Handle type="target" position={Position.Left} id="ref-image" className="weap-handle" style={{ background: '#ff6d00' }} />
        <Handle type="source" position={Position.Right} id="image-out" className="weap-handle" style={{ background: '#ff6d00' }} />
      </div>

      {/* Side Panel */}
      <div className={`weap-panel ${panelOpen ? 'open' : ''}`}>
        <div className="weap-panel-inner nodrag nowheel">
          <div className="weap-panel-section">Components</div>
          {WEAPON_COMPONENT_FIELDS.map((f) => (
            <div key={f} className="weap-panel-field">
              <span className="weap-panel-label">{f}</span>
              <input
                className="weap-panel-input nodrag"
                value={components[f] ?? ''}
                onChange={(e) => setComp(f, e.target.value)}
                placeholder={`${f} description...`}
              />
            </div>
          ))}

          <div className="weap-panel-section">Finish</div>
          <div className="weap-panel-field">
            <span className="weap-panel-label">Material Finish</span>
            <select
              className="weap-panel-select nodrag"
              value={finish}
              onChange={(e) => setFinish(e.target.value)}
            >
              <option value="">—</option>
              {Object.keys(MATERIAL_FINISH_OPTIONS).map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </div>

          <div className="weap-panel-field">
            <span className="weap-panel-label">Condition</span>
            <select
              className="weap-panel-select nodrag"
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
            >
              <option value="">—</option>
              {Object.keys(CONDITION_OPTIONS).map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </div>

          <button className="weap-panel-btn nodrag" onClick={handleExtract} disabled={generating || !images.length}>
            Extract from Image
          </button>
        </div>
      </div>
    </div>
  );
}

export default memo(WeaponNodeInner);
