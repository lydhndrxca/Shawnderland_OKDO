import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

const ENV_ACCESS = process.env.HITEM3D_ACCESS_KEY ?? '';
const ENV_SECRET = process.env.HITEM3D_SECRET_KEY ?? '';
const BASE = 'https://api.hitem3d.ai';

const ALLOWED_PROXY_HOSTS = new Set(['api.hitem3d.ai', 'cdn.hitem3d.ai', 'assets.hitem3d.ai']);

export async function POST(req: NextRequest) {
  const ACCESS_KEY = req.headers.get('x-hitem3d-access') || ENV_ACCESS || '';
  const SECRET_KEY = req.headers.get('x-hitem3d-secret') || ENV_SECRET || '';
  if (!ACCESS_KEY) {
    return NextResponse.json({ error: 'Hitem 3D access key not configured. Go to Settings and enter your Hitem 3D keys.' }, { status: 500 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const { action } = payload as { action: string };

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
        headers: {
          Authorization: `Bearer ${ACCESS_KEY}`,
          'X-Secret-Key': SECRET_KEY,
        },
        body: form,
      });
      const text = await res.text();
      let data: unknown;
      try { data = JSON.parse(text); } catch { data = { raw: text }; }
      if (!res.ok) {
        return NextResponse.json(
          { error: `Hitem3D ${res.status}: ${typeof data === 'object' && data ? JSON.stringify(data) : text}` },
          { status: res.status },
        );
      }
      return NextResponse.json(data, { status: res.status });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  if (action === 'query-task') {
    const { task_id } = payload as { task_id: string };
    if (!task_id) return NextResponse.json({ error: 'Missing task_id' }, { status: 400 });

    try {
      const res = await fetch(
        `${BASE}/open-api/v1/query-task?task_id=${encodeURIComponent(task_id)}`,
        {
          headers: {
            Authorization: `Bearer ${ACCESS_KEY}`,
            'X-Secret-Key': SECRET_KEY,
          },
        },
      );
      const text = await res.text();
      let data: unknown;
      try { data = JSON.parse(text); } catch { data = { raw: text }; }
      return NextResponse.json(data, { status: res.status });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

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
