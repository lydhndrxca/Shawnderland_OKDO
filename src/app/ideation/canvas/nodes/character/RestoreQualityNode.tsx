"use client";

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Handle, Position, useReactFlow, useStore } from '@xyflow/react';
import { NODE_TOOLTIPS } from './nodeTooltips';
import {
  restoreImageQuality,
  type GeneratedImage,
} from '@/lib/ideation/engine/conceptlab/imageGenApi';
import { registerRequest, unregisterRequest } from '@/lib/activeRequests';
import './CharacterNodes.css';

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

function RestoreQualityNodeInner({ id, data, selected }: Props) {
  const { getNode, setNodes } = useReactFlow();

  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const edgesRef = useRef<Array<{ source: string; target: string }>>([]);
  const edgeSigSelector = useCallback(
    (state: { edges: Array<{ source: string; target: string }> }) => {
      edgesRef.current = state.edges;
      return state.edges.length;
    },
    [],
  );
  useStore(edgeSigSelector);

  const connectedSigSelector = useCallback(
    (state: {
      nodes: Array<{ id: string; type?: string; data: Record<string, unknown> }>;
      edges: Array<{ source: string; target: string }>;
    }) => {
      for (const e of state.edges) {
        if (e.target !== id) continue;
        const peer = state.nodes.find((n) => n.id === e.source);
        if (!peer?.data) continue;
        const img = peer.data.generatedImage as { base64: string } | undefined;
        if (img?.base64) return `${e.source}:${img.base64.slice(0, 40)}`;
      }
      return '';
    },
    [id],
  );
  const connectedSig = useStore(connectedSigSelector);

  const handleRestore = useCallback(async () => {
    if (busy) return;

    let sourceNodeId: string | null = null;
    let sourceImage: GeneratedImage | null = null;
    for (const e of edgesRef.current) {
      if (e.target !== id) continue;
      const peer = getNode(e.source);
      if (!peer?.data) continue;
      const img = (peer.data as Record<string, unknown>).generatedImage as GeneratedImage | undefined;
      if (img?.base64) {
        sourceNodeId = e.source;
        sourceImage = img;
        break;
      }
    }

    if (!sourceImage || !sourceNodeId) {
      setError('No source image connected');
      return;
    }

    setBusy(true);
    setError(null);
    setStatus('Starting…');
    setElapsed(0);
    const t0 = Date.now();
    timerRef.current = setInterval(() => {
      if (mountedRef.current) setElapsed(Math.floor((Date.now() - t0) / 1000));
    }, 500);

    const controller = registerRequest();
    try {
      const { image: restored } = await restoreImageQuality(sourceImage, {
        onStatus: (msg) => { if (mountedRef.current) setStatus(msg); },
      });

      if (!mountedRef.current || controller.signal.aborted) return;

      const secs = ((Date.now() - t0) / 1000).toFixed(1);
      setStatus(`Restored in ${secs}s \u2713`);

      const capturedSourceId = sourceNodeId;
      setNodes((nds) =>
        nds.map((n) =>
          n.id === capturedSourceId
            ? {
                ...n,
                data: {
                  ...n.data,
                  generatedImage: restored,
                  _pendingSnapshot: { image: restored, label: 'Quality Restored' },
                },
              }
            : n,
        ),
      );

      setTimeout(() => {
        if (mountedRef.current) setStatus(null);
      }, 4000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.toLowerCase().includes('cancel') && !msg.toLowerCase().includes('abort')) {
        setError(msg);
      }
      setStatus(null);
    } finally {
      clearInterval(timerRef.current);
      unregisterRequest(controller);
      setBusy(false);
      setElapsed(0);
    }
  }, [busy, id, getNode, setNodes]);

  const hasSource = connectedSig.length > 0;

  return (
    <div
      className={`char-node ${selected ? 'selected' : ''} ${busy ? 'char-node-processing' : ''}`}
      style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}
      title={NODE_TOOLTIPS.charRestore}
    >
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />

      <div
        className="char-node-header"
        style={{
          background: 'linear-gradient(135deg, #00c853 0%, #00e5ff 100%)',
          color: '#000',
        }}
      >
        Restore Quality
      </div>

      <div
        className="char-node-body"
        style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, padding: 10 }}
      >
        <div style={{ fontSize: 9, color: '#888', textAlign: 'center', lineHeight: 1.4 }}>
          AI describes the image in detail, then regenerates it from scratch at 2K via Imagen 4 using the original as a subject anchor
        </div>

        <button
          type="button"
          className="char-btn primary nodrag nopan"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); handleRestore(); }}
          disabled={busy || !hasSource}
          style={{
            width: '100%',
            padding: '8px 0',
            fontSize: 12,
            fontWeight: 700,
            background: busy ? undefined : 'linear-gradient(135deg, #00c853, #00e5ff)',
            color: busy ? undefined : '#000',
          }}
        >
          {busy ? `Restoring\u2026 ${elapsed}s` : 'Restore Quality'}
        </button>

        {!hasSource && !error && (
          <div style={{ fontSize: 10, color: '#666', textAlign: 'center' }}>
            Connect an image viewer node
          </div>
        )}

        {status && (
          <div className="char-progress" style={{ justifyContent: 'center', fontSize: 10 }}>
            {status}
          </div>
        )}

        {error && <div className="char-error">{error}</div>}
      </div>
    </div>
  );
}

const RestoreQualityNode = memo(RestoreQualityNodeInner);
export default RestoreQualityNode;
