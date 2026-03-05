"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import type { StageId } from '@/lib/ideation/engine/stages';
import {
  STAGE_ORDER, NODE_META,
  OUTPUT_NODE_TYPES, INPUT_NODE_TYPES, INFLUENCE_NODE_TYPES, UTILITY_NODE_TYPES, CONTROL_NODE_TYPES,
  OUTPUT_NODE_META, INPUT_NODE_META, INFLUENCE_NODE_META, UTILITY_NODE_META, CONTROL_NODE_META,
} from './nodes/nodeRegistry';
import './ContextMenu.css';

interface ContextMenuProps {
  x: number;
  y: number;
  nodeId?: string;
  stageId?: StageId;
  selectedNodeCount?: number;
  onClose: () => void;
  onCopy?: () => void;
  onSaveJson?: () => void;
  onBranch?: () => void;
  onRunFromHere?: () => void;
  onDelete?: () => void;
  onAddNode?: (nodeType: string) => void;
  onAutoLayout?: () => void;
  onFitView?: () => void;
  onOpenImage?: () => void;
  onPasteImage?: () => void;
  onCreateGroup?: () => void;
  onUngroupNode?: () => void;
  onExpandGroup?: () => void;
  onCollapseGroup?: () => void;
  onDeleteSelected?: () => void;
  onDuplicateSelected?: () => void;
  isGroupNode?: boolean;
  isGroupExpanded?: boolean;
}

interface SubCategory {
  label: string;
  items: Array<{ id: string; label: string; color: string }>;
}

const REFERENCE_INFLUENCES = ['textInfluence', 'documentInfluence', 'imageInfluence', 'linkInfluence', 'videoInfluence', 'imageReference'] as const;
const MODIFIER_INFLUENCES = ['emotion', 'influence'] as const;

function buildCategories(): SubCategory[] {
  return [
    {
      label: 'Pipeline',
      items: STAGE_ORDER.map((s) => ({
        id: s,
        label: NODE_META[s].label,
        color: NODE_META[s].color,
      })),
    },
    {
      label: 'Inputs & References',
      items: REFERENCE_INFLUENCES.map((t) => {
        const infMeta = (INFLUENCE_NODE_META as Record<string, { label: string; color: string }>)[t];
        const utMeta = (UTILITY_NODE_META as Record<string, { label: string; color: string }>)[t];
        const meta = infMeta ?? utMeta;
        return { id: t, label: meta.label, color: meta.color };
      }),
    },
    {
      label: 'Modifiers',
      items: [
        ...INPUT_NODE_TYPES.map((t) => ({
          id: t,
          label: INPUT_NODE_META[t].label,
          color: INPUT_NODE_META[t].color,
        })),
        ...MODIFIER_INFLUENCES.map((t) => ({
          id: t,
          label: INFLUENCE_NODE_META[t].label,
          color: INFLUENCE_NODE_META[t].color,
        })),
      ],
    },
    {
      label: 'Outputs',
      items: [
        ...OUTPUT_NODE_TYPES.map((t) => ({
          id: t,
          label: OUTPUT_NODE_META[t].label,
          color: OUTPUT_NODE_META[t].color,
        })),
        ...UTILITY_NODE_TYPES.filter((t) => t === 'extractData').map((t) => ({
          id: t,
          label: UTILITY_NODE_META[t].label,
          color: UTILITY_NODE_META[t].color,
        })),
      ],
    },
    {
      label: 'Control',
      items: CONTROL_NODE_TYPES.map((t) => ({
        id: t,
        label: CONTROL_NODE_META[t].label,
        color: CONTROL_NODE_META[t].color,
      })),
    },
  ];
}

