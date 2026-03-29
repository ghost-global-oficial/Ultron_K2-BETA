const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { fork } = require('child_process');

// Handle external URL opening (for OAuth)
ipcMain.on('open-external-url', (event, url) => {
  console.log('[Electron] Opening external URL:', url);
  shell.openExternal(url);
});

// ─── ULTRON PC Bridge (WebSocket porta 3002) ──────────────────────────────────
let bridgeProcess: any = null;

function startBridge() {
  // Caminho para bridge.cjs — funciona em dev e em prod (asar)
  const bridgePath = path.join(__dirname, '../../bridge.cjs');
  try {
    bridgeProcess = fork(bridgePath, [], {
      silent: false, // herda stdout/stderr do processo pai
      env: { ...process.env },
    });
    bridgeProcess.on('message', (msg: any) => {
      if (msg?.type === 'ready') console.log(`[Main] Bridge ready on port ${msg.port}`);
      if (msg?.type === 'already-running') console.log(`[Main] Bridge already running on port ${msg.port}`);
    });
    bridgeProcess.on('exit', (code: number) => {
      console.log(`[Main] Bridge exited with code ${code}`);
      bridgeProcess = null;
    });
    bridgeProcess.on('error', (e: Error) => console.error('[Main] Bridge error:', e.message));
  } catch (e: any) {
    console.error('[Main] Failed to start bridge:', e.message);
  }
}

app.on('will-quit', () => {
  if (bridgeProcess) { bridgeProcess.kill(); bridgeProcess = null; }
});

let mainWindow: any = null;

const isDev = process.env.NODE_ENV !== 'production';
const PORT = 3000;

async function startExpressServer() {
  try {
    const express = require('express');
    const server = express();
    server.use(express.json());

    // Computer Use endpoint — runs in the Electron main process
    // which has full desktop access via nut-js
    server.post('/api/computer-use', async (req: any, res: any) => {
      const { action } = req.body;
      if (!action || !action.type) {
        return res.status(400).json({ success: false, error: 'Missing action.type' });
      }
      try {
        const { mouse, keyboard, Key, Button } = await import('@nut-tree-fork/nut-js');
        const start = Date.now();
        switch (action.type) {
          case 'move':
            await mouse.setPosition({ x: action.x, y: action.y });
            break;
          case 'click': {
            if (action.x !== undefined) await mouse.setPosition({ x: action.x, y: action.y });
            const btn = action.button === 'right' ? Button.RIGHT : Button.LEFT;
            if (action.double) await mouse.doubleClick(btn);
            else await mouse.click(btn);
            break;
          }
          case 'type':
            await keyboard.type(action.text);
            break;
          case 'key': {
            const keyVal = (Key as any)[action.key] ?? action.key;
            await keyboard.pressKey(keyVal);
            await keyboard.releaseKey(keyVal);
            break;
          }
          case 'scroll':
            if (action.direction === 'down') await mouse.scrollDown(action.amount ?? 3);
            else await mouse.scrollUp(action.amount ?? 3);
            break;
        }
        res.json({ success: true, durationMs: Date.now() - start });
      } catch (err: any) {
        res.status(500).json({ success: false, error: err?.message ?? String(err) });
      }
    });

    // Serve built frontend
    const distPath = path.join(__dirname, '../dist');
    server.use(require('express').static(distPath));
    server.get('*', (_req: any, res: any) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });

    await new Promise<void>((resolve) => server.listen(PORT, '127.0.0.1', resolve));
    console.log(`[Electron] Express server running on http://localhost:${PORT}`);
  } catch (err) {
    console.error('[Electron] Failed to start Express server:', err);
  }
}

