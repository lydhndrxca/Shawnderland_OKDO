'use client';

import { useState, useCallback, useEffect } from 'react';
import { Save, FolderOpen, Trash2, X } from 'lucide-react';
import { useToolEditorStore } from './useToolEditorStore';
import type { TEExport } from './types';
import './ExportDialog.css';

const STORAGE_KEY = 'te-saved-layouts';

interface SavedEntry {
  name: string;
  savedAt: string;
  data: TEExport;
}

function loadSavedList(): SavedEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistList(entries: SavedEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SaveDialog({ open, onClose }: Props) {
  const { buildExport, loadFromExport } = useToolEditorStore();
  const [name, setName] = useState('');
  const [saved, setSaved] = useState<SavedEntry[]>([]);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    if (open) {
      setSaved(loadSavedList());
      setName('');
      setJustSaved(false);
    }
  }, [open]);

  const handleSave = useCallback(() => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const data = buildExport();
    const entry: SavedEntry = { name: trimmed, savedAt: new Date().toISOString(), data };
    const list = loadSavedList().filter((e) => e.name !== trimmed);
    list.unshift(entry);
    persistList(list);
    setSaved(list);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 1500);
  }, [name, buildExport]);

  const handleLoad = useCallback(
    (entry: SavedEntry) => {
      loadFromExport(entry.data);
      onClose();
    },
    [loadFromExport, onClose],
  );

  const handleDelete = useCallback((entryName: string) => {
    const list = loadSavedList().filter((e) => e.name !== entryName);
    persistList(list);
    setSaved(list);
  }, []);

  if (!open) return null;

  return (
    <div className="te-export-overlay" onClick={onClose}>
      <div className="te-export-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="te-export-header">
          <h2>Save / Load Layout</h2>
          <button className="te-export-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="te-save-section">
          <div className="te-save-row">
            <input
              className="te-save-input"
              placeholder="Layout name..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            />
            <button
              className="te-export-btn te-btn-download"
              onClick={handleSave}
              disabled={!name.trim()}
            >
              <Save size={14} />
              {justSaved ? 'Saved!' : 'Save'}
            </button>
          </div>
        </div>

        <div className="te-save-list-header">
          <span>Saved Layouts ({saved.length})</span>
        </div>

        <div className="te-save-list">
          {saved.length === 0 && (
            <p className="te-save-empty">No saved layouts yet</p>
          )}
          {saved.map((entry) => (
            <div key={entry.name} className="te-save-item">
              <div className="te-save-item-info">
                <span className="te-save-item-name">{entry.name}</span>
                <span className="te-save-item-meta">
                  {entry.data.nodes.length} node{entry.data.nodes.length !== 1 ? 's' : ''} &middot;{' '}
                  {new Date(entry.savedAt).toLocaleDateString()}
                </span>
              </div>
              <div className="te-save-item-actions">
                <button className="te-save-action-btn" onClick={() => handleLoad(entry)} title="Load">
                  <FolderOpen size={13} />
                </button>
                <button className="te-save-action-btn te-save-del" onClick={() => handleDelete(entry.name)} title="Delete">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
