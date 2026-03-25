"use client";

import { useModel3DEditor } from './Model3DEditorContext';

export default function HistoryPanel() {
  const { state, actions } = useModel3DEditor();
  const entries = state.historyEntries;

  return (
    <div className="m3d-history-panel">
      <div className="m3d-history-header">
        <span className="m3d-history-header-title">Edit History</span>
        <button
          className="m3d-menubar-close"
          onClick={() => actions.setShowHistory(false)}
          style={{ fontSize: 14, padding: '2px 6px' }}
        >
          &times;
        </button>
      </div>
      <div className="m3d-history-list">
        {entries.length === 0 ? (
          <div className="m3d-history-empty">
            No edits yet &mdash; history appears here as you make changes.
          </div>
        ) : (
          <>
            <div className="m3d-history-item current">
              <span className="m3d-history-item-idx">&bull;</span>
              <span className="m3d-history-item-label">Current State</span>
            </div>
            {[...entries].reverse().map((entry, i) => {
              const realIdx = entries.length - 1 - i;
              return (
                <div
                  key={`${entry.timestamp}-${realIdx}`}
                  className="m3d-history-item"
                  onClick={() => actions.restoreHistoryEntry(realIdx)}
                >
                  <span className="m3d-history-item-idx">{entries.length - i}</span>
                  <span className="m3d-history-item-label">{entry.label}</span>
                  <span className="m3d-history-item-time">
                    {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
