"use client";

import { useState } from 'react';
import { useSession } from '@/lib/ideation/context/SessionContext';
import './SaveDialog.css';

interface SaveDialogProps {
  onClose: () => void;
}

export default function SaveDialog({ onClose }: SaveDialogProps) {
  const { session, saveSessionAs } = useSession();
  const [name, setName] = useState(session.projectName || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please enter a name.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveSessionAs(trimmed);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="save-dialog-overlay" onClick={onClose}>
      <div className="save-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="save-dialog-title">Save Session</div>
        <input
          className="save-dialog-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onClose(); }}
          placeholder="My Brilliant Idea"
          autoFocus
          disabled={saving}
        />
        {error && <div className="save-dialog-error">{error}</div>}
        <div className="save-dialog-actions">
          <button className="save-dialog-cancel" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="save-dialog-save" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
