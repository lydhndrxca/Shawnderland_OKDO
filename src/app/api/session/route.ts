import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SESSIONS_DIR = process.env.SESSIONS_DIR || path.join(process.cwd(), 'saved-sessions');

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\- ]/g, '_').trim() || 'untitled';
}

function sessionPath(name: string): string {
  return path.join(SESSIONS_DIR, `${safeName(name)}.json`);
}

/**
 * GET /api/session  — list all saved sessions
 * GET /api/session?name=foo — load a specific session
 */
export async function GET(req: NextRequest) {
  try {
    ensureDir(SESSIONS_DIR);
    const name = req.nextUrl.searchParams.get('name');

    if (name) {
      const fp = sessionPath(name);
      if (!fs.existsSync(fp)) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }
      const raw = fs.readFileSync(fp, 'utf-8');
      const data = JSON.parse(raw);
      return NextResponse.json(data);
    }

    // List all sessions
    const files = fs.readdirSync(SESSIONS_DIR).filter((f) => f.endsWith('.json'));
    const sessions = files.map((f) => {
      const stat = fs.statSync(path.join(SESSIONS_DIR, f));
      return {
        name: f.replace(/\.json$/, ''),
        savedAt: stat.mtime.toISOString(),
        sizeBytes: stat.size,
      };
    });
    sessions.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
    return NextResponse.json({ sessions });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

/**
 * POST /api/session  — save a session
 * Body: { name: string, snapshot: object }
 * Uses raw text parsing to avoid Next.js default body size limit (1MB).
 */
export async function POST(req: NextRequest) {
  try {
    ensureDir(SESSIONS_DIR);

    const rawText = await req.text();
    const body = JSON.parse(rawText);
    const { name, snapshot } = body as { name: string; snapshot: unknown };
    if (!name || !snapshot) {
      return NextResponse.json({ error: 'name and snapshot are required' }, { status: 400 });
    }

    const fp = sessionPath(name);
    const payload = {
      name: safeName(name),
      savedAt: new Date().toISOString(),
      snapshot,
    };

    const jsonStr = JSON.stringify(payload);
    fs.writeFileSync(fp, jsonStr, 'utf-8');
    const sizeMB = (jsonStr.length / (1024 * 1024)).toFixed(2);
    console.log(`[session] Saved "${name}" → ${fp} (${sizeMB} MB)`);
    return NextResponse.json({ ok: true, path: fp, sizeBytes: jsonStr.length });
  } catch (e) {
    console.error('[session] Save error:', e);
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

/**
 * DELETE /api/session?name=foo — delete a session
 */
export async function DELETE(req: NextRequest) {
  try {
    const name = req.nextUrl.searchParams.get('name');
    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    const fp = sessionPath(name);
    if (fs.existsSync(fp)) {
      fs.unlinkSync(fp);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
