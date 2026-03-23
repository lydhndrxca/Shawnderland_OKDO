"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Copy, Download, Minus, Undo2, X } from "lucide-react";

interface FinalizeDialogProps {
  open: boolean;
  onClose: () => void;
  sourceImage: string;
}

export default function FinalizeDialog({ open, onClose, sourceImage }: FinalizeDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [shrinkHistory, setShrinkHistory] = useState<ImageData[]>([]);
  const [dimensions, setDimensions] = useState({ w: 0, h: 0 });

  // Apply chroma key on open
  useEffect(() => {
    if (!open || !sourceImage) return;

    const imgSrc = sourceImage.startsWith("data:")
      ? sourceImage
      : `data:image/png;base64,${sourceImage}`;

    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      setDimensions({ w, h });

      const offscreen = document.createElement("canvas");
      offscreen.width = w;
      offscreen.height = h;
      const ctx = offscreen.getContext("2d")!;
      ctx.drawImage(img, 0, 0);

      const data = ctx.getImageData(0, 0, w, h);
      const d = data.data;

      // Chroma key: remove green-ish pixels
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i + 1], b = d[i + 2];
        if (g >= 80 && (g - Math.max(r, b)) >= 60) {
          d[i] = 0; d[i + 1] = 0; d[i + 2] = 0; d[i + 3] = 0;
        }
      }

      setImageData(data);
      setShrinkHistory([]);
    };
    img.src = imgSrc;
  }, [open, sourceImage]);

  // Render to visible canvas
  useEffect(() => {
    if (!imageData || !canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext("2d")!;
    ctx.putImageData(imageData, 0, 0);
  }, [imageData]);

  // Shrink border by 1px: make outermost non-transparent pixels transparent
  const handleShrink = useCallback(() => {
    if (!imageData) return;
    const w = imageData.width;
    const h = imageData.height;
    const src = new Uint8ClampedArray(imageData.data);
    const dst = new Uint8ClampedArray(imageData.data);

    const isTransparent = (x: number, y: number) => {
      if (x < 0 || x >= w || y < 0 || y >= h) return true;
      return src[(y * w + x) * 4 + 3] === 0;
    };

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        if (src[idx + 3] === 0) continue;
        if (
          isTransparent(x - 1, y) ||
          isTransparent(x + 1, y) ||
          isTransparent(x, y - 1) ||
          isTransparent(x, y + 1)
        ) {
          dst[idx] = 0;
          dst[idx + 1] = 0;
          dst[idx + 2] = 0;
          dst[idx + 3] = 0;
        }
      }
    }

    setShrinkHistory((prev) => [...prev, imageData]);
    setImageData(new ImageData(dst, w, h));
  }, [imageData]);

  const handleUndoShrink = useCallback(() => {
    setShrinkHistory((prev) => {
      if (prev.length === 0) return prev;
      const stack = [...prev];
      const last = stack.pop()!;
      setImageData(last);
      return stack;
    });
  }, []);

  const handleSave = useCallback(() => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `finalized_${Date.now()}.png`;
    link.click();
  }, []);

  const handleCopy = useCallback(async () => {
    if (!canvasRef.current) return;
    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvasRef.current!.toBlob(resolve, "image/png"),
      );
      if (blob) {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      }
    } catch { /* clipboard failed */ }
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div
        className="relative w-[520px] max-h-[80vh] rounded-lg overflow-hidden flex flex-col"
        style={{
          background: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b shrink-0"
          style={{ borderColor: "var(--color-border)" }}
        >
          <span className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
            Finalized Icon
          </span>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-[var(--color-hover)] transition-colors"
            style={{ color: "var(--color-text-muted)" }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Image preview */}
        <div
          className="flex-1 min-h-0 flex items-center justify-center p-4 overflow-auto"
          style={{
            background:
              "repeating-conic-gradient(var(--color-elevated) 0% 25%, var(--color-background) 0% 50%) 50% / 16px 16px",
          }}
        >
          <canvas
            ref={canvasRef}
            className="max-w-full max-h-full"
            style={{ imageRendering: "pixelated" }}
          />
        </div>

        {/* Dimensions */}
        <div className="px-4 py-1 text-center text-[10px] font-mono" style={{ color: "var(--color-text-muted)" }}>
          {dimensions.w} × {dimensions.h}
        </div>

        {/* Actions */}
        <div
          className="flex items-center gap-2 px-4 py-3 border-t shrink-0"
          style={{ borderColor: "var(--color-border)" }}
        >
          <button
            onClick={handleShrink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
            style={{
              background: "var(--color-elevated)",
              color: "var(--color-text-primary)",
              border: "1px solid var(--color-border)",
            }}
          >
            <Minus className="h-3 w-3" /> Shrink Border (1px)
          </button>
          <button
            onClick={handleUndoShrink}
            disabled={shrinkHistory.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors disabled:opacity-40"
            style={{
              background: "var(--color-elevated)",
              color: "var(--color-text-primary)",
              border: "1px solid var(--color-border)",
            }}
          >
            <Undo2 className="h-3 w-3" /> Undo Shrink
          </button>

          <div className="flex-1" />

          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
            style={{
              background: "#2a5a2a",
              color: "white",
              border: "1px solid var(--color-border)",
            }}
          >
            <Download className="h-3 w-3" /> Save
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
            style={{
              background: "var(--color-elevated)",
              color: "var(--color-text-primary)",
              border: "1px solid var(--color-border)",
            }}
          >
            <Copy className="h-3 w-3" /> Copy
          </button>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
            style={{
              background: "var(--color-elevated)",
              color: "var(--color-text-primary)",
              border: "1px solid var(--color-border)",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
