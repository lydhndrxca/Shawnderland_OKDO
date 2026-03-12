import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';

export const maxDuration = 120;
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let body: { url: string; dir: string; filename: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const { url, dir, filename } = body;

  if (!url || !dir || !filename) {
    return NextResponse.json({ error: 'Missing url, dir, or filename' }, { status: 400 });
  }

  if (filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
    return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
  }

  const resolvedDir = path.resolve(dir);
  const outPath = path.join(resolvedDir, filename);
  if (!outPath.startsWith(resolvedDir)) {
    return NextResponse.json({ error: 'Path traversal detected' }, { status: 403 });
  }

  try {
    if (!fs.existsSync(resolvedDir)) {
      fs.mkdirSync(resolvedDir, { recursive: true });
    }

    const res = await fetch(url);
    if (!res.ok) {
      return NextResponse.json(
        { error: `Failed to download: ${res.status} ${res.statusText}` },
        { status: 502 },
      );
    }

    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(outPath, buf);

    return NextResponse.json({ ok: true, path: outPath, size: buf.length });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
