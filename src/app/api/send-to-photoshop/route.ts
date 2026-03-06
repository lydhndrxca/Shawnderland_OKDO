import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import os from 'os';

const PS_PATHS = [
  'C:\\Program Files\\Adobe\\Adobe Photoshop 2024\\Photoshop.exe',
  'C:\\Program Files\\Adobe\\Adobe Photoshop 2025\\Photoshop.exe',
  'C:\\Program Files\\Adobe\\Adobe Photoshop 2026\\Photoshop.exe',
  'C:\\Program Files\\Adobe\\Adobe Photoshop CC 2024\\Photoshop.exe',
  'C:\\Program Files (x86)\\Adobe\\Adobe Photoshop 2024\\Photoshop.exe',
];

function findPhotoshop(): string | null {
  for (const p of PS_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { base64, mimeType, label } = body as {
      base64: string;
      mimeType: string;
      label: string;
    };

    if (!base64) {
      return NextResponse.json({ error: 'base64 is required' }, { status: 400 });
    }

    const tmpDir = path.join(os.tmpdir(), 'shawnderland-ps');
    fs.mkdirSync(tmpDir, { recursive: true });

    const ext = mimeType?.includes('jpeg') ? '.jpg' : '.png';
    const tmpFile = path.join(tmpDir, `char_${label || 'image'}_${Date.now()}${ext}`);
    fs.writeFileSync(tmpFile, Buffer.from(base64, 'base64'));

    const psExe = findPhotoshop();
    if (!psExe) {
      return NextResponse.json(
        { error: 'Photoshop not found. Install Adobe Photoshop or update PS_PATHS.' },
        { status: 404 },
      );
    }

    exec(`"${psExe}" "${tmpFile}"`, (err) => {
      if (err) console.error('Failed to open Photoshop:', err.message);
    });

    return NextResponse.json({ message: `Sent ${label || 'image'} to Photoshop` });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
