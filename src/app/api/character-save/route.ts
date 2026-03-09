import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DEFAULT_OUTPUT_DIR = process.env.CHARACTER_OUTPUT_DIR || path.join(process.cwd(), 'character-output');

interface SaveRequest {
  base64: string;
  mimeType?: string;
  metadata?: Record<string, unknown>;
  charName?: string;
  viewName?: string;
  outputDir?: string;
  appKey?: string;
  contentType?: string;
}

function buildPath(req: SaveRequest): { folder: string; filename: string } {
  const baseDir = req.outputDir || DEFAULT_OUTPUT_DIR;
  const now = new Date();
  const dateFolder = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const safeView = (req.viewName || 'main').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeName = (req.charName || 'untitled').replace(/[^a-zA-Z0-9_-]/g, '_');

  if (req.appKey && req.contentType) {
    const folder = path.join(baseDir, req.appKey, req.contentType, safeName, dateFolder);
    return { folder, filename: safeView };
  }

  if (req.appKey === 'generated-images' || (!req.appKey && !req.charName)) {
    const folder = path.join(baseDir, 'generated-images', dateFolder);
    return { folder, filename: `image_${now.getTime()}` };
  }

  const folder = path.join(baseDir, safeName, dateFolder);
  return { folder, filename: safeView };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as SaveRequest;

    if (!body.base64) {
      return NextResponse.json({ error: 'base64 is required' }, { status: 400 });
    }

    const { folder, filename } = buildPath(body);
    fs.mkdirSync(folder, { recursive: true });

    const safeView = (body.viewName || 'main').replace(/[^a-zA-Z0-9_-]/g, '_');
    const existingFiles = fs.readdirSync(folder).filter(
      (f) => f.includes(`_${safeView}`) && f.endsWith('.png'),
    );
    if (existingFiles.length > 0) {
      const prevDir = path.join(folder, 'Previous Versions');
      fs.mkdirSync(prevDir, { recursive: true });
      for (const existing of existingFiles) {
        const src = path.join(folder, existing);
        const dst = path.join(prevDir, existing);
        fs.renameSync(src, dst);
        const jsonSrc = src.replace('.png', '.json');
        if (fs.existsSync(jsonSrc)) {
          fs.renameSync(jsonSrc, path.join(prevDir, existing.replace('.png', '.json')));
        }
      }
    }

    const imgBuffer = Buffer.from(body.base64, 'base64');
    const imgPath = path.join(folder, `${filename}.png`);
    fs.writeFileSync(imgPath, imgBuffer);

    const metaPath = path.join(folder, `${filename}.json`);
    const fullMeta = {
      charName: body.charName || undefined,
      viewName: safeView,
      appKey: body.appKey || undefined,
      contentType: body.contentType || undefined,
      timestamp: new Date().toISOString(),
      ...(body.metadata ?? {}),
    };
    fs.writeFileSync(metaPath, JSON.stringify(fullMeta, null, 2));

    return NextResponse.json({
      message: 'Saved',
      path: imgPath,
      folder,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
