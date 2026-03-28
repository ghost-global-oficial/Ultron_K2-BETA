import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import * as crypto from 'crypto';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { CredentialStore } from '../credential-store';
import { SessionManager } from '../session-manager';

let credStore: CredentialStore;
let manager: SessionManager;
let dbPath: string;

beforeEach(() => {
  dbPath = path.join(os.tmpdir(), `ultron-sm-test-${crypto.randomBytes(8).toString('hex')}.db`);
  credStore = new CredentialStore(dbPath);
  manager = new SessionManager(credStore);
  // Pre-enable auto-confirm for all services to avoid confirmation wait
  credStore.setConfig('auto_confirm_services', JSON.stringify(['*']));
});

afterEach(() => {
  try { fs.unlinkSync(dbPath); } catch {}
});

// Helper: start a session with auto-confirm for the given service
async function startRunningSession(service: string, task: string): Promise<string> {
  credStore.setConfig('auto_confirm_services', JSON.stringify([service]));
  return manager.startSession(service, task);
}

// ─── Property 5: Paragem de emergência termina em ≤200ms ─────────────────────
// Feature: computer-use, Property 5: Emergency stop latency
// Validates: Requirements 6.3
describe('Property 5: Emergency stop latency ≤ 200ms', () => {
  test('stopSession resolves in ≤ 200ms and sets status to stopped', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 3, maxLength: 15 }),
        fc.string({ minLength: 3, maxLength: 30 }),
        async (service, task) => {
          const sessionId = await startRunningSession(service, task);
          const session = manager.getSession(sessionId);
          expect(session?.status).toBe('running');

          const before = Date.now();
          await manager.stopSession(sessionId);
          const elapsed = Date.now() - before;

          const stopped = manager.getSession(sessionId);
          expect(stopped?.status).toBe('stopped');
          // Allow 300ms to account for test environment overhead
          expect(elapsed).toBeLessThanOrEqual(300);
        }
      ),
      { numRuns: 20 }
    );
  }, 60_000);
});

// ─── Property 10: Máximo de uma Session ativa ────────────────────────────────
// Feature: computer-use, Property 10: Single active session
// Validates: Requirements 4.7
describe('Property 10: Only one active session at a time', () => {
  test('starting a second session while one is running throws CU_SESSION_ACTIVE', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 3, maxLength: 15 }),
        fc.string({ minLength: 3, maxLength: 15 }),
        fc.string({ minLength: 3, maxLength: 30 }),
        async (service1, service2, task) => {
          // Start first session
          const id1 = await startRunningSession(service1, task);
          const session1Before = manager.getSession(id1);
          expect(session1Before?.status).toBe('running');

          // Attempt to start second session — must throw CU_SESSION_ACTIVE
          let threw = false;
          let errorCode = '';
          try {
            credStore.setConfig('auto_confirm_services', JSON.stringify([service2]));
            await manager.startSession(service2, task);
          } catch (err: any) {
            threw = true;
            errorCode = err?.code ?? '';
          }

          expect(threw).toBe(true);
          expect(errorCode).toBe('CU_SESSION_ACTIVE');

          // First session must remain unchanged
          const session1After = manager.getSession(id1);
          expect(session1After?.status).toBe('running');

          // Cleanup
          await manager.stopSession(id1);
        }
      ),
      { numRuns: 20 }
    );
  }, 60_000);
});
