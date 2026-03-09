"use client";

import { memo, useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Handle, Position, NodeResizer, useReactFlow, useStore } from '@xyflow/react';
import { ImageContextMenu } from '@/components/ImageContextMenu';
import { generateWithGeminiRef, type GeneratedImage, type GeminiImageModel } from '@/lib/ideation/engine/conceptlab/imageGenApi';
import { registerRequest, unregisterRequest } from '@/lib/activeRequests';
import { NODE_TOOLTIPS } from './nodeTooltips';
import './CharacterNodes.css';

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

type ViewKey = 'main' | 'front' | 'back' | 'side' | 'custom';

const VIEW_CONFIG: Record<ViewKey, { label: string; color: string; compactW: number; compactH: number }> = {
  main:   { label: 'Main Stage',  color: '#00bfa5', compactW: 180, compactH: 240 },
  front:  { label: 'Front View',  color: '#42a5f5', compactW: 150, compactH: 200 },
  back:   { label: 'Back View',   color: '#ab47bc', compactW: 150, compactH: 200 },
  side:   { label: 'Side View',   color: '#ff7043', compactW: 150, compactH: 200 },
  custom: { label: 'Custom View', color: '#7e57c2', compactW: 150, compactH: 200 },
};

const EDIT_PREFIX = 'VISUAL EDIT TASK:\nPreserve 100% of the existing design, only apply the following modification:\n';
const EDIT_SUFFIX = '\nApply ONLY the above modification. Do NOT change anything else.\nBackground: Solid flat grey (#D3D3D3). No floor, no shadows, no environment.';

const RENDER_STYLE_BLOCK = `
RENDERING STYLE — MATCH REFERENCE EXACTLY:
• You MUST match the EXACT rendering style, visual quality, lighting, color grading, saturation, contrast, and level of detail from the provided reference image.
• Study the reference image's style carefully — whether it is photorealistic, stylized, painterly, cel-shaded, or anything else — and reproduce that SAME style precisely.
• This must look like the SAME character rendered from a different camera angle in the SAME engine/pipeline. Do NOT change the art style.`;

const PERSPECTIVE_PROMPTS: Record<'front' | 'back' | 'side', string> = {
  front: `CHARACTER TURNAROUND SHEET — ORTHOGRAPHIC FRONT VIEW:
You are creating one panel of a professional character model sheet / turnaround sheet used in AAA game production.

CRITICAL CAMERA RULE — ORTHOGRAPHIC FRONT:
• The virtual camera is locked at EXACTLY 0° azimuth (dead-center front).
• Lens: orthographic / very long telephoto (200mm+). ZERO perspective distortion.
• Camera height: chest level, perfectly centered on the character's midline.
• The left and right halves of the character must be PERFECTLY SYMMETRICAL in the frame.
• You must NOT see the side of the head, side of the torso, or any surface that faces left/right. Only surfaces that face the camera (toward the viewer) are visible.
• ABSOLUTELY NO 3/4 TURN. NO YAW. NO ROTATION. If you can see the character's ear or side of their jaw, you have rotated too far — correct to 0°.

POSE: Neutral A-pose. Arms 30° from body, palms facing forward, fingers relaxed. Feet shoulder-width, weight even. Head facing straight at camera, eyes forward.

WHAT TO SHOW: Face (dead-on), chest, stomach, belt/buckle, front of both arms, both hands, front of both legs, tops of both shoes/boots. All front-facing gear, pouches, holsters, zippers, buttons, patches.

IDENTITY LOCK: Preserve 100% of the character's design from the reference — body type, face, hair, skin tone, every garment, every accessory, every color, every material, every piece of damage/wear. Change NOTHING except the viewing angle.
${RENDER_STYLE_BLOCK}
Full body head to toe, no cropping.
Background: Solid flat grey (#D3D3D3). No floor, no shadows, no environment.`,

  back: `CHARACTER TURNAROUND SHEET — ORTHOGRAPHIC BACK VIEW:
You are creating one panel of a professional character model sheet / turnaround sheet used in AAA game production.

CRITICAL CAMERA RULE — ORTHOGRAPHIC BACK:
• The virtual camera is locked at EXACTLY 180° azimuth (dead-center rear).
• Lens: orthographic / very long telephoto (200mm+). ZERO perspective distortion.
• Camera height: chest level, perfectly centered on the character's midline.
• You must see ONLY the back of the character. The face must be completely hidden.
• The left and right halves of the character's back must be PERFECTLY SYMMETRICAL in the frame.
• ABSOLUTELY NO 3/4 TURN. NO YAW. NO ROTATION.

POSE: Neutral A-pose. Arms 30° from body, palms facing forward (away from camera), fingers relaxed. Feet shoulder-width, weight even. Head facing directly away from camera.

WHAT TO SHOW: Back of head/hair, back of neck, shoulder blades, spine line, back of jacket/shirt, back of belt, rear pockets, back of both arms, back of both legs, heels of shoes/boots. Any backpack, cape, quiver, or rear-mounted equipment.

IDENTITY LOCK: Preserve 100% of the character's design from the reference — body type, face, hair, skin tone, every garment, every accessory, every color, every material, every piece of damage/wear. Extrapolate rear details consistent with the design language. Change NOTHING except the viewing angle.
${RENDER_STYLE_BLOCK}
Full body head to toe, no cropping.
Background: Solid flat grey (#D3D3D3). No floor, no shadows, no environment.`,

  side: `CHARACTER TURNAROUND SHEET — ORTHOGRAPHIC SIDE VIEW (LEFT PROFILE):
You are creating one panel of a professional character model sheet / turnaround sheet used in AAA game production.

CRITICAL CAMERA RULE — ORTHOGRAPHIC LEFT SIDE PROFILE:
• The virtual camera is locked at EXACTLY 90° azimuth (pure left side).
• Lens: orthographic / very long telephoto (200mm+). ZERO perspective distortion.
• Camera height: chest level.
• The character's nose points to the RIGHT edge of the frame. The back of their head points LEFT.
• You must see a CLEAN SILHOUETTE — the outline/profile of the character from the side.
• ONLY ONE EAR should be visible (the left ear). If you can see both eyes, you are NOT at 90° — you are doing a 3/4 view, which is WRONG.
• The character's chest and back should appear as a single edge/profile line, not as a surface.
• ABSOLUTELY NO 3/4 TURN. This must be a TRUE 90-DEGREE SIDE PROFILE. If ANY part of the chest surface or back surface faces the camera, you have rotated wrong.

POSE: Neutral standing pose. Arms slightly away from body (so the arm silhouette is visible). Feet shoulder-width apart, one foot slightly ahead for natural stance. Head in profile facing screen-right.

WHAT TO SHOW: Left profile of face (forehead, nose, lips, chin), left ear, left shoulder, left arm, left side of torso forming a clean silhouette, left hip, left leg, left side of all gear/clothing. The depth and layering of equipment should be visible in the profile silhouette.

IDENTITY LOCK: Preserve 100% of the character's design from the reference — body type, face, hair, skin tone, every garment, every accessory, every color, every material, every piece of damage/wear. Extrapolate side details consistent with the design language. Change NOTHING except the viewing angle.
${RENDER_STYLE_BLOCK}
Full body head to toe, no cropping.
Background: Solid flat grey (#D3D3D3). No floor, no shadows, no environment.`,
};

