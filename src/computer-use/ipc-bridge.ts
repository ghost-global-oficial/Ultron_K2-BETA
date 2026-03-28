import type { IpcMain, WebContents } from 'electron';
import type { CredentialStore } from './credential-store';
import type { InputController } from './input-controller';
import type { ScreenCapture } from './screen-capture';
import type { SessionManager } from './session-manager';

export interface ComputerUseModules {
  credStore: CredentialStore;
  inputController: InputController;
  screenCapture: ScreenCapture;
  sessionManager: SessionManager;
  webContents: WebContents;
}

// Strip sensitive fields before sending to renderer
function sanitizeForRenderer(obj: Record<string, unknown>): Record<string, unknown> {
  const FORBIDDEN = ['password', 'passwordEncrypted', 'iv', 'authTag', 'auth_tag', 'extra_enc', 'password_enc'];
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (!FORBIDDEN.includes(k)) {
      result[k] = v;
    }
  }
  return result;
}

// Mask email for display: "user@example.com" → "u***@example.com"
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  const masked = local.length > 1 ? local[0] + '***' : '***';
  return `${masked}@${domain}`;
}

export function registerComputerUseHandlers(ipcMain: IpcMain, modules: ComputerUseModules): void {
  const { credStore, inputController, screenCapture, sessionManager, webContents } = modules;

  // Wire up session event handlers to emit IPC events to renderer
  sessionManager.setEventHandlers({
    onConfirmRequired: (sessionId, description) => {
      webContents.send('cu:confirm-required', { sessionId, description });
    },
    onSessionUpdate: (session) => {
      webContents.send('cu:session-update', sanitizeForRenderer(session as any));
    },
    onSessionComplete: (session) => {
      webContents.send('cu:session-complete', sanitizeForRenderer(session as any));
    },
    onEmergencyStopped: (sessionId) => {
      webContents.send('cu:emergency-stopped', { sessionId });
    },
  });

  // ── Session management ──────────────────────────────────────────────────────

  ipcMain.handle('cu:start-session', async (_event, { service, task }: { service: string; task: string }) => {
    try {
      const sessionId = await sessionManager.startSession(service, task);
      return { success: true, sessionId };
    } catch (err: any) {
      return { success: false, error: err };
    }
  });

  ipcMain.handle('cu:confirm-session', async (_event, { sessionId }: { sessionId: string }) => {
    try {
      await sessionManager.confirmSession(sessionId);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err };
    }
  });

  ipcMain.handle('cu:stop-session', async (_event, { sessionId }: { sessionId: string }) => {
    try {
      await sessionManager.stopSession(sessionId);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err };
    }
  });

  ipcMain.handle('cu:get-sessions', async (_event, { limit }: { limit?: number } = {}) => {
    const sessions = sessionManager.getRecentSessions(limit ?? 20);
    return { success: true, sessions: sessions.map(s => sanitizeForRenderer(s as any)) };
  });

  // ── Screen capture ──────────────────────────────────────────────────────────

  ipcMain.handle('cu:capture-screen', async (_event, { monitorIndex }: { monitorIndex?: number } = {}) => {
    try {
      const result = await screenCapture.capture(monitorIndex ?? 0);
      return {
        success: true,
        image: result.image.toString('base64'),
        metadata: result.metadata,
      };
    } catch (err: any) {
      return { success: false, error: err };
    }
  });

  // ── Credentials ─────────────────────────────────────────────────────────────

  ipcMain.handle('cu:credential-create', async (_event, { service, email, password, extra }: any) => {
    try {
      await credStore.create(service, email, password, extra);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: { code: 'CU_CREDENTIAL_ERROR', message: err?.message } };
    }
  });

  ipcMain.handle('cu:credential-update', async (_event, { service, email, password, extra }: any) => {
    try {
      await credStore.update(service, email, password, extra);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: { code: 'CU_CREDENTIAL_ERROR', message: err?.message } };
    }
  });

  ipcMain.handle('cu:credential-delete', async (_event, { service }: { service: string }) => {
    try {
      await credStore.delete(service);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: { code: 'CU_CREDENTIAL_ERROR', message: err?.message } };
    }
  });

  ipcMain.handle('cu:list-services', async () => {
    const services = await credStore.listServices();
    return { success: true, services };
  });

  // Returns service + masked email (e.g. "u***@gmail.com") for display purposes only
  ipcMain.handle('cu:list-services-display', async () => {
    const rows = await credStore.listServicesWithEmail();
    const masked = rows.map(r => ({
      service: r.service,
      hasCredentials: true,
      emailMasked: maskEmail(r.email),
    }));
    return { success: true, services: masked };
  });

  // ── Input control ───────────────────────────────────────────────────────────

  ipcMain.handle('cu:execute-action', async (_event, { action }: { action: any }) => {
    try {
      const result = await inputController.executeAction(action);
      return result;
    } catch (err: any) {
      return { success: false, error: { code: 'CU_INPUT_ERROR', message: err?.message }, durationMs: 0 };
    }
  });

  ipcMain.handle('cu:get-screen-bounds', async () => {
    try {
      const bounds = await inputController.getScreenBounds();
      return { success: true, ...bounds };
    } catch (err: any) {
      return { success: false, error: { code: 'CU_INPUT_ERROR', message: err?.message } };
    }
  });

  // ── System status ───────────────────────────────────────────────────────────

  ipcMain.handle('cu:get-status', async () => {
    const enabled = credStore.getConfig('cu_enabled') === 'true';
    return { success: true, enabled };
  });

  ipcMain.handle('cu:set-enabled', async (_event, { enabled }: { enabled: boolean }) => {
    credStore.setConfig('cu_enabled', enabled ? 'true' : 'false');
    inputController.setEnabled(enabled);
    return { success: true };
  });

  ipcMain.handle('cu:check-deps', async () => {
    const available = await inputController.isAvailable();
    return { success: true, isAvailable: available };
  });
}
