"use client";

import { memo, useCallback, useState, useEffect } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { NODE_TOOLTIPS } from './nodeTooltips';
import './CharacterNodes.css';

const PRESET_KEY = 'okdo-model-settings-preset';

interface ModelDef {
  id: string;
  apiId: string;
  label: string;
  timeEstimate: string;
  maxRes: Record<string, string>;
  note: string;
}

const IMAGE_GEN_MODELS: ModelDef[] = [
  {
    id: 'nb2',
    apiId: 'gemini-3.1-flash-image-preview',
    label: 'Nano Banana 2',
    timeEstimate: '~20-45s',
    maxRes: { '1:1': '2048×2048', '9:16': '2304×4096', '16:9': '4096×2304', '3:4': '2048×2720', '4:3': '2720×2048' },
    note: '4K multimodal, best prompt following',
  },
  {
    id: 'nb-pro',
    apiId: 'gemini-3-pro-image-preview',
    label: 'Nano Banana Pro',
    timeEstimate: '~40-90s',
    maxRes: { '1:1': '2048×2048', '9:16': '2304×4096', '16:9': '4096×2304', '3:4': '2048×2720', '4:3': '2720×2048' },
    note: '4K pro quality, slower but highest fidelity',
  },
  {
    id: 'imagen4',
    apiId: 'imagen-4.0-generate-001',
    label: 'Imagen 4',
    timeEstimate: '~15-30s',
    maxRes: { '1:1': '2048×2048', '9:16': '1536×2816', '16:9': '2816×1536', '3:4': '1792×2560', '4:3': '2560×1792' },
    note: '2K photorealistic, dedicated image model',
  },
  {
    id: 'imagen4-ultra',
    apiId: 'imagen-4.0-ultra-generate-001',
    label: 'Imagen 4 Ultra',
    timeEstimate: '~45-120s',
    maxRes: { '1:1': '2048×2048', '9:16': '1536×2816', '16:9': '2816×1536', '3:4': '1792×2560', '4:3': '2560×1792' },
    note: '2K ultra quality, maximum Imagen fidelity',
  },
  {
    id: 'imagen4-fast',
    apiId: 'imagen-4.0-fast-generate-001',
    label: 'Imagen 4 Fast',
    timeEstimate: '~5-12s',
    maxRes: { '1:1': '1024×1024', '9:16': '768×1408', '16:9': '1408×768', '3:4': '896×1280', '4:3': '1280×896' },
    note: '1K fast iteration, lower res',
  },
];

const MULTIMODAL_MODELS: ModelDef[] = [
  {
    id: 'nb2-mm',
    apiId: 'gemini-flash-image',
    label: 'Nano Banana 2 (Gemini 3.1 Flash)',
    timeEstimate: '~25-60s',
    maxRes: { '1:1': '2048×2048', '9:16': '2304×4096', '16:9': '4096×2304', '3:4': '2048×2720', '4:3': '2720×2048' },
    note: '4K, best prompt following, fast ortho views & edits',
  },
  {
    id: 'nb-pro-mm',
    apiId: 'gemini-3-pro',
    label: 'Nano Banana Pro (Gemini 3 Pro)',
    timeEstimate: '~45-120s',
    maxRes: { '1:1': '2048×2048', '9:16': '2304×4096', '16:9': '4096×2304', '3:4': '2048×2720', '4:3': '2720×2048' },
    note: '4K pro, highest reference fidelity, supports 14 ref images',
  },
  {
    id: 'gemini-2.5-flash-mm',
    apiId: 'gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    timeEstimate: '~15-30s',
    maxRes: { '1:1': '1024×1024', '9:16': '768×1408', '16:9': '1408×768', '3:4': '896×1280', '4:3': '1280×896' },
    note: '1K, fast multimodal with strong reasoning, good balance',
  },
];

interface PresetData {
  imageGenModelId: string;
  multimodalModelId: string;
  aspectRatio: string;
}

