"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import '@/app/ideation/canvas/ContextMenu.css';

export interface ContextMenuCategory {
  label: string;
  items: Array<{ id: string; label: string; color: string }>;
}

export interface CanvasContextMenuProps {
  x: number;
  y: number;
  nodeId?: string;
  selectedNodeCount?: number;
  categories: ContextMenuCategory[];
  onClose: () => void;
  onAddNode?: (nodeType: string) => void;
  onDelete?: () => void;
  onDeleteSelected?: () => void;
  onDuplicateSelected?: () => void;
  onAutoLayout?: () => void;
  onFitView?: () => void;
}

export default function CanvasContextMenu({
  x,
  y,
  nodeId,
  selectedNodeCount,
  categories,
  onClose,
  onAddNode,
  onDelete,
  onDeleteSelected,
  onDuplicateSelected,
  onAutoLayout,
  onFitView,
}: CanvasContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [openSub, setOpenSub] = useState<string | null>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const multiSelected = (selectedNodeCount ?? 0) >= 2;

  return (
    <div ref={ref} className="context-menu" style={{ left: x, top: y }}>
      {nodeId ? (
        <>
          {multiSelected && (
            <>
              <button className="context-menu-item" onClick={() => { onDuplicateSelected?.(); onClose(); }}>
                <span className="context-menu-icon">{'\u29C9'}</span>Duplicate Selected
              </button>
              <button className="context-menu-item context-menu-danger" onClick={() => { onDeleteSelected?.(); onClose(); }}>
                <span className="context-menu-icon">{'\u2715'}</span>Delete Selected
              </button>
              <div className="context-menu-separator" />
            </>
          )}
          <button className="context-menu-item context-menu-danger" onClick={() => { onDelete?.(); onClose(); }}>
            <span className="context-menu-icon">{'\u2715'}</span>Delete node
          </button>
        </>
      ) : (
        <>
          <div className="context-menu-divider-label">Add Node</div>
          {categories.map((cat) => (
            <div
              key={cat.label}
              className="context-menu-sub-wrap"
              onMouseEnter={() => setOpenSub(cat.label)}
              onMouseLeave={() => setOpenSub(null)}
            >
              <button className={`context-menu-item context-menu-sub-trigger ${openSub === cat.label ? 'active' : ''}`}>
                <span className="context-menu-sub-arrow">{'\u25B8'}</span>
                {cat.label}
              </button>
              {openSub === cat.label && (
                <div className="context-menu-submenu">
                  {cat.items.map((item) => (
                    <button
                      key={item.id}
                      className="context-menu-item"
                      onClick={() => { onAddNode?.(item.id); onClose(); }}
                    >
                      <span className="context-menu-dot" style={{ background: item.color }} />
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {multiSelected && (
            <>
              <div className="context-menu-separator" />
              <button className="context-menu-item" onClick={() => { onDuplicateSelected?.(); onClose(); }}>
                <span className="context-menu-icon">{'\u29C9'}</span>Duplicate Selected
              </button>
              <button className="context-menu-item context-menu-danger" onClick={() => { onDeleteSelected?.(); onClose(); }}>
                <span className="context-menu-icon">{'\u2715'}</span>Delete Selected
              </button>
            </>
          )}

          <div className="context-menu-separator" />

          {onAutoLayout && (
            <button className="context-menu-item" onClick={() => { onAutoLayout(); onClose(); }}>
              <span className="context-menu-icon">{'\u229E'}</span>Auto-layout
            </button>
          )}
          <button className="context-menu-item" onClick={() => { onFitView?.(); onClose(); }}>
            <span className="context-menu-icon">{'\u22A1'}</span>Fit view
          </button>
        </>
      )}
    </div>
  );
}
