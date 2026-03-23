"use client";

import { useCallback, useRef, useState } from "react";
import { Download, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

interface ImageViewerProps {
  src: string | null;
  alt?: string;
  className?: string;
  downloadName?: string;
  showGrid?: boolean;
  gridSize?: { w: number; h: number } | null;
  drawMode?: boolean;
}

export default function ImageViewer({
  src,
  alt = "Generated image",
  className = "",
  downloadName = "image.png",
  showGrid = false,
  gridSize,
  drawMode = false,
}: ImageViewerProps) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [imgDims, setImgDims] = useState<{ w: number; h: number } | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setScale((s) => Math.max(0.1, Math.min(10, s - e.deltaY * 0.001)));
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 1 || (e.button === 0 && !drawMode)) {
        e.preventDefault();
        dragRef.current = { startX: e.clientX, startY: e.clientY, ox: offset.x, oy: offset.y };
      }
    },
    [offset, drawMode],
  );

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragRef.current) return;
    setOffset({
      x: dragRef.current.ox + (e.clientX - dragRef.current.startX),
      y: dragRef.current.oy + (e.clientY - dragRef.current.startY),
    });
  }, []);

  const handleMouseUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const resetView = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  const download = useCallback(() => {
    if (!src) return;
    const link = document.createElement("a");
    link.href = src.startsWith("data:") ? src : `data:image/png;base64,${src}`;
    link.download = downloadName;
    link.click();
  }, [src, downloadName]);

  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImgDims({ w: img.naturalWidth, h: img.naturalHeight });
  }, []);

  if (!src) {
    return (
      <div
        className={`flex items-center justify-center border-2 border-dashed rounded-lg ${className}`}
        style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}
      >
        <p className="text-sm">No image</p>
      </div>
    );
  }

  const imgSrc = src.startsWith("data:") ? src : `data:image/png;base64,${src}`;

  return (
    <div className={`relative flex flex-col ${className}`}>
      {/* Zoom controls */}
      <div className="absolute top-2 right-2 z-10 flex gap-1">
        <button
          onClick={() => setScale((s) => Math.min(10, s * 1.25))}
          className="p-1.5 rounded-md bg-black/50 text-white hover:bg-black/70 transition-colors"
          title="Zoom in"
        >
          <ZoomIn className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => setScale((s) => Math.max(0.1, s / 1.25))}
          className="p-1.5 rounded-md bg-black/50 text-white hover:bg-black/70 transition-colors"
          title="Zoom out"
        >
          <ZoomOut className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={resetView}
          className="p-1.5 rounded-md bg-black/50 text-white hover:bg-black/70 transition-colors"
          title="Reset view"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={download}
          className="p-1.5 rounded-md bg-black/50 text-white hover:bg-black/70 transition-colors"
          title="Download"
        >
          <Download className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Image dimensions */}
      {imgDims && (
        <div className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded text-[10px] font-mono bg-black/50 text-white/80">
          {imgDims.w}×{imgDims.h}
        </div>
      )}

      {/* Draw mode indicator */}
      {drawMode && (
        <div className="absolute top-9 left-2 z-10 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-600/80 text-white">
          Draw Mode
        </div>
      )}

      {/* Main image area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden rounded-lg cursor-grab active:cursor-grabbing"
        style={{
          background:
            "repeating-conic-gradient(var(--color-elevated) 0% 25%, var(--color-background) 0% 50%) 50% / 16px 16px",
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          className="h-full w-full flex items-center justify-center"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: "center center",
          }}
        >
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imgSrc}
              alt={alt}
              className="max-w-full max-h-full object-contain"
              style={{ imageRendering: scale > 2 ? "pixelated" : "auto" }}
              draggable={false}
              onLoad={handleImageLoad}
            />
            {/* Grid overlay (SVG) */}
            {showGrid && imgDims && (
              <svg
                className="absolute inset-0 pointer-events-none"
                width="100%"
                height="100%"
                viewBox={`0 0 ${imgDims.w} ${imgDims.h}`}
                preserveAspectRatio="none"
              >
                {(() => {
                  const gw = gridSize?.w ?? imgDims.w;
                  const gh = gridSize?.h ?? imgDims.h;
                  if (gw > 256 || gh > 256) return null;
                  const lines = [];
                  const stepX = imgDims.w / gw;
                  const stepY = imgDims.h / gh;
                  for (let i = 0; i <= gw; i++) {
                    const x = i * stepX;
                    lines.push(
                      <line key={`v${i}`} x1={x} y1={0} x2={x} y2={imgDims.h} stroke="rgba(0,0,0,0.3)" strokeWidth={0.5} />,
                    );
                  }
                  for (let j = 0; j <= gh; j++) {
                    const y = j * stepY;
                    lines.push(
                      <line key={`h${j}`} x1={0} y1={y} x2={imgDims.w} y2={y} stroke="rgba(0,0,0,0.3)" strokeWidth={0.5} />,
                    );
                  }
                  return lines;
                })()}
              </svg>
            )}
          </div>
        </div>
      </div>

      {/* Zoom percentage */}
      <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded text-[10px] font-mono bg-black/50 text-white/70">
        {Math.round(scale * 100)}%
      </div>
    </div>
  );
}
