"use client";

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Handle, Position, useReactFlow, useStore } from '@xyflow/react';
import { generateText, type TextModelId } from '@/lib/ideation/engine/conceptlab/imageGenApi';
import TextModelSelector from '@/components/TextModelSelector';
import './AudioNodes.css';

interface Props {
  id: string;
  data: Record<string, unknown>;
  selected?: boolean;
}

type LineStyle = 'dialogue' | 'monologue' | 'battlecry' | 'narrator' | 'taunt' | 'greeting';

const STYLES: Array<{ value: LineStyle; label: string }> = [
  { value: 'dialogue', label: 'Dialogue Line (1-2 sentences)' },
  { value: 'monologue', label: 'Monologue (3-6 sentences)' },
  { value: 'battlecry', label: 'Battle Cry / Callout (2-8 words)' },
  { value: 'taunt', label: 'Taunt / Trash Talk' },
  { value: 'greeting', label: 'Greeting / Introduction' },
  { value: 'narrator', label: 'Narrator Voiceover' },
];

const TONE_OPTIONS = [
  '', 'Heroic', 'Menacing', 'Calm', 'Sarcastic', 'Weary', 'Joyful',
  'Mysterious', 'Desperate', 'Commanding', 'Playful', 'Sorrowful', 'Enraged',
];

function buildPrompt(
  topic: string,
  style: LineStyle,
  tone: string,
  charContext: string,
  voiceDesc: string,
  count: number,
): string {
  let sysBlock = 'You are a AAA game script writer creating voice lines for a game character.\n';

  if (charContext) sysBlock += `\nCharacter context:\n${charContext}\n`;
  if (voiceDesc) sysBlock += `\nVoice description (match the speech patterns to this):\n${voiceDesc}\n`;
  if (tone) sysBlock += `\nEmotional tone: ${tone}\n`;

  sysBlock += `\nThe character is talking about / reacting to: ${topic}\n`;

  const styleInstructions: Record<LineStyle, string> = {
    dialogue: `Write ${count} in-character dialogue line${count > 1 ? 's' : ''} (1-2 sentences each).`,
    monologue: `Write ${count > 1 ? count + ' separate monologues' : 'a monologue'} (3-6 sentences${count > 1 ? ' each' : ''}).`,
    battlecry: `Write ${Math.max(count, 4)} battle cries or combat callouts (2-8 words each). Varied — aggressive, tactical, defiant.`,
    taunt: `Write ${Math.max(count, 3)} taunts or trash-talk lines. Cutting, in-character, designed to get under the opponent's skin.`,
    greeting: `Write ${Math.max(count, 3)} greeting or introduction lines. How this character introduces themselves or acknowledges someone.`,
    narrator: `Write ${count > 1 ? count + ' narrator voiceover passages' : 'a narrator voiceover'} (2-4 sentences${count > 1 ? ' each' : ''}). Cinematic third-person.`,
  };

  sysBlock += `\n${styleInstructions[style]}\n`;
  sysBlock += `
RULES:
- Return ONLY the spoken words — no quotation marks, no "(angrily)", no character names, no stage directions
- Write exactly as a voice actor should read it aloud
- ${count > 1 ? 'Separate each line with a blank line' : 'Return a single passage'}
- Match vocabulary and speech patterns to the character's background
- Keep language natural and speakable`;

  return sysBlock;
}

