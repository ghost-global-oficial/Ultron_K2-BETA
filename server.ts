import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import dotenv from "dotenv";

dotenv.config();

const execAsync = promisify(exec);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API endpoint to execute shell commands
  app.post("/api/exec", async (req, res) => {
    const { command } = req.body;
    
    if (!command) {
      return res.status(400).json({ error: "Command is required" });
    }

    console.log(`Executing command: ${command}`);

    try {
      // Execute the command in the current container environment (Linux)
      const { stdout, stderr } = await execAsync(command, { timeout: 30000 });
      res.json({ stdout, stderr });
    } catch (error: any) {
      console.error(`Execution error: ${error.message}`);
      res.status(500).json({ 
        error: error.message, 
        stdout: error.stdout || "", 
        stderr: error.stderr || "" 
      });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", environment: "linux", mcp: "active" });
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
