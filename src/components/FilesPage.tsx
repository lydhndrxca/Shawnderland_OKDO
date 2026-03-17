"use client";

import { useCallback, useEffect, useState } from 'react';
import { listGroups, deleteGroup, type SavedGroup } from '@/lib/filesStore';
import './FilesPage.css';

const APP_LABELS: Record<string, string> = {
  'concept-lab': 'AI Concept Lab',
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

export default function FilesPage() {
  const [groups, setGroups] = useState<SavedGroup[]>([]);
  const [collapsedApps, setCollapsedApps] = useState<Set<string>>(new Set());
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const all = await listGroups();
    setGroups(all);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

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

  const handleDragStart = useCallback((e: React.DragEvent, group: SavedGroup) => {
    e.dataTransfer.setData('application/shawnderland-file-group', group.id);
    e.dataTransfer.effectAllowed = 'copy';
  }, []);

  if (groups.length === 0) {
    return (
      <div className="files-page">
        <h1>Files</h1>
        <p className="files-subtitle">Saved image groups from your canvas projects</p>
        <div className="files-empty">
          <div className="files-empty-icon">📁</div>
          <div className="files-empty-text">No saved files yet</div>
          <div className="files-empty-hint">
            Use the Save Group node on any canvas to save images here
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="files-page">
      <h1>Files</h1>
      <p className="files-subtitle">Saved image groups from your canvas projects</p>

      {appKeys.map((appKey) => {
        const appGroups = groups.filter((g) => g.appKey === appKey);
        const collapsed = collapsedApps.has(appKey);

        return (
          <div key={appKey} className="files-app-section">
            <div className="files-app-header" onClick={() => toggleApp(appKey)}>
              <span className={`files-app-chevron ${collapsed ? 'collapsed' : ''}`}>▼</span>
              <span className="files-app-title">{APP_LABELS[appKey] ?? appKey}</span>
              <span className="files-app-count">{appGroups.length} save{appGroups.length !== 1 ? 's' : ''}</span>
            </div>

            {!collapsed && appGroups.map((group) => (
              <div
                key={group.id}
                className="files-group-card"
                draggable
                onDragStart={(e) => handleDragStart(e, group)}
              >
                <div className="files-group-meta">
                  <div>
                    <span className="files-group-name">{group.name}</span>
                    <span className="files-group-time" style={{ marginLeft: 10 }}>
                      {new Date(group.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="files-group-actions">
                    <span style={{ fontSize: 11, color: '#888' }}>
                      {group.images.length} image{group.images.length !== 1 ? 's' : ''}
                    </span>
                    <button
                      className="files-group-delete"
                      title="Delete group"
                      onClick={(e) => { e.stopPropagation(); setConfirmDelete(group.id); }}
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <div className="files-thumb-row">
                  {group.images.map((img, i) => (
                    <div
                      key={i}
                      className="files-thumb"
                      onClick={() => setLightbox({ base64: img.base64, mimeType: img.mimeType, label: `${group.name} — ${img.viewName}` })}
                    >
                      <img
                        src={`data:${img.mimeType};base64,${img.base64}`}
                        alt={img.viewName}
                        loading="lazy"
                      />
                      <span className="files-thumb-label">{img.viewName}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      })}

      {/* Lightbox */}
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

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="files-confirm-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="files-confirm-box" onClick={(e) => e.stopPropagation()}>
            <p>Delete this saved group? This cannot be undone.</p>
            <button className="files-confirm-cancel" onClick={() => setConfirmDelete(null)}>Cancel</button>
            <button className="files-confirm-delete" onClick={() => handleDelete(confirmDelete)}>Delete</button>
          </div>
        </div>
      )}
    </div>
  );
}
