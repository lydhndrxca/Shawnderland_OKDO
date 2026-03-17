"use client";

import { useEditor } from './EditorContext';
import type { EditorTool } from './types';
import { TOOL_GROUPS, TOOL_LABELS, TOOL_SHORTCUT_DISPLAY } from './types';

const S = 16;
const svgBase = { width: S, height: S, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

function ToolIcon({ tool }: { tool: EditorTool }) {
  switch (tool) {
    case 'move':
      return <svg {...svgBase}><path d="M8 2v12M2 8h12M8 2l-2 2M8 2l2 2M8 14l-2-2M8 14l2-2M2 8l2-2M2 8l2 2M14 8l-2-2M14 8l-2 2"/></svg>;
    case 'marquee':
      return <svg {...svgBase}><rect x="3" y="3" width="10" height="10" strokeDasharray="2 2"/></svg>;
    case 'lasso':
      return <svg {...svgBase}><path d="M8 3c3 0 5 2 5 5s-3 5-6 4c-2-1-3-2-2-4"/></svg>;
    case 'smartSelect':
      return <svg {...svgBase} fill="currentColor" stroke="none"><path d="M8 1l1.8 4.2L14 7l-4.2 1.8L8 13l-1.8-4.2L2 7l4.2-1.8z"/></svg>;
    case 'pointSelect':
      return <svg {...svgBase}><circle cx="8" cy="8" r="3"/><line x1="8" y1="2" x2="8" y2="5"/><line x1="8" y1="11" x2="8" y2="14"/><line x1="2" y1="8" x2="5" y2="8"/><line x1="11" y1="8" x2="14" y2="8"/></svg>;
    case 'brush':
      return <svg {...svgBase}><path d="M3 13l1.5-5L11 2l3 3-6.5 6.5L3 13z"/><path d="M9.5 3.5l3 3"/></svg>;
    case 'eraser':
      return <svg {...svgBase}><path d="M6 14h8M2.5 9.5L7 5l5 5-3 3.5H5.5l-3-4z"/></svg>;
    case 'cloneStamp':
      return <svg {...svgBase}><circle cx="8" cy="6" r="4"/><path d="M8 10v4M5 14h6"/></svg>;
    case 'crop':
      return <svg {...svgBase}><path d="M5 2v9h9M11 14V5H2"/></svg>;
    case 'outpaint':
      return <svg {...svgBase}><rect x="4" y="4" width="8" height="8"/><path d="M2 4H4M12 4h2M2 12H4M12 12h2M4 2V4M12 2V4M4 12v2M12 12v2"/></svg>;
    case 'aiEdit':
      return <svg {...svgBase}><path d="M3 13l7-7 2 2-7 7-3 1 1-3z"/><path d="M10 6l2-2 2 2-2 2"/><circle cx="12" cy="3" r="1" fill="currentColor" stroke="none"/></svg>;
    case 'bgRemove':
      return <svg {...svgBase}><rect x="2" y="2" width="12" height="12" rx="1"/><circle cx="8" cy="7" r="2.5"/><path d="M5.5 14c0-2.5 1-4 2.5-4s2.5 1.5 2.5 4"/></svg>;
    case 'styleTransfer':
      return <svg {...svgBase}><ellipse cx="7" cy="9" rx="5" ry="4"/><circle cx="5" cy="8" r="1.2" fill="currentColor" stroke="none"/><circle cx="8" cy="7.5" r="1.2" fill="currentColor" stroke="none"/><circle cx="7" cy="10.5" r="1.2" fill="currentColor" stroke="none"/><path d="M12 2c0 2-2 3-2 5"/></svg>;
    case 'smartErase':
      return <svg {...svgBase}><path d="M5 3l6 10M11 3l-6 10"/><circle cx="8" cy="8" r="2" fill="none"/></svg>;
    case 'hand':
      return <svg {...svgBase}><path d="M4 10V6.5a1 1 0 012 0V10M6 8V5.5a1 1 0 012 0V8M8 8V6.5a1 1 0 012 0V8M10 10V8.5a1 1 0 012 0V11c0 2-1.5 3-4 3s-4-1-4.5-2.5L2 8"/></svg>;
    case 'zoom':
      return <svg {...svgBase}><circle cx="7" cy="7" r="4"/><path d="M10.5 10.5L14 14"/></svg>;
    case 'eyedropper':
      return <svg {...svgBase}><path d="M3 14l2-5 4 4-1 1zM9 9l4-4M14 4l-1-1-2 2"/></svg>;
    default:
      return <span>?</span>;
  }
}

export default function ToolBar() {
  const { activeTool, setActiveTool } = useEditor();

  return (
    <div className="ps-toolbar">
      {TOOL_GROUPS.map((group, gi) => (
        <div key={group.label}>
          {gi > 0 && <div className="ps-tool-sep" />}
          {group.tools.map((tool) => (
            <button
              key={tool}
              className={`ps-tool-btn ${activeTool === tool ? 'active' : ''}`}
              onClick={() => setActiveTool(tool)}
              title={`${TOOL_LABELS[tool]}${TOOL_SHORTCUT_DISPLAY[tool] ? ` (${TOOL_SHORTCUT_DISPLAY[tool]})` : ''}`}
            >
              <ToolIcon tool={tool} />
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
