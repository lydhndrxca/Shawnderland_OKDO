'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, ClipboardPaste, X, AlertTriangle } from 'lucide-react';
import { useToolEditorStore } from './useToolEditorStore';
import type { TEExport } from './types';
import './ExportDialog.css';

interface Props {
  open: boolean;
  onClose: () => void;
}

function validate(obj: unknown): obj is TEExport {
  if (!obj || typeof obj !== 'object') return false;
  const d = obj as Record<string, unknown>;
  return Array.isArray(d.nodes) && Array.isArray(d.edges);
}

export default function ImportDialog({ open, onClose }: Props) {
  const { loadFromExport } = useToolEditorStore();
  const [pasteText, setPasteText] = useState('');
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'file' | 'paste'>('file');
  const fileRef = useRef<HTMLInputElement>(null);

  const doImport = useCallback(
    (raw: string) => {
      try {
        const parsed = JSON.parse(raw);
        if (!validate(parsed)) {
          setError('Invalid format: missing "nodes" or "edges" arrays.');
          return;
        }
        loadFromExport(parsed);
        onClose();
      } catch {
        setError('Invalid JSON. Check the format and try again.');
      }
    },
    [loadFromExport, onClose],
  );

  const handleFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setError('');
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') doImport(reader.result);
      };
      reader.readAsText(file);
    },
    [doImport],
  );

  const handlePaste = useCallback(() => {
    setError('');
    doImport(pasteText);
  }, [pasteText, doImport]);

  if (!open) return null;

  return (
    <div className="te-export-overlay" onClick={onClose}>
      <div className="te-export-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="te-export-header">
          <h2>Import Layout</h2>
          <button className="te-export-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="te-export-tabs">
          <button
            className={`te-export-tab ${tab === 'file' ? 'active' : ''}`}
            onClick={() => { setTab('file'); setError(''); }}
          >
            <Upload size={12} style={{ marginRight: 4 }} />
            Upload File
          </button>
          <button
            className={`te-export-tab ${tab === 'paste' ? 'active' : ''}`}
            onClick={() => { setTab('paste'); setError(''); }}
          >
            <ClipboardPaste size={12} style={{ marginRight: 4 }} />
            Paste JSON
          </button>
        </div>

        <div className="te-import-body">
          {tab === 'file' && (
            <div className="te-import-file-area">
              <input
                ref={fileRef}
                type="file"
                accept=".json"
                onChange={handleFile}
                className="te-import-file-input"
              />
              <button
                className="te-import-file-btn"
                onClick={() => fileRef.current?.click()}
              >
                <Upload size={20} />
                <span>Choose a .json file</span>
              </button>
            </div>
          )}

          {tab === 'paste' && (
            <div className="te-import-paste-area">
              <textarea
                className="te-import-textarea"
                rows={12}
                placeholder='Paste exported JSON here...'
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
              />
              <button
                className="te-export-btn te-btn-download"
                onClick={handlePaste}
                disabled={!pasteText.trim()}
              >
                <ClipboardPaste size={14} />
                Import
              </button>
            </div>
          )}

          {error && (
            <div className="te-import-error">
              <AlertTriangle size={14} />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
