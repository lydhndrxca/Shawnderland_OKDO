"use client";

import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { generateWithGeminiRef, type GeneratedImage } from '@/lib/ideation/engine/conceptlab/imageGenApi';
import { createProcessingAnimator } from '@/lib/processingAnimation';
import { registerRequest, unregisterRequest } from '@/lib/activeRequests';
import { NODE_TOOLTIPS } from './nodeTooltips';
import './CharacterNodes.css';

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

const EDIT_PREFIX =
  'VISUAL EDIT TASK:\nPreserve 100% of the existing design, only apply the following modification:\n';
const EDIT_SUFFIX =
  '\nApply ONLY the above modification. Do NOT change anything else.\nBackground: Solid flat grey (#D3D3D3). No floor, no shadows, no environment.';

type ViewKind = 'main' | 'front' | 'back' | 'side';

const VIEWER_MAP: Record<string, ViewKind> = {
  charMainViewer: 'main',
  charViewer: 'main',
  charImageViewer: 'main',
  charFrontViewer: 'front',
  charBackViewer: 'back',
  charSideViewer: 'side',
};

const VIEW_LABELS: Record<ViewKind, string> = {
  main: 'Main',
  front: 'Front',
  back: 'Back',
  side: 'Side',
};

function isCancelledError(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    return msg === 'cancelled' || msg.includes('abort') || err.name === 'AbortError';
  }
  return false;
}

