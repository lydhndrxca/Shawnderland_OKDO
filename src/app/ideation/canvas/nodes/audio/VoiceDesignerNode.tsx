"use client";

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Handle, Position, useReactFlow, useStore } from '@xyflow/react';
import { generateText, type GeneratedImage } from '@/lib/ideation/engine/conceptlab/imageGenApi';
import './AudioNodes.css';

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

const IMAGE_SOURCE_TYPES = new Set([
  'charMainViewer', 'charViewer', 'charImageViewer',
  'charFrontViewer', 'charBackViewer', 'charSideViewer',
  'charCustomView', 'detachedViewer', 'charGenerate',
  'imageOutput', 'imageReference', 'imageInfluence',
]);

const VOICE_PROMPT = `You are a veteran voice casting director for AAA games and animated films.

Study this character image carefully. Based on EVERYTHING you can see — their age, build, face, expression, clothing, armor, posture, attitude, and overall vibe — write a detailed voice description that a voice actor or text-to-speech engine could use to replicate how this character should sound.

Your description MUST cover all of the following:

1. **Pitch & Range** — low/mid/high, resonant/thin, gravelly/smooth
2. **Pace & Rhythm** — fast talker/measured/slow and deliberate, any speech patterns
3. **Accent & Dialect** — suggest a real-world accent or dialect that fits the character's look and setting
4. **Texture & Quality** — breathy/raspy/clear/nasal/warm/cold/silky/rough
5. **Emotional Baseline** — what's their default emotional state when speaking? Confident? Guarded? Weary? Cheerful?
6. **Personality Through Voice** — are they someone who chooses words carefully? Speaks in short bursts? Uses formality or slang?
7. **Age in Voice** — does the voice match the apparent age? Younger than they look? Weathered?

Write it as a single cohesive paragraph (4-6 sentences) that reads like a casting call brief. Be specific and evocative — don't just say "deep voice", say exactly what KIND of deep voice and why it fits this character.

Return ONLY the voice description paragraph, nothing else.`;

const VOICE_PROMPT_WITH_CONTEXT = (ctx: string) =>
  `${VOICE_PROMPT}\n\nAdditional character context:\n${ctx}`;