function loadPreset(): PresetData | null {
  try {
    const raw = localStorage.getItem(PRESET_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PresetData;
  } catch { return null; }
}

function savePreset(data: PresetData) {
  localStorage.setItem(PRESET_KEY, JSON.stringify(data));
}

const ASPECT_RATIOS = [
  { value: '9:16', label: 'Portrait 9:16' },
  { value: '1:1', label: 'Square 1:1' },
  { value: '16:9', label: 'Landscape 16:9' },
  { value: '3:4', label: 'Portrait 3:4' },
  { value: '4:3', label: 'Landscape 4:3' },
];

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
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

function ModelSettingsNodeInner({ id, data, selected }: Props) {
  const { setNodes } = useReactFlow();

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
  const [saved, setSaved] = useState(false);

  const imgDef = IMAGE_GEN_MODELS.find((m) => m.id === imageGenModel) ?? IMAGE_GEN_MODELS[0];
  const mmDef = MULTIMODAL_MODELS.find((m) => m.id === multimodalModel) ?? MULTIMODAL_MODELS[0];

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
    });
  }, [imageGenModel, multimodalModel, aspectRatio, imgDef.apiId, mmDef.apiId, persist]);

  const handleSavePreset = useCallback(() => {
    savePreset({
      imageGenModelId: imageGenModel,
      multimodalModelId: multimodalModel,
      aspectRatio,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [imageGenModel, multimodalModel, aspectRatio]);

  return (
    <div className={`char-node ${selected ? 'selected' : ''}`} title={NODE_TOOLTIPS.charModelSettings ?? 'Model Settings'}>
      <div className="char-node-header" style={{ background: '#7c4dff' }}>
        Model Settings
      </div>
      <div className="char-node-body" style={{ gap: 10 }}>

        {/* Image Generation Model */}
        <div>
          <label style={{ fontSize: 10, color: '#aaa', display: 'block', marginBottom: 3, fontWeight: 600 }}>
            Image Generation Model
          </label>
          <span style={{ fontSize: 8, color: '#666', display: 'block', marginBottom: 3 }}>
            Used for main stage character generation (text-to-image)
          </span>
          <select
            className="nodrag nowheel"
            value={imageGenModel}
            onChange={(e) => setImageGenModel(e.target.value)}
            style={selectStyle}
          >
            {IMAGE_GEN_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label} — {m.maxRes[aspectRatio] ?? 'auto'} — {m.timeEstimate}
              </option>
            ))}
          </select>
          <div style={{ fontSize: 9, color: '#888', marginTop: 3, lineHeight: 1.4 }}>
            {imgDef.note}
          </div>
        </div>

        {/* Multimodal Model */}
        <div>
          <label style={{ fontSize: 10, color: '#aaa', display: 'block', marginBottom: 3, fontWeight: 600 }}>
            Multimodal Model
          </label>
          <span style={{ fontSize: 8, color: '#666', display: 'block', marginBottom: 3 }}>
            Used for ortho views, edits, and reference-based generation
          </span>
          <select
            className="nodrag nowheel"
            value={multimodalModel}
            onChange={(e) => setMultimodalModel(e.target.value)}
            style={selectStyle}
          >
            {MULTIMODAL_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label} — {m.maxRes[aspectRatio] ?? 'auto'} — {m.timeEstimate}
              </option>
            ))}
          </select>
          <div style={{ fontSize: 9, color: '#888', marginTop: 3, lineHeight: 1.4 }}>
            {mmDef.note}
          </div>
        </div>

        {/* Aspect Ratio */}
        <div>
          <label style={{ fontSize: 10, color: '#aaa', display: 'block', marginBottom: 3, fontWeight: 600 }}>
            Aspect Ratio
          </label>
          <select
            className="nodrag nowheel"
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value)}
            style={selectStyle}
          >
            {ASPECT_RATIOS.map((ar) => (
              <option key={ar.value} value={ar.value}>
                {ar.label}
              </option>
            ))}
          </select>
        </div>

        {/* Output Summary */}
        <div style={{
          background: 'rgba(124, 77, 255, 0.08)',
          border: '1px solid rgba(124, 77, 255, 0.2)',
          borderRadius: 6,
          padding: '8px 10px',
          fontSize: 10,
          lineHeight: 1.6,
        }}>
          <div style={{ fontWeight: 700, color: '#b388ff', marginBottom: 4 }}>Output Summary</div>
          <div style={{ color: '#ccc' }}>
            <span style={{ color: '#888' }}>New Image:</span> {imgDef.label}
          </div>
          <div style={{ color: '#ccc' }}>
            <span style={{ color: '#888' }}>Edit &amp; Ref:</span> {mmDef.label}
          </div>
          <div style={{ color: '#ccc' }}>
            <span style={{ color: '#888' }}>Aspect:</span> {aspectRatio}
          </div>
        </div>

        {/* Save Preset */}
        <button
          type="button"
          className="char-btn nodrag"
          onClick={handleSavePreset}
          style={{
            width: '100%',
            background: saved ? 'rgba(105, 240, 174, 0.15)' : 'rgba(124, 77, 255, 0.15)',
            border: saved ? '1px solid rgba(105, 240, 174, 0.4)' : '1px solid rgba(124, 77, 255, 0.4)',
            color: saved ? '#69f0ae' : '#b388ff',
            fontWeight: 700,
            transition: 'all 0.2s',
          }}
        >
          {saved ? '✓ Saved as Default' : 'Save as Default Preset'}
        </button>
        <div style={{ fontSize: 8, color: '#666', textAlign: 'center', lineHeight: 1.3 }}>
          Persists across page refreshes. Connect this node to Generate Character Image to override its model settings.
        </div>
      </div>

      <Handle type="source" position={Position.Right} id="settings-out" className="char-handle" style={{ top: '50%' }} />
    </div>
  );
}

export { IMAGE_GEN_MODELS, MULTIMODAL_MODELS, PRESET_KEY, loadPreset };
export type { ModelDef, PresetData };
export default memo(ModelSettingsNodeInner);
