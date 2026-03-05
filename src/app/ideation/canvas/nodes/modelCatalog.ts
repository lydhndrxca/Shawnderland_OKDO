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
    id: 'imagen-4',
    modelId: 'imagen-4.0-generate-001',
    label: 'Imagen 4',
    description: 'Latest generation. Improved detail, lighting, and text rendering in images.',
    comparison: 'Newer than Imagen 3 — better at fine details and text in images, similar speed.',
    tags: ['Latest', 'Better text', 'Enhanced detail'],
    type: 'image',
    endpoint: 'imagen',
    releaseDate: '2025-05-01',
  },
  {
    id: 'imagen-4-fast',
    modelId: 'imagen-4.0-fast-generate-001',
    label: 'Imagen 4 Fast',
    description: 'Speed-optimized Imagen 4. Same quality DNA with faster turnaround.',
    comparison: 'Fastest high-quality option. Pick this when iterating quickly on concepts.',
    tags: ['Fast', 'Imagen 4 quality', 'Quick iteration'],
    type: 'image',
    endpoint: 'imagen',
    releaseDate: '2025-05-01',
  },
  {
    id: 'imagen-3',
    modelId: 'imagen-3.0-generate-002',
    label: 'Imagen 3',
    description: 'Fast, high-quality images. Best for product shots, illustrations, and realistic photos.',
    comparison: 'Reliable workhorse — great quality at fast speed. Choose this for most image tasks.',
    tags: ['Reliable', 'Up to 4 images', 'Multiple aspect ratios'],
    type: 'image',
    endpoint: 'imagen',
    releaseDate: '2024-08-01',
  },
  {
    id: 'gemini-flash-image',
    modelId: 'gemini-2.0-flash-exp',
    label: 'Gemini Flash',
    description: 'AI that thinks about your image. Can combine text reasoning with image generation.',
    comparison: 'Different approach — AI reasons about what to create. Best for creative or complex prompts.',
    tags: ['AI-reasoned', 'Text + Image', 'Conversational'],
    type: 'image',
    endpoint: 'gemini-image',
    releaseDate: '2025-02-01',
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
    id: 'gemini-3-pro-image',
    modelId: 'gemini-3-pro-image-preview',
    label: 'Gemini 3 Pro Image',
    description: 'Pro-quality reference-based generation. Best fidelity for turnaround views and character/weapon edits.',
    comparison: 'Higher quality than Flash — best for final renders and multi-view sheets. Slower.',
    tags: ['Pro quality', 'Reference-based', 'Multi-view'],
    type: 'image',
    endpoint: 'gemini-image',
    backends: ['ai-studio', 'vertex'],
    releaseDate: '2025-06-01',
  },
  {
    id: 'gemini-flash-image-gen',
    modelId: 'gemini-2.0-flash-preview-image-generation',
    label: 'Gemini Flash Image',
    description: 'Flash-speed reference-based generation. Good for fast iteration and previews.',
    comparison: 'Faster than Pro — great for quick previews while iterating on designs.',
    tags: ['Fast', 'Reference-based', 'Preview'],
    type: 'image',
    endpoint: 'gemini-image',
    backends: ['ai-studio', 'vertex'],
    releaseDate: '2025-03-01',
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
