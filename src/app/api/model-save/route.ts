import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';

export const maxDuration = 120;
export const dynamic = 'force-dynamic';

interface ModelSaveRequest {
  url: string;
  outputDir: string;
  appKey?: string;
  contentType?: string;
  modelName?: string;
  metadata?: Record<string, unknown>;
}

function buildDatedPath(req: ModelSaveRequest): { folder: string; filename: string } {
  const now = new Date();
  const dateFolder = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const safeName = (req.modelName || `model_${now.getTime()}`).replace(/[^a-zA-Z0-9_-]/g, '_');

  if (req.appKey && req.contentType) {
    const folder = path.join(req.outputDir, req.appKey, req.contentType, dateFolder);
    return { folder, filename: safeName };
  }

  const folder = path.join(req.outputDir, 'models', dateFolder);
  return { folder, filename: safeName };
}

export async function POST(req: NextRequest) {
  let body: ModelSaveRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { url, outputDir } = body;
  if (!url || !outputDir) {
    return NextResponse.json({ error: 'Missing url or outputDir' }, { status: 400 });
  }

  const { folder, filename } = buildDatedPath(body);
  const resolvedFolder = path.resolve(folder);
  const glbPath = path.join(resolvedFolder, `${filename}.glb`);
  const metaPath = path.join(resolvedFolder, `${filename}.json`);

  if (!glbPath.startsWith(resolvedFolder)) {
    return NextResponse.json({ error: 'Path traversal detected' }, { status: 403 });
  }

  try {
    fs.mkdirSync(resolvedFolder, { recursive: true });

    const res = await fetch(url);
    if (!res.ok) {
      return NextResponse.json(
        { error: `Failed to download model: ${res.status} ${res.statusText}` },
        { status: 502 },
      );
    }

    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(glbPath, buf);

    const meta = {
      modelName: body.modelName || filename,
      appKey: body.appKey || undefined,
      contentType: body.contentType || undefined,
      sourceUrl: url,
      timestamp: new Date().toISOString(),
      sizeBytes: buf.length,
      ...(body.metadata ?? {}),
    };
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));

    return NextResponse.json({ ok: true, path: glbPath, folder: resolvedFolder, size: buf.length });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
