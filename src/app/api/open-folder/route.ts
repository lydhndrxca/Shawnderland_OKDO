import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { folderPath, action } = body as { folderPath?: string; action?: string };

    if (action === 'browse') {
      if (process.platform !== 'win32') {
        return NextResponse.json({
          message: 'Browse not supported on this platform. Set the path manually.',
          path: '',
        });
      }

      const token = `browse-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const tmpResult = path.join(os.tmpdir(), `shawnderland-browse-${token}.txt`);
      const ps1File = path.join(os.tmpdir(), `shawnderland-browse-${token}.ps1`);

      const ps1Content = [
        'Add-Type -AssemblyName System.Windows.Forms',
        '$owner = New-Object System.Windows.Forms.Form',
        '$owner.TopMost = $true',
        '$owner.Width = 1',
        '$owner.Height = 1',
        '$owner.StartPosition = [System.Windows.Forms.FormStartPosition]::Manual',
        '$owner.Location = New-Object System.Drawing.Point(-2000, -2000)',
        '$owner.ShowInTaskbar = $false',
        '$owner.Show()',
        '$owner.Hide()',
        '$fb = New-Object System.Windows.Forms.FolderBrowserDialog',
        "$fb.Description = 'Select output directory'",
        "if ($fb.ShowDialog($owner) -eq 'OK') {",
        `  [System.IO.File]::WriteAllText('${tmpResult.replace(/'/g, "''")}', $fb.SelectedPath)`,
        '} else {',
        `  [System.IO.File]::WriteAllText('${tmpResult.replace(/'/g, "''")}', '')`,
        '}',
        '$owner.Close()',
      ].join('\n');

      fs.writeFileSync(ps1File, ps1Content, 'utf8');

      // Use exec (inherits desktop session) with -STA for WinForms
      exec(
        `powershell -NoProfile -STA -ExecutionPolicy Bypass -File "${ps1File}"`,
        { timeout: 120000 },
        () => {
          // Cleanup the .ps1 file after the dialog closes
          try { fs.unlinkSync(ps1File); } catch { /* ignore */ }
        },
      );

      return NextResponse.json({ token, tmpFile: tmpResult });
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

export async function GET(req: NextRequest) {
  const tmpFile = req.nextUrl.searchParams.get('tmpFile');
  if (!tmpFile) {
    return NextResponse.json({ error: 'tmpFile param required' }, { status: 400 });
  }

  try {
    if (!fs.existsSync(tmpFile)) {
      return NextResponse.json({ done: false });
    }
    const selected = fs.readFileSync(tmpFile, 'utf8').trim();
    fs.unlinkSync(tmpFile);
    return NextResponse.json({ done: true, path: selected });
  } catch {
    return NextResponse.json({ done: false });
  }
}
