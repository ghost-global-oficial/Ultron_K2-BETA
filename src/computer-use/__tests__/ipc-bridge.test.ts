import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import * as crypto from 'crypto';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { CredentialStore } from '../credential-store';
import { InputController } from '../input-controller';
import { ScreenCapture } from '../screen-capture';
import { SessionManager } from '../session-manager';
import { registerComputerUseHandlers } from '../ipc-bridge';

// Mock nut-js
vi.mock('@nut-tree-fork/nut-js', () => ({
  mouse: { setPosition: vi.fn(), click: vi.fn(), doubleClick: vi.fn() },
  keyboard: { type: vi.fn(), pressKey: vi.fn(), releaseKey: vi.fn() },
  screen: { width: vi.fn().mockResolvedValue(1920), height: vi.fn().mockResolvedValue(1080) },
  Key: {},
  Button: { LEFT: 0, RIGHT: 1 },
  scrollDown: vi.fn(),
  scrollUp: vi.fn(),
}));

const SENSITIVE_KEYS = ['password', 'passwordEncrypted', 'iv', 'authTag', 'auth_tag', 'extra_enc', 'password_enc'];

function hasSensitiveKey(obj: unknown): boolean {
  if (typeof obj !== 'object' || obj === null) return false;
  for (const key of Object.keys(obj as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.includes(key)) return true;
    if (hasSensitiveKey((obj as any)[key])) return true;
  }
  return false;
}

function createMockIpcMain() {
  const handlers: Map<string, (event: any, ...args: any[]) => Promise<any>> = new Map();
  return {
    handle: (channel: string, handler: (event: any, ...args: any[]) => Promise<any>) => {
      handlers.set(channel, handler);
    },
    invoke: async (channel: string, ...args: any[]) => {
      const handler = handlers.get(channel);
      if (!handler) throw new Error(`No handler for ${channel}`);
      return handler({}, ...args);
    },
  };
}

let credStore: CredentialStore;
let ipcMain: ReturnType<typeof createMockIpcMain>;
let dbPath: string;

beforeEach(() => {
  dbPath = path.join(os.tmpdir(), `ultron-ipc-test-${crypto.randomBytes(8).toString('hex')}.db`);
  credStore = new CredentialStore(dbPath);
  const inputController = new InputController();
  const screenCapture = new ScreenCapture();
  const manager = new SessionManager(credStore);
  ipcMain = createMockIpcMain();

  registerComputerUseHandlers(ipcMain as any, {
    credStore,
    inputController,
    screenCapture,
    sessionManager: manager,
    webContents: { send: vi.fn() } as any,
  });
});

afterEach(() => {
  try { fs.unlinkSync(dbPath); } catch {}
});

// ─── Property 3: Credenciais nunca chegam ao renderer ────────────────────────
// Feature: computer-use, Property 3: Credentials never reach renderer
// Validates: Requirements 3.4, 6.4
describe('Property 3: Credentials never reach renderer', () => {
  test('cu:list-services response contains no sensitive fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            service: fc.string({ minLength: 3, maxLength: 20 }),
            email: fc.emailAddress(),
            password: fc.string({ minLength: 1 }),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (credentials) => {
          for (const { service, email, password } of credentials) {
            await credStore.create(service, email, password);
          }
          const result = await ipcMain.invoke('cu:list-services');
          expect(hasSensitiveKey(result)).toBe(false);
          for (const { service } of credentials) {
            await credStore.delete(service);
          }
        }
      ),
      { numRuns: 20 }
    );
  }, 30_000);

  test('cu:credential-create response contains no sensitive fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          service: fc.string({ minLength: 3, maxLength: 20 }),
          email: fc.emailAddress(),
          password: fc.string({ minLength: 1 }),
        }),
        async ({ service, email, password }) => {
          const result = await ipcMain.invoke('cu:credential-create', { service, email, password });
          expect(hasSensitiveKey(result)).toBe(false);
          await credStore.delete(service);
        }
      ),
      { numRuns: 20 }
    );
  }, 30_000);
});
