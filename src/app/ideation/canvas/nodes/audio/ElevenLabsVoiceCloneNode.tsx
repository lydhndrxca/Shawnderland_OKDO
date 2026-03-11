"use client";

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Handle, Position, useReactFlow, useStore } from '@xyflow/react';
import {
  cloneVoice,
  listVoices,
  type ELVoice,
} from '@/lib/ideation/engine/elevenlabsApi';
import './AudioNodes.css';

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

function ElevenLabsVoiceCloneNodeInner({ id, data, selected }: Props) {
  const { setNodes } = useReactFlow();
  const didMountRef = useRef(false);
  const mountedRef = useRef(true);

  const persistData = useCallback(
    (patch: Record<string, unknown>) => {
      setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)));
    },
    [id, setNodes],
  );

  const [voiceName, setVoiceName] = useState<string>((data.voiceName as string) ?? '');
  const [description, setDescription] = useState<string>((data.description as string) ?? '');
  const [audioBase64, setAudioBase64] = useState<string>((data.sampleBase64 as string) ?? '');
  const [audioMime, setAudioMime] = useState<string>((data.sampleMime as string) ?? '');
  const [fileName, setFileName] = useState<string>((data.fileName as string) ?? '');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [clonedVoiceId, setClonedVoiceId] = useState<string>((data.clonedVoiceId as string) ?? '');
  const [myVoices, setMyVoices] = useState<ELVoice[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── Check if upstream provides audio (e.g. from an audio isolation node) ── */
  const upstreamAudio = useStore(
    useCallback(
      (state: { edges: Array<{ source: string; target: string }>; nodes: Array<{ id: string; data: Record<string, unknown> }> }) => {
        const incomers = state.edges.filter((e) => e.target === id).map((e) => e.source);
        for (const srcId of incomers) {
          const n = state.nodes.find((nd) => nd.id === srcId);
          if (!n) continue;
          const d = n.data;
          if (typeof d.audioBase64 === 'string' && d.audioBase64 && typeof d.audioMime === 'string') {
            return { base64: d.audioBase64 as string, mime: d.audioMime as string };
          }
        }
        return null;
      },
      [id],
    ),
  );

  useEffect(() => {
    mountedRef.current = true;
    listVoices().then((v) => { if (mountedRef.current) setMyVoices(v); }).catch(() => {});
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (!didMountRef.current) { didMountRef.current = true; return; }
    persistData({ voiceName, description });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceName, description]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      setAudioBase64(base64);
      setAudioMime(file.type || 'audio/mpeg');
      persistData({ sampleBase64: base64, sampleMime: file.type || 'audio/mpeg', fileName: file.name });
    };
    reader.readAsDataURL(file);
  }, [persistData]);

  const handleClone = useCallback(async () => {
    const sampleB64 = audioBase64 || upstreamAudio?.base64;
    const sampleMime = audioMime || upstreamAudio?.mime || 'audio/mpeg';

    if (!voiceName.trim()) { setError('Give your voice a name'); return; }
    if (!sampleB64) { setError('Upload an audio sample or connect an audio source'); return; }

    setProcessing(true);
    setError('');
    setSuccess('');

    try {
      const result = await cloneVoice(voiceName.trim(), sampleB64, sampleMime, description || undefined);
      if (mountedRef.current) {
        setClonedVoiceId(result.voice_id);
        setSuccess(`Voice "${voiceName}" cloned! ID: ${result.voice_id}`);
        persistData({ clonedVoiceId: result.voice_id });
        const updated = await listVoices();
        if (mountedRef.current) setMyVoices(updated);
      }
    } catch (e) {
      if (mountedRef.current) setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (mountedRef.current) setProcessing(false);
    }
  }, [voiceName, description, audioBase64, audioMime, upstreamAudio, persistData]);

  const hasSample = !!(audioBase64 || upstreamAudio);

  return (
    <div className={`audio-node${selected ? ' selected' : ''}${processing ? ' audio-node-processing' : ''}`}>
      <Handle type="target" position={Position.Left} style={{ background: '#ff6f00' }} />
      <Handle type="source" position={Position.Right} style={{ background: '#ff6f00' }} />

      <div className="audio-node-header" style={{ background: 'linear-gradient(135deg, #4a148c, #7b1fa2)' }}>
        <span>Voice Clone</span>
        <span style={{ fontSize: 9, opacity: 0.7 }}>ElevenLabs</span>
      </div>

      <div className="audio-node-body">
        {/* Voice name */}
        <div className="audio-field">
          <span className="audio-field-label">Name</span>
          <input
            className="audio-input"
            placeholder="My Character Voice"
            value={voiceName}
            onChange={(e) => setVoiceName(e.target.value)}
            disabled={processing}
          />
        </div>

        {/* Description */}
        <div className="audio-field">
          <span className="audio-field-label">Desc</span>
          <input
            className="audio-input"
            placeholder="Optional description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={processing}
          />
        </div>

        {/* Audio upload zone */}
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        <div
          className="audio-upload-zone"
          onClick={() => fileInputRef.current?.click()}
          style={hasSample ? { borderColor: '#69f0ae', background: 'rgba(105,240,174,0.04)' } : undefined}
        >
          {hasSample ? (
            <div>
              <div style={{ color: '#69f0ae', fontWeight: 600 }}>
                {fileName || (upstreamAudio ? 'Audio from upstream' : 'Sample loaded')}
              </div>
              <div style={{ fontSize: 9, color: '#888', marginTop: 2 }}>Click to replace</div>
            </div>
          ) : (
            <div>
              <div>Drop or click to upload audio sample</div>
              <div style={{ fontSize: 9, color: '#666', marginTop: 2 }}>MP3, WAV, OGG — min ~30 seconds recommended</div>
            </div>
          )}
        </div>

        {audioBase64 && (
          <audio
            className="audio-player"
            controls
            src={`data:${audioMime};base64,${audioBase64}`}
          />
        )}

        <button
          className="audio-btn primary"
          onClick={handleClone}
          disabled={processing || !voiceName.trim() || !hasSample}
          style={{ width: '100%' }}
        >
          {processing ? 'Cloning…' : 'Clone Voice'}
        </button>

        {error && <div className="audio-error">{error}</div>}
        {success && <div className="audio-success">{success}</div>}

        {clonedVoiceId && (
          <div className="audio-voice-chip">
            Cloned: {clonedVoiceId.slice(0, 12)}…
          </div>
        )}

        {/* Your voices */}
        {myVoices.length > 0 && (
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 6, marginTop: 4 }}>
            <div className="audio-field-label" style={{ marginBottom: 4 }}>Your Voices ({myVoices.length})</div>
            <div style={{ maxHeight: 100, overflowY: 'auto', fontSize: 10 }}>
              {myVoices.slice(0, 15).map((v) => (
                <div key={v.voice_id} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', color: '#bbb' }}>
                  <span>{v.name}</span>
                  <span style={{ color: '#777' }}>{v.category}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const ElevenLabsVoiceCloneNode = memo(ElevenLabsVoiceCloneNodeInner);
export default ElevenLabsVoiceCloneNode;
