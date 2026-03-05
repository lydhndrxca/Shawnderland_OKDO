"use client";

import { useState, useCallback, useRef, useEffect } from 'react';
import { Lock, Unlock } from 'lucide-react';
import type { Node, Edge } from '@xyflow/react';
import '../../app/ideation/canvas/ToolDock.css';

interface DockNodeDef {
  type: string;
  label: string;
  desc: string;
  color: string;
}

interface CategoryDef {
  key: string;
  label: string;
  icon: string;
  items: DockNodeDef[];
}

interface TemplateDef {
  label: string;
  icon: string;
  nodes: Node[];
  edges: Edge[];
}

interface GeminiStudioDockProps {
  categories: CategoryDef[];
  templates: TemplateDef[];
  onLoadTemplate: (nodes: Node[], edges: Edge[]) => void;
  selectedNodeId: string | null;
  onCloseInspector: () => void;
}

export default function GeminiStudioDock({
  categories,
  templates,
  onLoadTemplate,
  selectedNodeId,
  onCloseInspector,
}: GeminiStudioDockProps) {
  const [activeTab, setActiveTab] = useState<'nodes' | 'details'>('nodes');
  const [collapsed, setCollapsed] = useState(false);
  const [pinned, setPinned] = useState(true);
  const [openCat, setOpenCat] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filteredCategories = search.trim()
    ? categories
        .map((cat) => ({
          ...cat,
          items: cat.items.filter(
            (item) =>
              item.label.toLowerCase().includes(search.toLowerCase()) ||
              item.desc.toLowerCase().includes(search.toLowerCase()),
          ),
        }))
        .filter((cat) => cat.items.length > 0)
    : categories;

  useEffect(() => {
    if (selectedNodeId) setActiveTab('details');
  }, [selectedNodeId]);

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

  const handleDragStart = useCallback((e: React.DragEvent, type: string) => {
    e.dataTransfer.setData('application/gs-node-type', type);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  if (collapsed) {
    return (
      <div className="tool-dock-collapsed-strip" onMouseEnter={handleMouseEnter}>
        <button className="tool-dock-strip-expand" onClick={() => setCollapsed(false)} title="Expand panel">
          <span className="strip-chevron">&#x25B6;</span>
          <span className="strip-vertical-label">Nodes / Details</span>
        </button>
      </div>
    );
  }

  return (
    <div className="tool-dock-panel" style={{ position: 'relative' }} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <div className="tool-dock-tabs">
        <button className={`tool-dock-tab ${activeTab === 'nodes' ? 'active' : ''}`} onClick={() => setActiveTab('nodes')}>
          Nodes
        </button>
        <button className={`tool-dock-tab ${activeTab === 'details' ? 'active' : ''}`} onClick={() => setActiveTab('details')}>
          Details
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
                placeholder="Search nodes..."
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
                        key={item.type}
                        className="tool-dock-item"
                        draggable
                        onDragStart={(e) => handleDragStart(e, item.type)}
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

            {templates.length > 0 && (
              <div className="tool-dock-category">
                <button
                  className={`tool-dock-cat-header ${openCat === 'templates' || search.trim() ? 'open' : ''}`}
                  onClick={() => setOpenCat(openCat === 'templates' ? null : 'templates')}
                >
                  <span className="tool-dock-cat-icon">{'\u{1F4CB}'}</span>
                  <span className="tool-dock-cat-label">Templates</span>
                  <span className="tool-dock-cat-count">{templates.length}</span>
                  <span className="tool-dock-cat-chevron">{openCat === 'templates' ? '\u25BE' : '\u25B8'}</span>
                </button>
                {(openCat === 'templates' || search.trim()) && (
                  <div className="tool-dock-cat-items">
                    {templates.map((t, i) => (
                      <div
                        key={i}
                        className="tool-dock-item"
                        style={{ cursor: 'pointer' }}
                        onClick={() => onLoadTemplate(t.nodes, t.edges)}
                      >
                        <div className="tool-dock-item-text">
                          <span className="tool-dock-item-label">{t.icon} {t.label}</span>
                          <span className="tool-dock-item-subtitle">Click to load template</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="tool-dock-details-empty">
            {selectedNodeId ? (
              <>
                <p>Node selected: <strong>{selectedNodeId}</strong></p>
                <button className="details-close-btn" onClick={onCloseInspector}>&times;</button>
              </>
            ) : (
              <>
                <span className="details-empty-icon">&#x25CE;</span>
                <p>Select a node to view details</p>
              </>
            )}
          </div>
        )}
      </div>

      <button className="tool-dock-edge-strip" onClick={() => setCollapsed(true)} title="Collapse panel">
        <span className="strip-chevron">&#x25C0;</span>
        <span className="strip-vertical-label">Nodes / Details</span>
      </button>
    </div>
  );
}