const CUSTOM_PROMPT_EXAMPLE = PERSPECTIVE_PROMPTS.front;

interface HistorySnapshot {
  image: GeneratedImage;
  label: string;
  timestamp: string;
}

/** Scans all nodes to find the Main Stage viewer and returns its current image. */
function getMainStageImage(
  selfId: string,
  getNodes: () => Array<{ id: string; type?: string; data: Record<string, unknown> }>,
): GeneratedImage | null {
  const nodes = getNodes();
  for (const n of nodes) {
    if (n.id === selfId) continue;
    const resolvedView = NODE_TYPE_TO_VIEW[n.type ?? ''] ?? (n.data as Record<string, unknown>)?.viewKey;
    if (resolvedView !== 'main') continue;
    const d = n.data as Record<string, unknown>;
    const img = d.generatedImage as GeneratedImage | undefined;
    if (img?.base64) return img;
  }
  return null;
}

function getUpstreamImage(
  nodeId: string,
  getNode: ReturnType<typeof useReactFlow>['getNode'],
  getEdges: ReturnType<typeof useReactFlow>['getEdges'],
): GeneratedImage | null {
  const edges = getEdges();
  const incoming = edges.filter((e) => e.target === nodeId);
  for (const e of incoming) {
    const src = getNode(e.source);
    if (!src?.data) continue;
    const d = src.data as Record<string, unknown>;

    if (src.type === 'charGate') {
      if (!(d.enabled as boolean ?? true)) return null;
      const gateEdges = getEdges().filter((ge) => ge.target === src.id);
      for (const ge of gateEdges) {
        const gSrc = getNode(ge.source);
        if (!gSrc?.data) continue;
        const gd = gSrc.data as Record<string, unknown>;
        const img = gd.generatedImage as GeneratedImage | undefined;
        if (img?.base64) return img;
        if (gd.imageBase64) return { base64: gd.imageBase64 as string, mimeType: (gd.mimeType as string) || 'image/png' };
      }
      continue;
    }

    const img = d.generatedImage as GeneratedImage | undefined;
    if (img?.base64) return img;
    if (d.imageBase64) return { base64: d.imageBase64 as string, mimeType: (d.mimeType as string) || 'image/png' };
  }
  return null;
}

const NODE_TYPE_TO_VIEW: Record<string, ViewKey> = {
  charMainViewer: 'main',
  charViewer: 'main',
  charImageViewer: 'main',
  charFrontViewer: 'front',
  charBackViewer: 'back',
  charSideViewer: 'side',
  charCustomView: 'custom',
};

/** Builds the prompt for a given view, handling custom prompts from node data. */
function buildViewPrompt(viewKey: ViewKey, data: Record<string, unknown>): string | null {
  if (viewKey === 'main') return null;

  if (viewKey === 'custom') {
    const useText = (data?.useText as boolean) ?? true;
    const viewPrompt = (data?.viewPrompt as string) ?? '';
    if (!useText || !viewPrompt.trim()) return null;
    return viewPrompt.trim() + '\n' + RENDER_STYLE_BLOCK + '\nFull body head to toe, no cropping.\nBackground: Solid flat grey (#D3D3D3). No floor, no shadows, no environment.';
  }

  return PERSPECTIVE_PROMPTS[viewKey as 'front' | 'back' | 'side'];
}

