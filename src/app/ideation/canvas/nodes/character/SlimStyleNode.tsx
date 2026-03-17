"use client";

import { memo, useCallback, useRef, useState, useEffect } from 'react';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import type { GeneratedImage, GeminiImageModel } from '@/lib/ideation/engine/conceptlab/imageGenApi';
import { generateWithGeminiRef, GEMINI_IMAGE_MODELS } from '@/lib/ideation/engine/conceptlab/imageGenApi';
import { NODE_TOOLTIPS } from './nodeTooltips';
import './CharacterNodes.css';

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

const VIEWER_TYPE_TO_VIEW: Record<string, string> = {
  charMainViewer: 'main',
  charFrontViewer: 'front',
  charBackViewer: 'back',
  charSideViewer: 'side',
  charCustomView: 'custom',
};

const MODEL_OPTIONS: { id: GeminiImageModel; label: string }[] = Object.entries(GEMINI_IMAGE_MODELS)
  .map(([k, v]) => ({ id: k as GeminiImageModel, label: v.label }));

function SlimStyleNodeInner({ id, data, selected }: Props) {
  const { setNodes, getNode, getEdges } = useReactFlow();

  const [styleImages, setStyleImages] = useState<GeneratedImage[]>(
    (data?.styleImages as GeneratedImage[]) ?? [],
  );
  const [styleText, setStyleText] = useState((data?.styleText as string) ?? '');
  const [model, setModel] = useState<GeminiImageModel>(
    (data?.slimModel as GeminiImageModel) ?? 'gemini-flash-image',
  );
  const [viewToggles, setViewToggles] = useState<Record<string, boolean>>({
    main: (data?.slimMain as boolean) ?? true,
    front: (data?.slimFront as boolean) ?? true,
    back: (data?.slimBack as boolean) ?? true,
    side: (data?.slimSide as boolean) ?? true,
  });
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const ext = (data?.styleImages as GeneratedImage[]) ?? [];
    if (ext.length !== styleImages.length ||
        (ext.length > 0 && ext[0]?.base64?.slice(0, 40) !== styleImages[0]?.base64?.slice(0, 40))) {
      setStyleImages(ext);
    }
    const extText = (data?.styleText as string) ?? '';
    if (extText !== styleText) setStyleText(extText);
    const extModel = (data?.slimModel as GeminiImageModel) ?? 'gemini-flash-image';
    if (extModel !== model) setModel(extModel);
  }, [data?.styleImages, data?.styleText, data?.slimModel]); // eslint-disable-line react-hooks/exhaustive-deps

  const persist = useCallback(
    (updates: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...updates } } : n)),
      );
    },
    [id, setNodes],
  );

  const handleOpenFiles = useCallback(() => { fileRef.current?.click(); }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      const pending: GeneratedImage[] = [];
      let loaded = 0;
      const total = files.length;
      for (let i = 0; i < total; i++) {
        const file = files[i];
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          if (base64) pending.push({ base64, mimeType: file.type || 'image/png' });
          loaded++;
          if (loaded === total) setStyleImages((prev) => [...prev, ...pending]);
        };
        reader.readAsDataURL(file);
      }
      e.target.value = '';
    },
    [],
  );

  const handlePaste = useCallback(async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find((t) => t.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = reader.result as string;
            const parts = dataUrl.split(',');
            const mime = parts[0].match(/:(.*?);/)?.[1] ?? 'image/png';
            setStyleImages((prev) => [...prev, { base64: parts[1], mimeType: mime }]);
          };
          reader.readAsDataURL(blob);
          return;
        }
      }
    } catch { /* clipboard not available */ }
  }, []);

  const removeImage = useCallback((idx: number) => {
    setStyleImages((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  useEffect(() => {
    persist({
      styleImages, styleText, slimModel: model,
      slimMain: viewToggles.main, slimFront: viewToggles.front,
      slimBack: viewToggles.back, slimSide: viewToggles.side,
    });
  }, [styleImages, styleText, model, viewToggles]); // eslint-disable-line react-hooks/exhaustive-deps

  const findConnectedViewers = useCallback(() => {
    const edges = getEdges();
    const viewers: { id: string; viewKey: string }[] = [];
    const seen = new Set<string>();
    const queue: string[] = [id];
    seen.add(id);

    while (queue.length > 0) {
      const cur = queue.shift()!;
      for (const e of edges) {
        const peerId = e.source === cur ? e.target : e.target === cur ? e.source : null;
        if (!peerId || seen.has(peerId)) continue;
        seen.add(peerId);
        const node = getNode(peerId);
        if (!node) continue;
        const nodeType = node.type ?? '';
        const viewKey = VIEWER_TYPE_TO_VIEW[nodeType]
          ?? ((node.data as Record<string, unknown>)?.viewKey as string | undefined)
          ?? null;
        if (viewKey && viewToggles[viewKey]) {
          viewers.push({ id: peerId, viewKey });
        } else {
          queue.push(peerId);
        }
      }
    }
    return viewers;
  }, [id, getNode, getEdges, viewToggles]);

  const handleConvert = useCallback(async () => {
    if (busy) return;
    if (styleImages.length === 0 && !styleText.trim()) {
      setError('Add a style image or enter style text first.');
      return;
    }

    const viewers = findConnectedViewers();
    if (viewers.length === 0) {
      setError('No enabled viewer nodes connected. Check toggles and connections.');
      return;
    }

    setBusy(true);
    setError(null);
    setStatus('Reading viewer images…');

    try {
      type ViewerInfo = { id: string; viewKey: string; images: GeneratedImage[] };
      const viewerData: ViewerInfo[] = [];
      for (const v of viewers) {
        const vn = getNode(v.id);
        if (!vn?.data) continue;
        const d = vn.data as Record<string, unknown>;
        const gallery = (d.imageGallery as GeneratedImage[]) ?? [];
        const single = ((d.generatedImage ?? d.editedImage) as GeneratedImage | null) ?? null;
        const imgs = gallery.length > 0 ? gallery : single ? [single] : [];
        if (imgs.length === 0) continue;
        viewerData.push({ id: v.id, viewKey: v.viewKey, images: imgs });
      }

      if (viewerData.length === 0) {
        setError('No images found in connected viewer nodes.');
        setBusy(false);
        setStatus('');
        return;
      }

      let totalJobs = 0;
      for (const v of viewerData) totalJobs += v.images.length;
      let completed = 0;

      const makeStyleCall = async (srcImage: GeneratedImage): Promise<GeneratedImage> => {
        let prompt: string;
        let refs: GeneratedImage[];
        if (styleImages.length > 0) {
          refs = [srcImage, ...styleImages];
          prompt = `Render this character image in the EXACT visual style of the style reference image(s).
Preserve the pose, framing, background, and all character details exactly.
Change ONLY the rendering style — geometry, textures, shading, color palette.${styleText.trim() ? `\nStyle description: ${styleText.trim()}` : ''}
IMAGE LAYOUT: Image 1 = CHARACTER TO RESTYLE. Images 2+ = STYLE REFERENCES.`;
        } else {
          refs = [srcImage];
          prompt = `Render this character image in the following art style: ${styleText.trim()}.
Preserve the pose, framing, background, and all character details exactly.
Change ONLY the rendering style.`;
        }
        const result = await generateWithGeminiRef(prompt, refs, model);
        completed++;
        setStatus(`Converting… ${completed}/${totalJobs}`);
        return result[0] ?? srcImage;
      };

      const perViewerWork = viewerData.map(async (viewer) => {
        const jobs = viewer.images.map((srcImage) => makeStyleCall(srcImage));
        const settled = await Promise.allSettled(jobs);
        const styledGallery = settled
          .filter((r): r is PromiseFulfilledResult<GeneratedImage> => r.status === 'fulfilled')
          .map((r) => r.value);

        if (styledGallery.length > 0) {
          setNodes((nds) =>
            nds.map((n) => {
              if (n.id !== viewer.id) return n;
              return {
                ...n,
                data: {
                  ...n.data,
                  imageGallery: [...styledGallery],
                  generatedImage: styledGallery[0],
                  _slimTs: Date.now(),
                },
              };
            }),
          );
        }
      });

      await Promise.allSettled(perViewerWork);

      setStatus(`Done — ${completed} image${completed > 1 ? 's' : ''} styled ✓`);
      setTimeout(() => setStatus(''), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }, [busy, styleImages, styleText, model, findConnectedViewers, getNode, setNodes]);

  const hasStyle = styleImages.length > 0 || styleText.trim().length > 0;

  return (
    <div className={`char-node ${selected ? 'selected' : ''} ${busy ? 'char-node-processing' : ''}`}
      title={NODE_TOOLTIPS.charSlimStyle ?? 'Style transfer — convert connected viewer images to a target style'}>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />

      <div className="char-node-header" style={{ background: '#7b1fa2' }}>
        Slim Style
      </div>

      <div className="char-node-body" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Model selector */}
        <div>
          <label style={{ fontSize: 10, color: '#aaa', display: 'block', marginBottom: 2 }}>Model</label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value as GeminiImageModel)}
            style={{ width: '100%', fontSize: 12, padding: '4px 6px', background: '#1e1e2e', color: '#eee', border: '1px solid #444', borderRadius: 4 }}
          >
            {MODEL_OPTIONS.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </div>

        {/* Style images */}
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={handleOpenFiles} className="char-btn" style={{ flex: 1, fontSize: 11 }}>
            Open Image
          </button>
          <button onClick={handlePaste} className="char-btn" style={{ flex: 1, fontSize: 11 }}>
            Paste Image
          </button>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        {styleImages.length > 0 && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {styleImages.map((img, i) => (
              <div key={i} style={{ position: 'relative', width: 56, height: 56 }}>
                <img
                  src={`data:${img.mimeType};base64,${img.base64}`}
                  alt={`style-${i}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4 }}
                />
                <button
                  onClick={() => removeImage(i)}
                  style={{
                    position: 'absolute', top: -4, right: -4,
                    width: 16, height: 16, borderRadius: '50%',
                    background: '#e53935', color: '#fff', border: 'none',
                    fontSize: 10, cursor: 'pointer', lineHeight: '16px', padding: 0,
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Style text */}
        <textarea
          value={styleText}
          onChange={(e) => setStyleText(e.target.value)}
          placeholder="Describe the target style (optional if images provided)…"
          rows={3}
          style={{
            width: '100%', fontSize: 12, padding: 6,
            background: '#1e1e2e', color: '#eee', border: '1px solid #444',
            borderRadius: 4, resize: 'vertical', fontFamily: 'inherit',
          }}
        />

        {/* View toggles */}
        <div>
          <label style={{ fontSize: 10, color: '#aaa', display: 'block', marginBottom: 3 }}>Apply to</label>
          <div style={{ display: 'flex', gap: 4 }}>
            {(['main', 'front', 'back', 'side'] as const).map((vk) => {
              const labels: Record<string, string> = { main: 'Main Stage', front: 'Front', back: 'Back', side: 'Side' };
              const colors: Record<string, string> = { main: '#00bfa5', front: '#1e88e5', back: '#fb8c00', side: '#8e24aa' };
              const on = viewToggles[vk];
              return (
                <button
                  key={vk}
                  onClick={() => setViewToggles((prev) => ({ ...prev, [vk]: !prev[vk] }))}
                  style={{
                    flex: 1, fontSize: 10, fontWeight: 600, padding: '4px 0',
                    background: on ? colors[vk] : '#333',
                    color: on ? '#fff' : '#666',
                    border: on ? `1px solid ${colors[vk]}` : '1px solid #555',
                    borderRadius: 4, cursor: 'pointer',
                    opacity: on ? 1 : 0.6,
                  }}
                >
                  {labels[vk]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Convert button */}
        <button
          onClick={handleConvert}
          disabled={busy || !hasStyle}
          style={{
            width: '100%', padding: '8px 0', fontSize: 13, fontWeight: 700,
            background: hasStyle && !busy ? '#7b1fa2' : '#444',
            color: hasStyle && !busy ? '#fff' : '#888',
            border: 'none', borderRadius: 6, cursor: hasStyle && !busy ? 'pointer' : 'default',
          }}
        >
          {busy ? 'Converting…' : 'Convert to Style'}
        </button>

        {status && (
          <div style={{ fontSize: 11, color: '#aaa', textAlign: 'center' }}>{status}</div>
        )}

        {error && (
          <div style={{ fontSize: 11, color: '#ef5350', textAlign: 'center' }}>{error}</div>
        )}
      </div>
    </div>
  );
}

const SlimStyleNode = memo(SlimStyleNodeInner);
export default SlimStyleNode;
