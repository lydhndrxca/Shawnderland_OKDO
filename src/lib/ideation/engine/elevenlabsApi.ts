/**
 * Client-side ElevenLabs API helpers.
 * Calls go through /api/elevenlabs to keep the API key server-side.
 */

/* ── Types ──────────────────────────────────────────────────────── */

export interface ELVoice {
  voice_id: string;
  name: string;
  category: string;
  labels?: Record<string, string>;
  preview_url?: string;
}

export interface ELModel {
  model_id: string;
  name: string;
  description?: string;
  can_do_text_to_speech?: boolean;
  languages?: Array<{ language_id: string; name: string }>;
}

export interface VoiceSettings {
  stability: number;
  similarity_boost: number;
  style?: number;
  use_speaker_boost?: boolean;
}

export interface TTSResult {
  audioBase64: string;
  mimeType: string;
  format: string;
}

export interface SFXResult {
  audioBase64: string;
  mimeType: string;
}

export type OutputFormat =
  | 'mp3_22050_32' | 'mp3_44100_64' | 'mp3_44100_96' | 'mp3_44100_128' | 'mp3_44100_192'
  | 'pcm_16000' | 'pcm_22050' | 'pcm_24000' | 'pcm_44100'
  | 'opus_48000_32' | 'opus_48000_64' | 'opus_48000_96' | 'opus_48000_128';

export const FORMAT_OPTIONS: Array<{ value: OutputFormat; label: string }> = [
  { value: 'mp3_44100_128', label: 'MP3 128kbps' },
  { value: 'mp3_44100_192', label: 'MP3 192kbps' },
  { value: 'mp3_44100_64', label: 'MP3 64kbps' },
  { value: 'mp3_22050_32', label: 'MP3 32kbps (small)' },
  { value: 'pcm_44100', label: 'PCM 44.1kHz (WAV)' },
  { value: 'pcm_24000', label: 'PCM 24kHz' },
  { value: 'opus_48000_128', label: 'Opus 128kbps' },
  { value: 'opus_48000_64', label: 'Opus 64kbps' },
];

export const TTS_MODELS: Array<{ id: string; label: string; desc: string }> = [
  { id: 'eleven_v3', label: 'Eleven v3', desc: 'Most expressive, 70+ languages' },
  { id: 'eleven_flash_v2_5', label: 'Flash v2.5', desc: '~75ms latency, fast' },
  { id: 'eleven_multilingual_v2', label: 'Multilingual v2', desc: '29 languages, high quality' },
  { id: 'eleven_turbo_v2_5', label: 'Turbo v2.5', desc: 'Low latency, English-optimized' },
  { id: 'eleven_monolingual_v1', label: 'English v1', desc: 'Legacy English model' },
];

export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  stability: 0.5,
  similarity_boost: 0.75,
  style: 0.0,
  use_speaker_boost: true,
};

/* ── API Calls ──────────────────────────────────────────────────── */

function elHeaders(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    const raw = typeof localStorage !== 'undefined'
      ? localStorage.getItem('shawnderland-global-settings') : null;
    if (raw) {
      const key = JSON.parse(raw)?.elevenLabsApiKey;
      if (key) h['x-elevenlabs-key'] = key;
    }
  } catch { /* SSR */ }
  return h;
}

async function elPost(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const res = await fetch('/api/elevenlabs', {
    method: 'POST',
    headers: elHeaders(),
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error((json as { error?: string }).error || `ElevenLabs error ${res.status}`);
  return json as Record<string, unknown>;
}

export async function listVoices(): Promise<ELVoice[]> {
  const data = await elPost({ action: 'list-voices' });
  return (data.voices as ELVoice[]) ?? [];
}

export async function listModels(): Promise<ELModel[]> {
  const data = await elPost({ action: 'list-models' });
  return (data as unknown as ELModel[]) ?? [];
}

export async function textToSpeech(
  voiceId: string,
  text: string,
  opts: {
    modelId?: string;
    outputFormat?: OutputFormat;
    voiceSettings?: VoiceSettings;
    languageCode?: string;
  } = {},
): Promise<TTSResult> {
  const data = await elPost({
    action: 'tts',
    voice_id: voiceId,
    text,
    model_id: opts.modelId ?? 'eleven_v3',
    output_format: opts.outputFormat ?? 'mp3_44100_128',
    voice_settings: opts.voiceSettings,
    language_code: opts.languageCode,
  });
  return {
    audioBase64: data.audio_base64 as string,
    mimeType: data.mime_type as string,
    format: data.format as string,
  };
}

export async function generateSoundEffect(
  text: string,
  opts: { durationSeconds?: number; promptInfluence?: number } = {},
): Promise<SFXResult> {
  const data = await elPost({
    action: 'sound-generation',
    text,
    duration_seconds: opts.durationSeconds,
    prompt_influence: opts.promptInfluence,
  });
  return {
    audioBase64: data.audio_base64 as string,
    mimeType: data.mime_type as string,
  };
}

export async function cloneVoice(
  name: string,
  audioBase64: string,
  audioMime: string,
  description?: string,
): Promise<{ voice_id: string }> {
  const data = await elPost({
    action: 'clone-voice',
    name,
    description,
    audio_base64: audioBase64,
    audio_mime: audioMime,
  });
  return { voice_id: data.voice_id as string };
}

export async function isolateAudio(
  audioBase64: string,
  audioMime: string,
): Promise<SFXResult> {
  const data = await elPost({
    action: 'audio-isolation',
    audio_base64: audioBase64,
    audio_mime: audioMime,
  });
  return {
    audioBase64: data.audio_base64 as string,
    mimeType: data.mime_type as string,
  };
}

/* ── Helpers ────────────────────────────────────────────────────── */

export function audioDataUrl(base64: string, mime: string): string {
  return `data:${mime};base64,${base64}`;
}
