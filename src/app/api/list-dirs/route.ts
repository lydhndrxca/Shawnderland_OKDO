import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

function getWindowsDrives(): string[] {
  try {
    const raw = execSync('wmic logicaldisk get name', {
      encoding: 'utf8',
      timeout: 3000,
      windowsHide: true,
    });
    return raw
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => /^[A-Z]:$/.test(l))
      .map((l) => `${l}\\`);
  } catch {
    return ['C:\\'];
  }
}

export async function GET(req: NextRequest) {
  try {
    const dirPath = req.nextUrl.searchParams.get('path') || '';
    const homeDir = os.homedir();

    if (!dirPath) {
      const drives =
        process.platform === 'win32' ? getWindowsDrives() : ['/'];

      return NextResponse.json({
        current: '',
        parent: null,
        home: homeDir,
        dirs: drives.map((d) => ({ name: d, path: d })),
      });
    }

    const resolved = path.resolve(dirPath);
    if (!fs.existsSync(resolved)) {
      return NextResponse.json({ error: 'Directory not found' }, { status: 404 });
    }

    const stat = fs.statSync(resolved);
    if (!stat.isDirectory()) {
      return NextResponse.json({ error: 'Not a directory' }, { status: 400 });
    }

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(resolved, { withFileTypes: true });
    } catch {
      return NextResponse.json({ error: 'Cannot read directory (access denied)' }, { status: 403 });
    }

    const dirs = entries
      .filter((e) => {
        try { return e.isDirectory(); } catch { return false; }
      })
      .filter((e) => !e.name.startsWith('.') && e.name !== 'node_modules' && e.name !== '$RECYCLE.BIN' && e.name !== 'System Volume Information')
      .map((e) => ({
        name: e.name,
        path: path.join(resolved, e.name),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

    const parent = path.dirname(resolved);
    const isRoot = parent === resolved;

    return NextResponse.json({
      current: resolved,
      parent: isRoot ? null : parent,
      home: homeDir,
      dirs,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
