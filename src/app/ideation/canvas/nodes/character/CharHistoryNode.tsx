"use client";

import { memo, useState, useCallback, useEffect, useRef } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import type { GeneratedImage } from '@/lib/ideation/engine/conceptlab/imageGenApi';
import './CharacterNodes.css';

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

interface HistorySnapshot {
  image: GeneratedImage | null;
  label: string;
  timestamp: string;
  nodeStates: Record<string, Record<string, unknown>>;
}

const CHARACTER_NODE_TYPES = new Set([
  'charIdentity', 'charDescription', 'charAttributes', 'charGenerate',
  'charGenViews', 'charEdit', 'charViewer', 'charImageViewer',
  'charRefCallout', 'imageRef', 'charQuickGen', 'charEnhanceDesc',
  'charExtract', 'charProjectSettings',
]);

function collectConnectedNodeStates(
  historyNodeId: string,
  getNode: ReturnType<typeof useReactFlow>['getNode'],
  getEdges: ReturnType<typeof useReactFlow>['getEdges'],
): Record<string, Record<string, unknown>> {
  const edges = getEdges();
  const connectedIds = new Set<string>();
  for (const e of edges) {
    if (e.source === historyNodeId) connectedIds.add(e.target);
    if (e.target === historyNodeId) connectedIds.add(e.source);
  }

  const states: Record<string, Record<string, unknown>> = {};
  for (const nid of connectedIds) {
    const n = getNode(nid);
    if (!n?.data) continue;
    if (n.type && CHARACTER_NODE_TYPES.has(n.type)) {
      states[nid] = { ...(n.data as Record<string, unknown>), __type: n.type };
    }
  }
  return states;
}

function findLatestImage(
  historyNodeId: string,
  getNode: ReturnType<typeof useReactFlow>['getNode'],
  getEdges: ReturnType<typeof useReactFlow>['getEdges'],
): GeneratedImage | null {
  const edges = getEdges();
  const incoming = edges.filter((e) => e.target === historyNodeId);
  for (const e of incoming) {
    const src = getNode(e.source);
    if (!src?.data) continue;
    const d = src.data as Record<string, unknown>;
    const img = d.generatedImage as GeneratedImage | undefined;
    if (img?.base64) return img;
  }
  return null;
}

