"use client";

import { useState, useCallback, useRef, useEffect } from 'react';
import { Lock, Unlock } from 'lucide-react';
import type { Node, Edge } from '@xyflow/react';
import { useReactFlow } from '@xyflow/react';
import NODE_TOOLTIPS from '@/app/ideation/canvas/nodes/character/nodeTooltips';
import { NODE_DESCRIPTIONS } from '@/lib/nodeDescriptions';
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

interface ConceptLabDockProps {
  categories: CategoryDef[];
  templates: TemplateDef[];
  onLoadTemplate: (nodes: Node[], edges: Edge[]) => void;
  selectedNodeId: string | null;
  onCloseInspector: () => void;
}

export default function ConceptLabDock({
  categories,
  templates,
  onLoadTemplate,
  selectedNodeId,
  onCloseInspector,
}: ConceptLabDockProps) {
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

  // User must manually click the Details tab — no auto-switch on node selection

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
    e.dataTransfer.setData('application/cl-node-type', type);
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

          </div>
        ) : (
          <NodeDetailsPanel nodeId={selectedNodeId} onClose={onCloseInspector} />
        )}
      </div>

      <button className="tool-dock-edge-strip" onClick={() => setCollapsed(true)} title="Collapse panel">
        <span className="strip-chevron">&#x25C0;</span>
        <span className="strip-vertical-label">Nodes / Details</span>
      </button>
    </div>
  );
}

function NodeDetailsPanel({ nodeId, onClose }: { nodeId: string | null; onClose: () => void }) {
  const { getNode } = useReactFlow();

  if (!nodeId) {
    return (
      <div className="tool-dock-details-empty">
        <span className="details-empty-icon">&#x25CE;</span>
        <p>Select a node to view details</p>
      </div>
    );
  }

  const node = getNode(nodeId);
  const nodeType = node?.type ?? nodeId.split('-')[0];
  const desc = NODE_DESCRIPTIONS[nodeType];
  const tooltip = NODE_TOOLTIPS[nodeType];
  const label = desc?.label ?? (node?.data?.label as string) ?? nodeType;

  return (
    <div className="tool-dock-details">
      <div className="details-header" style={{ borderBottomColor: desc?.color ?? '#888' }}>
        <span className="details-dot" style={{ background: desc?.color ?? '#888' }} />
        <span className="details-title">{label}</span>
        <button className="details-close-btn" onClick={onClose}>&times;</button>
      </div>
      <div className="details-body">
        {desc && (
          <div className="inspector-section">
            <p className="inspector-text" style={{ marginBottom: 12 }}>{desc.description}</p>
            {desc.connectsTo && desc.connectsTo.length > 0 && (
              <>
                <h4 style={{ fontSize: 12, marginBottom: 6, color: '#aaa' }}>Connects to</h4>
                <ul className="inspector-list">
                  {desc.connectsTo.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              </>
            )}
            {desc.connectsFrom && desc.connectsFrom.length > 0 && (
              <>
                <h4 style={{ fontSize: 12, marginBottom: 6, color: '#aaa' }}>Receives from</h4>
                <ul className="inspector-list">
                  {desc.connectsFrom.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              </>
            )}
          </div>
        )}
        {!desc && tooltip && (
          <div className="inspector-section">
            <p className="inspector-text">{tooltip}</p>
          </div>
        )}
        {!desc && !tooltip && (
          <div className="inspector-section">
            <p className="inspector-text" style={{ color: '#888' }}>No description available for this node type.</p>
          </div>
        )}
      </div>
    </div>
  );
}
