import { useCallback, useState } from 'react';
import { generateWithGeminiRef } from '@/lib/ideation/engine/conceptlab/imageGenApi';
import * as Mask from '../engines/maskEngine';
import type { GeneratedImage, GeminiImageModel } from '../types';

/**
 * Smart Erase: user paints over an object on the mask, and AI removes it
 * by inpainting the masked area to blend with surroundings.
 */
export function useSmartErase() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const erase = useCallback(async (
    sourceImage: GeneratedImage,
    maskCanvas: HTMLCanvasElement,
    model: GeminiImageModel,
  ): Promise<GeneratedImage | null> => {
    if (!Mask.maskHasContent(maskCanvas)) {
      setError('Paint over the object you want to remove first');
      return null;
    }
    setBusy(true);
    setError(null);
    try {
      const composite = await Mask.exportMaskComposite(maskCanvas, sourceImage);
      const prompt = 'Remove the object/area highlighted in red from the image. Fill the removed area with natural background content that seamlessly blends with the surrounding environment. Maintain consistent lighting, perspective, and texture.';
      const results = await generateWithGeminiRef(prompt, composite, model);
      Mask.clearMask(maskCanvas);
      return results[0] ?? null;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Smart erase failed');
      return null;
    } finally {
      setBusy(false);
    }
  }, []);

  return { erase, busy, error };
}
