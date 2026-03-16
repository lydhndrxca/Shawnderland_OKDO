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

type ScriptMode = 'dialogue' | 'monologue' | 'battlecry' | 'narrator' | 'custom';

const MODES: Array<{ value: ScriptMode; label: string; desc: string }> = [
  { value: 'dialogue', label: 'Dialogue Line', desc: 'A single in-character spoken line' },
  { value: 'monologue', label: 'Monologue', desc: 'Extended character speech (3-6 sentences)' },
  { value: 'battlecry', label: 'Battle Cry / Callout', desc: 'Short, punchy exclamations' },
  { value: 'narrator', label: 'Narrator / VO', desc: 'Third-person narration or voiceover' },
  { value: 'custom', label: 'Custom Prompt', desc: 'Write your own Gemini instructions' },
];

const TONE_OPTIONS = [
  'Heroic', 'Menacing', 'Calm', 'Sarcastic', 'Weary', 'Joyful',
  'Mysterious', 'Desperate', 'Commanding', 'Playful', 'Sorrowful', 'Enraged',
];

function buildPrompt(
  mode: ScriptMode,
  tone: string,
  context: string,
  characterInfo: string,
  customPrompt: string,
  count: number,
): string {
  const charBlock = characterInfo
    ? `\n\nCharacter context (use this to shape voice, vocabulary, and personality):\n${characterInfo}`
    : '';

  const sceneBlock = context
    ? `\n\nScene/situation context:\n${context}`
    : '';

  const toneBlock = tone ? `\nEmotional tone: ${tone}` : '';

  if (mode === 'custom') {
    return `${customPrompt}${charBlock}${sceneBlock}${toneBlock}\n\nReturn ONLY the speech text, no stage directions, no quotation marks, no attribution. Just the words to be spoken aloud.`;
  }

  const modeInstructions: Record<Exclude<ScriptMode, 'custom'>, string> = {
    dialogue: `Write ${count} short in-character dialogue line${count > 1 ? 's' : ''} (1-2 sentences each) that this character would actually say. Vary the lines — don't repeat the same structure.`,
    monologue: `Write a ${count > 1 ? `${count} separate monologues` : 'monologue'} (3-6 sentences${count > 1 ? ' each' : ''}) delivered by this character. It should feel like a real person talking — natural pacing, pauses implied through punctuation.`,
    battlecry: `Write ${Math.max(count, 3)} short, punchy battle cries or combat callouts this character would shout. Each should be 2-8 words. Make them varied — some aggressive, some tactical, some defiant.`,
    narrator: `Write ${count > 1 ? `${count} narrator voiceover passages` : 'a narrator voiceover passage'} (2-4 sentences${count > 1 ? ' each' : ''}) describing this character or scene in third person. Cinematic tone, like a game trailer or cutscene intro.`,
  };

  return `You are a AAA game script writer creating voice-over text for a game character.${charBlock}${sceneBlock}${toneBlock}

${modeInstructions[mode]}

IMPORTANT RULES:
- Return ONLY the spoken text — no quotation marks, no "(angrily)", no character names, no stage directions
- Write it exactly as it should be read aloud by a voice actor
- ${count > 1 ? 'Separate each line/passage with a blank line' : 'Return a single passage'}
- Match the character's personality and vocabulary to their background
- Keep language natural and speakable — avoid overly literary constructions`;
}

