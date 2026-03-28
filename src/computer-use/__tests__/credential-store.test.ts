import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import * as crypto from 'crypto';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { CredentialStore } from '../credential-store';

let store: CredentialStore;
let dbPath: string;

beforeEach(() => {
  dbPath = path.join(os.tmpdir(), `ultron-test-${crypto.randomBytes(8).toString('hex')}.db`);
  store = new CredentialStore(dbPath);
});

afterEach(() => {
  try { fs.unlinkSync(dbPath); } catch {}
});

// ─── Property 2: Encriptação round-trip de credenciais ───────────────────────
// Feature: computer-use, Property 2: Round-trip consistency
// Validates: Requirements 3.2, 3.3
describe('Property 2: Encryption round-trip', () => {
  test('encrypt then decrypt returns original values', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 3, maxLength: 20 }),
        async (email, password, service) => {
          await store.create(service, email, password);
          const result = await store.read(service);
          expect(result).not.toBeNull();
          expect(result!.email).toBe(email);
          expect(result!.password).toBe(password);
          await store.delete(service);
        }
      ),
      { numRuns: 20 }
    );
  }, 30_000);
});

// ─── Property 6: Auditoria regista todas as leituras ─────────────────────────
// Feature: computer-use, Property 6: Audit log completeness
// Validates: Requirements 3.7
describe('Property 6: Audit log completeness', () => {
  test('every read is recorded in audit_log', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 3, maxLength: 20 }),
        async (service) => {
          await store.create(service, 'test@test.com', 'pass123');
          await store.read(service, 'session-test');

          const db = store.getDb();
          const rows = db.prepare(
            `SELECT * FROM audit_log WHERE service = ? AND operation = 'read'`
          ).all(service) as any[];

          expect(rows.length).toBeGreaterThan(0);
          expect(rows[rows.length - 1].service).toBe(service);
          expect(rows[rows.length - 1].timestamp).toBeGreaterThan(0);

          await store.delete(service);
        }
      ),
      { numRuns: 20 }
    );
  }, 30_000);
});

// ─── Property 9: CRUD de credenciais é consistente ───────────────────────────
// Feature: computer-use, Property 9: CRUD consistency
// Validates: Requirements 3.6
describe('Property 9: CRUD consistency', () => {
  test('create → read → update → read → delete → read reflects each write', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc.emailAddress(),
          password: fc.string({ minLength: 1, maxLength: 30 }),
          email2: fc.emailAddress(),
          password2: fc.string({ minLength: 1, maxLength: 30 }),
        }),
        async ({ email, password, email2, password2 }) => {
          const service = `svc-${crypto.randomBytes(4).toString('hex')}`;

          await store.create(service, email, password);
          const r1 = await store.read(service);
          expect(r1?.email).toBe(email);
          expect(r1?.password).toBe(password);

          await store.update(service, email2, password2);
          const r2 = await store.read(service);
          expect(r2?.email).toBe(email2);
          expect(r2?.password).toBe(password2);

          await store.delete(service);
          const r3 = await store.read(service);
          expect(r3).toBeNull();
        }
      ),
      { numRuns: 15 }
    );
  }, 30_000);
});
