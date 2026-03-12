"use client";

import { memo, useCallback, useState, useRef, useEffect } from 'react';
import { Handle, Position, useReactFlow, useStore } from '@xyflow/react';
import {
  generateWithGeminiRef,
} from '@/lib/ideation/engine/conceptlab/imageGenApi';
import type { GeneratedImage } from '@/lib/ideation/engine/conceptlab/imageGenApi';
import { createProcessingAnimator } from '@/lib/processingAnimation';
import { NODE_TOOLTIPS } from './nodeTooltips';
import './CharacterNodes.css';

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

interface ADPoint {
  title: string;
  direction: string;
  rationale: string;
  reference: string;
}

interface ADResult {
  overallVision: string;
  points: ADPoint[];
}

const IMAGE_SOURCE_TYPES = new Set([
  'charMainViewer', 'charViewer', 'charImageViewer',
  'charFrontViewer', 'charBackViewer', 'charSideViewer', 'charCustomView',
  'charGenerate', 'charQuickGen', 'charEditImage',
  'imageOutput', 'imageReference', 'detachedViewer',
  'videoOutput', 'videoAnalysis',
  'adDirectionResult', 'ldDirectionResult',
  'imageStudio', 'artDirector',
]);

const VIEWER_TYPES = new Set([
  'charMainViewer', 'charViewer', 'charImageViewer',
  'charFrontViewer', 'charBackViewer', 'charSideViewer',
  'charCustomView', 'detachedViewer',
  'imageOutput', 'imageReference',
]);

function findUpstreamImage(
  nodeId: string,
  getNode: ReturnType<typeof useReactFlow>['getNode'],
  getEdges: ReturnType<typeof useReactFlow>['getEdges'],
): GeneratedImage | null {
  const edges = getEdges();
  for (const e of edges) {
    if (e.target !== nodeId) continue;
    const src = getNode(e.source);
    if (!src?.data) continue;
    const d = src.data as Record<string, unknown>;

    if (d._sleeping) {
      const result = findUpstreamImage(src.id, getNode, getEdges);
      if (result) return result;
      continue;
    }

    if (IMAGE_SOURCE_TYPES.has(src.type ?? '')) {
      const img = d.generatedImage as GeneratedImage | undefined;
      if (img?.base64) return img;
      if (typeof d.imageBase64 === 'string' && d.imageBase64) {
        return { base64: d.imageBase64, mimeType: (d.mimeType as string) || 'image/png' };
      }
      if (src.type === 'artDirector') {
        const mediaList = d.media as Array<{ type: string; base64?: string; mimeType?: string }> | undefined;
        const imgMedia = mediaList?.find((m) => m.type === 'image' && m.base64);
        if (imgMedia) return { base64: imgMedia.base64!, mimeType: imgMedia.mimeType || 'image/png' };
      }
    }
  }
  return null;
}

function findUpstreamADResult(
  nodeId: string,
  getNode: ReturnType<typeof useReactFlow>['getNode'],
  getEdges: ReturnType<typeof useReactFlow>['getEdges'],
): { result: ADResult; focus: string; userText: string } | null {
  const edges = getEdges();
  for (const e of edges) {
    if (e.target !== nodeId) continue;
    const src = getNode(e.source);
    if (!src?.data) continue;
    const d = src.data as Record<string, unknown>;

    if (d._sleeping) {
      const result = findUpstreamADResult(src.id, getNode, getEdges);
      if (result) return result;
      continue;
    }

    if (src.type !== 'artDirector') continue;
    const result = d.artDirectionResult as ADResult | undefined;
    if (result?.points?.length) {
      return {
        result,
        focus: (d.artDirectionFocus as string) || 'character',
        userText: (d.artDirectionText as string) || '',
      };
    }
  }
  return null;
}

function findAllConnectedViewers(
  nodeId: string,
  getNode: ReturnType<typeof useReactFlow>['getNode'],
  getEdges: ReturnType<typeof useReactFlow>['getEdges'],
): string[] {
  const edges = getEdges();
  const viewers: string[] = [];
  const visited = new Set<string>();
  const queue = [nodeId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    for (const e of edges) {
      let neighbor: string | null = null;
      if (e.source === current) neighbor = e.target;
      else if (e.target === current) neighbor = e.source;
      if (!neighbor || visited.has(neighbor)) continue;
      const node = getNode(neighbor);
      if (!node) continue;
      if (VIEWER_TYPES.has(node.type ?? '')) viewers.push(node.id);
      queue.push(neighbor);
    }
  }
  return viewers;
}

