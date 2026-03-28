/**
 * ULTRON PC Bridge
 * ─────────────────────────────────────────────────────────────────────────────
 * Subprograma autónomo que expõe um WebSocket na porta 3002.
 * O frontend conecta-se diretamente e envia ações de PC (rato, teclado).
 * Corre em TODOS os modos: electron:dev, npm run dev, e app instalada.
 *
 * Protocolo (JSON sobre WebSocket):
 *   → { id, action }          — executar ação
 *   ← { id, success, ... }    — resultado
 *   ← { type: 'ready' }       — bridge pronta
 */

'use strict';

const { WebSocketServer } = require('ws');
const http = require('http');

const BRIDGE_PORT = 3002;

// ─── nut-js lazy loader ───────────────────────────────────────────────────────
let nut = null;
async function getNut() {
  if (nut) return nut;
  try {
    nut = await import('@nut-tree-fork/nut-js');
    // Reduzir delay entre ações para maior velocidade
    nut.mouse.config.mouseSpeed = 2000;
    console.log('[Bridge] nut-js loaded OK');
  } catch (e) {
    console.error('[Bridge] nut-js failed to load:', e.message);
    nut = null;
  }
  return nut;
}

// ─── DPI scale factor ─────────────────────────────────────────────────────────
// nut-js usa coordenadas lógicas (sem DPI). No Windows com scaling > 100%,
// as coordenadas da captura de ecrã são físicas e precisam de ser convertidas.
let _dpiScale = null;
async function getDpiScale() {
  if (_dpiScale !== null) return _dpiScale;
  try {
    const n = await getNut();
    if (!n) { _dpiScale = 1; return 1; }
    // Resolução lógica reportada pelo nut-js
    const logicalW = await n.screen.width();
    // Resolução física via Windows WMI
    const { execSync } = require('child_process');
    const out = execSync('powershell -command "Get-WmiObject Win32_VideoController | Select-Object -First 1 -ExpandProperty CurrentHorizontalResolution"', { timeout: 3000 }).toString().trim();
    const physicalW = parseInt(out, 10);
    if (physicalW && logicalW && physicalW !== logicalW) {
      _dpiScale = physicalW / logicalW;
      console.log(`[Bridge] DPI scale detected: ${_dpiScale} (physical ${physicalW} / logical ${logicalW})`);
    } else {
      _dpiScale = 1;
    }
  } catch (e) {
    console.warn('[Bridge] Could not detect DPI scale, assuming 1:', e.message);
    _dpiScale = 1;
  }
  return _dpiScale;
}

// Converte coordenadas físicas (captura de ecrã) para lógicas (nut-js)
async function toLogical(x, y) {
  const scale = await getDpiScale();
  if (scale === 1) return { x, y };
  return { x: Math.round(x / scale), y: Math.round(y / scale) };
}

