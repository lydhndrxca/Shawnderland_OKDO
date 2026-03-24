import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { writeFile, readFile, unlink, mkdir, stat } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';

const SCRIPTS_DIR = join(process.cwd(), 'scripts', 'blender');

async function resolveBlenderExe(raw: string): Promise<string> {
  if (!raw) return '';
  if (/blender(\.exe)?$/i.test(raw)) return raw;
  const withExe = join(raw, 'blender.exe');
  try {
    const s = await stat(withExe);
    if (s.isFile()) return withExe;
  } catch { /* not found */ }
  const bare = join(raw, 'blender');
  try {
    const s = await stat(bare);
    if (s.isFile()) return bare;
  } catch { /* not found */ }
  return raw;
}

function getBlenderPathRaw(req: NextRequest): string {
  return (
    req.headers.get('x-blender-path') ||
    process.env.BLENDER_PATH ||
    ''
  );
}

function runBlender(
  blenderPath: string,
  scriptPath: string,
  argsJson: string,
): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve, reject) => {
    const proc = spawn(blenderPath, [
      '--background',
      '--python', scriptPath,
      '--', argsJson,
    ], { timeout: 120_000 });

    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d: Buffer) => { stdout += d.toString(); });
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });
    proc.on('close', (code) => resolve({ stdout, stderr, code: code ?? 1 }));
    proc.on('error', reject);
  });
}

export async function POST(req: NextRequest) {
  const blenderPath = await resolveBlenderExe(getBlenderPathRaw(req));
  if (!blenderPath) {
    return NextResponse.json(
      { error: 'Blender path not configured. Set it in Settings or BLENDER_PATH env var.' },
      { status: 400 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const op = body.operation as string;
  if (!['scale', 'collision', 'scale-surface'].includes(op)) {
    return NextResponse.json({ error: `Unknown operation: ${op}` }, { status: 400 });
  }

  const glbBase64 = body.glb as string;
  if (!glbBase64) {
    return NextResponse.json({ error: 'Missing glb field (base64)' }, { status: 400 });
  }

  const sessionId = randomUUID();
  const tmpDir = join(tmpdir(), 'shawnderland-blender', sessionId);
  const inputPath = join(tmpDir, 'input.glb');
  const outputPath = join(tmpDir, 'output.glb');

  try {
    await mkdir(tmpDir, { recursive: true });
    const inputBuf = Buffer.from(glbBase64, 'base64');
    await writeFile(inputPath, inputBuf);

    const scriptMap: Record<string, string> = {
      'scale': 'scale_model.py',
      'collision': 'gen_collision.py',
      'scale-surface': 'scale_surface.py',
    };
    const scriptPath = join(SCRIPTS_DIR, scriptMap[op]);

    const args: Record<string, unknown> = {
      input: inputPath,
      output: outputPath,
    };

    if (op === 'scale') {
      args.targetHeight = body.targetHeight;
      args.targetWidth = body.targetWidth;
      args.targetDepth = body.targetDepth;
    } else if (op === 'scale-surface') {
      args.faceIndices = body.faceIndices;
      args.targetHeight = body.targetHeight;
    }

    const { stderr, code } = await runBlender(blenderPath, scriptPath, JSON.stringify(args));

    if (code !== 0) {
      return NextResponse.json(
        { error: `Blender exited with code ${code}`, details: stderr.slice(-500) },
        { status: 500 },
      );
    }

    const outBuf = await readFile(outputPath);
    const outBase64 = outBuf.toString('base64');

    return NextResponse.json({ glb: outBase64 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  } finally {
    // Cleanup temp files
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});
    const { rmdir } = await import('fs/promises');
    await rmdir(tmpDir).catch(() => {});
  }
}
