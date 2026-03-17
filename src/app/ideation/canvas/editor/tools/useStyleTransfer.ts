import { useCallback, useState } from 'react';
import { generateWithGeminiRef } from '@/lib/ideation/engine/conceptlab/imageGenApi';
import type { GeneratedImage, GeminiImageModel } from '../types';

export const STYLE_PRESETS = [
  { id: 'oil_painting', label: 'Oil Painting', prompt: 'Transform this image into a classical oil painting with visible brushstrokes, rich warm tones, and dramatic chiaroscuro lighting.' },
  { id: 'watercolor', label: 'Watercolor', prompt: 'Transform this image into a delicate watercolor painting with soft washes, visible paper texture, bleeding edges, and transparent layered colors.' },
  { id: 'anime', label: 'Anime / Cel', prompt: 'Transform this image into high-quality anime/cel shaded art with clean linework, flat color fills, dramatic shading, and expressive styling.' },
  { id: 'cyberpunk', label: 'Cyberpunk', prompt: 'Transform this image into cyberpunk aesthetic with neon glow, chrome reflections, holographic overlays, rain-slicked surfaces, and dark futuristic atmosphere.' },
  { id: 'pencil_sketch', label: 'Pencil Sketch', prompt: 'Transform this image into a detailed pencil sketch with crosshatching, varying line weights, and subtle shading on white paper.' },
  { id: 'pixel_art', label: 'Pixel Art', prompt: 'Transform this image into detailed pixel art with a limited color palette, clean pixel edges, and retro game aesthetic. 32-bit style.' },
  { id: 'art_nouveau', label: 'Art Nouveau', prompt: 'Transform this image into Art Nouveau style with flowing organic lines, floral motifs, decorative borders, and Mucha-inspired elegance.' },
  { id: 'pop_art', label: 'Pop Art', prompt: 'Transform this image into bold Pop Art style with Ben-Day dots, high contrast, limited bright color palette, and comic book aesthetic.' },
  { id: 'studio_ghibli', label: 'Studio Ghibli', prompt: 'Transform this image into Studio Ghibli style with lush painterly backgrounds, soft pastel atmosphere, whimsical detail, and warm nostalgic feeling.' },
  { id: 'custom', label: 'Custom Style...', prompt: '' },
] as const;

export function useStyleTransfer() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const transfer = useCallback(async (
    image: GeneratedImage,
    stylePrompt: string,
    model: GeminiImageModel,
  ): Promise<GeneratedImage | null> => {
    if (!stylePrompt.trim()) return null;
    setBusy(true);
    setError(null);
    try {
      const prompt = `${stylePrompt} Maintain the original composition, subjects, and spatial relationships exactly. Only change the visual style.`;
      const results = await generateWithGeminiRef(prompt, image, model);
      return results[0] ?? null;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Style transfer failed');
      return null;
    } finally {
      setBusy(false);
    }
  }, []);

  return { transfer, busy, error };
}
