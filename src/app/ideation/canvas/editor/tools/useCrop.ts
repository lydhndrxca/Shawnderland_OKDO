import { useCallback, useState } from 'react';
import type { GeneratedImage } from '../types';

export interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function cropImage(image: GeneratedImage, rect: CropRect): Promise<GeneratedImage> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(rect.w));
      canvas.height = Math.max(1, Math.round(rect.h));
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('No canvas context'));
      ctx.drawImage(img, -rect.x, -rect.y);
      const dataUrl = canvas.toDataURL('image/png');
      resolve({ base64: dataUrl.split(',')[1], mimeType: 'image/png' });
    };
    img.onerror = () => reject(new Error('Failed to load image for crop'));
    img.src = `data:${image.mimeType};base64,${image.base64}`;
  });
}

export function useCrop() {
  const [cropRect, setCropRect] = useState<CropRect | null>(null);
  const [busy, setBusy] = useState(false);

  const applyCrop = useCallback(async (
    image: GeneratedImage,
    rect: CropRect,
  ): Promise<GeneratedImage | null> => {
    if (rect.w < 2 || rect.h < 2) return null;
    setBusy(true);
    try {
      const result = await cropImage(image, rect);
      setCropRect(null);
      return result;
    } catch {
      return null;
    } finally {
      setBusy(false);
    }
  }, []);

  return { cropRect, setCropRect, applyCrop, busy };
}
