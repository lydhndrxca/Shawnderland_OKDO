'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Lock, Unlock,
  Box, AppWindow, Frame, Grid3X3, RectangleHorizontal, Type, ChevronDown,
  ImageIcon,
  AlignStartHorizontal, AlignEndHorizontal, AlignStartVertical, AlignEndVertical,
  AlignCenterHorizontal, AlignCenterVertical,
  AlignHorizontalSpaceBetween, AlignVerticalSpaceBetween,
} from 'lucide-react';
import { useToolEditorStore } from './useToolEditorStore';
import type { TENodeKind } from './types';
import '../../app/ideation/canvas/ToolDock.css';
import './EditorToolDock.css';

interface Props {
  gridSize: number;
  onGridSizeChange: (size: number) => void;
}

interface TemplateDef {
  kind: TENodeKind;
  label: string;
  desc: string;
  Icon: typeof Box;
}

const TEMPLATES: TemplateDef[] = [
  { kind: 'generic', label: 'Node', desc: 'Customizable node with inputs, outputs & dropdowns', Icon: Box },
  { kind: 'window', label: 'Window', desc: 'Panel / viewport (3D viewer, display, etc.)', Icon: AppWindow },
  { kind: 'frame', label: 'Frame', desc: 'Layout frame to arrange UI sections', Icon: Frame },
  { kind: 'button', label: 'Button', desc: 'Standalone button element', Icon: RectangleHorizontal },
  { kind: 'textbox', label: 'Text Box', desc: 'Text input field', Icon: Type },
  { kind: 'dropdown', label: 'Dropdown', desc: 'Select / dropdown menu', Icon: ChevronDown },
  { kind: 'image', label: 'Image', desc: 'Image / thumbnail placeholder', Icon: ImageIcon },
];

interface CategoryDef {
  key: string;
  label: string;
  icon: string;
  items: TemplateDef[];
}

const CATEGORIES: CategoryDef[] = [
  {
    key: 'elements',
    label: 'UI Elements',
    icon: '\u{1F4E6}',
    items: TEMPLATES.filter((t) => ['generic', 'button', 'textbox', 'dropdown', 'image'].includes(t.kind)),
  },
  {
    key: 'containers',
    label: 'Containers',
    icon: '\u{1F5BC}',
    items: TEMPLATES.filter((t) => ['window', 'frame'].includes(t.kind)),
  },
];