function CreativeDirectorNodeInner({ id, data, selected }: Props) {
  const { setNodes, setEdges, getNode, getEdges } = useReactFlow();
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [status, setStatus] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const upstreamADSig = useStore(
    useCallback(
      (s: { nodeLookup: Map<string, { type?: string; data: Record<string, unknown> }>; edges: Array<{ source: string; target: string }> }) => {
        for (const e of s.edges) {
          if (e.target !== id) continue;
          const src = s.nodeLookup.get(e.source);
          if (!src || src.type !== 'artDirector') continue;
          const r = src.data?.artDirectionResult as ADResult | undefined;
          if (r?.points?.length) return JSON.stringify(r.points.map((p) => p.title));
        }
        return null;
      },
      [id],
    ),
  );

  const adData = findUpstreamADResult(id, getNode, getEdges);
  const adResult = adData?.result ?? null;
  const points = adResult?.points ?? [];

  useEffect(() => {
    setSelectedIds(new Set());
    setExpandedIds(new Set());
  }, [upstreamADSig]);

  const toggleExpand = useCallback((idx: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  }, []);

  const toggleSelect = useCallback((idx: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  }, []);

  const handleApply = useCallback(async () => {
    if (selectedIds.size === 0 || applying) return;

    const image = findUpstreamImage(id, getNode, getEdges);
    if (!image) {
      setError('No source image found. Connect a Main Stage Viewer or image source.');
      return;
    }

    const selectedPoints = [...selectedIds].sort().map((i) => points[i]).filter(Boolean);
    if (selectedPoints.length === 0) return;

    setApplying(true);
    setError(null);
    setStatus('Applying art direction...');
    const anim = createProcessingAnimator(setNodes, setEdges, getEdges);

    try {
      anim.markNodes([id], true);

      const directions = selectedPoints
        .map((p, i) => `${i + 1}. **${p.title}**: ${p.direction}\n   Rationale: ${p.rationale}`)
        .join('\n\n');

      const prompt = `You are applying professional art direction feedback to a character design image.

CREATIVE DIRECTIONS TO APPLY (apply ALL of these simultaneously):
${directions}

${adResult?.overallVision ? `OVERALL VISION: ${adResult.overallVision}\n` : ''}
RULES:
- Apply ALL listed art direction changes in a single cohesive result
- Keep the same character identity — same person, same face, same body type
- Keep the same pose, camera angle, and framing
- Reinterpret the design through the lens of the art direction feedback
- Materials, colors, silhouette, accessories, and details should evolve based on the directions
- Maintain photorealistic quality throughout
- Background: solid flat grey (#D3D3D3). No floor, no shadows, no environment
- Full body, head to toe visible, same framing as original
- The result should feel like a clear evolution of the original — recognizably the same character but with the art direction applied`;

      const result = await generateWithGeminiRef(prompt, image);
      if (!mountedRef.current) return;
      const editedImage = result[0];
      if (!editedImage) throw new Error('No image returned');

      const allViewerIds = findAllConnectedViewers(id, getNode, getEdges);

      if (allViewerIds.length > 0) {
        setNodes((nds) =>
          nds.map((n) =>
            allViewerIds.includes(n.id)
              ? { ...n, data: { ...n.data, generatedImage: editedImage } }
              : n,
          ),
        );
      }

      setStatus(`Applied ${selectedPoints.length} direction${selectedPoints.length > 1 ? 's' : ''} successfully`);
      setTimeout(() => { if (mountedRef.current) setStatus(null); }, 4000);
    } catch (e) {
      if (mountedRef.current) setError(e instanceof Error ? e.message : String(e));
      setStatus(null);
    } finally {
      if (mountedRef.current) setApplying(false);
      anim.clearAll();
    }
  }, [id, selectedIds, points, adResult, applying, getNode, getEdges, setNodes, setEdges]);

  const hasPoints = points.length > 0;

  return (
    <div
      className={`char-node ${selected ? 'selected' : ''} ${applying ? 'char-node-processing' : ''}`}
      title={NODE_TOOLTIPS.charCreativeDirector}
      style={{ width: '100%', minWidth: 460, maxWidth: 'none' }}
    >
      <div className="char-node-header" style={{ background: '#ff6f00', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>Art Direction Output</span>
        {hasPoints && selectedIds.size > 0 && !applying && (
          <button
            type="button"
            className="nodrag"
            onClick={handleApply}
            style={{
              background: 'rgba(0,0,0,0.25)',
              border: '1px solid rgba(0,0,0,0.15)',
              borderRadius: 4,
              color: '#fff',
              fontSize: 10,
              fontWeight: 700,
              padding: '3px 10px',
              cursor: 'pointer',
            }}
          >
            Apply {selectedIds.size} Direction{selectedIds.size > 1 ? 's' : ''}
          </button>
        )}
      </div>

      <div className="char-node-body" style={{ gap: 6 }}>
        {applying && <div className="char-progress">Generating updated character with art direction...</div>}
        {error && <div className="char-error">{error}</div>}
        {status && !applying && (
          <div style={{ fontSize: 10, color: '#69f0ae', textAlign: 'center', padding: '4px 0' }}>{status}</div>
        )}

        {!hasPoints && !applying && (
          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, lineHeight: 1.4, textAlign: 'center', padding: '12px 0' }}>
            Connect an Art Director node — results will appear here after running the gauntlet.
          </p>
        )}

        {/* Overall Vision */}
        {adResult?.overallVision && (
          <div style={{
            background: 'rgba(255,111,0,0.06)',
            border: '1px solid rgba(255,111,0,0.15)',
            borderRadius: 6,
            padding: '8px 10px',
            fontSize: 11,
            lineHeight: 1.5,
            color: '#ccc',
          }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: '#ff9800', marginBottom: 4 }}>
              Overall Vision
            </div>
            {adResult.overallVision}
          </div>
        )}

        {/* Direction Points */}
        {hasPoints && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {points.map((p, i) => {
              const isExpanded = expandedIds.has(i);
              const isSelected = selectedIds.has(i);
              return (
                <div
                  key={i}
                  style={{
                    background: isSelected ? 'rgba(255,111,0,0.08)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${isSelected ? 'rgba(255,111,0,0.35)' : 'rgba(255,255,255,0.06)'}`,
                    borderRadius: 6,
                    transition: 'border-color 0.15s, background 0.15s',
                    overflow: 'hidden',
                  }}
                >
                  {/* Header row */}
                  <div
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 10px',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      className="nodrag"
                      checked={isSelected}
                      onChange={() => toggleSelect(i)}
                      disabled={applying}
                      style={{ flexShrink: 0, accentColor: '#ff9800', width: 14, height: 14, cursor: applying ? 'default' : 'pointer' }}
                    />
                    <div
                      style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
                      onClick={() => toggleExpand(i)}
                      className="nodrag"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{
                          fontSize: 11, fontWeight: 800, color: '#ff9800',
                          background: 'rgba(255,111,0,0.12)',
                          width: 20, height: 20, borderRadius: '50%',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          {i + 1}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                          {p.title}
                        </span>
                        <span style={{ marginLeft: 'auto', fontSize: 10, color: '#666', flexShrink: 0 }}>
                          {isExpanded ? '▲' : '▼'}
                        </span>
                      </div>
                      {!isExpanded && (
                        <p style={{ fontSize: 10, color: '#888', margin: '3px 0 0 26px', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {p.direction}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div style={{ padding: '0 10px 10px 42px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div>
                        <div style={{ fontSize: 9, fontWeight: 700, color: '#ff9800', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 2 }}>Direction</div>
                        <p style={{ fontSize: 11, color: '#ccc', margin: 0, lineHeight: 1.5 }}>{p.direction}</p>
                      </div>
                      <div>
                        <div style={{ fontSize: 9, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 2 }}>Why it matters</div>
                        <p style={{ fontSize: 10, color: '#999', margin: 0, lineHeight: 1.4 }}>{p.rationale}</p>
                      </div>
                      <div>
                        <div style={{ fontSize: 9, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 2 }}>Reference</div>
                        <p style={{ fontSize: 10, color: '#999', margin: 0, lineHeight: 1.4, fontStyle: 'italic' }}>{p.reference}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Apply button at bottom */}
        {hasPoints && selectedIds.size > 0 && (
          <button
            type="button"
            className="nodrag"
            onClick={handleApply}
            disabled={applying}
            style={{
              width: '100%',
              height: 36,
              fontSize: 12,
              fontWeight: 700,
              borderRadius: 5,
              cursor: applying ? 'default' : 'pointer',
              border: '1px solid rgba(255,111,0,0.4)',
              background: applying ? 'rgba(255,111,0,0.1)' : 'rgba(255,111,0,0.2)',
              color: '#ff9800',
              transition: 'all 0.15s',
              opacity: applying ? 0.5 : 1,
            }}
          >
            {applying ? 'Applying...' : `Apply ${selectedIds.size} Art Direction${selectedIds.size > 1 ? 's' : ''} to Character`}
          </button>
        )}
      </div>

      <Handle type="target" position={Position.Left} id="input" className="char-handle" style={{ top: '50%' }} />
      <Handle type="source" position={Position.Right} id="output" className="char-handle" style={{ top: '50%' }} />
    </div>
  );
}

export default memo(CreativeDirectorNodeInner);
