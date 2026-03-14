"use client";

import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { Handle, Position, useReactFlow, useStore } from '@xyflow/react';
import { generateWithGeminiRef, type GeneratedImage } from '@/lib/ideation/engine/conceptlab/imageGenApi';
import { createProcessingAnimator } from '@/lib/processingAnimation';
import { registerRequest, unregisterRequest } from '@/lib/activeRequests';
import { NODE_TOOLTIPS } from './nodeTooltips';
import { devLog } from '@/lib/devLog';
import './CharacterNodes.css';

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

const EDIT_PREFIX =
  'VISUAL EDIT TASK (KEEP EXACT FRAMING — do NOT zoom in):\nPreserve 100% of the existing design, only apply the following modifications:\n\n';
const EDIT_SUFFIX =
  `\n\nApply ONLY the above modifications. Do NOT change anything else.
CRITICAL FRAMING RULE: Maintain the EXACT same camera distance, zoom level, and framing as the source image. The character must occupy the same area of the frame — do NOT zoom in, do NOT crop tighter, do NOT push the camera closer. If the source shows full body head-to-toe, the output MUST also show full body head-to-toe with the same amount of space above the head and below the feet. NEVER cut off the feet or head.
Background: Solid flat neutral grey. No floor, no shadows, no environment. Do NOT render any text or labels.`;

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

const ATTR_LABEL_MAP: Record<string, string> = {
  headwear: 'Headwear',
  outerwear: 'Outerwear',
  top: 'Top / Shirt',
  legwear: 'Legwear / Pants',
  footwear: 'Footwear',
  gloves: 'Gloves',
  facegear: 'Face Gear',
  utilityrig: 'Utility Rig / Belt',
  backpack: 'Backpack / Bag',
  handprop: 'Hand Prop',
  accessories: 'Accessories',
  coloraccents: 'Color Accents',
  detailing: 'Detailing / Wear',
  pose: 'Pose',
  age: 'Age',
  race: 'Race / Ethnicity',
  gender: 'Gender',
  build: 'Build / Body Type',
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
  const [computing, setComputing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const mountedRef = useRef(true);
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  useEffect(() => () => { mountedRef.current = false; clearInterval(timerRef.current); }, []);

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

  // Watch for changed fields on connected Attributes/Identity nodes
  const changedFieldsSig = useStore(
    useCallback(
      (s: { edges: Array<{ source: string; target: string }>; nodeLookup: Map<string, { type?: string; data: Record<string, unknown> }> }) => {
        let sig = '';
        for (const e of s.edges) {
          const peerId = e.source === id ? e.target : e.target === id ? e.source : null;
          if (!peerId) continue;
          const peer = s.nodeLookup.get(peerId);
          if (!peer) continue;
          if (peer.type === 'charAttributes') {
            const cf = peer.data.changedFields as string[] | undefined;
            if (cf?.length) sig += `attrs:${cf.join(',')}|`;
          }
          if (peer.type === 'charIdentity') {
            const cf = peer.data.identityChangedFields as string[] | undefined;
            if (cf?.length) sig += `ident:${cf.join(',')}|`;
          }
        }
        return sig;
      },
      [id],
    ),
  );

  const hasChangedFields = changedFieldsSig.length > 0;

  const computeChanges = useCallback(() => {
    setComputing(true);
    setError(null);

    const edges = getEdges();
    const lines: string[] = [];

    for (const e of edges) {
      const peerId = e.source === id ? e.target : e.target === id ? e.source : null;
      if (!peerId) continue;
      const peer = getNode(peerId);
      if (!peer?.data) continue;
      const d = peer.data as Record<string, unknown>;

      if (peer.type === 'charAttributes') {
        const cf = (d.changedFields as string[]) ?? [];
        const attrs = (d.attributes as Record<string, string>) ?? {};
        for (const key of cf) {
          const val = attrs[key];
          if (!val?.trim()) continue;
          const label = ATTR_LABEL_MAP[key] ?? key;
          lines.push(`${label}: Change to "${val}"`);
        }
      }

      if (peer.type === 'charIdentity') {
        const cf = (d.identityChangedFields as string[]) ?? [];
        const ident = (d.identity as Record<string, string>) ?? {};
        for (const key of cf) {
          const val = ident[key];
          if (!val?.trim()) continue;
          const label = ATTR_LABEL_MAP[key] ?? key;
          lines.push(`${label}: Change to "${val}"`);
        }
      }
    }

    if (lines.length === 0) {
      setError('No changed fields found. Highlight fields in Attributes or Identity nodes first.');
      setComputing(false);
      return;
    }

    const prompt = lines.join('\n');
    setEditText(prompt);
    setNodes((nds) =>
      nds.map((n) => n.id === id ? { ...n, data: { ...n.data, editText: prompt } } : n),
    );
    setComputing(false);
  }, [id, getNode, getEdges, setNodes]);

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

    const session = registerRequest();
    const anim = createProcessingAnimator(setNodes, setEdges, getEdges);

    try {
      anim.markNodes([id], true);
      anim.markEdgesFrom(id, true);
      anim.markEdgesTo(id, true);

      const prompt = editText.trim();
      const fullPrompt = EDIT_PREFIX + prompt + EDIT_SUFFIX;

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
          `The second image is the ${kind} view to edit.\n\n${fullPrompt}` +
          `\n\nFINAL REMINDER: Output must have the IDENTICAL zoom level, camera distance, and field of view as the source image. Do NOT zoom in. Do NOT crop tighter.`;
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
        devLog('[EditCharacter] cancelled');
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
        {/* Compute Changes button */}
        <button
          type="button"
          className="char-btn nodrag"
          onClick={computeChanges}
          disabled={!hasChangedFields || generating || computing}
          style={{
            width: '100%',
            padding: '6px 0',
            fontSize: 11,
            fontWeight: 700,
            background: hasChangedFields ? 'rgba(255, 152, 0, 0.12)' : undefined,
            borderColor: hasChangedFields ? 'rgba(255, 152, 0, 0.4)' : undefined,
            color: hasChangedFields ? '#ff9800' : undefined,
          }}
        >
          {computing ? 'Computing...' : hasChangedFields ? 'Compute Changes from Attributes' : 'No changed fields detected'}
        </button>

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
          placeholder="Edit instructions auto-fill here, or type manually..."
          rows={5}
          style={{ fontSize: 11, lineHeight: 1.5 }}
        />

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

        {!hasChangedFields && !generating && !error && (
          <div style={{ fontSize: 9, color: 'var(--text-muted)', textAlign: 'center', marginTop: 2, lineHeight: 1.4 }}>
            Highlight fields in Attributes or Identity nodes, then click "Compute Changes" to auto-fill
          </div>
        )}
      </div>

      <Handle type="target" position={Position.Left} id="image-in" className="char-handle" style={{ top: '50%' }} />
      <Handle type="source" position={Position.Right} id="image-out" className="char-handle" style={{ top: '50%' }} />
    </div>
  );
}

export default memo(EditCharacterNodeInner);
