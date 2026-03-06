"use client";

import { memo, useState, useCallback, useEffect } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import type { GeneratedImage } from '@/lib/ideation/engine/conceptlab/imageGenApi';
import './CharacterNodes.css';

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

interface HistoryEntry {
  image: GeneratedImage;
  label: string;
  timestamp: string;
}

function CharHistoryNodeInner({ id, data, selected }: Props) {
  const { setNodes, getNode, getEdges } = useReactFlow();
  const [entries, setEntries] = useState<HistoryEntry[]>(
    (data?.historyEntries as HistoryEntry[]) ?? [],
  );
  const [activeIdx, setActiveIdx] = useState(-1);

  useEffect(() => {
    const edges = getEdges();
    const incoming = edges.filter((e) => e.target === id);
    const newEntries: HistoryEntry[] = [];

    for (const e of incoming) {
      const src = getNode(e.source);
      if (!src?.data) continue;
      const d = src.data as Record<string, unknown>;
      const img = d.generatedImage as GeneratedImage | undefined;
      if (!img?.base64) continue;

      const already = entries.some(
        (entry) => entry.image.base64.slice(0, 100) === img.base64.slice(0, 100),
      );
      if (!already) {
        const label =
          (d.editText as string) ??
          (src.type === 'charGenerate' ? 'Generated character' : src.type ?? 'Image');
        newEntries.push({
          image: img,
          label: label.slice(0, 60),
          timestamp: new Date().toLocaleTimeString(),
        });
      }
    }

    if (newEntries.length > 0) {
      setEntries((prev) => {
        const next = [...prev, ...newEntries];
        setNodes((nds) =>
          nds.map((n) =>
            n.id === id ? { ...n, data: { ...n.data, historyEntries: next } } : n,
          ),
        );
        return next;
      });
    }
  }, [id, getNode, getEdges, entries, setNodes]);

  const handleSelect = useCallback(
    (idx: number) => {
      setActiveIdx(idx);
      const entry = entries[idx];
      if (!entry) return;

      const edges = getEdges();
      const outgoing = edges.filter((e) => e.source === id);
      setNodes((nds) =>
        nds.map((n) => {
          if (outgoing.some((e) => e.target === n.id)) {
            return { ...n, data: { ...n.data, generatedImage: entry.image } };
          }
          return n;
        }),
      );
    },
    [id, entries, getEdges, setNodes],
  );

  return (
    <div className={`char-node ${selected ? 'selected' : ''}`}>
      <div className="char-node-header" style={{ background: '#78909c' }}>
        History
      </div>
      <div className="char-node-body">
        {entries.length === 0 ? (
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            No history yet. Connect to generation/edit nodes.
          </div>
        ) : (
          <div className="char-history-list nodrag nowheel">
            {entries.map((entry, idx) => (
              <div
                key={idx}
                className={`char-history-entry ${activeIdx === idx ? 'active' : ''}`}
                onClick={() => handleSelect(idx)}
              >
                <img
                  src={`data:${entry.image.mimeType};base64,${entry.image.base64}`}
                  alt={entry.label}
                  className="char-history-thumb"
                />
                <div className="char-history-info">
                  <span className="char-history-label">{entry.label}</span>
                  <span className="char-history-time">{entry.timestamp}</span>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="char-gallery-nav" style={{ justifyContent: 'space-between' }}>
          <button
            className="nodrag"
            disabled={activeIdx <= 0}
            onClick={() => handleSelect(Math.max(0, activeIdx - 1))}
          >
            &lt; Back
          </button>
          <span>{entries.length} entries</span>
          <button
            className="nodrag"
            disabled={activeIdx >= entries.length - 1}
            onClick={() => handleSelect(Math.min(entries.length - 1, activeIdx + 1))}
          >
            Forward &gt;
          </button>
        </div>
      </div>

      <Handle type="target" position={Position.Left} id="input" className="char-handle" style={{ top: '50%' }} />
      <Handle type="source" position={Position.Right} id="viewer-out" className="char-handle" style={{ top: '50%' }} />
    </div>
  );
}

export default memo(CharHistoryNodeInner);
