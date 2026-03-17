import type { GeneratedImage } from '@/lib/ideation/engine/conceptlab/imageGenApi';

export function drawStroke(
  canvas: HTMLCanvasElement,
  x: number,
  y: number,
  prevPos: { x: number; y: number } | null,
  brushSize: number,
  mode: 'brush' | 'eraser',
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.globalCompositeOperation = mode === 'eraser' ? 'destination-out' : 'source-over';
  const radius = brushSize / 2;
  ctx.fillStyle = mode === 'eraser' ? 'rgba(0,0,0,1)' : 'rgba(255, 60, 60, 0.45)';
  if (prevPos) {
    const dx = x - prevPos.x;
    const dy = y - prevPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const step = Math.max(2, radius * 0.3);
    const steps = Math.ceil(dist / step);
    for (let i = 0; i <= steps; i++) {
      const t = steps === 0 ? 0 : i / steps;
      ctx.beginPath();
      ctx.arc(prevPos.x + dx * t, prevPos.y + dy * t, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function clearMask(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d');
  if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
}

export function maskHasContent(canvas: HTMLCanvasElement): boolean {
  if (canvas.width === 0 || canvas.height === 0) return false;
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;
  const px = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  for (let i = 3; i < px.length; i += 4) { if (px[i] > 0) return true; }
  return false;
}

export async function exportMaskComposite(
  canvas: HTMLCanvasElement,
  srcImage: GeneratedImage,
): Promise<GeneratedImage> {
  const w = canvas.width, h = canvas.height;
  const comp = document.createElement('canvas');
  comp.width = w;
  comp.height = h;
  const ctx = comp.getContext('2d')!;
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = reject;
    el.src = `data:${srcImage.mimeType};base64,${srcImage.base64}`;
  });
  ctx.drawImage(img, 0, 0, w, h);
  const maskCtx = canvas.getContext('2d')!;
  const maskData = maskCtx.getImageData(0, 0, w, h);
  const compData = ctx.getImageData(0, 0, w, h);
  for (let i = 0; i < maskData.data.length; i += 4) {
    if (maskData.data[i + 3] > 20) {
      const a = 0.6;
      compData.data[i] = Math.round(compData.data[i] * (1 - a));
      compData.data[i + 1] = Math.round(compData.data[i + 1] * (1 - a) + 255 * a);
      compData.data[i + 2] = Math.round(compData.data[i + 2] * (1 - a));
    }
  }
  ctx.putImageData(compData, 0, 0);
  const dataUrl = comp.toDataURL('image/png');
  return { base64: dataUrl.split(',')[1], mimeType: 'image/png' };
}

export function resizeMask(canvas: HTMLCanvasElement, w: number, h: number): void {
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
}
