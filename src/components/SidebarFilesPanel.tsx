"use client";

import { useCallback, useEffect, useState } from 'react';
import { listGroups, deleteGroup, type SavedGroup } from '@/lib/filesStore';
import { listStyles, deleteStyle, type SavedStyle } from '@/lib/styleStore';
import './FilesPage.css';

const APP_LABELS: Record<string, string> = {
  'concept-lab': 'AI ConceptLab',
  shawndermind: 'AI Ideation Pipeline',
  'gemini-studio': 'Gemini Studio',
  'ui-lab': 'UI Lab',
  'tool-editor': 'Tool Editor',
};

interface LightboxState {
  base64: string;
  mimeType: string;
  label: string;
}

interface Props {
  open: boolean;
}

export function SidebarFilesPanel({ open }: Props) {
  const [groups, setGroups] = useState<SavedGroup[]>([]);
  const [styles, setStyles] = useState<SavedStyle[]>([]);
  const [collapsedApps, setCollapsedApps] = useState<Set<string>>(new Set());
  const [stylesCollapsed, setStylesCollapsed] = useState(false);
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmDeleteStyle, setConfirmDeleteStyle] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [allGroups, allStyles] = await Promise.all([listGroups(), listStyles()]);
    setGroups(allGroups);
    setStyles(allStyles);
  }, []);

  useEffect(() => { if (open) refresh(); }, [open, refresh]);

  // Listen for style changes from StyleNode save/delete
  useEffect(() => {
    const handler = () => refresh();
    window.addEventListener('shawnderland-styles-changed', handler);
    return () => window.removeEventListener('shawnderland-styles-changed', handler);
  }, [refresh]);

  const appKeys = Array.from(new Set(groups.map((g) => g.appKey)));

  const toggleApp = useCallback((key: string) => {
    setCollapsedApps((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    await deleteGroup(id);
    setConfirmDelete(null);
    refresh();
  }, [refresh]);

  const handleDeleteStyle = useCallback(async (id: string) => {
    await deleteStyle(id);
    setConfirmDeleteStyle(null);
    refresh();
  }, [refresh]);

  const handleDragStart = useCallback((e: React.DragEvent, group: SavedGroup) => {
    e.dataTransfer.setData('application/shawnderland-file-group', group.id);
    e.dataTransfer.effectAllowed = 'copy';
  }, []);

  if (!open) return null;

  const hasContent = groups.length > 0 || styles.length > 0;

  return (
    <>
      <div className="sfp-panel">
        {!hasContent ? (
          <div className="sfp-empty">
            <span style={{ fontSize: 24, opacity: 0.3 }}>📁</span>
            <span style={{ fontSize: 11, color: '#888' }}>No saved files yet</span>
            <span style={{ fontSize: 10, color: '#666' }}>Use Save Group node or Style node</span>
          </div>
        ) : (
          <>
            {/* ── Styles section ── */}
            {styles.length > 0 && (
              <div className="sfp-section">
                <div className="sfp-section-header" onClick={() => setStylesCollapsed((c) => !c)}>
                  <span className={`sfp-chevron ${stylesCollapsed ? 'collapsed' : ''}`}>▼</span>
                  <span className="sfp-section-title">Styles</span>
                  <span className="sfp-section-count">{styles.length}</span>
                </div>

                {!stylesCollapsed && styles.map((style) => (
                  <div key={style.id} className="sfp-group">
                    <div className="sfp-group-header">
                      <span className="sfp-group-name">{style.name}</span>
                      <div className="sfp-group-actions">
                        <span className="sfp-group-count">{style.images.length} img{style.images.length !== 1 ? 's' : ''}</span>
                        <button
                          className="sfp-group-delete"
                          title="Delete"
                          onClick={(e) => { e.stopPropagation(); setConfirmDeleteStyle(style.id); }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                    {style.styleText && (
                      <div className="sfp-group-time" style={{ fontStyle: 'italic' }}>
                        {style.styleText.length > 60 ? style.styleText.slice(0, 60) + '...' : style.styleText}
                      </div>
                    )}
                    <div className="sfp-group-time">
                      {new Date(style.updatedAt).toLocaleString()}
                    </div>
                    <div className="sfp-thumbs">
                      {style.images.map((img, i) => (
                        <div
                          key={i}
                          className="sfp-thumb"
                          onClick={() => setLightbox({ base64: img.base64, mimeType: img.mimeType, label: `${style.name} — Image ${i + 1}` })}
                        >
                          <img
                            src={`data:${img.mimeType};base64,${img.base64}`}
                            alt={`Style ${i + 1}`}
                            loading="lazy"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Saved groups (existing) ── */}
            {appKeys.map((appKey) => {
              const appGroups = groups.filter((g) => g.appKey === appKey);
              const collapsed = collapsedApps.has(appKey);

              return (
                <div key={appKey} className="sfp-section">
                  <div className="sfp-section-header" onClick={() => toggleApp(appKey)}>
                    <span className={`sfp-chevron ${collapsed ? 'collapsed' : ''}`}>▼</span>
                    <span className="sfp-section-title">{APP_LABELS[appKey] ?? appKey}</span>
                    <span className="sfp-section-count">{appGroups.length}</span>
                  </div>

                  {!collapsed && appGroups.map((group) => (
                    <div
                      key={group.id}
                      className="sfp-group"
                      draggable
                      onDragStart={(e) => handleDragStart(e, group)}
                    >
                      <div className="sfp-group-header">
                        <span className="sfp-group-name">{group.name}</span>
                        <div className="sfp-group-actions">
                          <span className="sfp-group-count">{group.images.length}</span>
                          <button
                            className="sfp-group-delete"
                            title="Delete"
                            onClick={(e) => { e.stopPropagation(); setConfirmDelete(group.id); }}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                      <div className="sfp-group-time">
                        {new Date(group.createdAt).toLocaleString()}
                      </div>
                      <div className="sfp-thumbs">
                        {group.images.map((img, i) => (
                          <div
                            key={i}
                            className="sfp-thumb"
                            onClick={() => setLightbox({ base64: img.base64, mimeType: img.mimeType, label: `${group.name} — ${img.viewName}` })}
                          >
                            <img
                              src={`data:${img.mimeType};base64,${img.base64}`}
                              alt={img.viewName}
                              loading="lazy"
                            />
                            <span className="sfp-thumb-label">{img.viewName}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </>
        )}
      </div>

      {lightbox && (
        <div className="files-lightbox-backdrop" onClick={() => setLightbox(null)}>
          <div className="files-lightbox-content" onClick={(e) => e.stopPropagation()}>
            <img
              src={`data:${lightbox.mimeType};base64,${lightbox.base64}`}
              alt={lightbox.label}
            />
            <div className="files-lightbox-label">{lightbox.label}</div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="files-confirm-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="files-confirm-box" onClick={(e) => e.stopPropagation()}>
            <p>Delete this saved group? This cannot be undone.</p>
            <button className="files-confirm-cancel" onClick={() => setConfirmDelete(null)}>Cancel</button>
            <button className="files-confirm-delete" onClick={() => handleDelete(confirmDelete)}>Delete</button>
          </div>
        </div>
      )}

      {confirmDeleteStyle && (
        <div className="files-confirm-overlay" onClick={() => setConfirmDeleteStyle(null)}>
          <div className="files-confirm-box" onClick={(e) => e.stopPropagation()}>
            <p>Delete this saved style? This cannot be undone.</p>
            <button className="files-confirm-cancel" onClick={() => setConfirmDeleteStyle(null)}>Cancel</button>
            <button className="files-confirm-delete" onClick={() => handleDeleteStyle(confirmDeleteStyle)}>Delete</button>
          </div>
        </div>
      )}
    </>
  );
}
