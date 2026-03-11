import { NextRequest, NextResponse } from 'next/server';
import https from 'node:https';

export const maxDuration = 180;
export const dynamic = 'force-dynamic';

const API_KEY = process.env.GEMINI_API_KEY ?? process.env.NEXT_PUBLIC_GEMINI_API_KEY ?? '';
const AI_STUDIO_HOST = 'generativelanguage.googleapis.com';
const AI_STUDIO_BASE_PATH = '/v1beta';

const ALLOWED_MODELS = new Set([
  'gemini-2.0-flash',
  'gemini-2.0-flash-exp',
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash-thinking-exp',
  'gemini-3-pro-image-preview',
  'gemini-2.0-flash-preview-image-generation',
  'gemini-2.0-flash-exp-image-generation',
  'gemini-2.5-flash-image',
  'gemini-3.1-flash-image-preview',
  'nano-banana-pro-preview',
  'imagen-4.0-generate-001',
  'imagen-4.0-ultra-generate-001',
  'imagen-4.0-fast-generate-001',
  'imagen-4.0-upscale-preview',
  'veo-2.0-generate-001',
]);

const ALLOWED_METHODS = new Set([
  'generateContent',
  'streamGenerateContent',
  'predict',
  'predictLongRunning',
]);

function httpsPost(path: string, body: string, timeoutMs: number): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: AI_STUDIO_HOST,
        port: 443,
        path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
        timeout: timeoutMs,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          resolve({ status: res.statusCode ?? 500, body: Buffer.concat(chunks).toString() });
        });
      },
    );

    req.on('timeout', () => {
      req.destroy(new Error('Request timed out'));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function httpsGet(path: string, timeoutMs: number): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: AI_STUDIO_HOST,
        port: 443,
        path,
        method: 'GET',
        timeout: timeoutMs,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          resolve({ status: res.statusCode ?? 500, body: Buffer.concat(chunks).toString() });
        });
      },
    );

    req.on('timeout', () => {
      req.destroy(new Error('Request timed out'));
    });
    req.on('error', reject);
    req.end();
  });
}

/** GET — poll a long-running operation (video generation) */
export async function GET(req: NextRequest) {
  try {
    const opName = req.nextUrl.searchParams.get('poll');
    if (!opName) {
      return NextResponse.json({ error: 'Missing poll param' }, { status: 400 });
    }
    if (!/^operations\/[\w-]+$/.test(opName)) {
      return NextResponse.json({ error: 'Invalid poll param format' }, { status: 400 });
    }

    const path = `${AI_STUDIO_BASE_PATH}/${opName}?key=${API_KEY}`;
    const result = await httpsGet(path, 30_000);

    if (result.status !== 200) {
      return NextResponse.json(
        { error: `Poll upstream ${result.status}: ${result.body.slice(0, 400)}` },
        { status: result.status },
      );
    }

    try {
      return NextResponse.json(JSON.parse(result.body));
    } catch {
      return NextResponse.json({ error: 'Invalid JSON from upstream' }, { status: 502 });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[ai-generate GET] error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/** POST — call a model method (generateContent, predict, etc.) */
export async function POST(req: NextRequest) {
  try {
    const { model, method, body } = await req.json();

    if (!API_KEY) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }
    if (!model || !ALLOWED_MODELS.has(model)) {
      return NextResponse.json({ error: `Invalid model: ${model}` }, { status: 400 });
    }
    if (!method || !ALLOWED_METHODS.has(method)) {
      return NextResponse.json({ error: `Invalid method: ${method}` }, { status: 400 });
    }

    const path = `${AI_STUDIO_BASE_PATH}/models/${model}:${method}?key=${API_KEY}`;
    console.log(`[ai-generate] ${model}:${method}`);

    const bodyStr = body != null ? JSON.stringify(body) : '{}';
    const result = await httpsPost(path, bodyStr, 180_000);

    if (result.status !== 200) {
      console.error(`[ai-generate] ${model}:${method} → ${result.status}: ${result.body.slice(0, 500)}`);
      return NextResponse.json(
        { error: `Upstream ${result.status}: ${result.body.slice(0, 400)}` },
        { status: result.status },
      );
    }

    console.log(`[ai-generate] ${model}:${method} → OK`);
    try {
      return NextResponse.json(JSON.parse(result.body));
    } catch {
      return NextResponse.json({ error: 'Invalid JSON from upstream' }, { status: 502 });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[ai-generate] error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
