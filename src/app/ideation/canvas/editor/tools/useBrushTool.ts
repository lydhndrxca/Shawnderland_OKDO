import { useCallback, useRef } from 'react';
import * as Mask from '../engines/maskEngine';

/**
 * Encapsulates brush/eraser drawing state for the mask canvas.
 * Returns handlers for mouse down/move/up on the mask canvas element.
 */
export function useBrushTool(
  maskCanvasRef: React.RefObject<HTMLCanvasElement | null>,
  brushSize: number,
  mode: 'brush' | 'eraser',
) {
  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const toCanvasCoords = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = e.currentTarget;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0 || e.altKey) return false;
    e.preventDefault();
    e.stopPropagation();
    isDrawing.current = true;
    lastPos.current = null;
    const { x, y } = toCanvasCoords(e);
    if (maskCanvasRef.current) {
      Mask.drawStroke(maskCanvasRef.current, x, y, null, brushSize, mode);
    }
    lastPos.current = { x, y };
    return true;
  }, [maskCanvasRef, brushSize, mode, toCanvasCoords]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return;
    const { x, y } = toCanvasCoords(e);
    if (maskCanvasRef.current) {
      Mask.drawStroke(maskCanvasRef.current, x, y, lastPos.current, brushSize, mode);
    }
    lastPos.current = { x, y };
  }, [maskCanvasRef, brushSize, mode, toCanvasCoords]);

  const handleMouseUp = useCallback(() => {
    isDrawing.current = false;
    lastPos.current = null;
  }, []);

  return { handleMouseDown, handleMouseMove, handleMouseUp, isDrawing };
}
