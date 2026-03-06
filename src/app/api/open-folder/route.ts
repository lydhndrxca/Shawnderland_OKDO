import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { folderPath, action } = body as { folderPath?: string; action?: string };

    if (action === 'browse') {
      return NextResponse.json({
        message: 'Browse not supported server-side. Set the path manually.',
        path: '',
      });
    }

    if (!folderPath) {
      return NextResponse.json({ error: 'folderPath is required' }, { status: 400 });
    }

    const resolved = path.resolve(folderPath);

    const isWindows = process.platform === 'win32';
    const cmd = isWindows ? `explorer "${resolved}"` : `open "${resolved}"`;

    exec(cmd, (err) => {
      if (err) console.error('Failed to open folder:', err.message);
    });

    return NextResponse.json({ message: `Opening ${resolved}` });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
