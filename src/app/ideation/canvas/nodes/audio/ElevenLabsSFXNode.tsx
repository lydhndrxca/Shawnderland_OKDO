"use client";

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Handle, Position, useReactFlow, useStore } from '@xyflow/react';
import { generateSoundEffect, audioDataUrl } from '@/lib/ideation/engine/elevenlabsApi';
import './AudioNodes.css';

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

const DURATION_OPTIONS = [
  { value: 0, label: 'Auto' },
  { value: 0.5, label: '0.5s' },
  { value: 1, label: '1s' },
  { value: 2, label: '2s' },
  { value: 3, label: '3s' },
  { value: 5, label: '5s' },
  { value: 8, label: '8s' },
  { value: 10, label: '10s' },
  { value: 15, label: '15s' },
  { value: 22, label: '22s (max)' },
];

function ElevenLabsSFXNodeInner({ id, data, selected }: Props) {
  const { setNodes } = useReactFlow();
  const didMountRef = useRef(false);
  const mountedRef = useRef(true);

  const persistData = useCallback(
    (patch: Record<string, unknown>) => {
      setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)));
    },
    [id, setNodes],
  );

  const [prompt, setPrompt] = useState<string>((data.prompt as string) ?? '');
  const [duration, setDuration] = useState<number>((data.duration as number) ?? 0);
  const [influence, setInfluence] = useState<number>((data.influence as number) ?? 0.3);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [audioSrc, setAudioSrc] = useState<string>((data.audioSrc as string) ?? '');
  const [history, setHistory] = useState<Array<{ prompt: string; src: string }>>((data.history as Array<{ prompt: string; src: string }>) ?? []);

  /* ── Collect prompt from upstream ── */
  const upstreamText = useStore(
    useCallback(
      (state: { edges: Array<{ source: string; target: string }>; nodes: Array<{ id: string; data: Record<string, unknown> }> }) => {
        const incomers = state.edges.filter((e) => e.target === id).map((e) => e.source);
        const parts: string[] = [];
        for (const srcId of incomers) {
          const n = state.nodes.find((nd) => nd.id === srcId);
          if (!n) continue;
          const d = n.data;
          if (typeof d.text === 'string' && d.text) parts.push(d.text);
          if (typeof d.content === 'string' && d.content) parts.push(d.content);
        }
        return parts.join(', ');
      },
      [id],
    ),
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!didMountRef.current) { didMountRef.current = true; return; }
    persistData({ prompt, duration, influence });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prompt, duration, influence]);

  const handleGenerate = useCallback(async () => {
    const finalPrompt = prompt || upstreamText;
    if (!finalPrompt.trim()) { setError('Describe the sound effect'); return; }
    setProcessing(true);
    setError('');
    try {
      const result = await generateSoundEffect(finalPrompt, {
        durationSeconds: duration > 0 ? duration : undefined,
        promptInfluence: influence,
      });
      if (mountedRef.current) {
        const src = audioDataUrl(result.audioBase64, result.mimeType);
        setAudioSrc(src);
        const newHist = [{ prompt: finalPrompt, src }, ...history].slice(0, 10);
        setHistory(newHist);
        persistData({ audioSrc: src, audioBase64: result.audioBase64, audioMime: result.mimeType, history: newHist });
      }
    } catch (e) {
      if (mountedRef.current) setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (mountedRef.current) setProcessing(false);
    }
  }, [prompt, upstreamText, duration, influence, history, persistData]);

  return (
    <div className={`audio-node${selected ? ' selected' : ''}${processing ? ' audio-node-processing' : ''}`}>
      <Handle type="target" position={Position.Left} style={{ background: '#ff6f00' }} />
      <Handle type="source" position={Position.Right} style={{ background: '#ff6f00' }} />

      <div className="audio-node-header" style={{ background: 'linear-gradient(135deg, #bf360c, #e65100)' }}>
        <span>Sound Effects</span>
        <span style={{ fontSize: 9, opacity: 0.7 }}>ElevenLabs</span>
      </div>

      <div className="audio-node-body">
        <textarea
          className="audio-textarea"
          placeholder={upstreamText ? '(Using connected prompt…)' : 'Describe the sound: "thunder crack", "sword clash", "footsteps on gravel"…'}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          disabled={processing}
        />

        {upstreamText && !prompt && (
          <div className="audio-status">Using upstream: &quot;{upstreamText.slice(0, 60)}…&quot;</div>
        )}

        <div className="audio-field">
          <span className="audio-field-label">Duration</span>
          <select
            className="audio-select"
            value={duration}
            onChange={(e) => setDuration(+e.target.value)}
            disabled={processing}
          >
            {DURATION_OPTIONS.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
        </div>

        <div className="audio-slider-row">
          <span className="audio-field-label">Prompt</span>
          <input type="range" min={0} max={1} step={0.05} value={influence}
            onChange={(e) => setInfluence(+e.target.value)} disabled={processing} />
          <span className="audio-slider-val">{influence.toFixed(2)}</span>
        </div>
        <div style={{ fontSize: 9, color: '#777', marginTop: -4 }}>
          Prompt influence: lower = more variation, higher = closer match
        </div>

        <button
          className="audio-btn primary"
          onClick={handleGenerate}
          disabled={processing || (!prompt && !upstreamText)}
          style={{ width: '100%' }}
        >
          {processing ? 'Generating…' : 'Generate SFX'}
        </button>

        {error && <div className="audio-error">{error}</div>}

        {audioSrc && (
          <audio className="audio-player" controls src={audioSrc} />
        )}

        {/* History */}
        {history.length > 1 && (
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 6, marginTop: 4 }}>
            <div className="audio-field-label" style={{ marginBottom: 4 }}>Recent</div>
            {history.slice(1, 5).map((h, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 10, color: '#aaa', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {h.prompt.slice(0, 40)}
                </span>
                <audio src={h.src} controls style={{ height: 24, maxWidth: 140 }} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const ElevenLabsSFXNode = memo(ElevenLabsSFXNodeInner);
export default ElevenLabsSFXNode;