// ── Computer Use sidecar server (port 3001) ───────────────────────────────────
// Runs in the Electron main process in BOTH dev and prod.
// The Vite dev server (server.ts, port 3000) proxies /api/computer-use here.
async function startComputerUseServer() {
  try {
    const express = require('express');
    const app = express();
    app.use(express.json());

    app.post('/api/computer-use', async (req: any, res: any) => {
      const { action } = req.body;
      if (!action || !action.type) {
        return res.status(400).json({ success: false, error: 'Missing action.type' });
      }
      try {
        const { mouse, keyboard, Key, Button } = await import('@nut-tree-fork/nut-js');
        const start = Date.now();
        console.log(`[CU-Server] Executing action: ${action.type}`, action);
        switch (action.type) {
          case 'move':
            await mouse.setPosition({ x: action.x, y: action.y });
            break;
          case 'click': {
            if (action.x !== undefined) await mouse.setPosition({ x: action.x, y: action.y });
            const btn = action.button === 'right' ? Button.RIGHT : Button.LEFT;
            if (action.double) await mouse.doubleClick(btn);
            else await mouse.click(btn);
            break;
          }
          case 'type':
            await keyboard.type(action.text);
            break;
          case 'key': {
            const keyVal = (Key as any)[action.key] ?? action.key;
            await keyboard.pressKey(keyVal);
            await keyboard.releaseKey(keyVal);
            break;
          }
          case 'scroll':
            if (action.direction === 'down') await mouse.scrollDown(action.amount ?? 3);
            else await mouse.scrollUp(action.amount ?? 3);
            break;
        }
        const result = { success: true, durationMs: Date.now() - start };
        console.log(`[CU-Server] Action result:`, result);
        res.json(result);
      } catch (err: any) {
        console.error('[CU-Server] Error:', err);
        res.status(500).json({ success: false, error: err?.message ?? String(err) });
      }
    });

    // Health check so the dev server knows we're up
    app.get('/api/computer-use/health', (_req: any, res: any) => {
      res.json({ ok: true, pid: process.pid });
    });

    await new Promise<void>((resolve) => app.listen(3001, '127.0.0.1', resolve));
    console.log(`[CU-Server] Computer Use server running on http://localhost:3001 (pid: ${process.pid})`);
  } catch (err) {
    console.error('[CU-Server] Failed to start:', err);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    },
    icon: path.join(__dirname, '../assets/icon.png')
  });

  const loadApp = () => {
    if (isDev) {
      mainWindow?.loadURL(`http://localhost:${PORT}`);
      mainWindow?.webContents.openDevTools();
    } else {
      mainWindow?.loadURL(`http://localhost:${PORT}`);
    }
  };

  setTimeout(loadApp, 2000);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  // ── Iniciar o ULTRON PC Bridge (WebSocket porta 3002) ─────────────────────
  startBridge();

  // Start the Computer Use sidecar server on port 3001 (always, dev + prod)
  await startComputerUseServer();

  // In production, start the Express server to serve the frontend and handle API calls
  if (!isDev) {
    await startExpressServer();
  }

  createWindow();

  // Initialize computer use modules once and register IPC handlers
  try {
    const { CredentialStore } = await import('../src/computer-use/credential-store');
    const { InputController } = await import('../src/computer-use/input-controller');
    const { ScreenCapture } = await import('../src/computer-use/screen-capture');
    const { SessionManager } = await import('../src/computer-use/session-manager');
    const { registerComputerUseHandlers } = await import('../src/computer-use/ipc-bridge');

    const credStore = new CredentialStore();
    const inputController = new InputController();
    const screenCapture = new ScreenCapture();
    const sessionManager = new SessionManager(credStore);

    // Sync enabled state from config
    const enabled = credStore.getConfig('cu_enabled') === 'true';
    inputController.setEnabled(enabled);

    // ── Register a direct IPC handler for computer actions ──────────────────
    // This is used by the renderer in BOTH dev and prod via ipcRenderer.invoke.
    // It runs in the main process which has full desktop access via nut-js.

    // DPI scale helper — nut-js usa coordenadas lógicas, capturas são físicas
    let _dpiScale: number | null = null;
    const getDpiScale = async (): Promise<number> => {
      if (_dpiScale !== null) return _dpiScale;
      try {
        const { screen: nutScreen } = await import('@nut-tree-fork/nut-js');
        const logicalW = await nutScreen.width();
        const { execSync } = await import('child_process');
        const out = execSync('powershell -command "Get-WmiObject Win32_VideoController | Select-Object -First 1 -ExpandProperty CurrentHorizontalResolution"', { timeout: 3000 }).toString().trim();
        const physicalW = parseInt(out, 10);
        _dpiScale = (physicalW && logicalW && physicalW !== logicalW) ? physicalW / logicalW : 1;
        console.log(`[Main] DPI scale: ${_dpiScale}`);
      } catch { _dpiScale = 1; }
      return _dpiScale;
    };
    const toLogical = async (x: number, y: number) => {
      const s = await getDpiScale();
      return s === 1 ? { x, y } : { x: Math.round(x / s), y: Math.round(y / s) };
    };

    ipcMain.handle('cu:execute-action-direct', async (_event, { action }: { action: any }) => {
      try {
        const { mouse, keyboard, Key, Button } = await import('@nut-tree-fork/nut-js');
        const start = Date.now();
        switch (action.type) {
          case 'move': {
            const pos = await toLogical(action.x, action.y);
            await mouse.setPosition(pos);
            break;
          }
          case 'click': {
            if (action.x !== undefined) {
              const pos = await toLogical(action.x, action.y);
              await mouse.setPosition(pos);
            }
            const btn = action.button === 'right' ? Button.RIGHT : Button.LEFT;
            if (action.double) await mouse.doubleClick(btn);
            else await mouse.click(btn);
            break;
          }
          case 'type':
            await keyboard.type(action.text);
            break;
          case 'key': {
            const keyVal = (Key as any)[action.key] ?? action.key;
            await keyboard.pressKey(keyVal);
            await keyboard.releaseKey(keyVal);
            break;
          }
          case 'scroll':
            if (action.direction === 'down') await mouse.scrollDown(action.amount ?? 3);
            else await mouse.scrollUp(action.amount ?? 3);
            break;
        }
        return { success: true, durationMs: Date.now() - start };
      } catch (err: any) {
        console.error('[Electron] cu:execute-action-direct error:', err);
        return { success: false, error: err?.message ?? String(err), durationMs: 0 };
      }
    });

    // Wait for the main window to finish loading before wiring webContents
    mainWindow.webContents.once('did-finish-load', () => {
      registerComputerUseHandlers(ipcMain, {
        credStore,
        inputController,
        screenCapture,
        sessionManager,
        webContents: mainWindow.webContents,
      });
    });
  } catch (err) {
    console.error('[Computer Use] Failed to initialize:', err);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
