import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';

export const maxDuration = 120;
export const dynamic = 'force-dynamic';

const WATCHER_SCRIPT = path.join(process.cwd(), 'scripts', 'ue5', 'okdo_import_watcher.py');
const STAGING_SUBDIR = 'Saved/StagedImports';

interface TextureUrls {
  base_color?: string;
  metallic?: string;
  normal?: string;
  roughness?: string;
}

function sanitizeName(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') || 'model';
}

async function downloadFile(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed (${res.status}): ${url.slice(0, 120)}`);
  return Buffer.from(await res.arrayBuffer());
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const action = body.action as string;

  /* ── Test connection (lightweight ping) ──────────────────────── */

  if (action === 'test-connection') {
    try {
      const res = await fetch('http://localhost:30010/remote/info', {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      });
      if (res.ok) {
        return NextResponse.json({ ok: true, message: 'UE5 Remote Control API is reachable.' });
      }
      return NextResponse.json({ error: `UE5 responded with ${res.status}` }, { status: 502 });
    } catch {
      return NextResponse.json(
        { error: 'Cannot reach UE5 at localhost:30010. Ensure UE5 is open and the Web Remote Control plugin is enabled.' },
        { status: 502 },
      );
    }
  }

  /* ── Setup: install watcher script into UE5 project ──────────── */

  if (action === 'setup') {
    const projectPath = body.projectPath as string;
    if (!projectPath) {
      return NextResponse.json({ error: 'Missing projectPath' }, { status: 400 });
    }

    try {
      if (!fs.existsSync(WATCHER_SCRIPT)) {
        return NextResponse.json({ error: `Watcher script not found at ${WATCHER_SCRIPT}` }, { status: 500 });
      }

      const pythonDir = path.join(path.resolve(projectPath), 'Content', 'Python');
      if (!fs.existsSync(pythonDir)) {
        fs.mkdirSync(pythonDir, { recursive: true });
      }

      const watcherContent = fs.readFileSync(WATCHER_SCRIPT, 'utf-8');
      const initPath = path.join(pythonDir, 'init_unreal.py');

      if (fs.existsSync(initPath)) {
        const existing = fs.readFileSync(initPath, 'utf-8');
        if (existing.includes('okdo_import_watcher')) {
          return NextResponse.json({ ok: true, message: 'OKDO watcher is already installed. Restart UE5 to activate.' });
        }
        const watcherModulePath = path.join(pythonDir, 'okdo_import_watcher.py');
        fs.writeFileSync(watcherModulePath, watcherContent);
        fs.appendFileSync(initPath, '\n\n# OKDO Auto-Import Watcher\nimport okdo_import_watcher\n');
        return NextResponse.json({
          ok: true,
          message: `Installed watcher module and appended import to existing init_unreal.py. Restart UE5 to activate.`,
          path: watcherModulePath,
        });
      }

      fs.writeFileSync(initPath, watcherContent);
      return NextResponse.json({
        ok: true,
        message: 'Installed init_unreal.py. Restart UE5 to activate the auto-import watcher.',
        path: initPath,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  /* ── Import: stage model + textures + manifest ───────────────── */

  if (action === 'import') {
    const url = body.url as string | undefined;
    const glb = body.glb as string | undefined;
    const rawName = body.assetName as string || body.filename as string || 'model';
    const projectPath = body.projectPath as string;
    const destFolder = (body.destFolder as string) || '/Game/OKDO';
    const textureUrls = (body.textureUrls ?? {}) as TextureUrls;

    if (!projectPath) {
      return NextResponse.json({ error: 'Missing projectPath' }, { status: 400 });
    }
    if (!url && !glb) {
      return NextResponse.json({ error: 'Provide either url or glb (base64)' }, { status: 400 });
    }

    const assetName = sanitizeName(
      rawName === 'model'
        ? `model_${new Date().toISOString().slice(5, 16).replace(/[-T:]/g, '')}`
        : rawName,
    );

    const assetDir = path.join(path.resolve(projectPath), STAGING_SUBDIR, assetName);

    try {
      if (!fs.existsSync(assetDir)) {
        fs.mkdirSync(assetDir, { recursive: true });
      }

      // ── Download / decode mesh ────────────────────────────────
      const meshFilename = `${assetName}.glb`;
      let meshBuf: Buffer;
      if (glb) {
        meshBuf = Buffer.from(glb, 'base64');
      } else {
        meshBuf = await downloadFile(url!);
      }
      fs.writeFileSync(path.join(assetDir, meshFilename), meshBuf);

      // ── Download PBR textures ─────────────────────────────────
      const texManifest: Record<string, string> = {};
      const texResults: string[] = [];

      const texEntries = Object.entries(textureUrls).filter(
        (e): e is [string, string] => typeof e[1] === 'string' && e[1].length > 0,
      );

      await Promise.allSettled(
        texEntries.map(async ([channel, texUrl]) => {
          const suffix = channel === 'base_color' ? 'BaseColor'
            : channel === 'normal' ? 'Normal'
            : channel === 'metallic' ? 'Metallic'
            : channel === 'roughness' ? 'Roughness'
            : channel;
          const ext = texUrl.split('.').pop()?.split('?')[0] ?? 'png';
          const texFilename = `T_${assetName}_${suffix}.${ext}`;
          try {
            const buf = await downloadFile(texUrl);
            fs.writeFileSync(path.join(assetDir, texFilename), buf);
            texManifest[channel] = texFilename;
            texResults.push(`${channel}: ok`);
          } catch (e) {
            texResults.push(`${channel}: ${e instanceof Error ? e.message : 'failed'}`);
          }
        }),
      );

      // ── Write manifest ────────────────────────────────────────
      const manifest = {
        name: assetName,
        mesh: meshFilename,
        textures: texManifest,
        destFolder,
      };
      fs.writeFileSync(
        path.join(assetDir, 'manifest.json'),
        JSON.stringify(manifest, null, 2),
      );

      const texCount = Object.keys(texManifest).length;
      return NextResponse.json({
        ok: true,
        staged: true,
        assetName,
        path: assetDir,
        meshSize: meshBuf.length,
        texturesStaged: texCount,
        message: `Staged ${assetName} (mesh + ${texCount} textures). The UE5 watcher will auto-import.`,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json({ error: msg }, { status: 500 });
    }
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
}