function EditCharacterNodeInner({ id, data, selected }: Props) {
  const { getNode, getEdges, setNodes, setEdges } = useReactFlow();
  const [editText, setEditText] = useState((data?.editText as string) ?? '');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const mountedRef = useRef(true);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  useEffect(() => () => { mountedRef.current = false; clearInterval(timerRef.current); }, []);

  // View edit toggles — persisted in node data
  const saved = (data?.viewToggles as Record<string, boolean>) ?? {};
  const [editMain, setEditMain] = useState(saved.main ?? true);
  const [editFront, setEditFront] = useState(saved.front ?? false);
  const [editBack, setEditBack] = useState(saved.back ?? false);
  const [editSide, setEditSide] = useState(saved.side ?? false);

  const persistToggles = useCallback(
    (patch: Partial<Record<ViewKind, boolean>>) => {
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== id) return n;
          const prev = ((n.data as Record<string, unknown>).viewToggles as Record<string, boolean>) ?? {};
          return { ...n, data: { ...n.data, viewToggles: { ...prev, ...patch } } };
        }),
      );
    },
    [id, setNodes],
  );

  // ── Detect directly connected viewers (1 hop — no gates, no BFS) ──
  const edges = getEdges();
  const connectedViewers = new Map<ViewKind, { nodeId: string; image: GeneratedImage | null }>();
  const historyIds: string[] = [];

  for (const e of edges) {
    const peerId = e.source === id ? e.target : e.target === id ? e.source : null;
    if (!peerId) continue;
    const peer = getNode(peerId);
    if (!peer?.data) continue;
    const kind = VIEWER_MAP[peer.type ?? ''];
    if (kind && !connectedViewers.has(kind)) {
      const d = peer.data as Record<string, unknown>;
      const img = d.generatedImage as GeneratedImage | undefined;
      connectedViewers.set(kind, { nodeId: peer.id, image: img?.base64 ? img : null });
    }
    if (peer.type === 'charHistory') historyIds.push(peer.id);
  }

  const mainEntry = connectedViewers.get('main');
  const frontEntry = connectedViewers.get('front');
  const backEntry = connectedViewers.get('back');
  const sideEntry = connectedViewers.get('side');
  const mainImage = mainEntry?.image ?? null;

  // ── Apply edits ──
  const handleApply = useCallback(async () => {
    if (!mainImage || !editText.trim() || generating) return;

    setGenerating(true);
    setError(null);
    setElapsed(0);
    setStatus('Starting...');

    const t0 = Date.now();
    timerRef.current = setInterval(() => {
      if (mountedRef.current) setElapsed(Math.floor((Date.now() - t0) / 1000));
    }, 1000);

    // Session-level controller — Cancel All aborts this
    const session = registerRequest();
    const anim = createProcessingAnimator(setNodes, setEdges, getEdges);

    try {
      anim.markNodes([id], true);
      anim.markEdgesFrom(id, true);
      anim.markEdgesTo(id, true);

      const prompt = editText.trim();
      const fullPrompt = EDIT_PREFIX + prompt + EDIT_SUFFIX;

      // ── 1) Main Stage ──
      if (editMain && mainEntry && mainImage) {
        anim.markNodes([mainEntry.nodeId], true);
        setStatus('Editing main stage...');

        const results = await generateWithGeminiRef(fullPrompt, mainImage);
        if (!mountedRef.current || session.signal.aborted) return;

        const img = results[0];
        if (!img) throw new Error('No image returned for main stage');

        setNodes((nds) =>
          nds.map((n) => {
            if (n.id === id) return { ...n, data: { ...n.data, generatedImage: img, editText: prompt } };
            if (n.id === mainEntry.nodeId) return { ...n, data: { ...n.data, generatedImage: img } };
            return n;
          }),
        );

        // History — main stage edits only
        if (historyIds.length > 0) {
          const snap = { image: img, label: prompt.slice(0, 50) || 'Edit' };
          setTimeout(() => {
            setNodes((nds) =>
              nds.map((n) =>
                historyIds.includes(n.id)
                  ? { ...n, data: { ...n.data, _pendingSnapshot: snap } }
                  : n,
              ),
            );
          }, 150);
        }

        anim.markNodes([mainEntry.nodeId], false);
      }

      if (!mountedRef.current || session.signal.aborted) return;

      // ── 2) Front / Back / Side — each references Main Stage for character context ──
      const viewJobs: [ViewKind, typeof frontEntry, boolean][] = [
        ['front', frontEntry, editFront],
        ['back', backEntry, editBack],
        ['side', sideEntry, editSide],
      ];

      for (const [kind, entry, enabled] of viewJobs) {
        if (!enabled || !entry?.image || !mountedRef.current || session.signal.aborted) continue;

        anim.markNodes([entry.nodeId], true);
        setStatus(`Editing ${kind} view...`);

        const viewPrompt =
          `The first image is the main 3/4 view showing the full character for reference.\n` +
          `The second image is the ${kind} view to edit.\n\n${fullPrompt}`;
        const refs =
          mainImage !== entry.image ? [mainImage, entry.image] : entry.image;

        const results = await generateWithGeminiRef(viewPrompt, refs);
        if (!mountedRef.current || session.signal.aborted) break;

        if (results[0]) {
          setNodes((nds) =>
            nds.map((n) =>
              n.id === entry.nodeId
                ? { ...n, data: { ...n.data, generatedImage: results[0] } }
                : n,
            ),
          );
        }

        anim.markNodes([entry.nodeId], false);
      }
    } catch (e) {
      if (isCancelledError(e)) {
        console.log('[EditCharacter] cancelled');
      } else {
        console.error('[EditCharacter] error:', e);
        if (mountedRef.current) setError(e instanceof Error ? e.message : String(e));
      }
    } finally {
      clearInterval(timerRef.current);
      unregisterRequest(session);
      if (mountedRef.current) {
        setGenerating(false);
        setStatus('');
        setElapsed(0);
      }
      anim.clearAll();
    }
  }, [
    mainImage, editText, generating,
    editMain, editFront, editBack, editSide,
    id, mainEntry, frontEntry, backEntry, sideEntry, historyIds,
    getEdges, setNodes, setEdges,
  ]);

  // ── Toggle data ──
  const toggles: [ViewKind, boolean, React.Dispatch<React.SetStateAction<boolean>>, typeof mainEntry][] = [
    ['main', editMain, setEditMain, mainEntry],
    ['front', editFront, setEditFront, frontEntry],
    ['back', editBack, setEditBack, backEntry],
    ['side', editSide, setEditSide, sideEntry],
  ];

  const anyToggled = editMain || editFront || editBack || editSide;
  const canApply = !!mainImage && !!editText.trim() && anyToggled && !generating;

  return (
    <div
      className={`char-node ${selected ? 'selected' : ''} ${generating ? 'char-node-processing' : ''}`}
      title={NODE_TOOLTIPS.charEdit}
    >
      <div className="char-node-header" style={{ background: '#29b6f6' }}>
        Edit Character
      </div>
      <div className="char-node-body">
        <textarea
          className="char-textarea nodrag nowheel"
          value={editText}
          onChange={(e) => {
            setEditText(e.target.value);
            setNodes((nds) =>
              nds.map((n) =>
                n.id === id ? { ...n, data: { ...n.data, editText: e.target.value } } : n,
              ),
            );
          }}
          placeholder="Describe changes to apply..."
          rows={3}
        />

        {/* View toggle buttons */}
        <div style={{ display: 'flex', gap: 3, margin: '6px 0' }} className="nodrag">
          {toggles.map(([kind, active, setter, entry]) => {
            const linked = !!entry;
            const hasImg = !!entry?.image;
            return (
              <button
                key={kind}
                type="button"
                onClick={() => {
                  setter((v) => !v);
                  persistToggles({ [kind]: !active });
                }}
                style={{
                  flex: 1,
                  padding: '5px 0',
                  fontSize: 10,
                  fontWeight: active && linked ? 700 : 400,
                  background: !linked
                    ? '#222'
                    : active
                      ? 'rgba(0,229,255,0.12)'
                      : 'transparent',
                  border: `1.5px solid ${!linked ? '#333' : active ? '#00e5ff' : '#555'}`,
                  borderRadius: 4,
                  color: !linked ? '#555' : active ? '#00e5ff' : '#999',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  lineHeight: 1.3,
                }}
              >
                {active && linked ? '✓ ' : ''}
                {VIEW_LABELS[kind]}
                {!linked && (
                  <span style={{ display: 'block', fontSize: 8, opacity: 0.5 }}>—</span>
                )}
                {linked && !hasImg && (
                  <span style={{ display: 'block', fontSize: 8, color: '#ff9800' }}>no image</span>
                )}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className="char-btn primary nodrag"
          onClick={handleApply}
          disabled={!canApply}
        >
          {generating ? 'Applying...' : 'Apply Changes'}
        </button>

        {generating && (
          <div className="char-progress" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>{status}</span>
            <span style={{ fontSize: 9, opacity: 0.6 }}>{elapsed}s</span>
          </div>
        )}

        {error && (
          <div className="char-error" style={{ maxHeight: 60, overflow: 'auto' }}>
            {error}
          </div>
        )}

        {!mainEntry && !generating && (
          <div style={{ fontSize: 10, color: '#ff9800', marginTop: 4 }}>
            Connect directly to Main Stage viewer
          </div>
        )}
      </div>

      <Handle type="target" position={Position.Left} id="image-in" className="char-handle" style={{ top: '50%' }} />
      <Handle type="source" position={Position.Right} id="image-out" className="char-handle" style={{ top: '50%' }} />
    </div>
  );
}

export default memo(EditCharacterNodeInner);
