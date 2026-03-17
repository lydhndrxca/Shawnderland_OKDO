import { useCallback, useState } from 'react';
import { generateWithGeminiRef } from '@/lib/ideation/engine/conceptlab/imageGenApi';
import type { GeneratedImage, GeminiImageModel } from '../types';

export function useBgRemove() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const removeBg = useCallback(async (
    image: GeneratedImage,
    replacementPrompt: string,
    model: GeminiImageModel,
  ): Promise<GeneratedImage | null> => {
    setBusy(true);
    setError(null);
    try {
      const prompt = replacementPrompt.trim()
        ? `Remove the background from this image and replace it with: ${replacementPrompt}. Keep the main subject(s) perfectly intact with clean edges.`
        : `Remove the background from this image completely. Make the background transparent/white. Keep the main subject(s) perfectly intact with clean, precise edges.`;

      const results = await generateWithGeminiRef(prompt, image, model);
      return results[0] ?? null;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Background removal failed');
      return null;
    } finally {
      setBusy(false);
    }
  }, []);

  return { removeBg, busy, error };
}
