export const PRESET_KEY = 'okdo-model-settings-preset';

export interface ModelDef {
  id: string;
  apiId: string;
  label: string;
  timeEstimate: string;
  maxRes: Record<string, string>;
  note: string;
}

export const IMAGE_GEN_MODELS: ModelDef[] = [
  {
    id: 'nb2',
    apiId: 'gemini-3.1-flash-image-preview',
    label: 'Nano Banana 2',
    timeEstimate: '~20-45s',
    maxRes: { '1:1': '2048×2048', '9:16': '3072×5504', '16:9': '5504×3072', '3:4': '2720×3632', '4:3': '3632×2720' },
    note: 'Max res, best prompt following',
  },
  {
    id: 'nb-pro',
    apiId: 'gemini-3-pro-image-preview',
    label: 'Nano Banana Pro',
    timeEstimate: '~40-90s',
    maxRes: { '1:1': '2048×2048', '9:16': '3072×5504', '16:9': '5504×3072', '3:4': '2720×3632', '4:3': '3632×2720' },
    note: 'Max res pro quality, slower but highest fidelity',
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

export const MULTIMODAL_MODELS: ModelDef[] = [
  {
    id: 'nb2-mm',
    apiId: 'gemini-flash-image',
    label: 'Nano Banana 2 (Gemini 3.1 Flash)',
    timeEstimate: '~25-60s',
    maxRes: { '1:1': '2048×2048', '9:16': '3072×5504', '16:9': '5504×3072', '3:4': '2720×3632', '4:3': '3632×2720' },
    note: 'Max res multimodal, best prompt following, fast ortho views & edits',
  },
  {
    id: 'nb-pro-mm',
    apiId: 'gemini-3-pro',
    label: 'Nano Banana Pro (Gemini 3 Pro)',
    timeEstimate: '~45-120s',
    maxRes: { '1:1': '2048×2048', '9:16': '3072×5504', '16:9': '5504×3072', '3:4': '2720×3632', '4:3': '3632×2720' },
    note: 'Max res pro, highest reference fidelity, supports 14 ref images',
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

/**
 * Maps text-only image gen API IDs to the corresponding multimodal API ID
 * so the main stage can use the correct resolution tier when refs force multimodal.
 */
export const IMG_TO_MULTIMODAL_API: Record<string, string> = {
  'gemini-3.1-flash-image-preview': 'gemini-flash-image',
  'gemini-3-pro-image-preview': 'gemini-3-pro',
  'imagen-4.0-generate-001': 'gemini-flash-image',
  'imagen-4.0-ultra-generate-001': 'gemini-3-pro',
  'imagen-4.0-fast-generate-001': 'gemini-2.5-flash',
};

export interface PresetData {
  imageGenModelId: string;
  multimodalModelId: string;
  aspectRatio: string;
}

export function loadPreset(): PresetData | null {
  try {
    const raw = localStorage.getItem(PRESET_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PresetData;
  } catch { return null; }
}

export function savePreset(data: PresetData) {
  try { localStorage.setItem(PRESET_KEY, JSON.stringify(data)); } catch { /* quota */ }
}

export const ASPECT_RATIOS = [
  { value: '9:16', label: 'Portrait 9:16' },
  { value: '1:1', label: 'Square 1:1' },
  { value: '16:9', label: 'Landscape 16:9' },
  { value: '3:4', label: 'Portrait 3:4' },
  { value: '4:3', label: 'Landscape 4:3' },
];
