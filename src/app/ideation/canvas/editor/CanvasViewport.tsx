"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor } from './EditorContext';
import { ImageContextMenu } from '@/components/ImageContextMenu';
import * as Mask from './engines/maskEngine';
import type { GeneratedImage } from './types';

const MIN_ZOOM = 0.02;
const MAX_ZOOM = 30;
const ZOOM_FACTOR = 1.12;

export default function CanvasViewport() {
  const ctx = useEditor();
  const {
    activeImage, activeSource, activeTool,
    zoom, setZoom, pan, setPan, imgSize, setImgSize,
    canvasAreaRef, fitToView,
    maskCanvasRef, brushSize,
    pointPin, setPointPin, pointText, setPointText, handlePointEdit,
    editBusy, handlePasteImage, setCursorPos,
  } = ctx;

  const [isPanning, setIsPanning] = useState(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const isDrawing = useRef(false);
  const lastDrawPos = useRef<{ x: number; y: number } | null>(null);
  const [brushPos, setBrushPos] = useState<{ x: number; y: number } | null>(null);
  const pointInputRef = useRef<HTMLInputElement>(null);

  /* ── Marquee / Lasso selection state ── */
  const [marqueeRect, setMarqueeRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const marqueeStart = useRef<{ imgX: number; imgY: number } | null>(null);
  const [lassoPoints, setLassoPoints] = useState<{ imgX: number; imgY: number }[]>([]);
  const isLassoing = useRef(false);

  /* ── Crop state ── */
  const [cropRect, setCropRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const cropStart = useRef<{ imgX: number; imgY: number } | null>(null);

  /* Resize mask canvas to match image natural dimensions */
  const imgSizeW = imgSize.w, imgSizeH = imgSize.h;
  const maskRef = maskCanvasRef;
  useEffect(() => {
    if (maskRef.current && imgSizeW && imgSizeH) {
      Mask.resizeMask(maskRef.current, imgSizeW, imgSizeH);
    }
  }, [imgSizeW, imgSizeH, maskRef]);

  const handleImgLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setImgSize((prev) =>
      prev.w === img.naturalWidth && prev.h === img.naturalHeight
        ? prev
        : { w: img.naturalWidth, h: img.naturalHeight },
    );
  }, [setImgSize]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const area = canvasAreaRef.current;
    if (!area) return;
    const rect = area.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - rect.width / 2;
    const mouseY = e.clientY - rect.top - rect.height / 2;
    const factor = e.deltaY > 0 ? 1 / ZOOM_FACTOR : ZOOM_FACTOR;
    setZoom((prevZoom) => {
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prevZoom * factor));
      const ratio = newZoom / prevZoom;
      setPan((p) => ({
        x: mouseX - ratio * (mouseX - p.x),
        y: mouseY - ratio * (mouseY - p.y),
      }));
      return newZoom;
    });
  }, [canvasAreaRef, setZoom, setPan]);

  const toCanvasCoords = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  }, []);

  const toAreaCoords = useCallback((e: React.MouseEvent) => {
    const area = canvasAreaRef.current;
    if (!area) return null;
    const rect = area.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, [canvasAreaRef]);

  const screenToImg = useCallback((clientX: number, clientY: number): { imgX: number; imgY: number } | null => {
    const area = canvasAreaRef.current;
    if (!area || !imgSize.w || !imgSize.h) return null;
    const rect = area.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const ix = ((clientX - rect.left - cx - pan.x) / zoom + imgSize.w / 2);
    const iy = ((clientY - rect.top - cy - pan.y) / zoom + imgSize.h / 2);
    if (ix < 0 || ix > imgSize.w || iy < 0 || iy > imgSize.h) return null;
    return { imgX: ix, imgY: iy };
  }, [canvasAreaRef, imgSize, zoom, pan]);

  const commitMarqueeToMask = useCallback((rect: { x: number; y: number; w: number; h: number }) => {
    const canvas = maskCanvasRef.current;
    if (!canvas) return;
    const mctx = canvas.getContext('2d');
    if (!mctx) return;
    mctx.globalCompositeOperation = 'source-over';
    mctx.fillStyle = 'rgba(255, 60, 60, 0.45)';
    const x = Math.min(rect.x, rect.x + rect.w);
    const y = Math.min(rect.y, rect.y + rect.h);
    mctx.fillRect(x, y, Math.abs(rect.w), Math.abs(rect.h));
  }, [maskCanvasRef]);

  const commitLassoToMask = useCallback((points: { imgX: number; imgY: number }[]) => {
    const canvas = maskCanvasRef.current;
    if (!canvas || points.length < 3) return;
    const mctx = canvas.getContext('2d');
    if (!mctx) return;
    mctx.globalCompositeOperation = 'source-over';
    mctx.fillStyle = 'rgba(255, 60, 60, 0.45)';
    mctx.beginPath();
    mctx.moveTo(points[0].imgX, points[0].imgY);
    for (let i = 1; i < points.length; i++) mctx.lineTo(points[i].imgX, points[i].imgY);
    mctx.closePath();
    mctx.fill();
  }, [maskCanvasRef]);

  const handlePanStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsPanning(true);
    lastMouse.current = { x: e.clientX, y: e.clientY };
  }, []);

  const updateCursorPos = useCallback((e: React.MouseEvent) => {
    if (!imgSize.w || !imgSize.h || !canvasAreaRef.current) return;
    const area = canvasAreaRef.current.getBoundingClientRect();
    const cx = area.width / 2;
    const cy = area.height / 2;
    const imgX = Math.round(((e.clientX - area.left - cx - pan.x) / zoom) + imgSize.w / 2);
    const imgY = Math.round(((e.clientY - area.top - cy - pan.y) / zoom) + imgSize.h / 2);
    if (imgX >= 0 && imgX <= imgSize.w && imgY >= 0 && imgY <= imgSize.h) {
      setCursorPos({ imgX, imgY });
    } else {
      setCursorPos(null);
    }
  }, [imgSize, zoom, pan, canvasAreaRef, setCursorPos]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    updateCursorPos(e);
    if (isPanning) {
      const dx = e.clientX - lastMouse.current.x;
      const dy = e.clientY - lastMouse.current.y;
      lastMouse.current = { x: e.clientX, y: e.clientY };
      setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
      return;
    }
    if (marqueeStart.current && activeTool === 'marquee') {
      const pt = screenToImg(e.clientX, e.clientY);
      if (pt) setMarqueeRect({ x: marqueeStart.current.imgX, y: marqueeStart.current.imgY, w: pt.imgX - marqueeStart.current.imgX, h: pt.imgY - marqueeStart.current.imgY });
    }
    if (isLassoing.current && activeTool === 'lasso') {
      const pt = screenToImg(e.clientX, e.clientY);
      if (pt) setLassoPoints((prev) => [...prev, pt]);
    }
    if (cropStart.current && activeTool === 'crop') {
      const pt = screenToImg(e.clientX, e.clientY);
      if (pt) setCropRect({ x: cropStart.current.imgX, y: cropStart.current.imgY, w: pt.imgX - cropStart.current.imgX, h: pt.imgY - cropStart.current.imgY });
    }
  }, [isPanning, setPan, updateCursorPos, activeTool, screenToImg]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    if (marqueeStart.current && marqueeRect && activeTool === 'marquee') {
      commitMarqueeToMask(marqueeRect);
      setMarqueeRect(null);
      marqueeStart.current = null;
    }
    if (isLassoing.current && activeTool === 'lasso') {
      commitLassoToMask(lassoPoints);
      setLassoPoints([]);
      isLassoing.current = false;
    }
    if (cropStart.current && cropRect && activeTool === 'crop') {
      const x = Math.min(cropRect.x, cropRect.x + cropRect.w);
      const y = Math.min(cropRect.y, cropRect.y + cropRect.h);
      const w = Math.abs(cropRect.w);
      const h = Math.abs(cropRect.h);
      if (w > 4 && h > 4 && activeImage) {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(w);
          canvas.height = Math.round(h);
          const c = canvas.getContext('2d');
          if (c) {
            c.drawImage(img, -Math.round(x), -Math.round(y));
            const dataUrl = canvas.toDataURL('image/png');
            const cropped = { base64: dataUrl.split(',')[1], mimeType: 'image/png' as const };
            ctx.pushHistory(activeImage, 'Crop');
            ctx.handlePasteImage(cropped);
          }
        };
        img.src = `data:${activeImage.mimeType};base64,${activeImage.base64}`;
      }
      setCropRect(null);
      cropStart.current = null;
    }
  }, [activeTool, marqueeRect, lassoPoints, cropRect, activeImage, ctx, commitMarqueeToMask, commitLassoToMask]);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey) || activeTool === 'hand' || activeTool === 'move') {
      handlePanStart(e);
      return;
    }
    if (activeTool === 'zoom' && e.button === 0) {
      const area = canvasAreaRef.current;
      if (!area) return;
      const rect = area.getBoundingClientRect();
      const mouseX = e.clientX - rect.left - rect.width / 2;
      const mouseY = e.clientY - rect.top - rect.height / 2;
      const factor = e.shiftKey ? 1 / ZOOM_FACTOR : ZOOM_FACTOR;
      setZoom((prev) => {
        const nz = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prev * factor));
        const ratio = nz / prev;
        setPan((p) => ({ x: mouseX - ratio * (mouseX - p.x), y: mouseY - ratio * (mouseY - p.y) }));
        return nz;
      });
      return;
    }
    if (activeTool === 'marquee' && e.button === 0) {
      const pt = screenToImg(e.clientX, e.clientY);
      if (pt) {
        marqueeStart.current = pt;
        setMarqueeRect({ x: pt.imgX, y: pt.imgY, w: 0, h: 0 });
      }
      return;
    }
    if (activeTool === 'crop' && e.button === 0) {
      const pt = screenToImg(e.clientX, e.clientY);
      if (pt) {
        cropStart.current = pt;
        setCropRect({ x: pt.imgX, y: pt.imgY, w: 0, h: 0 });
      }
      return;
    }
    if (activeTool === 'lasso' && e.button === 0) {
      const pt = screenToImg(e.clientX, e.clientY);
      if (pt) {
        isLassoing.current = true;
        setLassoPoints([pt]);
      }
      return;
    }
    if (activeTool === 'pointSelect' && e.button === 0 && imgSize.w && imgSize.h) {
      const area = canvasAreaRef.current;
      if (!area) return;
      const areaRect = area.getBoundingClientRect();
      const screenX = e.clientX - areaRect.left;
      const screenY = e.clientY - areaRect.top;
      const centerX = areaRect.width / 2;
      const centerY = areaRect.height / 2;
      const ix = ((screenX - centerX - pan.x) / zoom + imgSize.w / 2);
      const iy = ((screenY - centerY - pan.y) / zoom + imgSize.h / 2);
      if (ix >= 0 && ix <= imgSize.w && iy >= 0 && iy <= imgSize.h) {
        setPointPin({ imgX: ix, imgY: iy });
        setPointText('');
        setTimeout(() => pointInputRef.current?.focus(), 50);
      }
    }
  }, [activeTool, imgSize, zoom, pan, canvasAreaRef, handlePanStart, setPointPin, setPointText, setZoom, setPan]);

  const isBrushTool = activeTool === 'brush' || activeTool === 'eraser' || activeTool === 'smartErase';
  const brushMode = activeTool === 'eraser' ? 'eraser' as const : 'brush' as const;

  const handleMaskMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isBrushTool || e.button !== 0 || e.altKey) return;
    e.preventDefault();
    e.stopPropagation();
    isDrawing.current = true;
    lastDrawPos.current = null;
    const { x, y } = toCanvasCoords(e);
    if (maskCanvasRef.current) Mask.drawStroke(maskCanvasRef.current, x, y, null, brushSize, brushMode);
    lastDrawPos.current = { x, y };
  }, [isBrushTool, brushMode, brushSize, toCanvasCoords, maskCanvasRef]);

  const handleMaskMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    setBrushPos(toAreaCoords(e));
    if (!isDrawing.current || !isBrushTool) return;
    const { x, y } = toCanvasCoords(e);
    if (maskCanvasRef.current) Mask.drawStroke(maskCanvasRef.current, x, y, lastDrawPos.current, brushSize, brushMode);
    lastDrawPos.current = { x, y };
  }, [isBrushTool, brushMode, brushSize, toCanvasCoords, toAreaCoords, maskCanvasRef]);

  const handleMaskMouseUp = useCallback(() => {
    isDrawing.current = false;
    lastDrawPos.current = null;
  }, []);

  const isSelectTool = activeTool === 'marquee' || activeTool === 'lasso';

  const canvasCursor = isPanning ? 'grabbing'
    : activeTool === 'pointSelect' ? 'crosshair'
    : isBrushTool ? 'none'
    : isSelectTool ? 'crosshair'
    : activeTool === 'hand' ? 'grab'
    : activeTool === 'zoom' ? 'zoom-in'
    : activeTool === 'move' ? 'grab'
    : activeTool === 'eyedropper' ? 'crosshair'
    : activeTool === 'crop' ? 'crosshair'
    : 'default';

  const screenBrushSize = brushSize * zoom;

  const pinScreenPos = pointPin && imgSize.w && canvasAreaRef.current
    ? (() => {
        const areaRect = canvasAreaRef.current!.getBoundingClientRect();
        const cx = areaRect.width / 2;
        const cy = areaRect.height / 2;
        return {
          x: cx + pan.x + (pointPin.imgX - imgSize.w / 2) * zoom,
          y: cy + pan.y + (pointPin.imgY - imgSize.h / 2) * zoom,
        };
      })()
    : null;

  return (
    <div
      ref={canvasAreaRef}
      className="ps-canvas-area"
      style={{ cursor: canvasCursor }}
      onWheel={handleWheel}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={(e) => {
        handleMouseMove(e);
        if (isBrushTool) setBrushPos(toAreaCoords(e));
      }}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => { handleMouseUp(); handleMaskMouseUp(); setBrushPos(null); setCursorPos(null); }}
    >
      {activeImage ? (
        <>
          <div
            className="ps-transform-wrap"
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              width: imgSize.w || undefined,
              height: imgSize.h || undefined,
            }}
          >
            <ImageContextMenu
              image={activeImage}
              alt={activeSource?.label ?? 'Editor image'}
              onPasteImage={handlePasteImage as (img: GeneratedImage) => void}
              onResetView={fitToView}
            >
              <img
                src={`data:${activeImage.mimeType};base64,${activeImage.base64}`}
                alt={activeSource?.label ?? 'Editor'}
                className="ps-main-img"
                onLoad={handleImgLoad}
                draggable={false}
              />
            </ImageContextMenu>

            <canvas
              ref={maskCanvasRef}
              className="ps-mask-layer"
              style={{ pointerEvents: isBrushTool ? 'auto' : 'none' }}
              onWheel={handleWheel}
              onMouseDown={(e) => {
                if (e.button === 1 || (e.button === 0 && e.altKey)) handlePanStart(e);
                else handleMaskMouseDown(e);
              }}
              onMouseMove={(e) => { handleMouseMove(e); handleMaskMouseMove(e); }}
              onMouseUp={() => { handleMouseUp(); handleMaskMouseUp(); }}
              onMouseLeave={() => { handleMouseUp(); handleMaskMouseUp(); setBrushPos(null); }}
            />
          </div>

          {/* ── Selection overlays (marquee / lasso) ── */}
          {marqueeRect && activeTool === 'marquee' && imgSize.w > 0 && (
            <div className="ps-selection-overlay" style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              width: imgSize.w,
              height: imgSize.h,
              left: '50%',
              top: '50%',
              marginLeft: -(imgSize.w / 2),
              marginTop: -(imgSize.h / 2),
            }}>
              <svg width={imgSize.w} height={imgSize.h} className="ps-selection-svg">
                <rect
                  x={Math.min(marqueeRect.x, marqueeRect.x + marqueeRect.w)}
                  y={Math.min(marqueeRect.y, marqueeRect.y + marqueeRect.h)}
                  width={Math.abs(marqueeRect.w)}
                  height={Math.abs(marqueeRect.h)}
                  fill="none"
                  stroke="white"
                  strokeWidth={2 / zoom}
                  strokeDasharray={`${6 / zoom} ${4 / zoom}`}
                  className="ps-marching-ants"
                />
              </svg>
            </div>
          )}
          {lassoPoints.length > 1 && activeTool === 'lasso' && imgSize.w > 0 && (
            <div className="ps-selection-overlay" style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              width: imgSize.w,
              height: imgSize.h,
              left: '50%',
              top: '50%',
              marginLeft: -(imgSize.w / 2),
              marginTop: -(imgSize.h / 2),
            }}>
              <svg width={imgSize.w} height={imgSize.h} className="ps-selection-svg">
                <polyline
                  points={lassoPoints.map(p => `${p.imgX},${p.imgY}`).join(' ')}
                  fill="none"
                  stroke="white"
                  strokeWidth={2 / zoom}
                  strokeDasharray={`${6 / zoom} ${4 / zoom}`}
                  className="ps-marching-ants"
                />
              </svg>
            </div>
          )}

          {/* ── Crop overlay ── */}
          {cropRect && activeTool === 'crop' && imgSize.w > 0 && (
            <div className="ps-selection-overlay" style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              width: imgSize.w,
              height: imgSize.h,
              left: '50%',
              top: '50%',
              marginLeft: -(imgSize.w / 2),
              marginTop: -(imgSize.h / 2),
            }}>
              <svg width={imgSize.w} height={imgSize.h} className="ps-selection-svg">
                <rect
                  x={Math.min(cropRect.x, cropRect.x + cropRect.w)}
                  y={Math.min(cropRect.y, cropRect.y + cropRect.h)}
                  width={Math.abs(cropRect.w)}
                  height={Math.abs(cropRect.h)}
                  fill="none"
                  stroke="#00bcd4"
                  strokeWidth={2 / zoom}
                  strokeDasharray={`${8 / zoom} ${4 / zoom}`}
                />
                {/* Dim area outside crop */}
                <rect x={0} y={0} width={imgSize.w} height={imgSize.h} fill="rgba(0,0,0,0.5)"
                  clipPath="url(#ps-crop-clip)" />
                <defs>
                  <clipPath id="ps-crop-clip">
                    <rect x={0} y={0} width={imgSize.w} height={imgSize.h} />
                    <rect
                      x={Math.min(cropRect.x, cropRect.x + cropRect.w)}
                      y={Math.min(cropRect.y, cropRect.y + cropRect.h)}
                      width={Math.abs(cropRect.w)}
                      height={Math.abs(cropRect.h)}
                    />
                  </clipPath>
                </defs>
              </svg>
            </div>
          )}

          {isBrushTool && brushPos && !isPanning && (
            <div
              className="ps-brush-cursor"
              style={{
                width: screenBrushSize,
                height: screenBrushSize,
                left: brushPos.x - screenBrushSize / 2,
                top: brushPos.y - screenBrushSize / 2,
                borderColor: activeTool === 'eraser' ? 'rgba(255,255,255,0.7)' : 'rgba(255,60,60,0.8)',
              }}
            />
          )}

          {pinScreenPos && (
            <>
              <div className="ps-point-pin" style={{ left: pinScreenPos.x, top: pinScreenPos.y }} />
              <div
                className="ps-point-popup"
                style={{
                  left: Math.min(pinScreenPos.x + 12, (canvasAreaRef.current?.clientWidth ?? 500) - 280),
                  top: pinScreenPos.y - 16,
                }}
              >
                <input
                  ref={pointInputRef}
                  type="text"
                  value={pointText}
                  onChange={(e) => setPointText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !editBusy) handlePointEdit();
                    if (e.key === 'Escape') setPointPin(null);
                  }}
                  placeholder="Describe change at this point..."
                  disabled={editBusy}
                />
                <button onClick={handlePointEdit} disabled={editBusy || !pointText.trim()}>
                  {editBusy ? `${ctx.editElapsed}s` : 'Apply'}
                </button>
                <button className="ps-point-dismiss" onClick={() => setPointPin(null)}>&times;</button>
              </div>
            </>
          )}
        </>
      ) : (
        <span className="ps-canvas-empty">
          {activeSource
            ? <>No image generated for <strong>{activeSource.label}</strong> yet.<br />Generate an image in the node first.</>
            : <>No image selected.<br />Connect image nodes and click one in the sidebar.</>
          }
        </span>
      )}
    </div>
  );
}
