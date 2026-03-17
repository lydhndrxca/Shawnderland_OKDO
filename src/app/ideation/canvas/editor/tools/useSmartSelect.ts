import { useCallback, useState } from 'react';
import { generateText } from '@/lib/ideation/engine/conceptlab/imageGenApi';
import type { GeneratedImage } from '../types';

/**
 * Smart Select: user types a subject name, Gemini describes its bounding region,
 * and we fill the mask canvas with that region.
 */
export function useSmartSelect(
  maskCanvasRef: React.RefObject<HTMLCanvasElement | null>,
  activeImage: GeneratedImage | null,
) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectSubject = useCallback(async (subjectName: string) => {
    if (!activeImage || !maskCanvasRef.current || busy) return;
    const canvas = maskCanvasRef.current;
    if (!canvas.width || !canvas.height) return;

    setBusy(true);
    setError(null);

    try {
      const prompt = `You are an image segmentation assistant. The user wants to select: "${subjectName}".

Analyze the image and return the bounding region of "${subjectName}" as a JSON object with these fields:
- shape: "rect" for rectangular regions, "ellipse" for organic/round shapes
- x: left edge as a percentage (0-100) of image width
- y: top edge as a percentage (0-100) of image height
- w: width as a percentage (0-100) of image width
- h: height as a percentage (0-100) of image height

Return ONLY the JSON object, no explanation. If the subject is not found, return {"shape":"rect","x":0,"y":0,"w":0,"h":0}.`;

      const response = await generateText(prompt, activeImage);
      const jsonMatch = response.match(/\{[^}]+\}/);
      if (!jsonMatch) throw new Error('Could not parse selection response');

      const region = JSON.parse(jsonMatch[0]) as {
        shape: string;
        x: number;
        y: number;
        w: number;
        h: number;
      };

      if (region.w === 0 || region.h === 0) {
        setError(`"${subjectName}" not found in image`);
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const px = (region.x / 100) * canvas.width;
      const py = (region.y / 100) * canvas.height;
      const pw = (region.w / 100) * canvas.width;
      const ph = (region.h / 100) * canvas.height;

      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(255, 60, 60, 0.45)';

      if (region.shape === 'ellipse') {
        ctx.beginPath();
        ctx.ellipse(px + pw / 2, py + ph / 2, pw / 2, ph / 2, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(px, py, pw, ph);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Smart select failed');
    } finally {
      setBusy(false);
    }
  }, [activeImage, maskCanvasRef, busy]);

  return { selectSubject, busy, error };
}
