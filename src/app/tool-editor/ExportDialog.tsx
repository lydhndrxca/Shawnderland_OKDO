'use client';

import { useState, useCallback } from 'react';
import { Download, Copy, Check, X } from 'lucide-react';
import { useToolEditorStore } from './useToolEditorStore';
import './ExportDialog.css';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ExportDialog({ open, onClose }: Props) {
  const { selectedIds, buildExport } = useToolEditorStore();
  const [mode, setMode] = useState<'all' | 'selected'>('all');
  const [copied, setCopied] = useState(false);

  const data = buildExport(mode === 'selected' ? selectedIds : undefined);
  const json = JSON.stringify(data, null, 2);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(json).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [json]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tool-design-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [json]);

  if (!open) return null;

  return (
    <div className="te-export-overlay" onClick={onClose}>
      <div className="te-export-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="te-export-header">
          <h2>Export Tool Design</h2>
          <button className="te-export-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="te-export-tabs">
          <button
            className={`te-export-tab ${mode === 'all' ? 'active' : ''}`}
            onClick={() => setMode('all')}
          >
            Export All
          </button>
          <button
            className={`te-export-tab ${mode === 'selected' ? 'active' : ''}`}
            onClick={() => setMode('selected')}
            disabled={selectedIds.length === 0}
          >
            Export Selected ({selectedIds.length})
          </button>
        </div>

        <div className="te-export-preview">
          <pre>{json}</pre>
        </div>

        <div className="te-export-meta">
          <span>{data.nodes.length} node{data.nodes.length !== 1 ? 's' : ''}, {data.edges.length} connection{data.edges.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="te-export-actions">
          <button className="te-export-btn te-btn-copy" onClick={handleCopy}>
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied' : 'Copy to Clipboard'}
          </button>
          <button className="te-export-btn te-btn-download" onClick={handleDownload}>
            <Download size={14} />
            Download JSON
          </button>
        </div>
      </div>
    </div>
  );
}
