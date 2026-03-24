import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

const ENV_ACCESS = process.env.HITEM3D_ACCESS_KEY ?? '';
const ENV_SECRET = process.env.HITEM3D_SECRET_KEY ?? '';
const BASE = 'https://api.hitem3d.ai';

const ALLOWED_PROXY_HOSTS = new Set(['api.hitem3d.ai', 'cdn.hitem3d.ai', 'assets.hitem3d.ai']);

/* ── Token cache (keyed by access key so multiple users don't collide) ── */
const tokenCache = new Map<string, { token: string; expiresAt: number }>();
const TOKEN_TTL_MS = 25 * 60 * 1000; // refresh every 25 min (tokens typically last 30)

async function getAuthToken(clientId: string, clientSecret: string): Promise<string> {
  const cacheKey = clientId;
  const cached = tokenCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) return cached.token;

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await fetch(`${BASE}/open-api/v1/auth/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/json',
    },
    body: '{}',
  });

  const text = await res.text();
  let body: Record<string, unknown>;
  try { body = JSON.parse(text); } catch { throw new Error(`Token response not JSON: ${text.slice(0, 200)}`); }

  const code = body.code as number | undefined;
  if (code && code !== 200) {
    const msg = (body.msg ?? body.message ?? 'Unknown error') as string;
    throw new Error(`Hitem3D auth failed (${code}): ${msg}`);
  }

  const data = body.data as Record<string, unknown> | undefined;
  const accessToken = data?.accessToken as string | undefined;
  if (!accessToken) throw new Error('No accessToken in auth response: ' + JSON.stringify(body));

  tokenCache.set(cacheKey, { token: accessToken, expiresAt: Date.now() + TOKEN_TTL_MS });
  return accessToken;
}

function authHeaders(bearerToken: string): Record<string, string> {
  return { Authorization: `Bearer ${bearerToken}` };
}

function parseResponseBody(text: string): unknown {
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

function toHttpStatus(code: number): number {
  if (code >= 200 && code <= 599) return code;
  const prefix = Math.floor(code / 100000);
  if (prefix >= 2 && prefix <= 5) return prefix * 100;
  const prefix3 = Math.floor(code / 10000);
  if (prefix3 >= 200 && prefix3 <= 599) return prefix3;
  return 500;
}

function checkBodyError(data: unknown): { code: number; httpStatus: number; msg: string } | null {
  if (typeof data !== 'object' || !data) return null;
  const code = (data as Record<string, unknown>).code;
  if (typeof code === 'number' && code !== 200 && code >= 400) {
    const msg = ((data as Record<string, unknown>).msg ?? (data as Record<string, unknown>).message ?? 'Unknown error') as string;
    return { code, httpStatus: toHttpStatus(code), msg };
  }
  return null;
}

export async function POST(req: NextRequest) {
  const ACCESS_KEY = req.headers.get('x-hitem3d-access') || ENV_ACCESS || '';
  const SECRET_KEY = req.headers.get('x-hitem3d-secret') || ENV_SECRET || '';
  if (!ACCESS_KEY) {
    return NextResponse.json({ error: 'Hitem 3D access key not configured. Go to Settings and enter your Hitem 3D keys.' }, { status: 500 });
  }
  if (!SECRET_KEY) {
    return NextResponse.json({ error: 'Hitem 3D secret key not configured. Go to Settings and enter your Hitem 3D secret key.' }, { status: 500 });
  }

  let bearerToken: string;
  try {
    bearerToken = await getAuthToken(ACCESS_KEY, SECRET_KEY);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const { action } = payload as { action: string };

  /* ── Test connection ── */
  if (action === 'test-connection') {
    return NextResponse.json({ ok: true, message: 'Hitem3D credentials are valid.' });
  }

  /* ── Submit task ── */
  if (action === 'submit-task') {
    const {
      request_type, model, resolution, face, format,
      images, multi_images, multi_images_bit,
      mesh_url,
    } = payload as {
      request_type: number;
      model: string;
      resolution?: string;
      face?: number;
      format?: number;
      images?: { base64: string; mimeType: string; name: string };
      multi_images?: Array<{ base64: string; mimeType: string; name: string }>;
      multi_images_bit?: string;
      mesh_url?: string;
    };

    const form = new FormData();
    form.append('request_type', String(request_type));
    form.append('model', model);
    if (resolution) form.append('resolution', resolution);
    if (face != null) form.append('face', String(face));
    if (format != null) form.append('format', String(format));
    if (mesh_url) form.append('mesh_url', mesh_url);

    if (multi_images && multi_images.length > 0) {
      for (const img of multi_images) {
        const buf = Buffer.from(img.base64, 'base64');
        const blob = new Blob([buf], { type: img.mimeType });
        form.append('multi_images', blob, img.name);
      }
      if (multi_images_bit) form.append('multi_images_bit', multi_images_bit);
    } else if (images) {
      const buf = Buffer.from(images.base64, 'base64');
      const blob = new Blob([buf], { type: images.mimeType });
      form.append('images', blob, images.name);
    } else if (request_type !== 2) {
      return NextResponse.json({ error: 'No images provided' }, { status: 400 });
    }

    try {
      const res = await fetch(`${BASE}/open-api/v1/submit-task`, {
        method: 'POST',
        headers: authHeaders(bearerToken),
        body: form,
      });
      const text = await res.text();
      const data = parseResponseBody(text);
      if (!res.ok) {
        return NextResponse.json(
          { error: `Hitem3D ${res.status}: ${typeof data === 'object' && data ? JSON.stringify(data) : text}` },
          { status: res.status },
        );
      }
      const err = checkBodyError(data);
      if (err) {
        tokenCache.delete(ACCESS_KEY);
        return NextResponse.json({ error: `Hitem3D API error (${err.code}): ${err.msg}` }, { status: err.httpStatus });
      }
      return NextResponse.json(data, { status: res.status });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  /* ── Query task ── */
  if (action === 'query-task') {
    const { task_id } = payload as { task_id: string };
    if (!task_id) return NextResponse.json({ error: 'Missing task_id' }, { status: 400 });

    try {
      const res = await fetch(
        `${BASE}/open-api/v1/query-task?task_id=${encodeURIComponent(task_id)}`,
        { headers: authHeaders(bearerToken) },
      );
      const text = await res.text();
      const data = parseResponseBody(text);
      const err = checkBodyError(data);
      if (err) {
        tokenCache.delete(ACCESS_KEY);
        return NextResponse.json({ error: `Hitem3D API error (${err.code}): ${err.msg}` }, { status: err.httpStatus });
      }
      return NextResponse.json(data, { status: res.status });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  /* ── Proxy model download ── */
  if (action === 'proxy-model') {
    const { url } = payload as { url: string };
    if (!url) return NextResponse.json({ error: 'Missing url' }, { status: 400 });
    try {
      const parsedUrl = new URL(url);
      if (!ALLOWED_PROXY_HOSTS.has(parsedUrl.hostname)) {
        return NextResponse.json({ error: `Proxy blocked: host ${parsedUrl.hostname} not allowed` }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }
    try {
      const res = await fetch(url);
      if (!res.ok) {
        return NextResponse.json(
          { error: `Download failed: ${res.status} ${res.statusText}` },
          { status: 502 },
        );
      }
      const buf = await res.arrayBuffer();
      return new NextResponse(buf, {
        status: 200,
        headers: {
          'Content-Type': res.headers.get('content-type') || 'application/octet-stream',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
}
