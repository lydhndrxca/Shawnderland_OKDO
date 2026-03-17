import { useCallback, useState } from 'react';
import { generateWithGeminiRef } from '@/lib/ideation/engine/conceptlab/imageGenApi';
import type { GeneratedImage, GeminiImageModel } from '../types';

export type OutpaintDirection = 'left' | 'right' | 'top' | 'bottom' | 'all';

function expandCanvas(
  image: GeneratedImage,
  direction: OutpaintDirection,
  expandPx: number,
): Promise<{ base64: string; mimeType: string; w: number; h: number; offsetX: number; offsetY: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let newW = img.width;
      let newH = img.height;
      let offsetX = 0;
      let offsetY = 0;

      if (direction === 'left' || direction === 'all') { newW += expandPx; offsetX = expandPx; }
      if (direction === 'right' || direction === 'all') { newW += expandPx; }
      if (direction === 'top' || direction === 'all') { newH += expandPx; offsetY = expandPx; }
      if (direction === 'bottom' || direction === 'all') { newH += expandPx; }

      const canvas = document.createElement('canvas');
      canvas.width = newW;
      canvas.height = newH;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Could not get canvas context'));

      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, newW, newH);
      ctx.drawImage(img, offsetX, offsetY);

      const dataUrl = canvas.toDataURL('image/png');
      const b64 = dataUrl.split(',')[1];
      resolve({ base64: b64, mimeType: 'image/png', w: newW, h: newH, offsetX, offsetY });
    };
    img.onerror = () => reject(new Error('Failed to load image for outpaint'));
    img.src = `data:${image.mimeType};base64,${image.base64}`;
  });
}

export function useOutpaint() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const outpaint = useCallback(async (
    sourceImage: GeneratedImage,
    direction: OutpaintDirection,
    expandPx: number,
    prompt: string,
    model: GeminiImageModel,
  ): Promise<GeneratedImage | null> => {
    setBusy(true);
    setError(null);

    try {
      const expanded = await expandCanvas(sourceImage, direction, expandPx);

      const expandedImage: GeneratedImage = {
        base64: expanded.base64,
        mimeType: expanded.mimeType as 'image/png',
      };

      const outpaintPrompt = prompt.trim()
        ? `Extend/outpaint the image in the ${direction === 'all' ? 'all directions' : direction} direction. The black areas are where new content should be generated. ${prompt}. Match the existing style, lighting, and perspective perfectly.`
        : `Extend/outpaint the image in the ${direction === 'all' ? 'all directions' : direction} direction. The black areas around the original image are where new content should be seamlessly generated. Match the existing style, lighting, color palette, and perspective perfectly. Create natural, continuous content.`;

      const results = await generateWithGeminiRef(outpaintPrompt, expandedImage, model);
      return results[0] ?? null;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Outpaint failed');
      return null;
    } finally {
      setBusy(false);
    }
  }, []);

  return { outpaint, busy, error };
}
