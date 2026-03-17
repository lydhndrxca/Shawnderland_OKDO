"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor } from './EditorContext';

interface MenuItem {
  label: string;
  shortcut?: string;
  action?: () => void;
  divider?: boolean;
  disabled?: boolean;
}

interface Menu {
  label: string;
  items: MenuItem[];
}

export default function MenuBar() {
  const ctx = useEditor();
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  const copyImage = useCallback(async () => {
    if (!ctx.activeImage) return;
    try {
      const blob = await fetch(`data:${ctx.activeImage.mimeType};base64,${ctx.activeImage.base64}`).then((r) => r.blob());
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    } catch { /* best-effort */ }
  }, [ctx.activeImage]);

  const downloadImage = useCallback(async () => {
    if (!ctx.activeImage) return;
    try {
      const blob = await fetch(`data:${ctx.activeImage.mimeType};base64,${ctx.activeImage.base64}`).then((r) => r.blob());
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${ctx.activeSource?.label ?? 'image'}-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* best-effort */ }
  }, [ctx.activeImage, ctx.activeSource]);

  const downloadAll = useCallback(async () => {
    for (const src of ctx.sources) {
      if (!src.image) continue;
      try {
        const blob = await fetch(`data:${src.image.mimeType};base64,${src.image.base64}`).then((r) => r.blob());
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${src.label}-${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(url);
      } catch { /* best-effort */ }
    }
  }, [ctx.sources]);

  const menus: Menu[] = [
    {
      label: 'File',
      items: [
        { label: 'Copy to Clipboard', action: copyImage, disabled: !ctx.activeImage },
        { label: 'Download Image', action: downloadImage, disabled: !ctx.activeImage },
        { label: 'Download All', action: downloadAll, disabled: ctx.sources.every((s) => !s.image) },
        { divider: true, label: '' },
        { label: 'Close Editor', shortcut: 'Esc', action: ctx.onClose },
      ],
    },
    {
      label: 'Edit',
      items: [
        { label: 'Undo', shortcut: 'Ctrl+Z', action: () => { if (ctx.historyEntries.length > 0) ctx.handleHistoryClick(0); } },
        { divider: true, label: '' },
        { label: 'Clear Mask', action: ctx.clearMask },
      ],
    },
    {
      label: 'Image',
      items: [
        { label: 'Restore Quality', action: ctx.handleRestore, disabled: ctx.editBusy || ctx.restoreBusy || !ctx.activeImage },
        { label: 'Upscale', disabled: true },
        { label: 'Auto-Enhance', disabled: true },
        { divider: true, label: '' },
        { label: 'Style Transfer...', action: () => ctx.setActiveTool('styleTransfer') },
        { label: 'Remove Background', action: () => ctx.setActiveTool('bgRemove') },
      ],
    },
    {
      label: 'Select',
      items: [
        { label: 'Deselect', shortcut: 'Ctrl+D', action: ctx.clearMask },
        { label: 'Smart Select...', shortcut: 'W', action: () => ctx.setActiveTool('smartSelect') },
      ],
    },
    {
      label: 'View',
      items: [
        { label: 'Fit to View', shortcut: 'Ctrl+0', action: ctx.fitToView },
        { label: 'Actual Size (100%)', shortcut: 'Ctrl+1', action: () => { ctx.setZoom(1); ctx.setPan({ x: 0, y: 0 }); } },
        { divider: true, label: '' },
        { label: `${ctx.panelsVisible ? 'Hide' : 'Show'} Panels`, shortcut: 'Tab', action: () => ctx.setPanelsVisible((v) => !v) },
        { label: 'Before/After Compare', action: () => ctx.setComparisonActive((v) => !v) },
      ],
    },
  ];

  useEffect(() => {
    if (openMenu === null) return;
    const handler = (e: MouseEvent) => {
      if (!barRef.current?.contains(e.target as Node)) setOpenMenu(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openMenu]);

  return (
    <div className="ps-menubar" ref={barRef}>
      {menus.map((menu, mi) => (
        <div key={menu.label} className="ps-menu-wrapper">
          <button
            className={`ps-menu-label ${openMenu === mi ? 'active' : ''}`}
            onClick={() => setOpenMenu(openMenu === mi ? null : mi)}
            onMouseEnter={() => { if (openMenu !== null) setOpenMenu(mi); }}
          >
            {menu.label}
          </button>
          {openMenu === mi && (
            <div className="ps-menu-dropdown">
              {menu.items.map((item, ii) =>
                item.divider ? (
                  <div key={ii} className="ps-menu-divider" />
                ) : (
                  <button
                    key={ii}
                    className="ps-menu-item"
                    onClick={() => { item.action?.(); setOpenMenu(null); }}
                    disabled={item.disabled}
                  >
                    <span>{item.label}</span>
                    {item.shortcut && <span className="ps-menu-shortcut">{item.shortcut}</span>}
                  </button>
                ),
              )}
            </div>
          )}
        </div>
      ))}
      <div className="ps-menubar-spacer" />
      <span className="ps-menubar-title">
        {ctx.activeSource ? ctx.activeSource.label : 'Image Studio'}
      </span>
    </div>
  );
}
