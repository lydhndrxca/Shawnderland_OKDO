import type { ApiBackend } from '@/lib/ideation/engine/apiConfig';
export type { ApiBackend };

export interface ModelOption {
  id: string;
  modelId: string;
  label: string;
  description: string;
  comparison: string;
  tags: string[];
  type: 'image' | 'video' | 'text';
  endpoint: 'imagen' | 'gemini-image' | 'veo' | 'gemini-text';
  backends?: ApiBackend[];
  /** ISO date string used for newest-first sorting in UI selectors */
  releaseDate?: string;
}

export const IMAGE_MODELS: ModelOption[] = [
  {
    id: 'nano-banana-2',
    modelId: 'gemini-3.1-flash-image-preview',
    label: 'Nano Banana 2',
    description: 'Latest multimodal image model. 4K output, thinks before generating, excellent prompt following.',
    comparison: 'Best overall — understands complex prompts, generates photorealistic images with correct framing.',
    tags: ['Default', '4K', 'Multimodal', 'Thinking'],
    type: 'image',
    endpoint: 'gemini-image',
    releaseDate: '2026-02-19',
  },
  {
    id: 'nano-banana-pro',
    modelId: 'gemini-3-pro-image-preview',
    label: 'Nano Banana Pro',
    description: 'Pro-quality image generation. Highest fidelity, supports up to 14 reference images.',
    comparison: 'Maximum quality — slower but best for final renders. Use when NB2 quality isn\'t enough.',
    tags: ['Pro', '4K', 'Max quality'],
    type: 'image',
    endpoint: 'gemini-image',
    releaseDate: '2025-11-01',
  },
  {
    id: 'imagen-4',
    modelId: 'imagen-4.0-generate-001',
    label: 'Imagen 4',
    description: 'Dedicated image model. High photographic fidelity, 2K resolution.',
    comparison: 'Legacy option — strong photorealism but weaker prompt following than Nano Banana.',
    tags: ['2K', 'Photorealistic'],
    type: 'image',
    endpoint: 'imagen',
    releaseDate: '2025-05-01',
  },
  {
    id: 'imagen-4-fast',
    modelId: 'imagen-4.0-fast-generate-001',
    label: 'Imagen 4 Fast',
    description: 'Speed-optimized Imagen 4. Same quality DNA with faster turnaround.',
    comparison: 'Fastest Imagen option. Pick this when iterating quickly on concepts.',
    tags: ['Fast', 'Imagen 4 quality'],
    type: 'image',
    endpoint: 'imagen',
    releaseDate: '2025-05-01',
  },
];

export const VIDEO_MODELS: ModelOption[] = [
  {
    id: 'veo-3.1',
    modelId: 'veo-3.1-generate-001',
    label: 'Veo 3.1',
    description: 'Up to 8 seconds at 1080p/4K with native audio. Reference image support.',
    comparison: 'Higher quality with audio. Takes longer but produces cinema-grade results.',
    tags: ['1080p/4K', 'Audio', 'Reference images'],
    type: 'video',
    endpoint: 'veo',
    releaseDate: '2025-05-01',
  },
  {
    id: 'veo-2',
    modelId: 'veo-2.0-generate-001',
    label: 'Veo 2',
    description: '5-8 second video clips at 720p. Good for quick concept visualization.',
    comparison: 'Faster generation, lower resolution. Best for quick previews and iteration.',
    tags: ['720p', '5-8 sec', 'Faster'],
    type: 'video',
    endpoint: 'veo',
    releaseDate: '2024-12-01',
  },
];

export const TEXT_MODELS: ModelOption[] = [
  {
    id: 'gemini-flash',
    modelId: 'gemini-2.0-flash',
    label: 'Gemini 2.0 Flash',
    description: 'Fast, reliable text generation. Currently powering the ideation pipeline.',
    comparison: 'The same model running your pipeline stages — fast and cost-effective.',
    tags: ['Fast', 'Pipeline default', 'JSON mode'],
    type: 'text',
    endpoint: 'gemini-text',
    releaseDate: '2025-02-01',
  },
];

export const CONCEPTLAB_MODELS: ModelOption[] = [
  {
    id: 'nano-banana-2-ref',
    modelId: 'gemini-3.1-flash-image-preview',
    label: 'Nano Banana 2',
    description: 'Default reference-based generation. 4K output, fast, excellent prompt following.',
    comparison: 'Best overall — understands complex prompts, correct framing, fast turnaround.',
    tags: ['Default', '4K', 'Reference-based', 'Thinking'],
    type: 'image',
    endpoint: 'gemini-image',
    backends: ['ai-studio', 'vertex'],
    releaseDate: '2026-02-19',
  },
  {
    id: 'nano-banana-pro-ref',
    modelId: 'gemini-3-pro-image-preview',
    label: 'Nano Banana Pro',
    description: 'Pro-quality reference-based generation. Maximum fidelity for final renders.',
    comparison: 'Slower but highest quality — best for final character sheets and hero renders.',
    tags: ['Pro quality', 'Reference-based', 'Max fidelity'],
    type: 'image',
    endpoint: 'gemini-image',
    backends: ['ai-studio', 'vertex'],
    releaseDate: '2025-11-01',
  },
];

/** All image models sorted newest-first for Gemini Studio selectors */
export const ALL_IMAGE_MODELS_SORTED: ModelOption[] = [
  ...IMAGE_MODELS,
  ...CONCEPTLAB_MODELS.filter((m) => m.type === 'image'),
].sort((a, b) => (b.releaseDate ?? '').localeCompare(a.releaseDate ?? ''));

/** All video models sorted newest-first */
export const ALL_VIDEO_MODELS_SORTED: ModelOption[] = [...VIDEO_MODELS];

export const ALL_MODELS = [...IMAGE_MODELS, ...VIDEO_MODELS, ...TEXT_MODELS, ...CONCEPTLAB_MODELS];

export const ASPECT_RATIOS = [
  { value: '1:1', label: 'Square (1:1)' },
  { value: '16:9', label: 'Widescreen (16:9)' },
  { value: '9:16', label: 'Portrait (9:16)' },
  { value: '4:3', label: 'Standard (4:3)' },
  { value: '3:4', label: 'Tall (3:4)' },
];
