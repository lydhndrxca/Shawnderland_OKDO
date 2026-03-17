"use client";

import { useEditor } from '../EditorContext';

export default function HistoryPanel() {
  const { historyEntries, activeHistIdx, handleHistoryClick, sources, activeSourceIdx, setActiveSourceIdx } = useEditor();

  return (
    <div className="ps-history-panel">
      {sources.length > 1 && (
        <div className="ps-history-sources">
          {sources.map((src, i) => (
            <button
              key={src.nodeId}
              className={`ps-history-source-btn ${i === activeSourceIdx ? 'active' : ''}`}
              onClick={() => setActiveSourceIdx(i)}
            >
              {src.image ? (
                <img
                  src={`data:${src.image.mimeType};base64,${src.image.base64}`}
                  alt={src.label}
                  className="ps-history-source-thumb"
                />
              ) : (
                <div className="ps-history-source-thumb ps-history-source-empty" />
              )}
              <span>{src.label}</span>
            </button>
          ))}
        </div>
      )}
      <div className="ps-history-list">
        {historyEntries.length === 0 && (
          <div className="ps-panel-empty">No edits yet — history appears here as you make changes.</div>
        )}
        {historyEntries.map((entry, i) => (
          <div
            key={`${entry.timestamp}-${i}`}
            className={`ps-history-item ${i === activeHistIdx ? 'active' : ''}`}
            onClick={() => handleHistoryClick(i)}
          >
            <img
              src={`data:${entry.image.mimeType};base64,${entry.image.base64}`}
              alt={entry.label}
              className="ps-history-thumb"
            />
            <div className="ps-history-meta">
              <span className="ps-history-label">{entry.label}</span>
              <span className="ps-history-time">
                {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
