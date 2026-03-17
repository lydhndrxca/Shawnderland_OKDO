"use client";

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Handle, Position, useReactFlow, useStore } from '@xyflow/react';
import {
  upscaleWithImagen,
  type GeneratedImage,
  type UpscaleFactor,
} from '@/lib/ideation/engine/conceptlab/imageGenApi';
import { registerRequest, unregisterRequest } from '@/lib/activeRequests';
import './UtilityNodes.css';

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

function gatherUpstreamImages(
  nodeId: string,
  getNode: (id: string) => { id: string; data: Record<string, unknown> } | undefined,
  edges: Array<{ source: string; target: string }>,
): GeneratedImage[] {
  const imgs: GeneratedImage[] = [];
  for (const e of edges) {
    if (e.target !== nodeId) continue;
    const peer = getNode(e.source);
    if (!peer?.data) continue;
    const d = peer.data as Record<string, unknown>;
    const bulk = d._bulkImages as GeneratedImage[] | undefined;
    if (bulk?.length) { imgs.push(...bulk); continue; }
    const single = d.generatedImage as GeneratedImage | undefined;
    if (single?.base64) imgs.push(single);
  }
  return imgs;
}

function UpresStandaloneNodeInner({ id, data, selected }: Props) {
  const { getNode, setNodes, getEdges } = useReactFlow();

  const [factor, setFactor] = useState<UpscaleFactor>(
    (data._upresFactor as UpscaleFactor) ?? 'x2',
  );
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [examined, setExamined] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const mountedRef = useRef(true);

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, _upresFactor: factor } } : n)),
    );
  }, [factor, id, setNodes]);

  const inputCountSelector = useCallback(
    (state: {
      nodes: Array<{ id: string; data: Record<string, unknown> }>;
      edges: Array<{ source: string; target: string }>;
    }) => {
      let count = 0;
      for (const e of state.edges) {
        if (e.target !== id) continue;
        const peer = state.nodes.find((n) => n.id === e.source);
        if (!peer?.data) continue;
        const bulk = peer.data._bulkImages as GeneratedImage[] | undefined;
        if (bulk?.length) { count += bulk.length; continue; }
        const single = peer.data.generatedImage as GeneratedImage | undefined;
        if (single?.base64) count++;
      }
      return count;
    },
    [id],
  );
  const inputCount = useStore(inputCountSelector);

  useEffect(() => {
    if (inputCount === 0) setExamined(false);
  }, [inputCount]);

  const handleExamine = useCallback(() => {
    if (inputCount === 0) {
      setError('No images connected');
      return;
    }
    setExamined(true);
    setError(null);
    setStatus(`${inputCount} image${inputCount !== 1 ? 's' : ''} ready for upscaling`);
  }, [inputCount]);

  const handleProcess = useCallback(async () => {
    if (busy) return;
    const edges = getEdges();
    const inputImages = gatherUpstreamImages(id, getNode as (id: string) => { id: string; data: Record<string, unknown> } | undefined, edges);

    if (inputImages.length === 0) {
      setError('No images to process');
      return;
    }

    setBusy(true);
    setError(null);
    setStatus('Starting upscale...');
    setElapsed(0);
    const t0 = Date.now();
    timerRef.current = setInterval(() => {
      if (mountedRef.current) setElapsed(Math.floor((Date.now() - t0) / 1000));
    }, 500);

    const controller = registerRequest();
    const results: GeneratedImage[] = [];

    try {
      for (let i = 0; i < inputImages.length; i++) {
        if (!mountedRef.current || controller.signal.aborted) return;
        setStatus(`Processing ${i + 1}/${inputImages.length}...`);
        const result = await upscaleWithImagen(inputImages[i], factor);
        results.push(result);
      }

      if (!mountedRef.current || controller.signal.aborted) return;

      const secs = ((Date.now() - t0) / 1000).toFixed(1);
      setStatus(`Done — ${results.length} image${results.length !== 1 ? 's' : ''} upscaled in ${secs}s`);

      // Push results to connected output nodes
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== id) return n;
          return { ...n, data: { ...n.data, _outputImages: results } };
        }),
      );

      setTimeout(() => { if (mountedRef.current) setStatus(null); }, 4000);
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
  }, [busy, factor, id, getNode, getEdges, setNodes]);

  return (
    <div className={`util-node ${selected ? 'selected' : ''} ${busy ? 'util-node-processing' : ''}`}>
      <Handle type="target" position={Position.Left} id="input" />
      <Handle type="source" position={Position.Right} id="output" />

      <div className="util-node-header" style={{ background: '#e040fb' }}>
        AI Upres
      </div>

      <div className="util-node-body">
        {inputCount === 0 && !error && (
          <div className="util-hint">Connect a Bulk Image Input or image node</div>
        )}

        {inputCount > 0 && !examined && (
          <button
            type="button"
            className="util-btn primary nodrag nopan"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); handleExamine(); }}
            style={{ width: '100%', padding: '8px 0', fontSize: 12, fontWeight: 700 }}
          >
            Examine ({inputCount} image{inputCount !== 1 ? 's' : ''})
          </button>
        )}

        {examined && (
          <>
            <div style={{ fontSize: 11, color: '#ccc', textAlign: 'center' }}>
              {inputCount} image{inputCount !== 1 ? 's' : ''} ready
            </div>

            <div style={{ display: 'flex', gap: 4 }}>
              {(['x2', 'x3', 'x4'] as UpscaleFactor[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  className={`util-btn nodrag nopan ${factor === f ? 'primary' : ''}`}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); setFactor(f); }}
                  style={{ flex: 1, fontSize: 12, fontWeight: 700, padding: '6px 0' }}
                >
                  {f.toUpperCase()}
                </button>
              ))}
            </div>

            <div style={{ fontSize: 9, color: '#888', textAlign: 'center' }}>
              {factor === 'x2' && 'Up to ~4 MP output'}
              {factor === 'x3' && 'Up to ~9 MP output'}
              {factor === 'x4' && 'Up to 17 MP output'}
            </div>

            <button
              type="button"
              className="util-btn primary nodrag nopan"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); handleProcess(); }}
              disabled={busy}
              style={{ width: '100%', padding: '8px 0', fontSize: 12, fontWeight: 700 }}
            >
              {busy ? `Processing… ${elapsed}s` : 'Process'}
            </button>
          </>
        )}

        {status && <div className="util-status">{status}</div>}
        {error && <div className="util-error">{error}</div>}
      </div>
    </div>
  );
}

const UpresStandaloneNode = memo(UpresStandaloneNodeInner);
export default UpresStandaloneNode;