function VoiceDesignerNodeInner({ id, data, selected }: Props) {
  const { setNodes, getNode, getEdges } = useReactFlow();
  const didMountRef = useRef(false);
  const mountedRef = useRef(true);

  const persistData = useCallback(
    (patch: Record<string, unknown>) => {
      setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)));
    },
    [id, setNodes],
  );

  const [voiceDesc, setVoiceDesc] = useState<string>((data.text as string) ?? '');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  /* ── Detect upstream image changes for status display ── */
  const hasImage = useStore(
    useCallback(
      (state: { edges: Array<{ source: string; target: string }>; nodes: Array<{ id: string; data: Record<string, unknown>; type?: string }> }) => {
        const incomers = state.edges.filter((e) => e.target === id).map((e) => e.source);
        for (const srcId of incomers) {
          const n = state.nodes.find((nd) => nd.id === srcId);
          if (!n) continue;
          if (IMAGE_SOURCE_TYPES.has(n.type ?? '')) {
            const img = n.data?.generatedImage as { base64?: string } | undefined;
            if (img?.base64) return true;
          }
        }
        return false;
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
    persistData({ text: voiceDesc });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceDesc]);

  const gatherContext = useCallback(() => {
    const edges = getEdges();
    const incoming = edges.filter((e) => e.target === id);

    let image: GeneratedImage | null = null;
    const contextParts: string[] = [];

    for (const e of incoming) {
      const src = getNode(e.source);
      if (!src?.data) continue;
      const d = src.data as Record<string, unknown>;

      if (IMAGE_SOURCE_TYPES.has(src.type ?? '')) {
        const img = d.generatedImage as GeneratedImage | undefined;
        if (img?.base64 && !image) image = img;
      }

      if (src.type === 'charIdentity') {
        const ident = d.identity as { age?: string; race?: string; gender?: string; build?: string; name?: string } | undefined;
        if (ident) {
          const parts = [ident.name, ident.age, ident.race, ident.gender, ident.build].filter(Boolean);
          if (parts.length) contextParts.push(`Identity: ${parts.join(', ')}`);
        }
      }
      if (src.type === 'charDescription' && typeof d.description === 'string' && d.description) {
        contextParts.push(`Description: ${d.description}`);
      }
      if (src.type === 'charAttributes' && d.attributes && typeof d.attributes === 'object') {
        const attrs = d.attributes as Record<string, string>;
        for (const [k, v] of Object.entries(attrs)) {
          if (v?.trim()) contextParts.push(`${k}: ${v}`);
        }
      }
      if (typeof d.text === 'string' && d.text && !['charIdentity', 'charDescription', 'charAttributes'].includes(src.type ?? '')) {
        contextParts.push(d.text);
      }
    }

    return { image, context: contextParts.join('\n') };
  }, [id, getNode, getEdges]);

  const handleAnalyze = useCallback(async () => {
    const { image, context } = gatherContext();
    if (!image) { setError('Connect a character image viewer'); return; }

    setProcessing(true);
    setError('');

    try {
      const prompt = context ? VOICE_PROMPT_WITH_CONTEXT(context) : VOICE_PROMPT;
      const result = await generateText(prompt, image);
      if (mountedRef.current) {
        const cleaned = result.trim();
        setVoiceDesc(cleaned);
        persistData({ text: cleaned });
      }
    } catch (e) {
      if (mountedRef.current) setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (mountedRef.current) setProcessing(false);
    }
  }, [gatherContext, persistData]);

  return (
    <div className={`audio-node${selected ? ' selected' : ''}${processing ? ' audio-node-processing' : ''}`}>
      <Handle type="target" position={Position.Left} style={{ background: '#42a5f5' }} />
      <Handle type="source" position={Position.Right} style={{ background: '#42a5f5' }} />

      <div className="audio-node-header" style={{ background: 'linear-gradient(135deg, #0d47a1, #1976d2)' }}>
        <span>Voice Designer</span>
        <span style={{ fontSize: 9, opacity: 0.7 }}>Gemini AI</span>
      </div>

      <div className="audio-node-body">
        <div style={{ fontSize: 10, color: '#90caf9', lineHeight: 1.4 }}>
          Analyzes a character image and writes a casting-call voice description — pitch, accent, pace, texture, personality.
        </div>

        <div style={{
          fontSize: 10,
          padding: '4px 8px',
          borderRadius: 4,
          background: hasImage ? 'rgba(105,240,174,0.06)' : 'rgba(244,67,54,0.06)',
          color: hasImage ? '#69f0ae' : '#f44336',
          border: `1px solid ${hasImage ? 'rgba(105,240,174,0.15)' : 'rgba(244,67,54,0.15)'}`,
        }}>
          {hasImage ? 'Character image connected' : 'Connect a character image viewer ←'}
        </div>

        <button
          className="audio-btn primary"
          onClick={handleAnalyze}
          disabled={processing || !hasImage}
          style={{ width: '100%' }}
        >
          {processing ? 'Analyzing character…' : 'Design Voice from Image'}
        </button>

        {error && <div className="audio-error">{error}</div>}

        {voiceDesc && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#42a5f5', marginBottom: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Voice Description</span>
              <button className="audio-btn" onClick={handleAnalyze} disabled={processing} style={{ fontSize: 9, padding: '1px 6px' }}>
                ↻
              </button>
            </div>
            <textarea
              className="audio-textarea"
              value={voiceDesc}
              onChange={(e) => { setVoiceDesc(e.target.value); persistData({ text: e.target.value }); }}
              rows={6}
              style={{ minHeight: 80, fontSize: 11, lineHeight: 1.5 }}
            />
            <div style={{ fontSize: 9, color: '#666', textAlign: 'right' }}>
              Editable · connects to TTS or Voice Clone →
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const VoiceDesignerNode = memo(VoiceDesignerNodeInner);
export default VoiceDesignerNode;