// ─── Executar ação ────────────────────────────────────────────────────────────
async function executeAction(action) {
  const n = await getNut();
  if (!n) throw new Error('nut-js not available on this system');

  const { mouse, keyboard, Key, Button, screen } = n;
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
      await keyboard.type(action.text ?? '');
      break;

    case 'key': {
      // Aliases para nomes comuns que diferem entre plataformas
      const KEY_ALIASES = {
        'Meta': 'LeftSuper',
        'Win': 'LeftSuper',
        'Windows': 'LeftSuper',
        'Super': 'LeftSuper',
        'Cmd': 'LeftSuper',
        'Command': 'LeftSuper',
        'Ctrl': 'LeftControl',
        'Control': 'LeftControl',
        'Alt': 'LeftAlt',
        'Option': 'LeftAlt',
        'Shift': 'LeftShift',
        'Enter': 'Return',
        'Esc': 'Escape',
        'Backspace': 'BackSpace',
        'Del': 'Delete',
        'ArrowUp': 'Up',
        'ArrowDown': 'Down',
        'ArrowLeft': 'Left',
        'ArrowRight': 'Right',
        'Space': 'Space',
        'Tab': 'Tab',
        'Home': 'Home',
        'End': 'End',
        'PageUp': 'PageUp',
        'PageDown': 'PageDown',
        'Insert': 'Insert',
      };

      console.log(`[Bridge] Key action received: "${action.key}"`);

      const resolveKey = (k) => {
        // Normalizar para capitalizado (primeira letra maiúscula)
        const normalized = k.charAt(0).toUpperCase() + k.slice(1).toLowerCase();
        const alias = KEY_ALIASES[normalized] ?? normalized;
        const resolved = Key[alias] ?? Key[alias.charAt(0).toUpperCase() + alias.slice(1)];
        console.log(`[Bridge] Key resolution: "${k}" → normalized: "${normalized}" → alias: "${alias}" → resolved: ${resolved !== undefined ? 'OK' : 'FAILED'}`);
        if (resolved === undefined) console.warn(`[Bridge] Unknown key: "${k}" (normalized: "${normalized}", alias: "${alias}")`);
        return resolved;
      };

      // Suporta combinações: "Control+c", "Meta", "Return", etc.
      const keys = String(action.key).split('+').map(resolveKey).filter(k => k !== undefined);
      if (keys.length === 0) throw new Error(`No valid keys found for: ${action.key}`);

      if (keys.length === 1) {
        await keyboard.pressKey(keys[0]);
        await keyboard.releaseKey(keys[0]);
      } else {
        for (const k of keys) await keyboard.pressKey(k);
        for (const k of [...keys].reverse()) await keyboard.releaseKey(k);
      }
      break;
    }

    case 'scroll':
      if (action.x !== undefined) {
        const pos = await toLogical(action.x, action.y);
        await mouse.setPosition(pos);
      }
      if (action.direction === 'up') await mouse.scrollUp(action.amount ?? 3);
      else await mouse.scrollDown(action.amount ?? 3);
      break;

    case 'http': {
      // Proxy HTTP para contornar CORS
      const https = require('https');
      const httpModule = require('http');
      
      return new Promise((resolve, reject) => {
        const url = new URL(action.url);
        const protocol = url.protocol === 'https:' ? https : httpModule;
        
        const options = {
          hostname: url.hostname,
          port: url.port || (url.protocol === 'https:' ? 443 : 80),
          path: url.pathname + url.search,
          method: action.method || 'GET',
          headers: action.headers || {}
        };

        const req = protocol.request(options, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              const json = JSON.parse(data);
              resolve({ success: true, status: res.statusCode, data: json, durationMs: Date.now() - start });
            } catch {
              resolve({ success: true, status: res.statusCode, data, durationMs: Date.now() - start });
            }
          });
        });

        req.on('error', (err) => {
          reject(new Error(`HTTP request failed: ${err.message}`));
        });

        if (action.body) {
          req.write(typeof action.body === 'string' ? action.body : JSON.stringify(action.body));
        }
        
        req.end();
      });
    }

    case 'screenshot': {
      console.log('[Bridge] Screenshot requested');
      const scale = await getDpiScale();
      const logicalW = await screen.width();
      const logicalH = await screen.height();
      const physicalW = Math.round(logicalW * scale);
      const physicalH = Math.round(logicalH * scale);
      console.log(`[Bridge] Screen dimensions: ${physicalW}x${physicalH} (scale: ${scale})`);

      // Capture actual screen image using PowerShell + .NET (Windows, no extra deps)
      const { execSync } = require('child_process');
      const os = require('os');
      const path = require('path');
      const fs = require('fs');
      
      try {
        const tmpFile = path.join(os.tmpdir(), `ultron_cap_${Date.now()}.png`);
        const psScriptFile = path.join(os.tmpdir(), `ultron_screenshot_${Date.now()}.ps1`);
        console.log('[Bridge] Temp file:', tmpFile);
        console.log('[Bridge] PS script file:', psScriptFile);

        // Criar script PowerShell em arquivo separado
        const psScript = `
Add-Type -AssemblyName System.Windows.Forms, System.Drawing
$screen = [System.Windows.Forms.Screen]::PrimaryScreen
$bounds = $screen.Bounds
$bitmap = New-Object System.Drawing.Bitmap($bounds.Width, $bounds.Height)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.CopyFromScreen($bounds.X, $bounds.Y, 0, 0, $bounds.Size)
$graphics.Dispose()
$bitmap.Save('${tmpFile.replace(/\\/g, '\\\\')}', [System.Drawing.Imaging.ImageFormat]::Png)
$bitmap.Dispose()
Write-Host "Screenshot saved to: ${tmpFile.replace(/\\/g, '\\\\')}"
`;

        // Salvar script em arquivo
        fs.writeFileSync(psScriptFile, psScript, 'utf8');
        console.log('[Bridge] PowerShell script saved');

        console.log('[Bridge] Executing PowerShell screenshot...');
        const output = execSync(`powershell -ExecutionPolicy Bypass -File "${psScriptFile}"`, {
          timeout: 8000,
          encoding: 'utf8'
        });
        console.log('[Bridge] PowerShell output:', output);

        // Limpar script temporário
        try { fs.unlinkSync(psScriptFile); } catch {}

        if (fs.existsSync(tmpFile)) {
          console.log('[Bridge] Screenshot file created successfully');
          const imgBuffer = fs.readFileSync(tmpFile);
          const fileSize = imgBuffer.length;
          console.log(`[Bridge] Screenshot file size: ${fileSize} bytes`);
          fs.unlinkSync(tmpFile);
          const base64 = imgBuffer.toString('base64');
          console.log(`[Bridge] Base64 length: ${base64.length} characters`);
          return {
            success: true,
            image: base64,
            width: physicalW,
            height: physicalH,
            logicalWidth: logicalW,
            logicalHeight: logicalH,
            dpiScale: scale,
            durationMs: Date.now() - start
          };
        } else {
          console.error('[Bridge] Screenshot file was not created at:', tmpFile);
        }
      } catch (capErr) {
        console.error('[Bridge] Screenshot capture failed:', capErr);
        console.error('[Bridge] Error details:', {
          message: capErr.message,
          code: capErr.code,
          stderr: capErr.stderr?.toString(),
          stdout: capErr.stdout?.toString()
        });
        
        // Fallback: return dimensions only (no image)
        return {
          success: true,
          width: physicalW,
          height: physicalH,
          logicalWidth: logicalW,
          logicalHeight: logicalH,
          dpiScale: scale,
          durationMs: Date.now() - start
        };
      }
    }

    default:
      throw new Error(`Unknown action type: ${action.type}`);
  }

  return { success: true, durationMs: Date.now() - start };
}

