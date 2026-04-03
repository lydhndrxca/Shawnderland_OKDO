const { app, BrowserWindow, shell } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

const PORT = 3000;
const DEV = process.argv.includes('--dev');
const PROJECT_ROOT = path.join(__dirname, '..');
let serverProcess = null;
let mainWindow = null;
let splashWindow = null;

/* ── Splash Screen ─────────────────────────────────── */

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 420,
    height: 360,
    frame: false,
    transparent: false,
    resizable: false,
    backgroundColor: '#0a0a0f',
    title: 'PUBG Madison AI Suite',
    center: true,
    show: true,
    alwaysOnTop: true,
    skipTaskbar: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  splashWindow.loadFile(path.join(__dirname, 'splash.html'));

  splashWindow.on('closed', () => {
    splashWindow = null;
  });
}

/* ── Next.js Server ────────────────────────────────── */

function startNextServer() {
  const cmd = DEV ? 'npx next dev' : 'npx next start';
  const fullCmd = `${cmd} -p ${PORT}`;

  serverProcess = spawn(fullCmd, [], {
    cwd: PROJECT_ROOT,
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'pipe',
    shell: true,
  });

  serverProcess.stdout?.on('data', (d) => process.stdout.write(d));
  serverProcess.stderr?.on('data', (d) => process.stderr.write(d));
  serverProcess.on('error', (err) => console.error('Server process error:', err));
  serverProcess.on('exit', (code) => {
    console.log(`Next.js server exited with code ${code}`);
    serverProcess = null;
  });
}

function waitForServer(retries = 120) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const check = () => {
      const req = http.get(`http://127.0.0.1:${PORT}`, (res) => {
        res.resume();
        resolve();
      });
      req.on('error', () => {
        attempts++;
        if (attempts % 10 === 0) {
          console.log(`[splash] Waiting for server... attempt ${attempts}/${retries}`);
        }
        if (attempts >= retries) {
          reject(new Error(`Server did not start after ${retries} attempts (${retries / 2}s)`));
        } else {
          setTimeout(check, 500);
        }
      });
      req.setTimeout(2000, () => { req.destroy(); });
    };
    check();
  });
}

/* ── Main Window ───────────────────────────────────── */

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 1024,
    minHeight: 700,
    title: 'PUBG Madison AI Suite',
    backgroundColor: '#0a0a0f',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false,
  });

  mainWindow.loadURL(`http://127.0.0.1:${PORT}`);

  mainWindow.once('ready-to-show', () => {
    if (splashWindow) {
      splashWindow.webContents.postMessage('server-ready', null);
      setTimeout(() => {
        mainWindow.show();
        if (splashWindow && !splashWindow.isDestroyed()) {
          splashWindow.close();
        }
      }, 600);
    } else {
      mainWindow.show();
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://127.0.0.1') || url.startsWith('http://localhost')) {
      return { action: 'allow' };
    }
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/* ── Server cleanup ────────────────────────────────── */

function killServer() {
  if (serverProcess) {
    try {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', String(serverProcess.pid), '/f', '/t'], { shell: true });
      } else {
        serverProcess.kill('SIGTERM');
      }
    } catch { /* already dead */ }
    serverProcess = null;
  }
}

/* ── App lifecycle ─────────────────────────────────── */

app.whenReady().then(async () => {
  createSplashWindow();
  startNextServer();

  try {
    await waitForServer();
  } catch (err) {
    console.error(err.message);
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
    }
    app.quit();
    return;
  }

  createWindow();
});

app.on('window-all-closed', () => {
  killServer();
  app.quit();
});

app.on('before-quit', () => {
  killServer();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0 && serverProcess) {
    createWindow();
  }
});
