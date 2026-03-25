/**
 * Kills any existing Next.js dev servers for this project before starting a new one.
 * Prevents duplicate servers from stacking up on ports 3000-3009.
 *
 * Runs automatically via `npm run dev`.
 */

const { execSync } = require('child_process');
const path = require('path');

const PROJECT_DIR = path.resolve(__dirname, '..').toLowerCase().replace(/\//g, '\\');
const MY_PID = process.pid;
const PARENT_PID = process.ppid;

function killStaleDev() {
  if (process.platform !== 'win32') {
    // Unix: find node processes with "next dev" in cwd
    try {
      const out = execSync(
        `lsof -i :3000-3009 -t 2>/dev/null || true`,
        { encoding: 'utf8' },
      ).trim();
      if (!out) return;
      const pids = out.split('\n').map(Number).filter((p) => p && p !== MY_PID && p !== PARENT_PID);
      for (const pid of pids) {
        try { process.kill(pid, 'SIGTERM'); } catch { /* already gone */ }
      }
      if (pids.length) console.log(`[kill-stale-dev] Killed ${pids.length} stale process(es)`);
    } catch { /* no lsof or nothing listening */ }
    return;
  }

  // Windows: use netstat to find listeners on dev ports, then check if they're node.exe
  try {
    const netstat = execSync('netstat -ano', { encoding: 'utf8' });
    const pids = new Set();

    for (const line of netstat.split('\n')) {
      const match = line.match(/TCP\s+\S+:30[0-9]{2}\s+\S+\s+LISTENING\s+(\d+)/);
      if (!match) continue;
      const pid = parseInt(match[1], 10);
      if (!pid || pid === MY_PID || pid === PARENT_PID) continue;
      pids.add(pid);
    }

    if (pids.size === 0) return;

    // Check each PID — only kill node.exe processes from our project
    let killed = 0;
    for (const pid of pids) {
      try {
        const info = execSync(
          `wmic process where "ProcessId=${pid}" get CommandLine,ExecutablePath /format:list 2>nul`,
          { encoding: 'utf8' },
        );
        const isNode = /node(\.exe)?/i.test(info);
        const isOurProject = info.toLowerCase().replace(/\//g, '\\').includes(PROJECT_DIR);
        if (isNode && isOurProject) {
          execSync(`taskkill /F /T /PID ${pid} 2>nul`, { encoding: 'utf8' });
          killed++;
        }
      } catch { /* process already gone or access denied */ }
    }

    if (killed) console.log(`[kill-stale-dev] Killed ${killed} stale dev server(s)`);
  } catch { /* netstat not available */ }
}

killStaleDev();