function VoiceScriptNodeInner({ id, data, selected }: Props) {
  const { setNodes } = useReactFlow();
  const didMountRef = useRef(false);
  const mountedRef = useRef(true);

  const persistData = useCallback(
    (patch: Record<string, unknown>) => {
      setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)));
    },
    [id, setNodes],
  );

  const [mode, setMode] = useState<ScriptMode>((data.mode as ScriptMode) ?? 'dialogue');
  const [tone, setTone] = useState<string>((data.tone as string) ?? '');
  const [context, setContext] = useState<string>((data.context as string) ?? '');
  const [customPrompt, setCustomPrompt] = useState<string>((data.customPrompt as string) ?? '');
  const [count, setCount] = useState<number>((data.count as number) ?? 1);
  const [generatedText, setGeneratedText] = useState<string>((data.text as string) ?? '');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [textModel, setTextModel] = useState<TextModelId>((data?.textModel as TextModelId) ?? 'fast');

  /* ── Collect character info from upstream (identity, description, attributes) ── */
  const characterInfo = useStore(
    useCallback(
      (state: { edges: Array<{ source: string; target: string }>; nodes: Array<{ id: string; data: Record<string, unknown>; type?: string }> }) => {
        const incomers = state.edges.filter((e) => e.target === id).map((e) => e.source);
        const parts: string[] = [];
        for (const srcId of incomers) {
          const n = state.nodes.find((nd) => nd.id === srcId);
          if (!n) continue;
          const d = n.data;
          if (n.type === 'charIdentity' || n.type === 'charDescription') {
            if (typeof d.name === 'string' && d.name) parts.push(`Name: ${d.name}`);
            if (typeof d.age === 'string' && d.age) parts.push(`Age: ${d.age}`);
            if (typeof d.gender === 'string' && d.gender) parts.push(`Gender: ${d.gender}`);
            if (typeof d.race === 'string' && d.race) parts.push(`Race: ${d.race}`);
            if (typeof d.description === 'string' && d.description) parts.push(`Description: ${d.description}`);
            if (typeof d.text === 'string' && d.text) parts.push(d.text);
          }
          if (n.type === 'charAttributes' && d.attributes && typeof d.attributes === 'object') {
            const attrs = d.attributes as Record<string, string>;
            for (const [k, v] of Object.entries(attrs)) {
              if (v) parts.push(`${k}: ${v}`);
            }
          }
          if (typeof d.content === 'string' && d.content && !parts.includes(d.content)) {
            parts.push(d.content);
          }
          if (typeof d.text === 'string' && d.text && n.type !== 'charIdentity' && n.type !== 'charDescription' && !parts.includes(d.text)) {
            parts.push(d.text);
          }
        }
        return parts.join('\n');
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
    persistData({ mode, tone, context, customPrompt, count, textModel });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, tone, context, customPrompt, count, textModel]);

  const handleGenerate = useCallback(async () => {
    setProcessing(true);
    setError('');
    try {
      const prompt = buildPrompt(mode, tone, context, characterInfo, customPrompt, count);
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
  }, [mode, tone, context, characterInfo, customPrompt, count, textModel, persistData]);

  const handleClear = useCallback(() => {
    setGeneratedText('');
    persistData({ text: '' });
  }, [persistData]);

  const modeInfo = MODES.find((m) => m.value === mode);

  return (
    <div className={`audio-node${selected ? ' selected' : ''}${processing ? ' audio-node-processing' : ''}`}>
      <Handle type="target" position={Position.Left} style={{ background: '#ff6f00' }} />
      <Handle type="source" position={Position.Right} style={{ background: '#ff6f00' }} />

      <div className="audio-node-header" style={{ background: 'linear-gradient(135deg, #1565c0, #42a5f5)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span>Voice Script Writer</span>
          <TextModelSelector
            value={textModel}
            onChange={(m) => { setTextModel(m); setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, textModel: m } } : n)); }}
            disabled={processing}
          />
        </span>
        <span style={{ fontSize: 9, opacity: 0.7 }}>Gemini AI</span>
      </div>

      <div className="audio-node-body">
        {characterInfo && (
          <div style={{ fontSize: 10, color: '#69f0ae', padding: '2px 6px', background: 'rgba(105,240,174,0.06)', borderRadius: 4 }}>
            Character context connected
          </div>
        )}

        {/* Mode selector */}
        <div className="audio-field">
          <span className="audio-field-label">Mode</span>
          <select
            className="audio-select"
            value={mode}
            onChange={(e) => setMode(e.target.value as ScriptMode)}
            disabled={processing}
          >
            {MODES.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>
        {modeInfo && (
          <div style={{ fontSize: 9, color: '#777', marginTop: -4 }}>{modeInfo.desc}</div>
        )}

        {/* Tone */}
        <div className="audio-field">
          <span className="audio-field-label">Tone</span>
          <select
            className="audio-select"
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            disabled={processing}
          >
            <option value="">Auto (from context)</option>
            {TONE_OPTIONS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Count */}
        {mode !== 'battlecry' && (
          <div className="audio-field">
            <span className="audio-field-label">Count</span>
            <select
              className="audio-select"
              value={count}
              onChange={(e) => setCount(+e.target.value)}
              disabled={processing}
              style={{ maxWidth: 60 }}
            >
              {[1, 2, 3, 5].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <span style={{ fontSize: 9, color: '#777' }}>
              {count > 1 ? 'variations' : 'line'}
            </span>
          </div>
        )}

        {/* Scene context */}
        <textarea
          className="audio-textarea"
          placeholder={'Scene context (optional): "The hero stands at the cliff edge before the final battle..."'}
          value={context}
          onChange={(e) => setContext(e.target.value)}
          rows={2}
          disabled={processing}
          style={{ minHeight: 40 }}
        />

        {/* Custom prompt (only in custom mode) */}
        {mode === 'custom' && (
          <textarea
            className="audio-textarea"
            placeholder="Your custom instructions to Gemini for generating voice text…"
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            rows={3}
            disabled={processing}
          />
        )}

        <div style={{ display: 'flex', gap: 6 }}>
          <button
            className="audio-btn primary"
            onClick={handleGenerate}
            disabled={processing}
            style={{ flex: 1 }}
          >
            {processing ? 'Writing…' : 'Generate Script'}
          </button>
          {generatedText && (
            <button className="audio-btn" onClick={handleGenerate} disabled={processing} title="Regenerate">
              ↻
            </button>
          )}
        </div>

        {error && <div className="audio-error">{error}</div>}

        {/* Generated output */}
        {generatedText && (
          <div style={{ position: 'relative' }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#42a5f5', marginBottom: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Generated Script</span>
              <button
                className="audio-btn"
                onClick={handleClear}
                style={{ fontSize: 9, padding: '1px 6px' }}
              >
                Clear
              </button>
            </div>
            <div style={{
              background: 'rgba(66, 165, 245, 0.06)',
              border: '1px solid rgba(66, 165, 245, 0.15)',
              borderRadius: 4,
              padding: '8px 10px',
              fontSize: 12,
              lineHeight: 1.5,
              color: 'var(--text-primary)',
              whiteSpace: 'pre-wrap',
              maxHeight: 200,
              overflowY: 'auto',
            }}>
              {generatedText}
            </div>
            <div style={{ fontSize: 9, color: '#666', marginTop: 2, textAlign: 'right' }}>
              {generatedText.length} chars · connects to Text-to-Speech →
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const VoiceScriptNode = memo(VoiceScriptNodeInner);
export default VoiceScriptNode;