// ─── WebSocket Server ─────────────────────────────────────────────────────────
function startBridge() {
  // HTTP server para health check
  const httpServer = http.createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, pid: process.pid, port: BRIDGE_PORT }));
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  const wss = new WebSocketServer({ server: httpServer });

  wss.on('connection', (ws, req) => {
    const origin = req.headers.origin || 'unknown';
    console.log(`[Bridge] Client connected from ${origin}`);

    // Avisar o cliente que está pronto
    ws.send(JSON.stringify({ type: 'ready', pid: process.pid }));

    ws.on('message', async (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        ws.send(JSON.stringify({ error: 'Invalid JSON' }));
        return;
      }

      const { id, action } = msg;
      console.log(`[Bridge] Action [${id}]: ${action?.type}`, action);

      try {
        const result = await executeAction(action);
        console.log(`[Bridge] Result [${id}]:`, result);
        ws.send(JSON.stringify({ id, ...result }));
      } catch (err) {
        console.error(`[Bridge] Error [${id}]:`, err.message);
        ws.send(JSON.stringify({ id, success: false, error: err.message }));
      }
    });

    ws.on('close', () => console.log('[Bridge] Client disconnected'));
    ws.on('error', (e) => console.error('[Bridge] WS error:', e.message));
  });

  httpServer.listen(BRIDGE_PORT, '127.0.0.1', () => {
    console.log(`[Bridge] ULTRON PC Bridge running on ws://localhost:${BRIDGE_PORT}`);
    // Sinalizar ao processo pai que estamos prontos (se corremos como child_process)
    if (process.send) process.send({ type: 'ready', port: BRIDGE_PORT });
  });

  httpServer.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
      console.log(`[Bridge] Port ${BRIDGE_PORT} already in use — bridge already running`);
      if (process.send) process.send({ type: 'already-running', port: BRIDGE_PORT });
    } else {
      console.error('[Bridge] HTTP server error:', e);
    }
  });
}

startBridge();
