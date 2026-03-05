"use client";

import { useCallback, useEffect, useState } from 'react';
import { useSession } from '@/lib/ideation/context/SessionContext';
import './OpenDialog.css';

interface SavedEntry {
  name: string;
  savedAt: string;
}

interface OpenDialogProps {
  onClose: () => void;
}

export default function OpenDialog({ onClose }: OpenDialogProps) {
  const { loadSessionByName, listSavedSessions, deleteSavedSession, resetSession } = useSession();
  const [sessions, setSessions] = useState<SavedEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listSavedSessions();
      setSessions(list.sort((a, b) => b.savedAt.localeCompare(a.savedAt)));
    } catch {
      setSessions([]);
    }
    setLoading(false);
  }, [listSavedSessions]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleLoad = async (name: string) => {
    await loadSessionByName(name);
    onClose();
  };

  const handleDelete = async (name: string) => {
    await deleteSavedSession(name);
    refresh();
  };

  const handleNew = () => {
    resetSession();
    onClose();
  };

  return (
    <div className="open-dialog-overlay" onClick={onClose}>
      <div className="open-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="open-dialog-header">
          <span className="open-dialog-title">Open Session</span>
          <button className="open-dialog-new" onClick={handleNew} title="Start a blank session">
            New Session
          </button>
        </div>

        {loading ? (
          <div className="open-dialog-empty">Loading...</div>
        ) : sessions.length === 0 ? (
          <div className="open-dialog-empty">No saved sessions yet. Use Save to create one.</div>
        ) : (
          <div className="open-dialog-list">
            {sessions.map((s) => (
              <div key={s.name} className="open-dialog-row">
                <div className="open-dialog-info" onClick={() => handleLoad(s.name)}>
                  <span className="open-dialog-name">{s.name}</span>
                  <span className="open-dialog-date">{new Date(s.savedAt).toLocaleString()}</span>
                </div>
                <button
                  className="open-dialog-delete"
                  onClick={() => handleDelete(s.name)}
                  title="Delete this session"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="open-dialog-actions">
          <button className="open-dialog-cancel" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