function CharHistoryNodeInner({ id, data, selected }: Props) {
  const { setNodes, getNode, getEdges } = useReactFlow();
  const [entries, setEntries] = useState<HistorySnapshot[]>(
    (data?.historyEntries as HistorySnapshot[]) ?? [],
  );
  const [activeIdx, setActiveIdx] = useState(-1);
  const [currentState, setCurrentState] = useState<Record<string, Record<string, unknown>> | null>(null);
  const lastImageRef = useRef<string>('');

  useEffect(() => {
    const img = findLatestImage(id, getNode, getEdges);
    if (!img?.base64) return;

    const sig = img.base64.slice(0, 100);
    if (sig === lastImageRef.current) return;
    lastImageRef.current = sig;

    const nodeStates = collectConnectedNodeStates(id, getNode, getEdges);
    const label =
      Object.values(nodeStates).find((s) => s.__type === 'charEdit' && s.editText)
        ? (Object.values(nodeStates).find((s) => s.__type === 'charEdit')?.editText as string)?.slice(0, 50) ?? 'Edit'
        : 'Generated character';

    const snap: HistorySnapshot = {
      image: img,
      label,
      timestamp: new Date().toLocaleTimeString(),
      nodeStates,
    };

    setCurrentState(nodeStates);

    setEntries((prev) => {
      const next = [...prev, snap];
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, historyEntries: next } } : n,
        ),
      );
      return next;
    });
    setActiveIdx(-1);
  }, [id, getNode, getEdges, setNodes]);

  const captureCurrentState = useCallback(() => {
    const states = collectConnectedNodeStates(id, getNode, getEdges);
    setCurrentState(states);
    return states;
  }, [id, getNode, getEdges]);

  const restoreSnapshot = useCallback(
    (snap: HistorySnapshot) => {
      setNodes((nds) =>
        nds.map((n) => {
          const saved = snap.nodeStates[n.id];
          if (!saved) return n;
          const { __type, ...rest } = saved;
          return { ...n, data: { ...n.data, ...rest } };
        }),
      );
    },
    [setNodes],
  );

  const handleSelectCurrent = useCallback(() => {
    if (!currentState) {
      captureCurrentState();
    }
    if (entries.length > 0) {
      restoreSnapshot(entries[entries.length - 1]);
    }
    setActiveIdx(-1);
  }, [currentState, entries, restoreSnapshot, captureCurrentState]);

  const handleSelect = useCallback(
    (idx: number) => {
      if (activeIdx === -1) {
        captureCurrentState();
      }
      setActiveIdx(idx);
      restoreSnapshot(entries[idx]);
    },
    [activeIdx, entries, restoreSnapshot, captureCurrentState],
  );

  const PLACEHOLDER_COUNT = 8;
  const emptySlots = Math.max(0, PLACEHOLDER_COUNT - entries.length);

  return (
    <div className={`char-node ${selected ? 'selected' : ''}`} style={{ minHeight: 420 }}>
      <div className="char-node-header" style={{ background: '#78909c' }}>
        History
      </div>
      <div className="char-node-body" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div className="char-history-list nodrag nowheel" style={{ flex: 1, minHeight: 300, overflowY: 'auto' }}>
          {/* Current entry */}
          <div
            className={`char-history-entry ${activeIdx === -1 ? 'active' : ''}`}
            onClick={handleSelectCurrent}
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <div className="char-history-info" style={{ padding: '6px 0' }}>
              <span className="char-history-label" style={{ fontWeight: 700 }}>Current</span>
              <span className="char-history-time">latest state</span>
            </div>
          </div>

          {/* History entries (newest first) */}
          {[...entries].reverse().map((entry, ri) => {
            const realIdx = entries.length - 1 - ri;
            return (
              <div
                key={realIdx}
                className={`char-history-entry ${activeIdx === realIdx ? 'active' : ''}`}
                onClick={() => handleSelect(realIdx)}
              >
                {entry.image && (
                  <img
                    src={`data:${entry.image.mimeType};base64,${entry.image.base64}`}
                    alt={entry.label}
                    className="char-history-thumb"
                  />
                )}
                <div className="char-history-info">
                  <span className="char-history-label">{entry.label}</span>
                  <span className="char-history-time">{entry.timestamp}</span>
                </div>
              </div>
            );
          })}

          {/* Empty placeholder slots */}
          {Array.from({ length: emptySlots }).map((_, i) => (
            <div key={`empty-${i}`} className="char-history-entry" style={{ opacity: 0.25, pointerEvents: 'none' }}>
              <div className="char-history-thumb" style={{ background: 'var(--bg-secondary)', width: 40, height: 40, borderRadius: 4 }} />
              <div className="char-history-info">
                <span className="char-history-label" style={{ color: 'var(--text-muted)' }}>—</span>
              </div>
            </div>
          ))}
        </div>

        <div className="char-gallery-nav" style={{ justifyContent: 'space-between', marginTop: 4 }}>
          <button
            className="nodrag"
            disabled={activeIdx <= 0 && activeIdx !== -1}
            onClick={() => {
              if (activeIdx === -1 && entries.length > 0) {
                handleSelect(entries.length - 1);
              } else if (activeIdx > 0) {
                handleSelect(activeIdx - 1);
              }
            }}
          >
            &lt; Back
          </button>
          <span>{entries.length} entries</span>
          <button
            className="nodrag"
            disabled={activeIdx === -1}
            onClick={() => {
              if (activeIdx >= entries.length - 1) {
                handleSelectCurrent();
              } else {
                handleSelect(activeIdx + 1);
              }
            }}
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
