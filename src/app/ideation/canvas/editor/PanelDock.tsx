"use client";

import { useEditor } from './EditorContext';
import type { PanelTab } from './types';
import HistoryPanel from './panels/HistoryPanel';
import LayersPanel from './panels/LayersPanel';
import PropertiesPanel from './panels/PropertiesPanel';
import MacrosPanel from './panels/MacrosPanel';

const TABS: { id: PanelTab; label: string }[] = [
  { id: 'history', label: 'History' },
  { id: 'layers', label: 'Layers' },
  { id: 'properties', label: 'Props' },
  { id: 'macros', label: 'Macros' },
];

export default function PanelDock() {
  const { activePanel, setActivePanel, panelsVisible } = useEditor();
  if (!panelsVisible) return null;

  return (
    <div className="ps-paneldock">
      <div className="ps-panel-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`ps-panel-tab ${activePanel === tab.id ? 'active' : ''}`}
            onClick={() => setActivePanel(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="ps-panel-content">
        {activePanel === 'history' && <HistoryPanel />}
        {activePanel === 'layers' && <LayersPanel />}
        {activePanel === 'properties' && <PropertiesPanel />}
        {activePanel === 'macros' && <MacrosPanel />}
      </div>
    </div>
  );
}
