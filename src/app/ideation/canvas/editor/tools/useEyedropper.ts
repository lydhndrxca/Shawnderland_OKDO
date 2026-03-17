import { useCallback, useState } from 'react';
import type { GeneratedImage } from '../types';

export function useEyedropper() {
  const [pickedColor, setPickedColor] = useState<string | null>(null);

  const pickColor = useCallback((image: GeneratedImage, imgX: number, imgY: number) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
      const px = Math.max(0, Math.min(img.width - 1, Math.round(imgX)));
      const py = Math.max(0, Math.min(img.height - 1, Math.round(imgY)));
      const data = ctx.getImageData(px, py, 1, 1).data;
      const hex = `#${data[0].toString(16).padStart(2, '0')}${data[1].toString(16).padStart(2, '0')}${data[2].toString(16).padStart(2, '0')}`;
      setPickedColor(hex);
      try {
        navigator.clipboard.writeText(hex);
      } catch {
        // clipboard may not be available
      }
    };
    img.src = `data:${image.mimeType};base64,${image.base64}`;
  }, []);

  return { pickedColor, pickColor };
}
