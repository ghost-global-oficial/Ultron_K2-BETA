const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow: any = null;
let serverProcess: any = null;

const isDev = process.env.NODE_ENV !== 'production';
const PORT = 3000;

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

  // Wait for server to be ready
  const loadApp = () => {
    if (isDev) {
      mainWindow?.loadURL(`http://localhost:${PORT}`);
      mainWindow?.webContents.openDevTools();
    } else {
      mainWindow?.loadURL(`http://localhost:${PORT}`);
    }
  };

  // Give server time to start
  setTimeout(loadApp, 3000);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startServer() {
  const serverScript = isDev 
    ? path.join(__dirname, '../server.ts')
    : path.join(process.resourcesPath, 'server.js');

  const command = isDev ? 'tsx' : 'node';
  const args = [serverScript];

  console.log(`Starting server: ${command} ${args.join(' ')}`);

  serverProcess = spawn(command, args, {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, NODE_ENV: process.env.NODE_ENV || 'development' }
  });

  serverProcess.on('error', (err: any) => {
    console.error('Failed to start server:', err);
  });

  serverProcess.on('exit', (code: any) => {
    console.log(`Server process exited with code ${code}`);
  });
}

app.whenReady().then(() => {
  startServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});