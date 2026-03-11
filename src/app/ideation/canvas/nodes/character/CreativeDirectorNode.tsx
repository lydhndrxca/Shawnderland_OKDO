"use client";

import { memo, useCallback, useState, useRef, useEffect } from 'react';
import { Handle, Position, useReactFlow, useStore } from '@xyflow/react';
import {
  generateText,
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

interface DesignSuggestion {
  title: string;
  suggestion: string;
  category: string;
}

interface HistoryEntry {
  title: string;
  suggestion: string;
  applied: boolean;
}

const CATEGORY_COLORS: Record<string, string> = {
  silhouette: '#42a5f5',
  color: '#ffa726',
  material: '#8d6e63',
  accessory: '#ab47bc',
  attitude: '#ef5350',
  story: '#66bb6a',
  proportion: '#26c6da',
  detail: '#78909c',
};

const IMAGE_SOURCE_TYPES = new Set([
  'charMainViewer', 'charViewer', 'charImageViewer',
  'charFrontViewer', 'charBackViewer', 'charSideViewer', 'charCustomView',
  'charGenerate', 'imageOutput', 'detachedViewer',
]);

const VIEWER_TYPES = new Set([
  'charMainViewer', 'charViewer', 'charImageViewer',
  'charFrontViewer', 'charBackViewer', 'charSideViewer',
  'charCustomView', 'detachedViewer',
]);

function gatherContext(
  nodeId: string,
  getNode: ReturnType<typeof useReactFlow>['getNode'],
  getEdges: ReturnType<typeof useReactFlow>['getEdges'],
) {
  const edges = getEdges();
  const incoming = edges.filter((e) => e.target === nodeId);

  let image: GeneratedImage | null = null;
  let description = '';
  let identityText = '';
  const attributeLines: string[] = [];

  for (const e of incoming) {
    const src = getNode(e.source);
    if (!src?.data) continue;
    const d = src.data as Record<string, unknown>;

    if (IMAGE_SOURCE_TYPES.has(src.type ?? '')) {
      const img = d.generatedImage as GeneratedImage | undefined;
      if (img?.base64 && !image) image = img;
    }

    if (src.type === 'charDescription' && typeof d.description === 'string') {
      description = d.description;
    }
    if (src.type === 'charIdentity') {
      const ident = d.identity as { age?: string; race?: string; gender?: string; build?: string } | undefined;
      if (ident) {
        identityText = [ident.age, ident.race, ident.gender, ident.build].filter(Boolean).join(', ');
      }
    }
    if (src.type === 'charAttributes' && d.attributes) {
      const attrs = d.attributes as Record<string, string>;
      for (const [k, v] of Object.entries(attrs)) {
        if (v?.trim()) attributeLines.push(`${k}: ${v}`);
      }
    }
  }

  return { image, description, identityText, attributeLines };
}

function findDownstreamViewers(
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
      if (e.source !== current) continue;
      const tgt = getNode(e.target);
      if (!tgt || visited.has(tgt.id)) continue;
      if (VIEWER_TYPES.has(tgt.type ?? '')) viewers.push(tgt.id);
      queue.push(tgt.id);
    }
  }
  return viewers;
}

const BASE_PROMPT = `You are an award-winning Hollywood character designer with 25+ years working on iconic film franchises — think the costume departments behind Blade Runner, Mad Max, The Matrix, John Wick, and Dune. You have an extraordinary eye for what makes a character design feel lived-in, memorable, and cinematically compelling.

You're reviewing this character design. Study every detail — the silhouette, color relationships, material choices, accessories, proportions, and the overall "story" the outfit tells about who this person is.

Now give your honest, expert creative direction. What specific changes would push this design from good to iconic? Think about:
- Silhouette and shape language (what does the outline read as?)
- Color harmony and accent choices
- Material contrasts and textural interest
- Accessories or props that add narrative depth
- Small details that reward a closer look
- What the design says about this character's life and personality`;

const BOLD_ADDENDUM = `

BOLD MODE — PUSH THE BOUNDARIES:
Forget safe, incremental suggestions. Think like a visionary. What would a fearless designer do? Consider:
- Radical silhouette changes that completely redefine the character's presence
- Unexpected cultural or subcultural mashups
- Bold color moves — monochrome, neon accents, inverted palettes
- Unusual material combinations (tech fabrics with vintage leather, raw canvas with chrome hardware)
- Accessories that tell a whole backstory in one glance
- Props or wearable elements that break genre conventions
- Details inspired by architecture, nature, machinery, or other non-fashion sources
Be provocative. Be surprising. Every suggestion should make the designer say "I never would have thought of that."`;

