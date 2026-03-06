"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import '@/app/ideation/canvas/ContextMenu.css';

export interface ContextMenuCategory {
  label: string;
  items: Array<{ id: string; label: string; color: string }>;
}

export interface CustomNodeAction {
  label: string;
  icon: string;
  onClick: () => void;
  danger?: boolean;
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

  onCopy?: () => void;
  onPaste?: () => void;
  onPin?: () => void;
  isPinned?: boolean;
  onCreateGroup?: () => void;
  onUngroupNode?: () => void;
  onExpandGroup?: () => void;
  onCollapseGroup?: () => void;
  isGroupNode?: boolean;
  isGroupExpanded?: boolean;
  onOpenImage?: () => void;
  onPasteImage?: () => void;
  customNodeActions?: CustomNodeAction[];

  edgeId?: string;
  onDeleteEdge?: () => void;
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
  onCopy,
  onPaste,
  onPin,
  isPinned,
  onCreateGroup,
  onUngroupNode,
  onExpandGroup,
  onCollapseGroup,
  isGroupNode,
  isGroupExpanded,
  onOpenImage,
  onPasteImage,
  customNodeActions,
  edgeId,
  onDeleteEdge,
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

  if (edgeId) {
    return (
      <div ref={ref} className="context-menu" style={{ left: x, top: y }}>
        <button className="context-menu-item context-menu-danger" onClick={() => { onDeleteEdge?.(); onClose(); }}>
          <span className="context-menu-icon">{'\u2715'}</span>Delete Connection
        </button>
      </div>
    );
  }

  return (
    <div ref={ref} className="context-menu" style={{ left: x, top: y }}>
      {nodeId ? (
        <>
          {onCopy && (
            <button className="context-menu-item" onClick={() => { onCopy(); onClose(); }}>
              <span className="context-menu-icon">{'\uD83D\uDCCB'}</span>Copy
            </button>
          )}
          {onPaste && (
            <button className="context-menu-item" onClick={() => { onPaste(); onClose(); }}>
              <span className="context-menu-icon">{'\uD83D\uDCCE'}</span>Paste
            </button>
          )}
          {onDuplicateSelected && (
            <button className="context-menu-item" onClick={() => { onDuplicateSelected(); onClose(); }}>
              <span className="context-menu-icon">{'\u29C9'}</span>Duplicate
            </button>
          )}

          {customNodeActions && customNodeActions.length > 0 && (
            <>
              <div className="context-menu-separator" />
              {customNodeActions.map((action, i) => (
                <button
                  key={i}
                  className={`context-menu-item ${action.danger ? 'context-menu-danger' : ''}`}
                  onClick={() => { action.onClick(); onClose(); }}
                >
                  <span className="context-menu-icon">{action.icon}</span>{action.label}
                </button>
              ))}
            </>
          )}

          <div className="context-menu-separator" />

          {onPin && (
            <button className="context-menu-item" onClick={() => { onPin(); onClose(); }}>
              <span className="context-menu-icon">{isPinned ? '\uD83D\uDD13' : '\uD83D\uDCCC'}</span>
              {isPinned ? 'Unpin' : 'Pin'}
            </button>
          )}

          {multiSelected && (
            <>
              <div className="context-menu-separator" />
              {onCreateGroup && (
                <button className="context-menu-item" onClick={() => { onCreateGroup(); onClose(); }}>
                  <span className="context-menu-icon">{'\u229E'}</span>Create Group
                </button>
              )}
              <button className="context-menu-item" onClick={() => { onDuplicateSelected?.(); onClose(); }}>
                <span className="context-menu-icon">{'\u29C9'}</span>Duplicate Selected
              </button>
              <button className="context-menu-item context-menu-danger" onClick={() => { onDeleteSelected?.(); onClose(); }}>
                <span className="context-menu-icon">{'\u2715'}</span>Delete Selected
              </button>
            </>
          )}

          {isGroupNode && (
            <>
              <div className="context-menu-separator" />
              {isGroupExpanded ? (
                <button className="context-menu-item" onClick={() => { onCollapseGroup?.(); onClose(); }}>
                  <span className="context-menu-icon">{'\u229F'}</span>Collapse
                </button>
              ) : (
                <button className="context-menu-item" onClick={() => { onExpandGroup?.(); onClose(); }}>
                  <span className="context-menu-icon">{'\u229E'}</span>Expand
                </button>
              )}
              <button className="context-menu-item" onClick={() => { onUngroupNode?.(); onClose(); }}>
                <span className="context-menu-icon">{'\u2715'}</span>Ungroup
              </button>
            </>
          )}

          <div className="context-menu-separator" />
          <button className="context-menu-item context-menu-danger" onClick={() => { onDelete?.(); onClose(); }}>
            <span className="context-menu-icon">{'\u2715'}</span>Delete node
          </button>
        </>
      ) : (
        <>
          {onOpenImage && (
            <button className="context-menu-item" onClick={() => { onOpenImage(); onClose(); }}>
              <span className="context-menu-icon">{'\uD83D\uDDBC'}</span>Open Image...
            </button>
          )}
          {onPasteImage && (
            <button className="context-menu-item" onClick={() => { onPasteImage(); onClose(); }}>
              <span className="context-menu-icon">{'\uD83D\uDCCE'}</span>Paste Image
            </button>
          )}

          {(onOpenImage || onPasteImage) && <div className="context-menu-separator" />}

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

          {onCopy && onPaste && (
            <>
              <div className="context-menu-separator" />
              <button className="context-menu-item" onClick={() => { onCopy(); onClose(); }}>
                <span className="context-menu-icon">{'\uD83D\uDCCB'}</span>Copy
              </button>
              <button className="context-menu-item" onClick={() => { onPaste(); onClose(); }}>
                <span className="context-menu-icon">{'\uD83D\uDCCE'}</span>Paste
              </button>
            </>
          )}

          {multiSelected && (
            <>
              <div className="context-menu-separator" />
              {onCreateGroup && (
                <button className="context-menu-item" onClick={() => { onCreateGroup(); onClose(); }}>
                  <span className="context-menu-icon">{'\u229E'}</span>Create Group
                </button>
              )}
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
