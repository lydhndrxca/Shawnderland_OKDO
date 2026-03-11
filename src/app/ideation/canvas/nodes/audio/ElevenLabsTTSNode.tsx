"use client";

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Handle, Position, useReactFlow, useStore } from '@xyflow/react';
import {
  listVoices,
  textToSpeech,
  audioDataUrl,
  TTS_MODELS,
  FORMAT_OPTIONS,
  DEFAULT_VOICE_SETTINGS,
  type ELVoice,
  type VoiceSettings,
  type OutputFormat,
} from '@/lib/ideation/engine/elevenlabsApi';
import './AudioNodes.css';

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

function ElevenLabsTTSNodeInner({ id, data, selected }: Props) {
  const { setNodes, getEdges } = useReactFlow();
  const didMountRef = useRef(false);

  const persistData = useCallback(
    (patch: Record<string, unknown>) => {
      setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)));
    },
    [id, setNodes],
  );

  /* ── State ─────────────────────────────── */
  const [voices, setVoices] = useState<ELVoice[]>([]);
  const [voiceId, setVoiceId] = useState<string>((data.voiceId as string) ?? '');
  const [modelId, setModelId] = useState<string>((data.modelId as string) ?? 'eleven_v3');
  const [format, setFormat] = useState<OutputFormat>((data.format as OutputFormat) ?? 'mp3_44100_128');
  const [text, setText] = useState<string>((data.text as string) ?? '');
  const [stability, setStability] = useState<number>((data.stability as number) ?? DEFAULT_VOICE_SETTINGS.stability);
  const [similarity, setSimilarity] = useState<number>((data.similarity as number) ?? DEFAULT_VOICE_SETTINGS.similarity_boost);
  const [style, setStyle] = useState<number>((data.style as number) ?? 0);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [audioSrc, setAudioSrc] = useState<string>((data.audioSrc as string) ?? '');
  const [loadingVoices, setLoadingVoices] = useState(false);
  const mountedRef = useRef(true);

  /* ── Collect text from upstream nodes ── */
  const upstreamText = useStore(
    useCallback(
      (state: { edges: Array<{ source: string; target: string }>; nodes: Array<{ id: string; data: Record<string, unknown>; type?: string }> }) => {
        const incomers = state.edges.filter((e) => e.target === id).map((e) => e.source);
        const parts: string[] = [];
        for (const srcId of incomers) {
          const n = state.nodes.find((nd) => nd.id === srcId);
          if (!n) continue;
          const d = n.data;
          if (typeof d.text === 'string' && d.text) parts.push(d.text);
          if (typeof d.content === 'string' && d.content) parts.push(d.content);
          if (typeof d.description === 'string' && d.description) parts.push(d.description);
        }
        return parts.join('\n\n');
      },
      [id],
    ),
  );

  /* ── Fetch voices once ── */
  useEffect(() => {
    mountedRef.current = true;
    setLoadingVoices(true);
    listVoices()
      .then((v) => {
        if (mountedRef.current) {
          setVoices(v);
          if (!voiceId && v.length > 0) setVoiceId(v[0].voice_id);
        }
      })
      .catch(() => {})
      .finally(() => { if (mountedRef.current) setLoadingVoices(false); });
    return () => { mountedRef.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Persist settings changes ── */
  useEffect(() => {
    if (!didMountRef.current) { didMountRef.current = true; return; }
    persistData({ voiceId, modelId, format, text, stability, similarity, style });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceId, modelId, format, text, stability, similarity, style]);

  /* ── Generate ── */
  const handleGenerate = useCallback(async () => {
    const finalText = text || upstreamText;
    if (!finalText.trim()) { setError('Enter text or connect a text source'); return; }
    if (!voiceId) { setError('Select a voice'); return; }
    setProcessing(true);
    setError('');
    setAudioSrc('');
    try {
      const settings: VoiceSettings = {
        stability,
        similarity_boost: similarity,
        style,
        use_speaker_boost: true,
      };
      const result = await textToSpeech(voiceId, finalText, {
        modelId,
        outputFormat: format,
        voiceSettings: settings,
      });
      if (mountedRef.current) {
        const src = audioDataUrl(result.audioBase64, result.mimeType);
        setAudioSrc(src);
        persistData({ audioSrc: src, audioBase64: result.audioBase64, audioMime: result.mimeType });
      }
    } catch (e) {
      if (mountedRef.current) setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (mountedRef.current) setProcessing(false);
    }
  }, [text, upstreamText, voiceId, modelId, format, stability, similarity, style, persistData]);

  const selectedVoice = voices.find((v) => v.voice_id === voiceId);

  return (
    <div className={`audio-node${selected ? ' selected' : ''}${processing ? ' audio-node-processing' : ''}`}>
      <Handle type="target" position={Position.Left} style={{ background: '#ff6f00' }} />
      <Handle type="source" position={Position.Right} style={{ background: '#ff6f00' }} />

      <div className="audio-node-header" style={{ background: 'linear-gradient(135deg, #e65100, #ff6f00)' }}>
        <span>Text-to-Speech</span>
        <span style={{ fontSize: 9, opacity: 0.7 }}>ElevenLabs</span>
      </div>

      <div className="audio-node-body">
        {/* Voice selector */}
        <div className="audio-field">
          <span className="audio-field-label">Voice</span>
          <select
            className="audio-select"
            value={voiceId}
            onChange={(e) => setVoiceId(e.target.value)}
            disabled={processing}
          >
            {loadingVoices && <option>Loading voices…</option>}
            {voices.map((v) => (
              <option key={v.voice_id} value={v.voice_id}>
                {v.name} ({v.category})
              </option>
            ))}
          </select>
        </div>

        {selectedVoice?.preview_url && (
          <div style={{ fontSize: 10, color: '#888' }}>
            Preview: <audio src={selectedVoice.preview_url} controls style={{ height: 20, verticalAlign: 'middle' }} />
          </div>
        )}

        {/* Model selector */}
        <div className="audio-field">
          <span className="audio-field-label">Model</span>
          <select
            className="audio-select"
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
            disabled={processing}
          >
            {TTS_MODELS.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </div>

        {/* Format selector */}
        <div className="audio-field">
          <span className="audio-field-label">Format</span>
          <select
            className="audio-select"
            value={format}
            onChange={(e) => setFormat(e.target.value as OutputFormat)}
            disabled={processing}
          >
            {FORMAT_OPTIONS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>

        {/* Voice settings */}
        <div className="audio-slider-row">
          <span className="audio-field-label">Stability</span>
          <input type="range" min={0} max={1} step={0.05} value={stability}
            onChange={(e) => setStability(+e.target.value)} disabled={processing} />
          <span className="audio-slider-val">{stability.toFixed(2)}</span>
        </div>
        <div className="audio-slider-row">
          <span className="audio-field-label">Clarity</span>
          <input type="range" min={0} max={1} step={0.05} value={similarity}
            onChange={(e) => setSimilarity(+e.target.value)} disabled={processing} />
          <span className="audio-slider-val">{similarity.toFixed(2)}</span>
        </div>
        <div className="audio-slider-row">
          <span className="audio-field-label">Style</span>
          <input type="range" min={0} max={1} step={0.05} value={style}
            onChange={(e) => setStyle(+e.target.value)} disabled={processing} />
          <span className="audio-slider-val">{style.toFixed(2)}</span>
        </div>

        {/* Text input */}
        <textarea
          className="audio-textarea"
          placeholder={upstreamText ? '(Using connected text…)' : 'Type speech text here…'}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          disabled={processing}
        />

        {upstreamText && !text && (
          <div className="audio-status">Using upstream text ({upstreamText.length} chars)</div>
        )}

        <button
          className="audio-btn primary"
          onClick={handleGenerate}
          disabled={processing || (!text && !upstreamText)}
          style={{ width: '100%' }}
        >
          {processing ? 'Generating…' : 'Generate Speech'}
        </button>

        {error && <div className="audio-error">{error}</div>}

        {audioSrc && (
          <audio className="audio-player" controls src={audioSrc} />
        )}
      </div>
    </div>
  );
}

const ElevenLabsTTSNode = memo(ElevenLabsTTSNodeInner);
export default ElevenLabsTTSNode;
