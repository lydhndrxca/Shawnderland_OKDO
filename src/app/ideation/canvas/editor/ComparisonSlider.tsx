"use client";

import { useCallback, useRef, useState } from 'react';
import { useEditor } from './EditorContext';

export default function ComparisonSlider() {
  const { comparisonActive, activeImage, historyEntries, imgSize } = useEditor();
  const [splitPct, setSplitPct] = useState(50);
  const dragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const prevImage = historyEntries[0]?.image ?? null;

  const handleMouseDown = useCallback(() => { dragging.current = true; }, []);
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pct = Math.max(5, Math.min(95, ((e.clientX - rect.left) / rect.width) * 100));
    setSplitPct(pct);
  }, []);
  const handleMouseUp = useCallback(() => { dragging.current = false; }, []);

  if (!comparisonActive || !activeImage || !prevImage || !imgSize.w) return null;

  return (
    <div
      ref={containerRef}
      className="ps-comparison-overlay"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="ps-comparison-left" style={{ width: `${splitPct}%` }}>
        <img src={`data:${prevImage.mimeType};base64,${prevImage.base64}`} alt="Before" />
        <span className="ps-comparison-label">Before</span>
      </div>
      <div className="ps-comparison-right" style={{ width: `${100 - splitPct}%` }}>
        <img src={`data:${activeImage.mimeType};base64,${activeImage.base64}`} alt="After" />
        <span className="ps-comparison-label">After</span>
      </div>
      <div
        className="ps-comparison-handle"
        style={{ left: `${splitPct}%` }}
        onMouseDown={handleMouseDown}
      />
    </div>
  );
}