export default function EditorToolDock({ gridSize, onGridSizeChange }: Props) {
  const { selectedIds, alignNodes, distributeNodes } = useToolEditorStore();
  const [activeTab, setActiveTab] = useState<'nodes' | 'details'>('nodes');
  const [collapsed, setCollapsed] = useState(false);
  const [pinned, setPinned] = useState(true);
  const [openCat, setOpenCat] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const multiSelected = selectedIds.length >= 2;
  const canDistribute = selectedIds.length >= 3;

  const filteredCategories = search.trim()
    ? CATEGORIES
        .map((cat) => ({
          ...cat,
          items: cat.items.filter(
            (item) =>
              item.label.toLowerCase().includes(search.toLowerCase()) ||
              item.desc.toLowerCase().includes(search.toLowerCase()),
          ),
        }))
        .filter((cat) => cat.items.length > 0)
    : CATEGORIES;

  const onDragStart = useCallback((e: React.DragEvent, kind: TENodeKind) => {
    e.dataTransfer.setData('application/te-node-kind', kind);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const cancelHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const handleMouseEnter = useCallback(() => {
    cancelHideTimer();
    if (!pinned && collapsed) setCollapsed(false);
  }, [pinned, collapsed, cancelHideTimer]);

  const handleMouseLeave = useCallback(() => {
    if (!pinned && !collapsed) setCollapsed(true);
  }, [pinned, collapsed]);

  useEffect(() => {
    return () => cancelHideTimer();
  }, [cancelHideTimer]);

  if (collapsed) {
    return (
      <div className="tool-dock-collapsed-strip" onMouseEnter={handleMouseEnter}>
        <button className="tool-dock-strip-expand" onClick={() => setCollapsed(false)} title="Expand panel">
          <span className="strip-chevron">&#x25B6;</span>
          <span className="strip-vertical-label">Nodes / Tools</span>
        </button>
      </div>
    );
  }

  return (
    <div className="tool-dock-panel" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <div className="tool-dock-tabs">
        <button className={`tool-dock-tab ${activeTab === 'nodes' ? 'active' : ''}`} onClick={() => setActiveTab('nodes')}>
          Nodes
        </button>
        <button className={`tool-dock-tab ${activeTab === 'details' ? 'active' : ''}`} onClick={() => setActiveTab('details')}>
          Tools
        </button>
        <button
          className={`tool-dock-pin-btn ${pinned ? 'pinned' : ''}`}
          onClick={() => setPinned((p) => !p)}
          title={pinned ? 'Unlock — panel will auto-hide' : 'Lock — panel stays open'}
        >
          {pinned ? <Lock size={14} /> : <Unlock size={14} />}
        </button>
      </div>

      <div className="tool-dock-content">
        {activeTab === 'nodes' ? (
          <div className="tool-dock-nodes-list">
            <div className="tool-dock-search">
              <input
                className="tool-dock-search-input"
                placeholder="Search elements..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {filteredCategories.map((cat) => (
              <div key={cat.key} className="tool-dock-category">
                <button
                  className={`tool-dock-cat-header ${openCat === cat.key || search.trim() ? 'open' : ''}`}
                  onClick={() => setOpenCat(openCat === cat.key ? null : cat.key)}
                >
                  <span className="tool-dock-cat-icon">{cat.icon}</span>
                  <span className="tool-dock-cat-label">{cat.label}</span>
                  <span className="tool-dock-cat-count">{cat.items.length}</span>
                  <span className="tool-dock-cat-chevron">{openCat === cat.key ? '\u25BE' : '\u25B8'}</span>
                </button>
                {(openCat === cat.key || search.trim()) && (
                  <div className="tool-dock-cat-items">
                    {cat.items.map((item) => (
                      <div
                        key={item.kind}
                        className="tool-dock-item"
                        draggable
                        onDragStart={(e) => onDragStart(e, item.kind)}
                        title={item.desc}
                      >
                        <div className="tool-dock-item-text">
                          <span className="tool-dock-item-label">{item.label}</span>
                          <span className="tool-dock-item-subtitle">{item.desc}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="te-tools-tab">
            <div className="te-tools-section">
              <h3 className="te-tools-heading">
                <Grid3X3 size={13} style={{ marginRight: 4, opacity: 0.6 }} />
                Grid Size
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

            <div className="te-tools-section">
              <h3 className="te-tools-heading">Align</h3>
              <div className="te-align-grid">
                <button className="te-align-btn" disabled={!multiSelected} onClick={() => alignNodes('left')} title="Align left">
                  <AlignStartHorizontal size={14} />
                </button>
                <button className="te-align-btn" disabled={!multiSelected} onClick={() => alignNodes('centerH')} title="Align center (horizontal)">
                  <AlignCenterHorizontal size={14} />
                </button>
                <button className="te-align-btn" disabled={!multiSelected} onClick={() => alignNodes('right')} title="Align right">
                  <AlignEndHorizontal size={14} />
                </button>
                <button className="te-align-btn" disabled={!multiSelected} onClick={() => alignNodes('top')} title="Align top">
                  <AlignStartVertical size={14} />
                </button>
                <button className="te-align-btn" disabled={!multiSelected} onClick={() => alignNodes('centerV')} title="Align center (vertical)">
                  <AlignCenterVertical size={14} />
                </button>
                <button className="te-align-btn" disabled={!multiSelected} onClick={() => alignNodes('bottom')} title="Align bottom">
                  <AlignEndVertical size={14} />
                </button>
              </div>
              <h3 className="te-tools-heading te-tools-heading-sub">Distribute</h3>
              <div className="te-align-grid te-align-grid-2">
                <button className="te-align-btn" disabled={!canDistribute} onClick={() => distributeNodes('horizontal')} title="Distribute horizontally (3+ nodes)">
                  <AlignHorizontalSpaceBetween size={14} />
                </button>
                <button className="te-align-btn" disabled={!canDistribute} onClick={() => distributeNodes('vertical')} title="Distribute vertically (3+ nodes)">
                  <AlignVerticalSpaceBetween size={14} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <button className="tool-dock-edge-strip" onClick={() => setCollapsed(true)} title="Collapse panel">
        <span className="strip-chevron">&#x25C0;</span>
        <span className="strip-vertical-label">Nodes / Tools</span>
      </button>
    </div>
  );
}
