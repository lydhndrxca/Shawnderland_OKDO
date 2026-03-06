import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DEFAULT_OUTPUT_DIR = process.env.CHARACTER_OUTPUT_DIR || path.join(process.cwd(), 'character-output');

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { base64, metadata, charName, viewName, outputDir } = body as {
      base64: string;
      metadata: Record<string, unknown>;
      charName: string;
      viewName: string;
      outputDir?: string;
    };

    if (!base64 || !charName) {
      return NextResponse.json({ error: 'base64 and charName are required' }, { status: 400 });
    }

    const baseDir = outputDir || DEFAULT_OUTPUT_DIR;
    const now = new Date();
    const dateFolder = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const charFolder = path.join(baseDir, charName.replace(/[^a-zA-Z0-9_-]/g, '_'), dateFolder);
    fs.mkdirSync(charFolder, { recursive: true });

    const prevDir = path.join(charFolder, 'Previous Versions');
    const timestamp = now.getTime();
    const safeView = (viewName || 'main').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `auto_${timestamp}_${safeView}`;

    const existingFiles = fs.readdirSync(charFolder).filter(
      (f) => f.includes(`_${safeView}`) && f.endsWith('.png'),
    );
    if (existingFiles.length > 0) {
      fs.mkdirSync(prevDir, { recursive: true });
      for (const existing of existingFiles) {
        const src = path.join(charFolder, existing);
        const dst = path.join(prevDir, existing);
        fs.renameSync(src, dst);
        const jsonSrc = src.replace('.png', '.json');
        if (fs.existsSync(jsonSrc)) {
          fs.renameSync(jsonSrc, path.join(prevDir, existing.replace('.png', '.json')));
        }
      }
    }

    const imgBuffer = Buffer.from(base64, 'base64');
    const imgPath = path.join(charFolder, `${filename}.png`);
    fs.writeFileSync(imgPath, imgBuffer);

    const metaPath = path.join(charFolder, `${filename}.json`);
    const fullMeta = {
      charName,
      viewName: safeView,
      timestamp: now.toISOString(),
      ...metadata,
    };
    fs.writeFileSync(metaPath, JSON.stringify(fullMeta, null, 2));

    return NextResponse.json({
      message: 'Saved',
      path: imgPath,
      folder: charFolder,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
