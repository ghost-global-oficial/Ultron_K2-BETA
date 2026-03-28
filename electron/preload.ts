const { contextBridge, ipcRenderer } = require('electron');

// ─── window.electron ──────────────────────────────────────────────────────────
try {
  contextBridge.exposeInMainWorld('electron', {
    platform: process.platform,
    versions: {
      node: process.versions.node,
      chrome: process.versions.chrome,
      electron: process.versions.electron,
    },
    ipcInvoke: (channel: string, data?: any) => {
      const allowed = ['cu:execute-action-direct', 'cu:get-screen-bounds', 'cu:check-deps'];
      if (allowed.includes(channel)) return ipcRenderer.invoke(channel, data);
      throw new Error(`IPC channel not allowed: ${channel}`);
    }
  });
} catch (e) {
  console.error('[preload] Failed to expose window.electron:', e);
}

// ─── window.computerUse ───────────────────────────────────────────────────────
try {
  contextBridge.exposeInMainWorld('computerUse', {
    executeAction: (action: any) =>
      ipcRenderer.invoke('cu:execute-action-direct', { action }),

    startSession: (service: string, task: string) =>
      ipcRenderer.invoke('cu:start-session', { service, task }),
    confirmSession: (sessionId: string) =>
      ipcRenderer.invoke('cu:confirm-session', { sessionId }),
    stopSession: (sessionId: string) =>
      ipcRenderer.invoke('cu:stop-session', { sessionId }),
    getSessions: (limit?: number) =>
      ipcRenderer.invoke('cu:get-sessions', { limit }),

    captureScreen: (monitorIndex?: number) =>
      ipcRenderer.invoke('cu:capture-screen', { monitorIndex }),

    createCredential: (service: string, email: string, password: string, extra?: Record<string, string>) =>
      ipcRenderer.invoke('cu:credential-create', { service, email, password, extra }),
    updateCredential: (service: string, email: string, password: string, extra?: Record<string, string>) =>
      ipcRenderer.invoke('cu:credential-update', { service, email, password, extra }),
    deleteCredential: (service: string) =>
      ipcRenderer.invoke('cu:credential-delete', { service }),
    listServices: () =>
      ipcRenderer.invoke('cu:list-services'),
    listServicesDisplay: () =>
      ipcRenderer.invoke('cu:list-services-display'),

    getScreenBounds: () =>
      ipcRenderer.invoke('cu:get-screen-bounds'),
    getStatus: () =>
      ipcRenderer.invoke('cu:get-status'),
    setEnabled: (enabled: boolean) =>
      ipcRenderer.invoke('cu:set-enabled', { enabled }),
    checkDeps: () =>
      ipcRenderer.invoke('cu:check-deps'),

    onEvent: (channel: string, callback: (...args: any[]) => void) => {
      const validChannels = [
        'cu:confirm-required',
        'cu:session-update',
        'cu:session-complete',
        'cu:emergency-stopped',
      ];
      if (validChannels.includes(channel)) {
        ipcRenderer.on(channel, (_event: any, ...args: any[]) => callback(...args));
      }
    },

    removeListener: (channel: string, callback: (...args: any[]) => void) => {
      ipcRenderer.removeListener(channel, callback);
    },
  });
} catch (e) {
  console.error('[preload] Failed to expose window.computerUse:', e);
}
