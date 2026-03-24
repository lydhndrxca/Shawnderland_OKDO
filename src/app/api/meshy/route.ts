import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

const ENV_MESHY_KEY = process.env.MESHY_API_KEY ?? '';
const MESHY_BASE = 'https://api.meshy.ai';

function resolveMeshyKey(req: NextRequest): string {
  return req.headers.get('x-meshy-key') || ENV_MESHY_KEY || '';
}

async function meshyFetch(
  apiKey: string,
  path: string,
  method: 'GET' | 'POST' | 'DELETE' = 'GET',
  body?: unknown,
): Promise<{ status: number; data: unknown }> {
  const opts: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${MESHY_BASE}${path}`, opts);
  const text = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  return { status: res.status, data };
}

const ALLOWED_PROXY_HOSTS = new Set(['assets.meshy.ai', 'cdn.meshy.ai', 'api.meshy.ai']);

export async function POST(req: NextRequest) {
  const MESHY_KEY = resolveMeshyKey(req);
  if (!MESHY_KEY) {
    return NextResponse.json({ error: 'Meshy API key not configured. Go to Settings and enter your Meshy API key.' }, { status: 500 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const { action, ...params } = payload;

  if (action === 'test-connection') {
    const { status, data } = await meshyFetch(MESHY_KEY, '/openapi/v1/image-to-3d?limit=1');
    if (status >= 200 && status < 300) {
      return NextResponse.json({ ok: true, message: 'Meshy API key is valid.' });
    }
    return NextResponse.json({ ok: false, error: typeof data === 'object' && data ? JSON.stringify(data) : `Status ${status}` }, { status });
  }

  if (action === 'create-image-to-3d') {
    const { status, data } = await meshyFetch(MESHY_KEY, '/openapi/v1/image-to-3d', 'POST', params);
    return NextResponse.json(data, { status });
  }

  if (action === 'create-multi-image-to-3d') {
    const { status, data } = await meshyFetch(MESHY_KEY, '/openapi/v1/multi-image-to-3d', 'POST', params);
    return NextResponse.json(data, { status });
  }

  if (action === 'poll-image-to-3d') {
    const taskId = params.taskId as string;
    const isMulti = params.isMulti as boolean;
    const prefix = isMulti ? '/openapi/v1/multi-image-to-3d' : '/openapi/v1/image-to-3d';
    const { status, data } = await meshyFetch(MESHY_KEY, `${prefix}/${taskId}`);
    return NextResponse.json(data, { status });
  }

  if (action === 'proxy-model') {
    const url = params.url as string;
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
          { error: `Model download failed: ${res.status} ${res.statusText}` },
          { status: 502 },
        );
      }
      const buf = await res.arrayBuffer();
      const contentType = res.headers.get('content-type') || 'model/gltf-binary';
      return new NextResponse(buf, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=86400',
        },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
}
