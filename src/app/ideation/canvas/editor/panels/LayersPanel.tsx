"use client";

import { useEditor } from '../EditorContext';

export default function LayersPanel() {
  const { historyEntries, activeImage, activeSource } = useEditor();

  const layers = [
    ...(activeImage && activeSource
      ? [{ label: 'Current', image: activeImage, isCurrent: true }]
      : []),
    ...historyEntries.slice(0, 20).map((e) => ({
      label: e.label,
      image: e.image,
      isCurrent: false,
    })),
  ];

  return (
    <div className="ps-layers-panel">
      {layers.length === 0 && (
        <div className="ps-panel-empty">No layers yet — edit an image to see layer history.</div>
      )}
      {layers.map((layer, i) => (
        <div key={i} className={`ps-layer-item ${layer.isCurrent ? 'active' : ''}`}>
          <img
            src={`data:${layer.image.mimeType};base64,${layer.image.base64}`}
            alt={layer.label}
            className="ps-layer-thumb"
          />
          <span className="ps-layer-label">{layer.label}</span>
          {layer.isCurrent && <span className="ps-layer-badge">Current</span>}
        </div>
      ))}
    </div>
  );
}