export default function ContextMenu({
  x,
  y,
  nodeId,
  selectedNodeCount,
  onClose,
  onCopy,
  onSaveJson,
  onBranch,
  onRunFromHere,
  onDelete,
  onAddNode,
  onAutoLayout,
  onFitView,
  onOpenImage,
  onPasteImage,
  onCreateGroup,
  onUngroupNode,
  onExpandGroup,
  onCollapseGroup,
  onDeleteSelected,
  onDuplicateSelected,
  isGroupNode,
  isGroupExpanded,
}: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [openSub, setOpenSub] = useState<string | null>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
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

  const categories = buildCategories();
  const multiSelected = (selectedNodeCount ?? 0) >= 2;

  return (
    <div
      ref={ref}
      className="context-menu"
      style={{ left: x, top: y }}
    >
      {nodeId ? (
        <>
          <button className="context-menu-item" onClick={() => { onCopy?.(); onClose(); }}>
            <span className="context-menu-icon">📋</span>Copy idea state
          </button>
          <button className="context-menu-item" onClick={() => { onSaveJson?.(); onClose(); }}>
            <span className="context-menu-icon">💾</span>Save as JSON
          </button>
          <button className="context-menu-item" onClick={() => { onBranch?.(); onClose(); }}>
            <span className="context-menu-icon">🌿</span>Branch from here
          </button>
          <button className="context-menu-item" onClick={() => { onRunFromHere?.(); onClose(); }}>
            <span className="context-menu-icon">▶</span>Run from here
          </button>
          {multiSelected && (
            <>
              <div className="context-menu-separator" />
              <button className="context-menu-item" onClick={() => { onCreateGroup?.(); onClose(); }}>
                <span className="context-menu-icon">⊞</span>Create Group
              </button>
              <button className="context-menu-item" onClick={() => { onDuplicateSelected?.(); onClose(); }}>
                <span className="context-menu-icon">⧉</span>Duplicate Selected
              </button>
              <button className="context-menu-item context-menu-danger" onClick={() => { onDeleteSelected?.(); onClose(); }}>
                <span className="context-menu-icon">✕</span>Delete Selected
              </button>
            </>
          )}
          {isGroupNode && (
            <>
              {isGroupExpanded ? (
                <button className="context-menu-item" onClick={() => { onCollapseGroup?.(); onClose(); }}>
                  <span className="context-menu-icon">⊟</span>Collapse
                </button>
              ) : (
                <button className="context-menu-item" onClick={() => { onExpandGroup?.(); onClose(); }}>
                  <span className="context-menu-icon">⊞</span>Expand
                </button>
              )}
              <button className="context-menu-item" onClick={() => { onUngroupNode?.(); onClose(); }}>
                <span className="context-menu-icon">✕</span>Ungroup
              </button>
            </>
          )}
          <div className="context-menu-separator" />
          <button className="context-menu-item context-menu-danger" onClick={() => { onDelete?.(); onClose(); }}>
            <span className="context-menu-icon">✕</span>Delete node
          </button>
        </>
      ) : (
        <>
          <button className="context-menu-item" onClick={() => { onOpenImage?.(); onClose(); }}>
            <span className="context-menu-icon">🖼</span>Open Image...
          </button>
          <button className="context-menu-item" onClick={() => { onPasteImage?.(); onClose(); }}>
            <span className="context-menu-icon">📎</span>Paste Image
          </button>

          <div className="context-menu-separator" />

          <div className="context-menu-divider-label">Add Node</div>
          {categories.map((cat) => (
            <div
              key={cat.label}
              className="context-menu-sub-wrap"
              onMouseEnter={() => setOpenSub(cat.label)}
              onMouseLeave={() => setOpenSub(null)}
            >
              <button className={`context-menu-item context-menu-sub-trigger ${openSub === cat.label ? 'active' : ''}`}>
                <span className="context-menu-sub-arrow">▸</span>
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
              <button className="context-menu-item" onClick={() => { onCreateGroup?.(); onClose(); }}>
                <span className="context-menu-icon">⊞</span>Create Group
              </button>
              <button className="context-menu-item" onClick={() => { onDuplicateSelected?.(); onClose(); }}>
                <span className="context-menu-icon">⧉</span>Duplicate Selected
              </button>
              <button className="context-menu-item context-menu-danger" onClick={() => { onDeleteSelected?.(); onClose(); }}>
                <span className="context-menu-icon">✕</span>Delete Selected
              </button>
            </>
          )}

          <div className="context-menu-separator" />

          <button className="context-menu-item" onClick={() => { onAutoLayout?.(); onClose(); }}>
            <span className="context-menu-icon">⊞</span>Auto-layout
          </button>
          <button className="context-menu-item" onClick={() => { onFitView?.(); onClose(); }}>
            <span className="context-menu-icon">⊡</span>Fit view
          </button>
        </>
      )}
    </div>
  );
}