function CharViewNodeInner({ id, data, selected }: Props) {
  const { getNode, getNodes, getEdges, setNodes } = useReactFlow();

  const nodeType = getNode(id)?.type ?? '';
  const viewKey: ViewKey = NODE_TYPE_TO_VIEW[nodeType] ?? (data?.viewKey as ViewKey) ?? 'main';
  const cfg = VIEW_CONFIG[viewKey] ?? VIEW_CONFIG.main;
  const isMain = viewKey === 'main';
  const isCustom = viewKey === 'custom';
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [compact, setCompact] = useState(false);
  const [localImage, setLocalImage] = useState<GeneratedImage | null>(
    (data?.localImage as GeneratedImage) ?? null,
  );
  const isPanning = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const fileRef = useRef<HTMLInputElement>(null);
  const angleRefFileRef = useRef<HTMLInputElement>(null);
  const [showFullPreview, setShowFullPreview] = useState(false);

  // ── Custom view state ──
  const [customLabel, setCustomLabel] = useState<string>((data?.customLabel as string) ?? '');
  const [editingLabel, setEditingLabel] = useState(false);
  const [viewPrompt, setViewPrompt] = useState<string>((data?.viewPrompt as string) ?? '');
  const [useText, setUseText] = useState<boolean>((data?.useText as boolean) ?? true);
  const [useImage, setUseImage] = useState<boolean>((data?.useImage as boolean) ?? false);
  const [angleRefImage, setAngleRefImage] = useState<GeneratedImage | null>(
    (data?.angleRefImage as GeneratedImage) ?? null,
  );
  const [showCustomConfig, setShowCustomConfig] = useState(false);

  // Init custom view prompt with example on first mount
  const customInitRef = useRef(false);
  useEffect(() => {
    if (!isCustom || customInitRef.current) return;
    customInitRef.current = true;
    if (!viewPrompt) {
      setViewPrompt(CUSTOM_PROMPT_EXAMPLE);
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, viewPrompt: CUSTOM_PROMPT_EXAMPLE, useText: true, useImage: false } } : n,
        ),
      );
    }
  }, [isCustom, viewPrompt, id, setNodes]);

  // Persist custom view data changes
  const persistCustomData = useCallback((updates: Record<string, unknown>) => {
    setNodes((nds) =>
      nds.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...updates } } : n,
      ),
    );
  }, [id, setNodes]);

  // ── Main Stage image (reactive subscription for non-main views) ──
  const mainStageSelector = useCallback(
    (state: { nodes: Array<{ id: string; type?: string; data: Record<string, unknown> }> }) => {
      if (isMain) return null;
      for (const n of state.nodes) {
        if (n.id === id) continue;
        const resolved = NODE_TYPE_TO_VIEW[n.type ?? ''] ?? (n.data?.viewKey as string);
        if (resolved !== 'main') continue;
        const img = n.data?.generatedImage as GeneratedImage | undefined;
        if (img?.base64) return img.base64.slice(0, 120);
      }
      return null;
    },
    [isMain, id],
  );
  const mainStageSig = useStore(mainStageSelector);

  const mainStageImage = useMemo<GeneratedImage | null>(() => {
    if (isMain || !mainStageSig) return null;
    return getMainStageImage(id, getNodes as () => Array<{ id: string; type?: string; data: Record<string, unknown> }>);
  }, [isMain, mainStageSig, id, getNodes]);

  // ── Image display ──
  const upstreamSigSelector = useCallback(
    (state: { nodes: Array<{ id: string; type?: string; data: Record<string, unknown> }>; edges: Array<{ source: string; target: string }> }) => {
      const incoming = state.edges.filter((e) => e.target === id);
      for (const e of incoming) {
        const src = state.nodes.find((n) => n.id === e.source);
        if (!src?.data) continue;
        const d = src.data as Record<string, unknown>;
        if ((src.type === 'charGate') && !(d.enabled as boolean ?? true)) return '__gate_off__';
        if (src.type === 'charGate') {
          const gateIn = state.edges.filter((ge) => ge.target === src.id);
          for (const ge of gateIn) {
            const gSrc = state.nodes.find((n) => n.id === ge.source);
            if (!gSrc?.data) continue;
            const gd = gSrc.data as Record<string, unknown>;
            const img = gd.generatedImage as GeneratedImage | undefined;
            if (img?.base64) return img.base64.slice(0, 120);
          }
          continue;
        }
        const img = d.generatedImage as GeneratedImage | undefined;
        if (img?.base64) return img.base64.slice(0, 120);
      }
      return null;
    },
    [id],
  );
  const upstreamSig = useStore(upstreamSigSelector);

  const upstreamImage = useMemo<GeneratedImage | null>(() => {
    if (!upstreamSig || upstreamSig === '__gate_off__') return null;
    return getUpstreamImage(id, getNode, getEdges);
  }, [upstreamSig, id, getNode, getEdges]);

  const pushedImage = (data?.generatedImage as GeneratedImage | undefined) ?? null;
  const [editedImage, setEditedImage] = useState<GeneratedImage | null>(null);

  const currentImage = isMain
    ? (editedImage ?? pushedImage ?? upstreamImage ?? localImage)
    : (editedImage ?? pushedImage ?? localImage);

  // Sync upstream → node data (Main Stage only)
  const lastUpstreamSig = useRef<string | null>(null);
  useEffect(() => {
    if (!isMain || !upstreamImage) return;
    const sig = upstreamImage.base64.slice(0, 120);
    if (sig === lastUpstreamSig.current) return;
    lastUpstreamSig.current = sig;
    setEditedImage(null);
    setNodes((nds) =>
      nds.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, generatedImage: upstreamImage } } : n,
      ),
    );
  }, [isMain, upstreamImage, id, setNodes]);

  // ── Embedded History (all views) ──
  const initialEntries = (data?.historyEntries as HistorySnapshot[]) ?? [];
  const [historyEntries, setHistoryEntries] = useState<HistorySnapshot[]>(initialEntries);
  const [historyMinimized, setHistoryMinimized] = useState(true);
  const [activeHistIdx, setActiveHistIdx] = useState(-1);
  const lastHistSig = useRef<string>(
    initialEntries.length > 0 ? initialEntries[initialEntries.length - 1].image.base64.slice(0, 100) : '',
  );

  const pushHistory = useCallback((img: GeneratedImage, label: string) => {
    const sig = img.base64.slice(0, 100);
    if (sig === lastHistSig.current) return;
    lastHistSig.current = sig;

    const snap: HistorySnapshot = {
      image: img,
      label,
      timestamp: new Date().toLocaleTimeString(),
    };

    setHistoryEntries((prev) => [...prev, snap]);
    setActiveHistIdx(-1);
  }, []);

  const historyLenRef = useRef(historyEntries.length);
  useEffect(() => {
    if (historyEntries.length === historyLenRef.current) return;
    historyLenRef.current = historyEntries.length;
    setNodes((nds) =>
      nds.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, historyEntries } } : n,
      ),
    );
  }, [historyEntries, id, setNodes]);

  useEffect(() => {
    if (!isMain || !upstreamImage) return;
    pushHistory(upstreamImage, 'Generated character');
  }, [isMain, upstreamImage, pushHistory]);

  useEffect(() => {
    const pending = (data as Record<string, unknown>)?._pendingSnapshot as { image: GeneratedImage; label: string } | undefined;
    if (!pending?.image?.base64) return;

    setNodes((nds) =>
      nds.map((n) => {
        if (n.id !== id) return n;
        const nd = { ...(n.data as Record<string, unknown>) };
        delete nd._pendingSnapshot;
        return { ...n, data: nd };
      }),
    );

    pushHistory(pending.image, pending.label);
  }, [id, data, setNodes, pushHistory]);

  const historyViewImage = activeHistIdx >= 0 ? historyEntries[activeHistIdx]?.image ?? null : null;
  const viewImage = historyViewImage ?? currentImage;

  // ── Auto-generate perspective when Main Stage image arrives (non-main views) ──
  const gateBlocked = upstreamSig === '__gate_off__';
  const referenceImage = isMain ? null : (gateBlocked ? null : (upstreamImage ?? mainStageImage));
  const lastRefSig = useRef<string | null>(null);
  const autoGenInFlight = useRef(false);
  const autoGenMountedRef = useRef(true);
  const [autoGenBusy, setAutoGenBusy] = useState(false);
  useEffect(() => {
    autoGenMountedRef.current = true;
    return () => { autoGenMountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (isMain || !referenceImage || autoGenInFlight.current) return;

    const sig = referenceImage.base64.slice(0, 120);
    if (sig === lastRefSig.current) return;
    lastRefSig.current = sig;

    const prompt = buildViewPrompt(viewKey, data);
    if (!prompt) return;

    autoGenInFlight.current = true;
    setAutoGenBusy(true);
    setNodes((nds) =>
      nds.map((n) => n.id === id ? { ...n, data: { ...n.data, generating: true } } : n),
    );

    console.log(`[CharView:${viewKey}] Auto-generating ${cfg.label} from Main Stage reference...`);

    const session = registerRequest();

    // For custom views: include angle reference image if enabled
    const refImages: GeneratedImage | GeneratedImage[] = (() => {
      if (isCustom && useImage && angleRefImage) {
        return [referenceImage, angleRefImage];
      }
      return referenceImage;
    })();

    (async () => {
      try {
        const results = await generateWithGeminiRef(prompt, refImages, 'gemini-flash-image');
        if (!autoGenMountedRef.current || session.signal.aborted) return;

        const img = results[0];
        if (!img) return;

        console.log(`[CharView:${viewKey}] ✓ Auto-generated ${cfg.label} (${(img.base64.length / 1024).toFixed(0)}KB)`);
        setEditedImage(img);
        setNodes((nds) =>
          nds.map((n) =>
            n.id === id ? { ...n, data: { ...n.data, generatedImage: img } } : n,
          ),
        );
        pushHistory(img, `Auto: ${cfg.label}`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!msg.toLowerCase().includes('cancel') && !msg.toLowerCase().includes('abort')) {
          console.error(`[CharView:${viewKey}] Auto-generate error:`, e);
        }
      } finally {
        unregisterRequest(session);
        autoGenInFlight.current = false;
        setAutoGenBusy(false);
        setNodes((nds) =>
          nds.map((n) => n.id === id ? { ...n, data: { ...n.data, generating: false } } : n),
        );
      }
    })();
  }, [isMain, isCustom, referenceImage, viewKey, cfg, id, setNodes, pushHistory, data, useImage, angleRefImage]);

  // ── Inline Edit ──
  const [editText, setEditText] = useState('');
  const [editBusy, setEditBusy] = useState(false);
  const [editStatus, setEditStatus] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [editElapsed, setEditElapsed] = useState(0);
  const [editModel, setEditModel] = useState<GeminiImageModel>('gemini-flash-image');
  const editTimerRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; clearInterval(editTimerRef.current); };
  }, []);

  const handleEdit = useCallback(async () => {
    const srcImage = viewImage;
    if (!srcImage || !editText.trim() || editBusy) return;

    setEditBusy(true);
    setEditError(null);
    setEditStatus('Sending to API…');
    setEditElapsed(0);

    const t0 = Date.now();
    editTimerRef.current = setInterval(() => {
      if (mountedRef.current) setEditElapsed(Math.floor((Date.now() - t0) / 1000));
    }, 500);

    const session = registerRequest();

    try {
      let prompt: string;
      let refImages: GeneratedImage | GeneratedImage[];

      if (isMain) {
        prompt = EDIT_PREFIX + editText.trim() + EDIT_SUFFIX;
        refImages = srcImage;
      } else {
        const mainImg = getMainStageImage(id, getNodes as () => Array<{ id: string; type?: string; data: Record<string, unknown> }>);
        const contextNote = `This is a ${(isCustom ? (customLabel || cfg.label) : cfg.label).toLowerCase()} of the character shown in the first reference image (the main/canonical view).\n`;
        prompt = contextNote + EDIT_PREFIX + editText.trim() + EDIT_SUFFIX;
        refImages = mainImg ? [mainImg, srcImage] : srcImage;
      }

      console.log(`[CharView:${viewKey}] editing image (${Array.isArray(refImages) ? refImages.length + ' images' : (srcImage.base64.length / 1024).toFixed(0) + 'KB'})...`);

      const modelLabel = editModel === 'gemini-flash-image' ? 'Flash' : 'Pro';
      setEditStatus(`Waiting for Gemini ${modelLabel}…`);
      const results = await generateWithGeminiRef(prompt, refImages, editModel);

      console.log(`[CharView:${viewKey}] API returned. mounted=${mountedRef.current}, aborted=${session.signal.aborted}, results=${results?.length}`);

      if (!mountedRef.current) {
        console.warn(`[CharView:${viewKey}] ⚠ Component unmounted during API call — skipping update`);
        return;
      }
      if (session.signal.aborted) {
        console.warn(`[CharView:${viewKey}] ⚠ Session was cancelled — skipping update`);
        return;
      }

      const img = results[0];
      if (!img) throw new Error('No image returned');

      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      console.log(`[CharView:${viewKey}] ✓ edit complete (${elapsed}s), new image ${(img.base64.length / 1024).toFixed(0)}KB`);
      setEditStatus(`Done in ${elapsed}s ✓`);

      setEditedImage(img);

      setNodes((nds) =>
        nds.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, generatedImage: img } } : n,
        ),
      );

      pushHistory(img, editText.trim().slice(0, 50) || 'Edit');

      if (isMain) {
        const edges = getEdges();
        const historyIds: string[] = [];
        for (const e of edges) {
          const peerId = e.source === id ? e.target : e.target === id ? e.source : null;
          if (!peerId) continue;
          const peer = getNode(peerId);
          if (peer?.type === 'charHistory') historyIds.push(peer.id);
        }
        if (historyIds.length > 0) {
          const snap = { image: img, label: editText.trim().slice(0, 50) || 'Edit' };
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
      }

      setEditText('');
      setTimeout(() => { if (mountedRef.current) setEditStatus(null); }, 3000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const isCancel = msg.toLowerCase().includes('cancelled') || msg.toLowerCase().includes('abort');
      if (isCancel) {
        console.log(`[CharView:${viewKey}] edit cancelled`);
        setEditStatus(null);
      } else {
        console.error(`[CharView:${viewKey}] edit error:`, e);
        if (mountedRef.current) {
          setEditError(msg);
          setEditStatus(null);
        }
      }
    } finally {
      clearInterval(editTimerRef.current);
      unregisterRequest(session);
      if (mountedRef.current) {
        setEditBusy(false);
        setEditElapsed(0);
      }
    }
  }, [viewImage, editText, editBusy, viewKey, id, isMain, isCustom, customLabel, cfg, getNode, getNodes, getEdges, setNodes, pushHistory, editModel]);

  // ── Standard handlers ──
  const handleResetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.stopPropagation();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((z) => Math.max(0.1, Math.min(10, z + delta)));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1) {
      e.preventDefault();
      isPanning.current = true;
      lastMouse.current = { x: e.clientX, y: e.clientY };
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning.current) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
  }, []);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (e.button === 1) isPanning.current = false;
  }, []);

  const handlePasteImage = useCallback(
    (img: GeneratedImage) => {
      setLocalImage(img);
      setEditedImage(null);
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id
            ? { ...n, data: { ...n.data, localImage: img, generatedImage: img } }
            : n,
        ),
      );
      pushHistory(img, 'Opened / pasted image');
    },
    [id, setNodes, pushHistory],
  );

  const handleOpenImage = useCallback(() => {
    fileRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        const img: GeneratedImage = { base64, mimeType: file.type || 'image/png' };
        handlePasteImage(img);
      };
      reader.readAsDataURL(file);
    },
    [handlePasteImage],
  );

  // ── Custom view: angle reference image ──
  const handleAngleRefFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        const img: GeneratedImage = { base64, mimeType: file.type || 'image/png' };
        setAngleRefImage(img);
        persistCustomData({ angleRefImage: img });
      };
      reader.readAsDataURL(file);
    },
    [persistCustomData],
  );

  const handleResize = useCallback(
    (_: unknown, params: { width: number; height: number }) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id
            ? { ...n, style: { ...n.style, width: params.width, height: params.height } }
            : n,
        ),
      );
    },
    [id, setNodes],
  );

  const toggleCompact = useCallback(() => {
    const goingCompact = !compact;
    setCompact(goingCompact);
    const w = goingCompact ? cfg.compactW : (viewKey === 'main' ? 600 : 400);
    const h = goingCompact ? cfg.compactH : (viewKey === 'main' ? 820 : 720);
    setNodes((nds) =>
      nds.map((n) =>
        n.id === id ? { ...n, style: { ...n.style, width: w, height: h } } : n,
      ),
    );
  }, [compact, cfg, viewKey, id, setNodes]);

  // ── History navigation ──
  const handleHistoryCurrent = useCallback(() => {
    setActiveHistIdx(-1);
  }, []);

  const handleHistorySelect = useCallback((idx: number) => {
    setActiveHistIdx(idx);
  }, []);

  const handleHistoryBack = useCallback(() => {
    if (activeHistIdx === -1 && historyEntries.length > 0) {
      setActiveHistIdx(historyEntries.length - 1);
    } else if (activeHistIdx > 0) {
      setActiveHistIdx(activeHistIdx - 1);
    }
  }, [activeHistIdx, historyEntries.length]);

  const handleHistoryForward = useCallback(() => {
    if (activeHistIdx >= historyEntries.length - 1) {
      setActiveHistIdx(-1);
    } else if (activeHistIdx >= 0) {
      setActiveHistIdx(activeHistIdx + 1);
    }
  }, [activeHistIdx, historyEntries.length]);

  // ── Manual "Generate View" button for non-main views ──
  const [genBusy, setGenBusy] = useState(false);
  const handleGenerateView = useCallback(async () => {
    if (isMain || genBusy) return;
    const mainImg = getMainStageImage(id, getNodes as () => Array<{ id: string; type?: string; data: Record<string, unknown> }>);
    if (!mainImg) {
      setEditError('No Main Stage image found — generate a character first');
      return;
    }

    const prompt = buildViewPrompt(viewKey, data);
    if (!prompt) {
      setEditError(isCustom ? 'Enable "Use Text" and enter a view description, or enable "Use Image" with a reference.' : 'No prompt available');
      return;
    }

    setGenBusy(true);
    setEditError(null);
    setEditStatus('Generating view…');
    setEditElapsed(0);

    const t0 = Date.now();
    editTimerRef.current = setInterval(() => {
      if (mountedRef.current) setEditElapsed(Math.floor((Date.now() - t0) / 1000));
    }, 500);

    const session = registerRequest();

    try {
      // For custom views: include angle reference image if enabled
      const refImages: GeneratedImage | GeneratedImage[] = (() => {
        if (isCustom && useImage && angleRefImage) {
          return [mainImg, angleRefImage];
        }
        return mainImg;
      })();

      const fullPrompt = isCustom && useImage && angleRefImage && !useText
        ? `Create a custom view of this character matching the camera angle and pose shown in the second reference image. Preserve the character's identity from the first reference image exactly.\n${RENDER_STYLE_BLOCK}\nFull body head to toe, no cropping.\nBackground: Solid flat grey (#D3D3D3). No floor, no shadows, no environment.`
        : (isCustom && useImage && angleRefImage
          ? prompt + '\nUse the second reference image as a guide for the desired camera angle, pose, and framing.'
          : prompt);

      const modelLabel = editModel === 'gemini-flash-image' ? 'Flash' : 'Pro';
      setEditStatus(`Waiting for Gemini ${modelLabel}…`);
      const results = await generateWithGeminiRef(fullPrompt, refImages, editModel);

      if (!mountedRef.current || session.signal.aborted) return;

      const img = results[0];
      if (!img) throw new Error('No image returned');

      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      setEditStatus(`Done in ${elapsed}s ✓`);
      setEditedImage(img);
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, generatedImage: img } } : n,
        ),
      );
      pushHistory(img, `Generated ${(isCustom ? (customLabel || cfg.label) : cfg.label).toLowerCase()}`);
      setTimeout(() => { if (mountedRef.current) setEditStatus(null); }, 3000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.toLowerCase().includes('cancel') && !msg.toLowerCase().includes('abort')) {
        if (mountedRef.current) setEditError(msg);
      }
      setEditStatus(null);
    } finally {
      clearInterval(editTimerRef.current);
      unregisterRequest(session);
      if (mountedRef.current) {
        setGenBusy(false);
        setEditElapsed(0);
      }
    }
  }, [isMain, isCustom, genBusy, id, cfg, customLabel, data, viewKey, getNodes, setNodes, pushHistory, editModel, useText, useImage, angleRefImage]);

  const anyBusy = editBusy || genBusy || autoGenBusy;

  const tooltipKey = viewKey === 'front' ? 'charFrontViewer'
    : viewKey === 'back' ? 'charBackViewer'
    : viewKey === 'side' ? 'charSideViewer'
    : viewKey === 'custom' ? 'charCustomView'
    : 'charMainViewer';

  const displayLabel = isCustom && customLabel ? customLabel : cfg.label;

  return (
    <div
      className={`char-node char-viewer-node ${selected ? 'selected' : ''} ${compact ? 'char-view-compact' : 'char-view-expanded'} ${anyBusy ? 'char-node-processing' : ''}`}
      style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}
      title={NODE_TOOLTIPS[tooltipKey]}
    >
      <NodeResizer
        isVisible={!!selected}
        minWidth={compact ? 100 : 200}
        minHeight={compact ? 100 : 200}
        onResize={handleResize}
      />

      {/* ── Header ── */}
      <div className="char-node-header" style={{ background: cfg.color }}>
        {isCustom && editingLabel ? (
          <input
            className="nodrag"
            autoFocus
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            onBlur={() => { setEditingLabel(false); persistCustomData({ customLabel }); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { setEditingLabel(false); persistCustomData({ customLabel }); } }}
            style={{ background: 'rgba(0,0,0,0.3)', border: 'none', color: '#fff', fontSize: 12, fontWeight: 700, padding: '0 4px', width: '60%', borderRadius: 3 }}
          />
        ) : (
          <span
            onDoubleClick={isCustom ? () => setEditingLabel(true) : undefined}
            style={isCustom ? { cursor: 'text' } : undefined}
            title={isCustom ? 'Double-click to rename' : undefined}
          >
            {displayLabel}
          </span>
        )}
        {!isMain && mainStageImage && (
          <span style={{ fontSize: 8, opacity: 0.7, marginLeft: 4 }} title="Linked to Main Stage">🔗</span>
        )}
        {isCustom && (
          <button
            className="char-view-toggle nodrag"
            onClick={() => setShowCustomConfig((v) => !v)}
            title="View configuration"
            style={{ marginLeft: 4, fontSize: 10 }}
          >
            ⚙
          </button>
        )}
        <button className="char-view-toggle nodrag" onClick={toggleCompact} title={compact ? 'Expand' : 'Shrink'}>
          {compact ? '\u2922' : '\u2921'}
        </button>
      </div>

      {/* ── Full-size image popup (to the right of the node) ── */}
      {showFullPreview && viewImage && (
        <div className="style-popup-overlay nodrag" onClick={(e) => e.stopPropagation()}>
          <div className="style-popup-window" style={{ maxWidth: 520, maxHeight: 620 }}>
            <button
              type="button"
              className="style-popup-close nodrag"
              onClick={() => setShowFullPreview(false)}
            >
              &times;
            </button>
            <img
              src={`data:${viewImage.mimeType};base64,${viewImage.base64}`}
              alt={displayLabel}
              draggable={false}
              style={{ maxWidth: 500, maxHeight: 580, objectFit: 'contain', display: 'block', borderRadius: 4 }}
            />
            <div className="style-popup-label">{displayLabel}</div>
          </div>
        </div>
      )}

      {/* ── Custom View Configuration (collapsible) ── */}
      {isCustom && showCustomConfig && !compact && (
        <div className="nodrag nowheel" style={{ padding: '6px 8px', borderBottom: '1px solid #333', background: 'rgba(126,87,194,0.08)', fontSize: 11 }}>
          <div style={{ marginBottom: 4, display: 'flex', gap: 6, alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer', color: useText ? '#bb86fc' : '#666' }}>
              <input type="checkbox" checked={useText} onChange={(e) => { setUseText(e.target.checked); persistCustomData({ useText: e.target.checked }); }} />
              Use Text
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer', color: useImage ? '#bb86fc' : '#666' }}>
              <input type="checkbox" checked={useImage} onChange={(e) => { setUseImage(e.target.checked); persistCustomData({ useImage: e.target.checked }); }} />
              Use Image
            </label>
          </div>

          {useText && (
            <textarea
              value={viewPrompt}
              onChange={(e) => { setViewPrompt(e.target.value); persistCustomData({ viewPrompt: e.target.value }); }}
              placeholder="Describe the camera angle, pose, and framing for this custom view..."
              rows={4}
              style={{
                width: '100%',
                background: '#1a1a2e',
                color: '#ddd',
                border: '1px solid #444',
                borderRadius: 4,
                padding: '4px 6px',
                fontSize: 10,
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
            />
          )}

          {useImage && (
            <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                className="char-btn nodrag"
                onClick={() => angleRefFileRef.current?.click()}
                style={{ fontSize: 10, padding: '3px 8px' }}
              >
                {angleRefImage ? 'Change Ref Image' : 'Open Angle Reference'}
              </button>
              <input ref={angleRefFileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAngleRefFile} />
              {angleRefImage && (
                <div style={{ position: 'relative', width: 32, height: 32 }}>
                  <img
                    src={`data:${angleRefImage.mimeType};base64,${angleRefImage.base64}`}
                    alt="angle ref"
                    style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 3, border: '1px solid #555' }}
                  />
                  <button
                    onClick={() => { setAngleRefImage(null); persistCustomData({ angleRefImage: null }); }}
                    style={{ position: 'absolute', top: -4, right: -4, width: 14, height: 14, borderRadius: '50%', background: '#f44336', color: '#fff', border: 'none', fontSize: 8, cursor: 'pointer', lineHeight: '14px', padding: 0 }}
                    title="Remove reference image"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop: 3, fontSize: 9, color: '#888', fontStyle: 'italic' }}>
            {useText && useImage ? 'Text prompt + angle reference image will be used together.'
              : useText ? 'Text prompt only — describe the angle/pose/framing.'
              : useImage ? 'Image only — the reference image angle will be matched.'
              : 'Enable at least one input mode.'}
          </div>
        </div>
      )}

      <div
        className="char-viewer-canvas nodrag nowheel"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { isPanning.current = false; }}
        onDoubleClick={handleResetView}
        style={{ flex: 1, overflow: 'hidden', cursor: isPanning.current ? 'grabbing' : 'default' }}
      >
        {viewImage ? (
          <ImageContextMenu
            image={viewImage}
            alt={displayLabel}
            onPasteImage={handlePasteImage}
            onResetView={handleResetView}
          >
            <img
              key={viewImage.base64.slice(-40)}
              src={`data:${viewImage.mimeType};base64,${viewImage.base64}`}
              alt={displayLabel}
              onClick={() => { if (!isPanning.current) setShowFullPreview(true); }}
              style={{
                transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
                transition: isPanning.current ? 'none' : 'transform 0.1s',
                cursor: 'pointer',
              }}
            />
          </ImageContextMenu>
        ) : (
          <span className="char-viewer-empty">
            {isMain ? (
              <>No image loaded<br />Connect a source or open a file</>
            ) : mainStageImage ? (
              <>No view generated yet<br />Click &ldquo;Generate View&rdquo; below</>
            ) : (
              <>Waiting for Main Stage<br />Generate a character image first</>
            )}
          </span>
        )}
      </div>

      {!compact && (
        <div className="char-viewer-toolbar">
          <button className="char-btn nodrag" onClick={handleOpenImage}>Open</button>
          {!isMain && (
            <button
              className="char-btn nodrag"
              onClick={handleGenerateView}
              disabled={anyBusy || !mainStageImage}
              title={mainStageImage ? `Generate ${displayLabel.toLowerCase()} from Main Stage` : 'No Main Stage image yet'}
              style={{ background: anyBusy ? undefined : cfg.color, color: '#000', fontWeight: 600 }}
            >
              {genBusy ? `${editElapsed}s…` : 'Generate View'}
            </button>
          )}
          <button className="char-btn nodrag" onClick={handleResetView}>Reset View</button>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} />
          <span className="char-viewer-zoom-info">{Math.round(zoom * 100)}%</span>
        </div>
      )}

      {/* ── Inline Edit (all views) ── */}
      {!compact && viewImage && (
        <div style={{ padding: '4px 6px 6px', borderTop: '1px solid #333' }} className="nodrag">
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <input
              className="nowheel"
              type="text"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !anyBusy) handleEdit(); }}
              placeholder={isMain ? 'Edit image (e.g. red coat)…' : `Edit ${displayLabel.toLowerCase()} (e.g. switch hands)…`}
              disabled={anyBusy}
              style={{
                flex: 1,
                padding: '5px 8px',
                fontSize: 11,
                background: '#1a1a2e',
                border: '1px solid #444',
                borderRadius: 4,
                color: '#eee',
                outline: 'none',
              }}
            />
            <button
              type="button"
              onClick={handleEdit}
              disabled={anyBusy || !editText.trim()}
              style={{
                padding: '5px 12px',
                fontSize: 11,
                fontWeight: 600,
                background: anyBusy ? '#555' : '#00e5ff',
                color: anyBusy ? '#aaa' : '#000',
                border: 'none',
                borderRadius: 4,
                cursor: anyBusy ? 'default' : 'pointer',
                whiteSpace: 'nowrap',
                minWidth: 52,
              }}
            >
              {editBusy ? `${editElapsed}s` : 'Enter'}
            </button>
          </div>
          <div style={{ marginTop: 4 }}>
            <select
              value={editModel}
              onChange={(e) => setEditModel(e.target.value as GeminiImageModel)}
              disabled={anyBusy}
              className="nowheel"
              style={{
                width: '100%',
                padding: '4px 6px',
                fontSize: 10,
                background: '#1a1a2e',
                color: '#eee',
                border: '1px solid #444',
                borderRadius: 4,
                cursor: anyBusy ? 'default' : 'pointer',
                opacity: anyBusy ? 0.5 : 1,
              }}
            >
              <option value="gemini-flash-image">⚡ Gemini Flash — 1024×1024 — ~5-10s</option>
              <option value="gemini-3-pro">✦ Gemini 3 Pro — 2048×2048 — ~20-30s</option>
            </select>
          </div>
          {!isMain && !mainStageImage && (
            <div style={{ fontSize: 9, color: '#ff9800', marginTop: 2, opacity: 0.8 }}>
              Edits will work without Main Stage context, but results are better with one.
            </div>
          )}
          {editStatus && (
            <div style={{ fontSize: 10, color: '#00e5ff', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
              {anyBusy && <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', border: '2px solid #00e5ff', borderTopColor: 'transparent', animation: 'char-spin 0.7s linear infinite' }} />}
              {editStatus}
            </div>
          )}
          {editError && (
            <div style={{ fontSize: 10, color: '#f44336', marginTop: 3, maxHeight: 60, overflow: 'auto', padding: '4px 6px', background: 'rgba(244,67,54,0.08)', borderRadius: 3, border: '1px solid rgba(244,67,54,0.2)' }}>
              {editError}
            </div>
          )}
        </div>
      )}

      {/* ── Embedded History (all views) ── */}
      {!compact && (
        <div style={{ borderTop: '1px solid #444', flexShrink: 0, background: '#1a1a2e', position: 'relative', zIndex: 5 }}>
          <div
            className="nodrag"
            onClick={() => setHistoryMinimized((m) => !m)}
            style={{
              padding: '6px 10px',
              background: '#252540',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              userSelect: 'none',
            }}
          >
            <span style={{ fontWeight: 700, fontSize: 11, color: '#ccc', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              History
            </span>
            <span style={{ marginLeft: 'auto', fontSize: 10, opacity: 0.7, color: '#999' }}>
              {historyMinimized ? '\u25BC' : '\u25B2'} {historyEntries.length}
            </span>
          </div>

          {historyMinimized && historyEntries.length > 0 && (() => {
            const latest = historyEntries[historyEntries.length - 1];
            return (
              <div style={{ padding: '4px 6px', background: '#1a1a2e' }}>
                <div className="char-history-entry active" style={{ cursor: 'default' }}>
                  {latest.image && (
                    <img
                      src={`data:${latest.image.mimeType};base64,${latest.image.base64}`}
                      alt={latest.label}
                      className="char-history-thumb"
                    />
                  )}
                  <div className="char-history-info">
                    <span className="char-history-label">{latest.label}</span>
                    <span className="char-history-time">{latest.timestamp}</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {!historyMinimized && (
            <div className="nodrag nowheel" style={{ display: 'flex', flexDirection: 'column', background: '#1a1a2e' }}>
              <div style={{ maxHeight: 220, overflowY: 'auto', padding: '2px 0' }}>
                <div
                  className={`char-history-entry ${activeHistIdx === -1 ? 'active' : ''}`}
                  onClick={handleHistoryCurrent}
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div className="char-history-info" style={{ padding: '4px 0' }}>
                    <span className="char-history-label" style={{ fontWeight: 700 }}>Current</span>
                    <span className="char-history-time">latest state</span>
                  </div>
                </div>

                {[...historyEntries].reverse().map((entry, ri) => {
                  const realIdx = historyEntries.length - 1 - ri;
                  return (
                    <div
                      key={realIdx}
                      className={`char-history-entry ${activeHistIdx === realIdx ? 'active' : ''}`}
                      onClick={() => handleHistorySelect(realIdx)}
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

                {historyEntries.length === 0 && (
                  <div style={{ padding: '16px 12px', textAlign: 'center', fontSize: 11, color: '#666' }}>
                    No history yet — generate or edit an image to start
                  </div>
                )}
              </div>

              <div className="char-gallery-nav" style={{ justifyContent: 'space-between', padding: '4px 8px', borderTop: '1px solid #333' }}>
                <button
                  className="nodrag"
                  disabled={activeHistIdx <= 0 && activeHistIdx !== -1}
                  onClick={handleHistoryBack}
                >
                  &lt; Back
                </button>
                <span style={{ fontSize: 10 }}>{historyEntries.length} entries</span>
                <button
                  className="nodrag"
                  disabled={activeHistIdx === -1}
                  onClick={handleHistoryForward}
                >
                  Forward &gt;
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <Handle type="target" position={Position.Left} id="input" className="char-handle" style={{ top: '50%' }} />
      <Handle type="source" position={Position.Right} id="output" className="char-handle" style={{ top: '50%' }} />
    </div>
  );
}

export default memo(CharViewNodeInner);