function DialogueWriterNodeInner({ id, data, selected }: Props) {
  const { setNodes } = useReactFlow();
  const didMountRef = useRef(false);
  const mountedRef = useRef(true);

  const persistData = useCallback(
    (patch: Record<string, unknown>) => {
      setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)));
    },
    [id, setNodes],
  );

  const [topic, setTopic] = useState<string>((data.topic as string) ?? '');
  const [style, setStyle] = useState<LineStyle>((data.lineStyle as LineStyle) ?? 'dialogue');
  const [tone, setTone] = useState<string>((data.tone as string) ?? '');
  const [count, setCount] = useState<number>((data.count as number) ?? 3);
  const [generatedText, setGeneratedText] = useState<string>((data.text as string) ?? '');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [textModel, setTextModel] = useState<TextModelId>((data?.textModel as TextModelId) ?? 'fast');

  /* ── Collect character context + voice description from upstream ── */
  const upstream = useStore(
    useCallback(
      (state: { edges: Array<{ source: string; target: string }>; nodes: Array<{ id: string; data: Record<string, unknown>; type?: string }> }) => {
        const incomers = state.edges.filter((e) => e.target === id).map((e) => e.source);
        const charParts: string[] = [];
        let voiceDesc = '';

        for (const srcId of incomers) {
          const n = state.nodes.find((nd) => nd.id === srcId);
          if (!n) continue;
          const d = n.data;

          if (n.type === 'elVoiceDesigner' && typeof d.text === 'string' && d.text) {
            voiceDesc = d.text;
            continue;
          }

          if (n.type === 'charIdentity') {
            const ident = d.identity as { name?: string; age?: string; race?: string; gender?: string } | undefined;
            if (ident) {
              const parts = [ident.name, ident.age, ident.race, ident.gender].filter(Boolean);
              if (parts.length) charParts.push(`Identity: ${parts.join(', ')}`);
            }
          }
          if (n.type === 'charDescription' && typeof d.description === 'string' && d.description) {
            charParts.push(`Description: ${d.description}`);
          }
          if (n.type === 'charAttributes' && d.attributes && typeof d.attributes === 'object') {
            const attrs = d.attributes as Record<string, string>;
            for (const [k, v] of Object.entries(attrs)) {
              if (v?.trim()) charParts.push(`${k}: ${v}`);
            }
          }
          if (typeof d.text === 'string' && d.text && !['charIdentity', 'charDescription', 'charAttributes'].includes(n.type ?? '') && !charParts.includes(d.text)) {
            charParts.push(d.text);
          }
        }

        return { charContext: charParts.join('\n'), voiceDesc };
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
    persistData({ topic, lineStyle: style, tone, count, textModel });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic, style, tone, count, textModel]);

  const handleGenerate = useCallback(async () => {
    if (!topic.trim()) { setError('Describe what the character is talking about'); return; }
    setProcessing(true);
    setError('');
    try {
      const prompt = buildPrompt(topic, style, tone, upstream.charContext, upstream.voiceDesc, count);
      const result = await generateText(prompt, undefined, textModel);
      if (mountedRef.current) {
        const cleaned = result.trim();
        setGeneratedText(cleaned);
        persistData({ text: cleaned });
      }
    } catch (e) {
      if (mountedRef.current) setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (mountedRef.current) setProcessing(false);
    }
  }, [topic, style, tone, count, upstream, textModel, persistData]);

  return (
    <div className={`audio-node${selected ? ' selected' : ''}${processing ? ' audio-node-processing' : ''}`}>
      <Handle type="target" position={Position.Left} style={{ background: '#42a5f5' }} />
      <Handle type="source" position={Position.Right} style={{ background: '#42a5f5' }} />

      <div className="audio-node-header" style={{ background: 'linear-gradient(135deg, #1b5e20, #388e3c)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>Dialogue Writer</span>
          <TextModelSelector
            value={textModel}
            onChange={(m) => { setTextModel(m); setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, textModel: m } } : n)); }}
            disabled={processing}
          />
        </span>
        <span style={{ fontSize: 9, opacity: 0.7 }}>Gemini AI</span>
      </div>

      <div className="audio-node-body">
        {/* Connection status */}
        {(upstream.charContext || upstream.voiceDesc) && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {upstream.charContext && (
              <span className="audio-voice-chip" style={{ background: 'rgba(105,240,174,0.1)', borderColor: 'rgba(105,240,174,0.3)', color: '#69f0ae' }}>
                Character context
              </span>
            )}
            {upstream.voiceDesc && (
              <span className="audio-voice-chip" style={{ background: 'rgba(66,165,245,0.1)', borderColor: 'rgba(66,165,245,0.3)', color: '#42a5f5' }}>
                Voice description
              </span>
            )}
          </div>
        )}

        {/* Topic input */}
        <div className="audio-field-col">
          <span className="audio-field-label">What are they talking about?</span>
          <textarea
            className="audio-textarea"
            placeholder='e.g. "Warning allies about an approaching enemy" or "Reflecting on a lost friend" or "Negotiating a deal with a merchant"'
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            rows={3}
            disabled={processing}
            style={{ minHeight: 50 }}
          />
        </div>

        {/* Style */}
        <div className="audio-field">
          <span className="audio-field-label">Style</span>
          <select
            className="audio-select"
            value={style}
            onChange={(e) => setStyle(e.target.value as LineStyle)}
            disabled={processing}
          >
            {STYLES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* Tone + Count row */}
        <div style={{ display: 'flex', gap: 6 }}>
          <div className="audio-field" style={{ flex: 1 }}>
            <span className="audio-field-label">Tone</span>
            <select
              className="audio-select"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              disabled={processing}
            >
              <option value="">Auto</option>
              {TONE_OPTIONS.filter(Boolean).map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="audio-field" style={{ flex: 0 }}>
            <span className="audio-field-label">Lines</span>
            <select
              className="audio-select"
              value={count}
              onChange={(e) => setCount(+e.target.value)}
              disabled={processing}
              style={{ width: 48 }}
            >
              {[1, 2, 3, 5, 8].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          className="audio-btn primary"
          onClick={handleGenerate}
          disabled={processing || !topic.trim()}
          style={{ width: '100%' }}
        >
          {processing ? 'Writing…' : 'Write Dialogue'}
        </button>

        {error && <div className="audio-error">{error}</div>}

        {generatedText && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#69f0ae', marginBottom: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Dialogue Lines</span>
              <div style={{ display: 'flex', gap: 4 }}>
                <button className="audio-btn" onClick={handleGenerate} disabled={processing} style={{ fontSize: 9, padding: '1px 6px' }}>
                  ↻
                </button>
              </div>
            </div>
            <div style={{
              background: 'rgba(105,240,174,0.04)',
              border: '1px solid rgba(105,240,174,0.12)',
              borderRadius: 4,
              padding: '8px 10px',
              fontSize: 12,
              lineHeight: 1.6,
              color: 'var(--text-primary)',
              whiteSpace: 'pre-wrap',
              maxHeight: 220,
              overflowY: 'auto',
            }}>
              {generatedText}
            </div>
            <div style={{ fontSize: 9, color: '#666', marginTop: 2, textAlign: 'right' }}>
              {generatedText.length} chars · connect → Text-to-Speech
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const DialogueWriterNode = memo(DialogueWriterNodeInner);
export default DialogueWriterNode;