const FORMAT_INSTRUCTIONS = `

Return EXACTLY a JSON array of 4-5 suggestions. Each suggestion must be specific and actionable — not vague. Reference actual garments, colors, or details you can see.

JSON format (return ONLY this, no markdown, no backticks):
[
  { "title": "short punchy title (3-6 words)", "suggestion": "2-3 sentence specific actionable direction", "category": "silhouette|color|material|accessory|attitude|story|proportion|detail" }
]`;

function CreativeDirectorNodeInner({ id, data, selected }: Props) {
  const { setNodes, setEdges, getNode, getEdges } = useReactFlow();
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<DesignSuggestion[]>(
    (data?.suggestions as DesignSuggestion[]) ?? [],
  );
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editingMulti, setEditingMulti] = useState(false);
  const [editedIds, setEditedIds] = useState<Set<number>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [history, setHistory] = useState<HistoryEntry[]>(
    (data?.critiqueHistory as HistoryEntry[]) ?? [],
  );
  const [boldMode, setBoldMode] = useState<boolean>(
    (data?.boldMode as boolean) ?? false,
  );
  const mountedRef = useRef(true);
  const lastAnalyzedRef = useRef<string | null>(null);
  const analyzingRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const persistData = useCallback((updates: Record<string, unknown>) => {
    setNodes((nds) =>
      nds.map((n) => n.id === id ? { ...n, data: { ...n.data, ...updates } } : n),
    );
  }, [id, setNodes]);

  const runAnalysis = useCallback(async (auto: boolean) => {
    if (analyzingRef.current) return;
    analyzingRef.current = true;
    setAnalyzing(true);
    setError(null);

    let updatedHistory = history;
    if (!auto && suggestions.length > 0) {
      const archived: HistoryEntry[] = suggestions.map((s, i) => ({
        title: s.title,
        suggestion: s.suggestion,
        applied: editedIds.has(i),
      }));
      updatedHistory = [...history, ...archived];
      setHistory(updatedHistory);
      persistData({ critiqueHistory: updatedHistory });
    }

    setSuggestions([]);
    setEditedIds(new Set());
    setSelectedIds(new Set());

    try {
      const ctx = gatherContext(id, getNode, getEdges);

      if (!ctx.image) {
        if (!auto) setError('No image found. Connect a Main Stage Viewer or image source to the input.');
        return;
      }

      const imageKey = ctx.image.base64.slice(0, 64);
      if (auto && lastAnalyzedRef.current === imageKey) return;

      let contextBlock = '';
      if (ctx.identityText) contextBlock += `\nCharacter identity: ${ctx.identityText}`;
      if (ctx.description) contextBlock += `\nDesigner's description: ${ctx.description}`;
      if (ctx.attributeLines.length > 0) contextBlock += `\nCurrent attributes:\n${ctx.attributeLines.join('\n')}`;

      let historyBlock = '';
      if (updatedHistory.length > 0) {
        const applied = updatedHistory.filter((h) => h.applied);
        const notApplied = updatedHistory.filter((h) => !h.applied);

        historyBlock = '\n\nYOUR PREVIOUS CRITIQUE HISTORY (do NOT repeat these):';
        if (applied.length > 0) {
          historyBlock += '\n\nSuggestions the designer ACCEPTED and applied to the image:';
          for (const h of applied) {
            historyBlock += `\n- "${h.title}": ${h.suggestion}`;
          }
          historyBlock += '\nThese changes should already be visible in the current image. Acknowledge the progress and build on it.';
        }
        if (notApplied.length > 0) {
          historyBlock += '\n\nSuggestions the designer chose NOT to apply (respect their choice, do not re-suggest):';
          for (const h of notApplied) {
            historyBlock += `\n- "${h.title}": ${h.suggestion}`;
          }
        }
        historyBlock += '\n\nGive entirely NEW suggestions that explore different aspects of the design. Go deeper, look at things you missed before. Push into fresh territory.';
      }

      const prompt = BASE_PROMPT + (boldMode ? BOLD_ADDENDUM : '') + FORMAT_INSTRUCTIONS
        + (contextBlock ? `\n\nCONTEXT FROM THE DESIGNER:${contextBlock}` : '')
        + historyBlock;
      const raw = await generateText(prompt, ctx.image);

      let parsed: DesignSuggestion[];
      try {
        const jsonStr = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
        parsed = JSON.parse(jsonStr) as DesignSuggestion[];
      } catch {
        const match = raw.match(/\[[\s\S]*\]/);
        if (match) {
          parsed = JSON.parse(match[0]) as DesignSuggestion[];
        } else {
          throw new Error('Could not parse suggestions from AI response');
        }
      }

      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('No suggestions returned');
      }

      if (mountedRef.current) {
        lastAnalyzedRef.current = imageKey;
        setSuggestions(parsed);
        persistData({ suggestions: parsed });
      }
    } catch (e) {
      if (mountedRef.current) setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (mountedRef.current) setAnalyzing(false);
      analyzingRef.current = false;
    }
  }, [id, getNode, getEdges, persistData, history, suggestions, editedIds, boldMode]);

  const upstreamImageKey = useStore(
    useCallback(
      (s: { nodeLookup: Map<string, { type?: string; data: Record<string, unknown> }>; edges: Array<{ source: string; target: string }> }) => {
        for (const e of s.edges) {
          if (e.target !== id) continue;
          const src = s.nodeLookup.get(e.source);
          if (!src) continue;
          if (IMAGE_SOURCE_TYPES.has(src.type ?? '')) {
            const img = src.data?.generatedImage as { base64?: string } | undefined;
            if (img?.base64) return img.base64.slice(0, 64);
          }
        }
        return null;
      },
      [id],
    ),
  );

  useEffect(() => {
    if (!upstreamImageKey) return;
    if (lastAnalyzedRef.current === upstreamImageKey) return;
    const timer = setTimeout(() => { runAnalysis(true); }, 600);
    return () => clearTimeout(timer);
  }, [upstreamImageKey, runAnalysis]);

  const pushEditedImage = useCallback((editedImage: GeneratedImage) => {
    const viewerIds = findDownstreamViewers(id, getNode, getEdges);
    if (viewerIds.length > 0) {
      setNodes((nds) =>
        nds.map((n) =>
          viewerIds.includes(n.id)
            ? { ...n, data: { ...n.data, generatedImage: editedImage } }
            : n,
        ),
      );
    }
    const edges = getEdges();
    const incomingViewerIds: string[] = [];
    for (const e of edges) {
      if (e.target !== id) continue;
      const src = getNode(e.source);
      if (src && VIEWER_TYPES.has(src.type ?? '')) incomingViewerIds.push(src.id);
    }
    if (incomingViewerIds.length > 0) {
      setNodes((nds) =>
        nds.map((n) =>
          incomingViewerIds.includes(n.id)
            ? { ...n, data: { ...n.data, generatedImage: editedImage } }
            : n,
        ),
      );
    }
  }, [id, getNode, getEdges, setNodes]);

  const recordApplied = useCallback((items: DesignSuggestion[]) => {
    const entries: HistoryEntry[] = items.map((s) => ({ title: s.title, suggestion: s.suggestion, applied: true }));
    const next = [...history, ...entries];
    setHistory(next);
    setTimeout(() => persistData({ critiqueHistory: next }), 0);
  }, [history, persistData]);

  const buildEditPrompt = useCallback((items: DesignSuggestion[]) => {
    const directions = items.map((s, i) => `${i + 1}. "${s.title}": ${s.suggestion}`).join('\n');
    return `You are editing a character design image. Apply ALL of the following creative directions to the character simultaneously, while keeping everything else about the image identical:

CREATIVE DIRECTIONS TO APPLY:
${directions}

RULES:
- Apply ALL listed changes in a single cohesive result
- Keep the same character, same pose, same camera angle, same background
- Keep all existing clothing, accessories, and details that are NOT being changed
- Maintain the same art style and rendering quality
- The background must remain flat solid grey
- Full body, head to toe, same framing`;
  }, []);

  const handleApplyEdit = useCallback(async (idx: number) => {
    const s = suggestions[idx];
    if (!s) return;

    const ctx = gatherContext(id, getNode, getEdges);
    if (!ctx.image) { setError('No source image to edit.'); return; }

    setEditingIdx(idx);
    setError(null);
    const anim = createProcessingAnimator(setNodes, setEdges, getEdges);

    try {
      anim.markNodes([id], true);
      const result = await generateWithGeminiRef(buildEditPrompt([s]), ctx.image);
      if (!mountedRef.current) return;
      const editedImage = result[0];
      if (!editedImage) throw new Error('No edited image returned');

      pushEditedImage(editedImage);
      setEditedIds((prev) => new Set(prev).add(idx));
      recordApplied([s]);
    } catch (e) {
      if (mountedRef.current) setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (mountedRef.current) setEditingIdx(null);
      anim.clearAll();
    }
  }, [id, suggestions, getNode, getEdges, setNodes, setEdges, pushEditedImage, recordApplied, buildEditPrompt]);

  const handleApplySelected = useCallback(async () => {
    if (selectedIds.size === 0) return;
    const items = [...selectedIds].sort().map((i) => suggestions[i]).filter(Boolean);
    if (items.length === 0) return;

    const ctx = gatherContext(id, getNode, getEdges);
    if (!ctx.image) { setError('No source image to edit.'); return; }

    setEditingMulti(true);
    setError(null);
    const anim = createProcessingAnimator(setNodes, setEdges, getEdges);

    try {
      anim.markNodes([id], true);
      const result = await generateWithGeminiRef(buildEditPrompt(items), ctx.image);
      if (!mountedRef.current) return;
      const editedImage = result[0];
      if (!editedImage) throw new Error('No edited image returned');

      pushEditedImage(editedImage);
      setEditedIds((prev) => {
        const next = new Set(prev);
        for (const i of selectedIds) next.add(i);
        return next;
      });
      setSelectedIds(new Set());
      recordApplied(items);
    } catch (e) {
      if (mountedRef.current) setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (mountedRef.current) setEditingMulti(false);
      anim.clearAll();
    }
  }, [id, selectedIds, suggestions, getNode, getEdges, setNodes, setEdges, pushEditedImage, recordApplied, buildEditPrompt]);

  const toggleSelect = useCallback((idx: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  }, []);

  const isBusy = analyzing || editingIdx !== null || editingMulti;

  return (
    <div
      className={`char-node ${selected ? 'selected' : ''} ${isBusy ? 'char-node-processing' : ''}`}
      title={NODE_TOOLTIPS.charCreativeDirector}
      style={{ width: '100%', minWidth: 460, maxWidth: 'none' }}
    >
      {/* ── Header ── */}
      <div className="char-node-header" style={{ background: '#ff6f00', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          Creative Director
          {history.length > 0 && (
            <span style={{ fontSize: 8, opacity: 0.7, fontWeight: 400 }}>
              ({history.length} past note{history.length !== 1 ? 's' : ''})
            </span>
          )}
        </span>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {history.length > 0 && !analyzing && (
            <button
              type="button"
              className="nodrag"
              onClick={() => { setHistory([]); persistData({ critiqueHistory: [] }); }}
              disabled={isBusy}
              style={{
                background: 'rgba(0,0,0,0.15)',
                border: '1px solid rgba(0,0,0,0.1)',
                borderRadius: 4,
                color: '#0f0f1a',
                fontSize: 8,
                fontWeight: 600,
                padding: '2px 6px',
                cursor: 'pointer',
                opacity: 0.7,
              }}
            >
              Clear Memory
            </button>
          )}
          <button
            type="button"
            className="nodrag"
            onClick={() => runAnalysis(false)}
            disabled={isBusy}
            style={{
              background: 'rgba(0,0,0,0.2)',
              border: '1px solid rgba(0,0,0,0.15)',
              borderRadius: 4,
              color: '#0f0f1a',
              fontSize: 9,
              fontWeight: 700,
              padding: '2px 8px',
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '0.3px',
              opacity: isBusy ? 0.4 : 1,
            }}
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="char-node-body" style={{ gap: 10 }}>
        {/* ── Bold Mode toggle ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            type="button"
            className="nodrag"
            onClick={() => { const next = !boldMode; setBoldMode(next); persistData({ boldMode: next }); }}
            disabled={isBusy}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              fontSize: 10,
              fontWeight: 700,
              borderRadius: 4,
              cursor: isBusy ? 'default' : 'pointer',
              border: boldMode ? '1px solid rgba(255,111,0,0.5)' : '1px solid rgba(255,255,255,0.1)',
              background: boldMode ? 'rgba(255,111,0,0.15)' : 'transparent',
              color: boldMode ? '#ff9800' : 'var(--text-muted)',
              transition: 'all 0.2s',
            }}
          >
            <span style={{ fontSize: 14, lineHeight: 1 }}>{boldMode ? '🔥' : '💡'}</span>
            {boldMode ? 'Bold Mode ON' : 'Bold Mode'}
          </button>

          {/* ── Apply Selected button ── */}
          {selectedIds.size > 0 && !isBusy && (
            <button
              type="button"
              className="char-btn primary nodrag"
              onClick={handleApplySelected}
              style={{ fontSize: 10, padding: '4px 12px' }}
            >
              Apply {selectedIds.size} Selected
            </button>
          )}
        </div>

        {analyzing && <div className="char-progress">Studying the design{boldMode ? ' (bold mode)' : ''}...</div>}
        {editingMulti && <div className="char-progress">Applying {selectedIds.size || 'selected'} edits simultaneously...</div>}
        {editingIdx !== null && !editingMulti && (
          <div className="char-progress">
            Applying edit: {suggestions[editingIdx]?.title}...
          </div>
        )}
        {error && <div className="char-error">{error}</div>}

        {suggestions.length === 0 && !analyzing && !error && (
          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, lineHeight: 1.4, textAlign: 'center', padding: '8px 0' }}>
            Connect a character image — critique auto-generates.
          </p>
        )}

        {/* ── Suggestion cards ── */}
        {suggestions.length > 0 && !analyzing && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {suggestions.map((s, i) => {
              const edited = editedIds.has(i);
              const isThisEditing = editingIdx === i;
              const isSelected = selectedIds.has(i);
              const catColor = CATEGORY_COLORS[s.category] ?? '#78909c';
              return (
                <div
                  key={i}
                  style={{
                    background: edited
                      ? 'rgba(105, 240, 174, 0.06)'
                      : isSelected
                        ? 'rgba(255, 111, 0, 0.06)'
                        : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${
                      edited ? 'rgba(105, 240, 174, 0.25)'
                      : isSelected ? 'rgba(255, 111, 0, 0.35)'
                      : isThisEditing ? 'rgba(255, 111, 0, 0.4)'
                      : 'rgba(255,255,255,0.08)'
                    }`,
                    borderRadius: 6,
                    padding: '10px 12px',
                    transition: 'border-color 0.2s, background 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    {/* Checkbox */}
                    {!edited && (
                      <input
                        type="checkbox"
                        className="nodrag"
                        checked={isSelected}
                        onChange={() => toggleSelect(i)}
                        disabled={isBusy}
                        style={{
                          marginTop: 3,
                          flexShrink: 0,
                          accentColor: '#ff9800',
                          width: 14,
                          height: 14,
                          cursor: isBusy ? 'default' : 'pointer',
                        }}
                      />
                    )}
                    {edited && (
                      <span style={{ marginTop: 2, flexShrink: 0, fontSize: 14, lineHeight: 1 }}>✓</span>
                    )}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <span
                          style={{
                            fontSize: 8,
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            color: catColor,
                            background: `${catColor}18`,
                            padding: '1px 5px',
                            borderRadius: 3,
                            flexShrink: 0,
                          }}
                        >
                          {s.category}
                        </span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>
                          {s.title}
                        </span>
                      </div>
                      <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                        {s.suggestion}
                      </p>
                    </div>

                    <button
                      type="button"
                      className="nodrag"
                      disabled={isBusy || edited}
                      onClick={() => handleApplyEdit(i)}
                      style={{
                        flexShrink: 0,
                        padding: '6px 12px',
                        fontSize: 10,
                        fontWeight: 700,
                        borderRadius: 4,
                        cursor: isBusy || edited ? 'default' : 'pointer',
                        border: edited
                          ? '1px solid rgba(105,240,174,0.3)'
                          : '1px solid rgba(255,111,0,0.4)',
                        background: edited
                          ? 'rgba(105,240,174,0.1)'
                          : isThisEditing
                            ? 'rgba(255,111,0,0.3)'
                            : 'rgba(255,111,0,0.15)',
                        color: edited ? '#69f0ae' : '#ff9800',
                        transition: 'background 0.15s, border-color 0.15s',
                        whiteSpace: 'nowrap',
                        opacity: isBusy && !isThisEditing ? 0.4 : 1,
                      }}
                    >
                      {edited ? 'Applied' : isThisEditing ? 'Editing...' : 'Apply Edit'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Handle type="target" position={Position.Left} id="input" className="char-handle" style={{ top: '50%' }} />
      <Handle type="source" position={Position.Right} id="output" className="char-handle" style={{ top: '50%' }} />
    </div>
  );
}

export default memo(CreativeDirectorNodeInner);
