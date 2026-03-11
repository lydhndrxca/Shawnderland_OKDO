import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';

export const maxDuration = 120;
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const { url, dir, filename } = (await req.json()) as {
    url: string;
    dir: string;
    filename: string;
  };

  if (!url || !dir || !filename) {
    return NextResponse.json({ error: 'Missing url, dir, or filename' }, { status: 400 });
  }

  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const res = await fetch(url);
    if (!res.ok) {
      return NextResponse.json(
        { error: `Failed to download: ${res.status} ${res.statusText}` },
        { status: 502 },
      );
    }

    const buf = Buffer.from(await res.arrayBuffer());
    const outPath = path.join(dir, filename);
    fs.writeFileSync(outPath, buf);

    return NextResponse.json({ ok: true, path: outPath, size: buf.length });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
