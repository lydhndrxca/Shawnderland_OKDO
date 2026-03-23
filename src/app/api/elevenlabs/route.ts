import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 120;
export const dynamic = 'force-dynamic';

const ENV_KEY = process.env.ELEVENLABS_API_KEY ?? '';
const BASE = 'https://api.elevenlabs.io';

function resolveKey(req: NextRequest): string {
  return req.headers.get('x-elevenlabs-key') || ENV_KEY || '';
}

function authHeaders(key: string, extra?: Record<string, string>): Record<string, string> {
  return { 'xi-api-key': key, ...extra };
}

export async function POST(req: NextRequest) {
  const API_KEY = resolveKey(req);
  if (!API_KEY) {
    return NextResponse.json({ error: 'ElevenLabs API key not configured. Go to Settings and enter your ElevenLabs API key.' }, { status: 500 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const { action } = payload as { action: string };

  /* ── List voices ─────────────────────────────────────────────── */
  if (action === 'list-voices') {
    const res = await fetch(`${BASE}/v1/voices`, { headers: authHeaders(API_KEY) });
    const data = await res.json();
    if (!res.ok) return NextResponse.json({ error: JSON.stringify(data) }, { status: res.status });
    return NextResponse.json(data);
  }

  /* ── List models ─────────────────────────────────────────────── */
  if (action === 'list-models') {
    const res = await fetch(`${BASE}/v1/models`, { headers: authHeaders(API_KEY) });
    const data = await res.json();
    if (!res.ok) return NextResponse.json({ error: JSON.stringify(data) }, { status: res.status });
    return NextResponse.json(data);
  }

  /* ── Text-to-Speech ──────────────────────────────────────────── */
  if (action === 'tts') {
    const {
      voice_id, text, model_id, output_format,
      voice_settings, language_code,
    } = payload as {
      voice_id: string;
      text: string;
      model_id?: string;
      output_format?: string;
      voice_settings?: { stability?: number; similarity_boost?: number; style?: number; use_speaker_boost?: boolean };
      language_code?: string;
    };

    const body: Record<string, unknown> = { text };
    if (model_id) body.model_id = model_id;
    if (voice_settings) body.voice_settings = voice_settings;
    if (language_code) body.language_code = language_code;

    const fmt = output_format || 'mp3_44100_128';
    const url = `${BASE}/v1/text-to-speech/${voice_id}?output_format=${fmt}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: authHeaders(API_KEY, { 'Content-Type': 'application/json' }),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return NextResponse.json({ error: `TTS failed (${res.status}): ${errText.slice(0, 500)}` }, { status: res.status });
    }

    const audioBuffer = await res.arrayBuffer();
    const base64 = Buffer.from(audioBuffer).toString('base64');
    const mimeType = fmt.startsWith('mp3') ? 'audio/mpeg'
      : fmt.startsWith('pcm') ? 'audio/pcm'
      : fmt.startsWith('opus') ? 'audio/opus'
      : 'audio/mpeg';

    return NextResponse.json({ audio_base64: base64, mime_type: mimeType, format: fmt });
  }

  /* ── Sound Effects ───────────────────────────────────────────── */
  if (action === 'sound-generation') {
    const { text, duration_seconds, prompt_influence } = payload as {
      text: string;
      duration_seconds?: number;
      prompt_influence?: number;
    };

    const body: Record<string, unknown> = { text };
    if (duration_seconds != null) body.duration_seconds = duration_seconds;
    if (prompt_influence != null) body.prompt_influence = prompt_influence;

    const res = await fetch(`${BASE}/v1/sound-generation`, {
      method: 'POST',
      headers: authHeaders(API_KEY, { 'Content-Type': 'application/json' }),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return NextResponse.json({ error: `SFX failed (${res.status}): ${errText.slice(0, 500)}` }, { status: res.status });
    }

    const audioBuffer = await res.arrayBuffer();
    const base64 = Buffer.from(audioBuffer).toString('base64');
    return NextResponse.json({ audio_base64: base64, mime_type: 'audio/mpeg' });
  }

  /* ── Voice Clone (instant) ───────────────────────────────────── */
  if (action === 'clone-voice') {
    const { name, description, audio_base64, audio_mime } = payload as {
      name: string;
      description?: string;
      audio_base64: string;
      audio_mime: string;
    };

    const form = new FormData();
    form.append('name', name);
    if (description) form.append('description', description);

    const buf = Buffer.from(audio_base64, 'base64');
    const ext = audio_mime.includes('wav') ? 'wav' : audio_mime.includes('ogg') ? 'ogg' : 'mp3';
    const blob = new Blob([buf], { type: audio_mime });
    form.append('files', blob, `sample.${ext}`);

    const res = await fetch(`${BASE}/v1/voices/add`, {
      method: 'POST',
      headers: authHeaders(API_KEY),
      body: form,
    });

    const data = await res.json();
    if (!res.ok) return NextResponse.json({ error: JSON.stringify(data) }, { status: res.status });
    return NextResponse.json(data);
  }

  /* ── Audio Isolation ─────────────────────────────────────────── */
  if (action === 'audio-isolation') {
    const { audio_base64, audio_mime } = payload as {
      audio_base64: string;
      audio_mime: string;
    };

    const form = new FormData();
    const buf = Buffer.from(audio_base64, 'base64');
    const blob = new Blob([buf], { type: audio_mime });
    form.append('audio', blob, 'input.mp3');

    const res = await fetch(`${BASE}/v1/audio-isolation`, {
      method: 'POST',
      headers: authHeaders(API_KEY),
      body: form,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return NextResponse.json({ error: `Isolation failed (${res.status}): ${errText.slice(0, 500)}` }, { status: res.status });
    }

    const audioBuffer = await res.arrayBuffer();
    const base64 = Buffer.from(audioBuffer).toString('base64');
    return NextResponse.json({ audio_base64: base64, mime_type: 'audio/mpeg' });
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
}
