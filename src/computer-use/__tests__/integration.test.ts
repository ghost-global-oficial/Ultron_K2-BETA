/**
 * Integration tests: full Computer Use flow
 * Feature: computer-use
 * Validates: Requirements 4.2, 4.6, 3.7
 */
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import * as crypto from 'crypto';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { CredentialStore } from '../credential-store';
import { SessionManager } from '../session-manager';

// ─── Helpers ──────────────────────────────────────────────────────────────────

let credStore: CredentialStore;
let manager: SessionManager;
let dbPath: string;

const events: Record<string, any[]> = {
  confirmRequired: [],
  sessionUpdate: [],
  sessionComplete: [],
  emergencyStopped: [],
};

beforeEach(() => {
  dbPath = path.join(os.tmpdir(), `ultron-int-test-${crypto.randomBytes(8).toString('hex')}.db`);
  credStore = new CredentialStore(dbPath);
  manager = new SessionManager(credStore);

  // Reset event log
  Object.keys(events).forEach(k => (events[k] = []));

  manager.setEventHandlers({
    onConfirmRequired: (sessionId, description) => events.confirmRequired.push({ sessionId, description }),
    onSessionUpdate: (session) => events.sessionUpdate.push(session),
    onSessionComplete: (session) => events.sessionComplete.push(session),
    onEmergencyStopped: (sessionId) => events.emergencyStopped.push({ sessionId }),
  });
});

afterEach(() => {
  try { fs.unlinkSync(dbPath); } catch {}
});

// ─── Full session flow ────────────────────────────────────────────────────────

describe('Full session flow: start → confirm → complete', () => {
  test('session transitions through pending_confirm → running → completed', async () => {
    // Store credentials
    await credStore.create('gmail', 'test@example.com', 'secret123');

    // Start session (will emit confirm-required)
    const sessionPromise = manager.startSession('gmail', 'Read latest emails');

    // Confirm immediately
    await new Promise(r => setTimeout(r, 10));
    expect(events.confirmRequired.length).toBe(1);
    const { sessionId } = events.confirmRequired[0];
    await manager.confirmSession(sessionId);

    const id = await sessionPromise;
    expect(id).toBe(sessionId);

    const session = manager.getSession(id);
    expect(session?.status).toBe('running');

    // Complete the session
    manager.completeSession(id);
    const completed = manager.getSession(id);
    expect(completed?.status).toBe('completed');
    expect(events.sessionComplete.length).toBe(1);
    expect(events.sessionComplete[0].id).toBe(id);
  }, 10_000);

  test('session can be stopped mid-run and emits emergency-stopped event', async () => {
    credStore.setConfig('auto_confirm_services', JSON.stringify(['github']));
    const id = await manager.startSession('github', 'Create issue');

    expect(manager.getSession(id)?.status).toBe('running');

    await manager.stopSession(id);

    expect(manager.getSession(id)?.status).toBe('stopped');
    expect(events.emergencyStopped.length).toBe(1);
    expect(events.emergencyStopped[0].sessionId).toBe(id);
  }, 10_000);
});

// ─── Action log ──────────────────────────────────────────────────────────────

describe('Action log is recorded correctly', () => {
  test('addActionLog appends to session and triggers onSessionUpdate', async () => {
    credStore.setConfig('auto_confirm_services', JSON.stringify(['gmail']));
    const id = await manager.startSession('gmail', 'Send email');

    manager.addActionLog(id, {
      index: 0,
      type: 'click',
      params: { x: 100, y: 200 },
      success: true,
      timestamp: Date.now(),
      durationMs: 42,
    });

    const session = manager.getSession(id);
    expect(session?.actions.length).toBe(1);
    expect(session?.actions[0].type).toBe('click');
    expect(events.sessionUpdate.length).toBeGreaterThanOrEqual(1);
  }, 10_000);
});

// ─── Audit log ───────────────────────────────────────────────────────────────

describe('Audit log is populated after credential reads', () => {
  test('reading a credential creates an audit_log entry', async () => {
    await credStore.create('google-drive', 'user@gmail.com', 'pass456');
    await credStore.read('google-drive', 'test-session-id');

    const db = credStore.getDb();
    const rows = db.prepare(
      `SELECT * FROM audit_log WHERE service = 'google-drive' AND operation = 'read'`
    ).all() as any[];

    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows[0].timestamp).toBeGreaterThan(0);
    // Ensure no credential values are stored in audit log
    expect(rows[0].value).toBeUndefined();
  });
});

// ─── CU_DISABLED guard ────────────────────────────────────────────────────────

describe('CU_DISABLED prevents session start', () => {
  test('startSession throws CU_DISABLED when cu_enabled is false', async () => {
    credStore.setConfig('cu_enabled', 'false');

    let errorCode = '';
    try {
      await manager.startSession('gmail', 'some task');
    } catch (err: any) {
      errorCode = err.code;
    }
    expect(errorCode).toBe('CU_DISABLED');
  });
});

// ─── getRecentSessions ────────────────────────────────────────────────────────

describe('getRecentSessions returns persisted sessions', () => {
  test('completed sessions appear in getRecentSessions', async () => {
    credStore.setConfig('auto_confirm_services', JSON.stringify(['gmail']));
    const id = await manager.startSession('gmail', 'Test task');
    manager.completeSession(id);

    const recent = manager.getRecentSessions(10);
    const found = recent.find(s => s.id === id);
    expect(found).toBeDefined();
    expect(found?.status).toBe('completed');
  });
});
