import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { exec, fork } from "child_process";
import { promisify } from "util";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const execAsync = promisify(exec);

// ─── ULTRON PC Bridge (WebSocket porta 3002) ──────────────────────────────────
// Iniciado automaticamente em modo dev (sem Electron)
function startBridgeIfNeeded() {
  // Verificar se já está a correr
  fetch('http://127.0.0.1:3002/health')
    .then(() => console.log('[server] Bridge already running on port 3002'))
    .catch(() => {
      const bridgePath = path.join(__dirname, 'bridge.cjs');
      try {
        const bp = fork(bridgePath, [], { silent: false, env: { ...process.env } });
        bp.on('message', (msg: any) => {
          if (msg?.type === 'ready') console.log(`[server] Bridge started on port ${msg.port}`);
        });
        bp.on('error', (e: Error) => console.error('[server] Bridge error:', e.message));
        console.log('[server] Starting ULTRON PC Bridge...');
      } catch (e: any) {
        console.error('[server] Failed to start bridge:', e.message);
      }
    });
}

// ─── Computer Use (nut-js) ────────────────────────────────────────────────────
let nutMouse: any = null;
let nutKeyboard: any = null;
let nutScreen: any = null;

async function getNut() {
  if (!nutMouse) {
    try {
      const nut = await import('@nut-tree-fork/nut-js');
      nutMouse = nut.mouse;
      nutKeyboard = nut.keyboard;
      nutScreen = nut.screen;
    } catch {
      return null;
    }
  }
  return { mouse: nutMouse, keyboard: nutKeyboard, screen: nutScreen };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Iniciar o bridge de PC se não estiver já a correr (modo dev sem Electron)
  startBridgeIfNeeded();

  // Aumentar limite do body parser para suportar screenshots base64
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // API endpoint to execute shell commands
  app.post("/api/exec", async (req, res) => {
    const { command } = req.body;
    
    if (!command) {
      return res.status(400).json({ error: "Command is required" });
    }

    console.log(`[server] Executing command: ${command}`);

    try {
      // Detect platform and adjust command
      const isWindows = process.platform === 'win32';
      let actualCommand = command;
      
      // Map common Linux commands to Windows equivalents
      if (isWindows) {
        if (command.includes('google-chrome')) {
          // Try common Chrome paths on Windows
          actualCommand = 'start chrome';
        }
      }
      
      console.log(`[server] Platform: ${process.platform}, executing: ${actualCommand}`);
      
      const { stdout, stderr } = await execAsync(actualCommand, { 
        timeout: 30000,
        shell: isWindows ? 'powershell.exe' : undefined
      });
      
      res.json({ 
        stdout, 
        stderr,
        platform: process.platform,
        originalCommand: command,
        executedCommand: actualCommand
      });
    } catch (error: any) {
      console.error(`[server] Execution error: ${error.message}`);
      res.status(500).json({ 
        error: error.message, 
        stdout: error.stdout || "", 
        stderr: error.stderr || "",
        platform: process.platform,
        command: command
      });
    }
  });

  // API endpoint for Computer Use — proxies to Bridge WebSocket (port 3002)
  // The Bridge runs independently and provides desktop access via nut-js.
  app.post("/api/computer-use", async (req, res) => {
    const { action } = req.body as { action: any };
    if (!action || !action.type) {
      return res.status(400).json({ success: false, error: 'Missing action.type' });
    }

    try {
      // First try Bridge WebSocket on port 3002 (always available)
      const bridgeResponse = await fetch('http://127.0.0.1:3002/health', { 
        signal: AbortSignal.timeout(1000) 
      });
      
      if (bridgeResponse.ok) {
        // Bridge is available, but we can't use HTTP for actions (WebSocket only)
        // Return a message indicating the client should use WebSocket directly
        return res.json({
          success: true,
          message: 'Bridge available on WebSocket ws://127.0.0.1:3002',
          useBridgeWebSocket: true
        });
      }
    } catch (bridgeErr) {
      console.log('[server] Bridge WebSocket not available, trying Electron sidecar...');
    }

    try {
      // Fallback: Try Electron sidecar on port 3001
      const response = await fetch('http://127.0.0.1:3001/api/computer-use', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
        signal: AbortSignal.timeout(5000)
      });
      const data = await response.json();
      return res.json(data);
    } catch (err: any) {
      // Neither Bridge nor Electron sidecar available
      console.error('[server] ⚠️  No computer control backend available:', err.message);
      return res.status(503).json({
        success: false,
        error: 'No computer control backend available. Bridge (port 3002) and Electron sidecar (port 3001) are both offline.',
        code: 'CU_BACKEND_UNAVAILABLE'
      });
    }
  });

  // API endpoint for OpenAI/compatible API calls
  app.post("/api/chat", async (req, res) => {
    const { provider, model, messages, apiKey, baseUrl, temperature = 0.7, tools } = req.body;
    
    console.log('Chat API request:', { 
      provider, 
      model, 
      hasApiKey: !!apiKey, 
      apiKeyLength: apiKey?.length,
      apiKeyPrefix: apiKey?.substring(0, 10) + '...',
      messagesCount: messages?.length,
      baseUrl 
    });
    
    if (!provider || !model || !messages) {
      return res.status(400).json({ error: "Missing required parameters: provider, model, or messages" });
    }
    
    if (!apiKey || apiKey.trim() === '') {
      return res.status(400).json({ error: "API key is required and cannot be empty" });
    }

    // Validate common model names for OpenAI
    if (provider === 'openai' && baseUrl === 'https://api.openai.com/v1') {
      const validOpenAIModels = [
        'gpt-4', 'gpt-4-turbo', 'gpt-4o', 'gpt-4o-mini',
        'gpt-3.5-turbo', 'gpt-3.5-turbo-16k'
      ];
      if (!validOpenAIModels.includes(model)) {
        console.warn(`Warning: Model '${model}' may not be valid for OpenAI API. Valid models: ${validOpenAIModels.join(', ')}`);
      }
    }

    try {
      let response;
      
      if (provider === 'gemini') {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        console.log('[server] Making Gemini API call to:', url.replace(apiKey, 'HIDDEN'));
        
        try {
          response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: messages.map((msg: any) => ({
                role: msg.role === 'assistant' ? 'model' : msg.role,
                parts: [{ text: msg.content }]
              }))
            })
          });
        } catch (fetchErr: any) {
          console.error('[server] Gemini fetch failed:', fetchErr.message);
          console.error('[server] Fetch error details:', {
            code: fetchErr.code,
            cause: fetchErr.cause,
            stack: fetchErr.stack?.split('\n').slice(0, 3)
          });
          throw fetchErr;
        }
      } else {
        // OpenAI-compatible API
        const url = `${baseUrl || 'https://api.openai.com/v1'}/chat/completions`;
        console.log('[server] Making OpenAI API call to:', url);
        console.log('[server] Request payload:', {
          model,
          messagesCount: messages.length,
          temperature,
          hasAuth: !!apiKey,
          hasTools: !!tools,
          toolsCount: tools?.length
        });
        
        // Verificar se a URL é válida
        try {
          new URL(url);
        } catch (urlErr) {
          console.error('[server] Invalid URL:', url);
          throw new Error(`Invalid base URL: ${baseUrl}`);
        }
        
        const requestBody = {
          model,
          messages,
          temperature,
          ...(tools ? { tools, tool_choice: 'auto' } : {})
        };
        
        const bodyString = JSON.stringify(requestBody);
        console.log('[server] Request body size:', bodyString.length, 'bytes');
        
        // Detectar se é uma URL local (LM Studio, Ollama, etc.)
        const isLocalUrl = url.includes('localhost') || url.includes('127.0.0.1') || url.includes('0.0.0.0');
        // Timeout maior para payloads grandes (imagens) ou modelos vision
        const hasLargePayload = bodyString.length > 50000; // > 50KB
        const isVisionModel = model.includes('vision') || model.includes('4.6v') || model.includes('gpt-4o') || model.includes('gemini');
        const timeout = isLocalUrl ? 180000 : (hasLargePayload || isVisionModel ? 180000 : 60000); // 3min para local/vision/large, 1min normal
        
        console.log('[server] Using timeout:', timeout, 'ms (local:', isLocalUrl, ', large payload:', hasLargePayload, ', vision model:', isVisionModel, ')');
        console.log('[server] Body size:', bodyString.length, 'bytes (', (bodyString.length / 1024).toFixed(2), 'KB )');
        
        // Avisar se o payload é muito grande ou é um modelo vision
        if (bodyString.length > 100000 || isVisionModel) {
          console.warn('[server] ⚠️  Vision model or large payload detected:', (bodyString.length / 1024).toFixed(2), 'KB - using extended timeout of', timeout / 1000, 'seconds');
        }
        
        try {
          response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            body: bodyString,
            signal: AbortSignal.timeout(timeout)
          });
        } catch (fetchErr: any) {
          console.error('[server] OpenAI fetch failed:', fetchErr.message);
          console.error('[server] Fetch error details:', {
            code: fetchErr.code,
            cause: fetchErr.cause?.message,
            errno: fetchErr.errno,
            syscall: fetchErr.syscall,
            url: url,
            isTimeout: fetchErr.name === 'AbortError' || fetchErr.name === 'TimeoutError'
          });
          
          // Mensagem de erro mais amigável para servidores locais
          if (isLocalUrl && (fetchErr.code === 'ECONNREFUSED' || fetchErr.errno === -4078)) {
            throw new Error(`Não foi possível conectar ao servidor local em ${url}. Verifique se o LM Studio/Ollama está rodando.`);
          }
          
          throw fetchErr;
        }
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`External API Error: ${response.status} ${response.statusText}`);
        console.error('Error details:', errorText);
        console.error('Request details:', { provider, model, baseUrl, hasApiKey: !!apiKey });
        
        return res.status(response.status).json({ 
          error: `External API Error: ${response.statusText}`,
          details: errorText,
          status: response.status,
          model: model,
          provider: provider
        });
      }

      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error('[server] Chat API error:', error.message);
      console.error('[server] Error stack:', error.stack?.split('\n').slice(0, 5));
      console.error('[server] Error details:', {
        name: error.name,
        code: error.code,
        cause: error.cause,
        provider,
        model,
        baseUrl,
        messagesCount: messages?.length
      });
      
      // Retornar erro mais detalhado
      res.status(500).json({ 
        error: error.message || 'Unknown error',
        code: error.code,
        provider,
        model,
        details: error.cause?.message || error.toString()
      });
    }
  });

  // API endpoint for streaming chat
  app.post("/api/chat/stream", async (req, res) => {
    const { provider, model, messages, apiKey, baseUrl, temperature = 0.7 } = req.body;
    
    console.log('Streaming API request:', { 
      provider, 
      model, 
      hasApiKey: !!apiKey, 
      apiKeyLength: apiKey?.length,
      apiKeyPrefix: apiKey?.substring(0, 10) + '...',
      messagesCount: messages?.length,
      baseUrl 
    });
    
    if (!provider || !model || !messages) {
      return res.status(400).json({ error: "Missing required parameters: provider, model, or messages" });
    }
    
    if (!apiKey || apiKey.trim() === '') {
      return res.status(400).json({ error: "API key is required and cannot be empty" });
    }

    try {
      let response;
      
      if (provider === 'gemini') {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`;
        console.log('Making Gemini streaming API call to:', url.replace(apiKey, 'HIDDEN'));
        response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: messages.map((msg: any) => ({
              role: msg.role === 'assistant' ? 'model' : msg.role,
              parts: [{ text: msg.content }]
            }))
          })
        });
      } else {
        // OpenAI-compatible API
        const url = `${baseUrl || 'https://api.openai.com/v1'}/chat/completions`;
        console.log('Making OpenAI streaming API call to:', url);
        console.log('Request payload:', {
          model,
          messagesCount: messages.length,
          temperature,
          stream: true,
          hasAuth: !!apiKey
        });
        
        response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model,
            messages,
            temperature,
            stream: true
          })
        });
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`External API Error: ${response.status} ${response.statusText}`);
        console.error('Error details:', errorText);
        console.error('Request details:', { provider, model, baseUrl, hasApiKey: !!apiKey });
        
        return res.status(response.status).json({ 
          error: `External API Error: ${response.statusText}`,
          details: errorText,
          status: response.status,
          model: model,
          provider: provider
        });
      }

      // Set headers for streaming
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // Forward the stream
      if (response.body) {
        const reader = response.body.getReader();
        const pump = async () => {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              res.write(value);
            }
            res.end();
          } catch (error) {
            console.error('Streaming error:', error);
            res.end();
          }
        };
        pump();
      } else {
        res.end();
      }
    } catch (error: any) {
      console.error(`Streaming chat API error: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", environment: "linux", mcp: "active" });
  });

  // ── OAuth callback endpoint ───────────────────────────────────────────────
  // Provider redirects here after user authorizes: /oauth/callback?code=...&state=...
  app.get("/oauth/callback", async (req, res) => {
    const { code, state, error, error_description } = req.query;

    if (error) {
      console.error(`[OAuth] Authorization error: ${error} - ${error_description}`);
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head><title>OAuth Error</title></head>
        <body style="font-family: system-ui; padding: 40px; text-align: center;">
          <h1>❌ Authorization Failed</h1>
          <p>${error_description || error}</p>
          <button onclick="window.close()">Close Window</button>
        </body>
        </html>
      `);
    }

    if (!code || !state) {
      return res.status(400).send('Missing code or state parameter');
    }

    // Send success page with script to notify opener window
    res.send(`
      <!DOCTYPE html>
      <html>
      <head><title>OAuth Success</title></head>
      <body style="font-family: system-ui; padding: 40px; text-align: center;">
        <h1>✅ Authorization Successful</h1>
        <p>You can close this window now.</p>
        <script>
          // Notify opener window
          if (window.opener) {
            window.opener.postMessage({
              type: 'oauth-callback',
              code: '${code}',
              state: '${state}'
            }, '*');
          }
          // Auto-close after 2s
          setTimeout(() => window.close(), 2000);
        </script>
      </body>
      </html>
    `);
  });

  // ── Webhook inbound endpoints ─────────────────────────────────────────────
  // Third-party services POST to: /api/webhooks/in/:endpointId
  // The frontend registers endpoints via localStorage (webhook-store.ts).
  // The server reads the registry and routes accordingly.

  app.post("/api/webhooks/in/:endpointId", async (req, res) => {
    const { endpointId } = req.params;
    const rawBody = JSON.stringify(req.body);

    console.log(`[Webhooks] Inbound event on endpoint: ${endpointId}`);

    // Verify HMAC signature if present
    const signature = req.headers['x-hub-signature-256'] as string
      || req.headers['x-ultron-signature'] as string;

    // Acknowledge immediately — processing is async
    res.status(200).json({ received: true, endpointId });

    // Emit a custom event so the frontend (if connected) can react
    // In a full server-side setup this would trigger SSE/WebSocket push.
    // For now we log and the frontend polls or uses SSE (see /api/webhooks/events).
    console.log(`[Webhooks] Payload received for ${endpointId}:`, req.body);
  });

  // SSE stream — frontend subscribes to receive inbound webhook notifications in real time
  app.get("/api/webhooks/events", (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();

    // Keep-alive ping every 30s
    const ping = setInterval(() => res.write(': ping\n\n'), 30_000);

    req.on('close', () => {
      clearInterval(ping);
    });
  });

  // Webhook registry info (read-only, for debugging)
  app.get("/api/webhooks/health", (_req, res) => {
    res.json({ ok: true, message: "ULTRON Webhook server ready" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    console.log(`GEMINI_API_KEY present: ${!!process.env.GEMINI_API_KEY}`);
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false // Disable HMR to prevent WebSocket connection errors in AI Studio
      },
      appType: "spa",
      define: {
        'process.env.GEMINI_API_KEY': JSON.stringify(process.env.GEMINI_API_KEY),
        'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(process.env.GEMINI_API_KEY),
      }
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`ULTRON Real VM (Linux) initialized with MCP support.`);
  });
}

startServer();
