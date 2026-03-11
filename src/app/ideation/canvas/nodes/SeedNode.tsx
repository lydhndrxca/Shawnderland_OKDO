"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import type { NodeProps } from '@xyflow/react';
import { useReactFlow } from '@xyflow/react';
import { Image, Video, FileText, X } from 'lucide-react';
import BaseNode from './BaseNode';
import type { NodeStatus } from './BaseNode';
import { useSession } from '@/lib/ideation/context/SessionContext';
import type { SeedMediaItem } from '@/lib/ideation/state/sessionTypes';
import { generateText } from '@/lib/ideation/engine/conceptlab/imageGenApi';

export default function SeedNode({ id, data, selected }: NodeProps) {
  const { session, editSeed, editSeedContext, editSeedMedia, updateSettings, runStage, runningStageId, runFullPipeline, isRunning } = useSession();
  const { setNodes } = useReactFlow();
  const d = data as Record<string, unknown>;
  const prefill = (d.prefillSeed as string) ?? '';
  const nodeSubName = (d.subName as string) ?? '';
  const [localSeed, setLocalSeed] = useState(prefill || (d.seedText as string) || session.seedText);
  const [localContext, setLocalContext] = useState((d.seedContext as string) || (session.seedContext ?? ''));
  const [media, setMedia] = useState<SeedMediaItem[]>((d.seedMedia as SeedMediaItem[]) || (session.seedMedia ?? []));
  const didMountRef = useRef(false);
  const lastRestoreTs = useRef<number>(0);
  const userTouchedContext = useRef(!!localContext);

  /* ── Re-sync local state when a session/canvas restore happens ── */
  useEffect(() => {
    const ts = d._restoreTs as number;
    if (ts && ts !== lastRestoreTs.current) {
      lastRestoreTs.current = ts;
      const restoredSeed = (d.seedText as string) || session.seedText || '';
      const restoredCtx = (d.seedContext as string) || (session.seedContext ?? '');
      const restoredMedia = (d.seedMedia as SeedMediaItem[]) || (session.seedMedia ?? []);
      setLocalSeed(restoredSeed);
      setLocalContext(restoredCtx);
      setMedia(restoredMedia);
      if (restoredCtx) userTouchedContext.current = true;
      if (restoredSeed && restoredSeed !== session.seedText) editSeed(restoredSeed);
      if (restoredCtx && restoredCtx !== (session.seedContext ?? '')) editSeedContext(restoredCtx);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d._restoreTs]);

  /* ── Sync all editable state back to node.data for session save ── */
  useEffect(() => {
    if (!didMountRef.current) { didMountRef.current = true; return; }
    setNodes((nds) => nds.map((n) =>
      n.id === id ? { ...n, data: { ...n.data, seedText: localSeed, seedContext: localContext, seedMedia: media } } : n,
    ));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localSeed, localContext, media]);
  const strict = session.settings?.strictAdherence ?? false;

  /* ── On mount, if node.data has saved text, push it back to session context ── */
  useEffect(() => {
    if ((d.seedText as string) && (d.seedText as string) !== session.seedText) editSeed(d.seedText as string);
    if ((d.seedContext as string) && (d.seedContext as string) !== (session.seedContext ?? '')) editSeedContext(d.seedContext as string);
    if ((d.seedMedia as SeedMediaItem[])?.length && !session.seedMedia?.length) editSeedMedia(d.seedMedia as SeedMediaItem[]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Auto-infer context when user types a seed but leaves context empty ── */
  const inferTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [inferring, setInferring] = useState(false);

  useEffect(() => {
    if (localContext) userTouchedContext.current = true;
  }, [localContext]);

  useEffect(() => {
    if (inferTimerRef.current) clearTimeout(inferTimerRef.current);

    const seedTrimmed = localSeed.trim();
    if (!seedTrimmed || seedTrimmed.length < 8 || userTouchedContext.current || localContext.trim()) return;

    inferTimerRef.current = setTimeout(async () => {
      setInferring(true);
      try {
        const result = await generateText(
          `Given this idea: "${seedTrimmed}"\n\nRespond with ONLY a short context label (2-5 words) describing the domain or category this idea belongs to. Examples: "mobile app", "board game", "kitchen gadget", "SaaS platform", "children's toy", "fitness wearable". No explanation, just the label.`,
        );
        const cleaned = result.trim().replace(/^["']|["']$/g, '').replace(/\.$/,'');
        if (cleaned && cleaned.length < 60 && !userTouchedContext.current) {
          setLocalContext(cleaned);
          editSeedContext(cleaned);
        }
      } catch { /* silently fail */ }
      setInferring(false);
    }, 1500);

    return () => { if (inferTimerRef.current) clearTimeout(inferTimerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localSeed]);

  const hasOutput = !!session.stageState['seed']?.output;
  const status: NodeStatus = runningStageId === 'seed' ? 'running' : hasOutput ? 'complete' : 'empty';

  const hasSeedContent = localSeed.trim().length > 0 || media.length > 0;

  const handleRun = useCallback(async () => {
    if (localSeed !== session.seedText) editSeed(localSeed);
    if (localContext !== (session.seedContext ?? '')) editSeedContext(localContext);
    try { await runStage('seed'); } catch (e) { console.error('[SeedNode] runStage error:', e); }
  }, [localSeed, localContext, session.seedText, session.seedContext, editSeed, editSeedContext, runStage]);

  const handleRunAll = useCallback(async () => {
    if (localSeed !== session.seedText) editSeed(localSeed);
    if (localContext !== (session.seedContext ?? '')) editSeedContext(localContext);
    try { await runFullPipeline(); } catch (e) { console.error('[SeedNode] runFullPipeline error:', e); }
  }, [localSeed, localContext, session.seedText, session.seedContext, editSeed, editSeedContext, runFullPipeline]);

  const toggleStrict = useCallback(() => {
    updateSettings({ strictAdherence: !strict });
  }, [strict, updateSettings]);

  const addMedia = useCallback((item: SeedMediaItem) => {
    setMedia((prev) => {
      const next = [...prev, item];
      editSeedMedia(next);
      return next;
    });
  }, [editSeedMedia]);

  const removeMedia = useCallback((idx: number) => {
    setMedia((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      editSeedMedia(next);
      return next;
    });
  }, [editSeedMedia]);

  const handleImageUpload = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const parts = dataUrl.split(',');
        const mime = parts[0].match(/:(.*?);/)?.[1] ?? 'image/png';
        addMedia({ type: 'image', base64: parts[1], mimeType: mime, fileName: file.name });
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }, [addMedia]);

  const handleVideoUpload = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const parts = dataUrl.split(',');
        const mime = parts[0].match(/:(.*?);/)?.[1] ?? 'video/mp4';
        addMedia({ type: 'video', base64: parts[1], mimeType: mime, fileName: file.name });
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }, [addMedia]);

  const handleDocUpload = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,.md,.pdf,.doc,.docx,.csv,.json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        addMedia({ type: 'document', mimeType: file.type || 'text/plain', fileName: file.name, textContent: text });
      };
      reader.readAsText(file);
    };
    input.click();
  }, [addMedia]);

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
            addMedia({ type: 'image', base64: parts[1], mimeType: mime, fileName: 'pasted-image' });
          };
          reader.readAsDataURL(blob);
          return;
        }
      }
    } catch { /* clipboard access may fail */ }
  }, [addMedia]);

  return (
    <BaseNode stageId="seed" status={status} selected={selected} onRun={hasSeedContent ? handleRun : undefined} subName={nodeSubName}>
      <textarea
        className="seed-input nodrag nowheel"
        value={localSeed}
        onChange={(e) => { setLocalSeed(e.target.value); editSeed(e.target.value); }}
        placeholder={media.length > 0 ? 'Optional text prompt (media will be analyzed)' : "What's your idea?"}
        spellCheck={false}
        rows={3}
      />
      <input
        className="seed-input nodrag nowheel"
        value={localContext}
        onChange={(e) => { setLocalContext(e.target.value); userTouchedContext.current = true; editSeedContext(e.target.value); }}
        placeholder={inferring ? 'Inferring context…' : 'Context (optional) — e.g., "video game console", "things to do when bored"'}
        spellCheck={false}
        style={{ minHeight: 'auto', padding: '6px 10px', fontSize: '12px', opacity: inferring ? 0.6 : 1 }}
      />

      <div className="seed-media-bar nodrag">
        <button className="seed-media-btn" onClick={handleImageUpload} title="Upload image">
          <Image size={13} /> <span>Image</span>
        </button>
        <button className="seed-media-btn" onClick={handleVideoUpload} title="Upload video">
          <Video size={13} /> <span>Video</span>
        </button>
        <button className="seed-media-btn" onClick={handleDocUpload} title="Upload document">
          <FileText size={13} /> <span>Doc</span>
        </button>
        <button className="seed-media-btn" onClick={handlePaste} title="Paste image from clipboard">
          <span style={{ fontSize: '12px' }}>📋</span> <span>Paste</span>
        </button>
      </div>

      {media.length > 0 && (
        <div className="seed-media-list nodrag nowheel">
          {media.map((m, i) => (
            <div key={i} className="seed-media-item">
              <span className="seed-media-icon">
                {m.type === 'image' ? <Image size={12} /> : m.type === 'video' ? <Video size={12} /> : <FileText size={12} />}
              </span>
              <span className="seed-media-name" title={m.fileName}>{m.fileName}</span>
              {m.type === 'image' && m.base64 && (
                <img className="seed-media-thumb" src={`data:${m.mimeType};base64,${m.base64}`} alt={m.fileName} />
              )}
              <button className="seed-media-remove" onClick={() => removeMedia(i)} title="Remove">
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        className={`seed-strict-toggle nodrag ${strict ? 'active' : ''}`}
        onClick={toggleStrict}
        title={strict
          ? 'Strict Adherence ON — the pipeline will only interpret what you explicitly stated, no assumptions about product type or domain.'
          : 'Strict Adherence OFF — the pipeline may infer product categories, use cases, or domains from your idea.'}
      >
        <span className="seed-strict-icon">{strict ? '🔒' : '🔓'}</span>
        <span className="seed-strict-label">Strict Adherence</span>
        <span className={`seed-strict-badge ${strict ? 'on' : 'off'}`}>{strict ? 'ON' : 'OFF'}</span>
      </button>

      {hasSeedContent && (
        <button
          className="seed-run-all-btn nodrag"
          onClick={handleRunAll}
          disabled={isRunning}
          title="Run the full ideation pipeline automatically — no stops"
        >
          {isRunning ? 'Pipeline Running…' : '▶▶ Run Full Pipeline'}
        </button>
      )}
    </BaseNode>
  );
}
