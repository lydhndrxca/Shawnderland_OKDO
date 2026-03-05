'use client';

import { useCallback } from 'react';
import { Box, AppWindow, Frame, Grid3X3 } from 'lucide-react';
import type { TENodeKind } from './types';
import './EditorToolDock.css';

interface Props {
  gridSize: number;
  onGridSizeChange: (size: number) => void;
}

const TEMPLATES: { kind: TENodeKind; label: string; desc: string; Icon: typeof Box }[] = [
  { kind: 'generic', label: 'Node', desc: 'Customizable node with inputs, outputs & dropdowns', Icon: Box },
  { kind: 'window', label: 'Window', desc: 'Panel / viewport (3D viewer, display, etc.)', Icon: AppWindow },
  { kind: 'frame', label: 'Frame', desc: 'Layout frame to arrange UI sections', Icon: Frame },
];

export default function EditorToolDock({ gridSize, onGridSizeChange }: Props) {
  const onDragStart = useCallback((e: React.DragEvent, kind: TENodeKind) => {
    e.dataTransfer.setData('application/te-node-kind', kind);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  return (
    <aside className="te-dock">
      <div className="te-dock-section">
        <h3 className="te-dock-heading">Templates</h3>
        {TEMPLATES.map((t) => (
          <div
            key={t.kind}
            className="te-dock-item"
            draggable
            onDragStart={(e) => onDragStart(e, t.kind)}
            title={t.desc}
          >
            <t.Icon size={16} className="te-dock-icon" />
            <div className="te-dock-item-text">
              <span className="te-dock-item-label">{t.label}</span>
              <span className="te-dock-item-desc">{t.desc}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="te-dock-section">
        <h3 className="te-dock-heading">
          <Grid3X3 size={13} style={{ marginRight: 4, opacity: 0.6 }} />
          Grid
        </h3>
        <div className="te-grid-control">
          <input
            type="range"
            min={5}
            max={100}
            step={5}
            value={gridSize}
            onChange={(e) => onGridSizeChange(Number(e.target.value))}
            className="te-grid-slider"
          />
          <span className="te-grid-value">{gridSize}px</span>
        </div>
      </div>
    </aside>
  );
}
