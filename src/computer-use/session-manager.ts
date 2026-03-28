import * as crypto from 'crypto';
import type { CredentialStore } from './credential-store';
import type { Action } from './input-controller';

// ─── Types ────────────────────────────────────────────────────────────────────

export type SessionStatus = 'idle' | 'pending_confirm' | 'running' | 'completed' | 'failed' | 'stopped';

export interface ActionLog {
  index: number;
  type: Action['type'];
  params: Record<string, unknown>;
  success: boolean;
  timestamp: number;
  durationMs: number;
}

export interface Session {
  id: string;
  service: string;
  task: string;
  status: SessionStatus;
  actions: ActionLog[];
  startedAt: number;
  endedAt?: number;
  errorMessage?: string;
}

export interface ISessionManager {
  startSession(service: string, task: string): Promise<string>;
  confirmSession(sessionId: string): Promise<void>;
  stopSession(sessionId: string): Promise<void>;
  getSession(sessionId: string): Session | null;
  getRecentSessions(limit: number): Session[];
  addActionLog(sessionId: string, log: ActionLog): void;
  completeSession(sessionId: string, errorMessage?: string): void;
}

// ─── SessionManager ───────────────────────────────────────────────────────────

const CONFIRM_TIMEOUT_MS = 60_000;
const STOP_TIMEOUT_MS = 200;

export class SessionManager implements ISessionManager {
  private sessions: Map<string, Session> = new Map();
  private confirmResolvers: Map<string, () => void> = new Map();
  private stopResolvers: Map<string, () => void> = new Map();
  private onConfirmRequired?: (sessionId: string, description: string) => void;
  private onSessionUpdate?: (session: Session) => void;
  private onSessionComplete?: (session: Session) => void;
  private onEmergencyStopped?: (sessionId: string) => void;

  constructor(private credStore: CredentialStore) {}

  setEventHandlers(handlers: {
    onConfirmRequired?: (sessionId: string, description: string) => void;
    onSessionUpdate?: (session: Session) => void;
    onSessionComplete?: (session: Session) => void;
    onEmergencyStopped?: (sessionId: string) => void;
  }): void {
    this.onConfirmRequired = handlers.onConfirmRequired;
    this.onSessionUpdate = handlers.onSessionUpdate;
    this.onSessionComplete = handlers.onSessionComplete;
    this.onEmergencyStopped = handlers.onEmergencyStopped;
  }

  async startSession(service: string, task: string): Promise<string> {
    // Check if system is enabled
    const enabled = this.credStore.getConfig('cu_enabled');
    if (enabled !== 'true') {
      throw { code: 'CU_DISABLED', message: 'Computer Use system is disabled.' };
    }

    // Enforce single active session
    for (const session of this.sessions.values()) {
      if (session.status === 'running' || session.status === 'pending_confirm') {
        throw { code: 'CU_SESSION_ACTIVE', message: 'A session is already active. Stop it before starting a new one.' };
      }
    }

    const id = crypto.randomUUID();
    const session: Session = {
      id,
      service,
      task,
      status: 'pending_confirm',
      actions: [],
      startedAt: Date.now(),
    };
    this.sessions.set(id, session);
    this._persist(session);

    // Check if auto-confirm is enabled for this service
    const autoConfirmRaw = this.credStore.getConfig('auto_confirm_services') ?? '[]';
    const autoConfirm: string[] = JSON.parse(autoConfirmRaw);

    if (autoConfirm.includes(service)) {
      // Auto-confirm: set to running immediately without waiting
      session.status = 'running';
      this._persist(session);
    } else {
      // Notify UI to ask for confirmation
      this.onConfirmRequired?.(id, `Execute task "${task}" on ${service}?`);

      // Wait for confirmation with timeout
      await new Promise<void>((resolve, reject) => {
        this.confirmResolvers.set(id, resolve);
        setTimeout(() => {
          if (this.confirmResolvers.has(id)) {
            this.confirmResolvers.delete(id);
            session.status = 'failed';
            session.errorMessage = 'Confirmation timeout (60s).';
            session.endedAt = Date.now();
            this._persist(session);
            reject({ code: 'CU_CONFIRM_TIMEOUT', message: 'User did not confirm within 60 seconds.' });
          }
        }, CONFIRM_TIMEOUT_MS);
      });
    }

    return id;
  }

  async confirmSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) throw { code: 'CU_SESSION_NOT_FOUND', message: `Session ${sessionId} not found.` };

    session.status = 'running';
    this._persist(session);

    const resolver = this.confirmResolvers.get(sessionId);
    if (resolver) {
      this.confirmResolvers.delete(sessionId);
      resolver();
    }
  }

  async stopSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const stopPromise = new Promise<void>((resolve) => {
      this.stopResolvers.set(sessionId, resolve);
      // Immediately mark as stopped
      session.status = 'stopped';
      session.endedAt = Date.now();
      this._persist(session);
      this.stopResolvers.delete(sessionId);
      this.onEmergencyStopped?.(sessionId);
      resolve();
    });

    await Promise.race([
      stopPromise,
      new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error('Stop timeout')), STOP_TIMEOUT_MS)
      ),
    ]);
  }

  getSession(sessionId: string): Session | null {
    return this.sessions.get(sessionId) ?? null;
  }

  getRecentSessions(limit: number): Session[] {
    // Load from DB
    const db = this.credStore.getDb();
    const rows = db.prepare(
      `SELECT * FROM sessions ORDER BY started_at DESC LIMIT ?`
    ).all(limit) as any[];

    const dbSessions = rows.map(r => ({
      id: r.id,
      service: r.service,
      task: r.task,
      status: r.status as SessionStatus,
      actions: JSON.parse(r.actions_json ?? '[]'),
      startedAt: r.started_at,
      endedAt: r.ended_at ?? undefined,
      errorMessage: r.error_msg ?? undefined,
    }));

    // Merge in-memory sessions (running/pending_confirm) that may not be persisted yet
    const inMemoryActive = Array.from(this.sessions.values()).filter(
      s => s.status === 'running' || s.status === 'pending_confirm'
    );

    // Deduplicate: in-memory takes precedence over DB for same id
    const dbSessionsFiltered = dbSessions.filter(
      db => !inMemoryActive.some(m => m.id === db.id)
    );

    return [...inMemoryActive, ...dbSessionsFiltered]
      .sort((a, b) => b.startedAt - a.startedAt)
      .slice(0, limit);
  }

  addActionLog(sessionId: string, log: ActionLog): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.actions.push(log);
    this.onSessionUpdate?.(session);
    this._persist(session);
  }

  completeSession(sessionId: string, errorMessage?: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.status = errorMessage ? 'failed' : 'completed';
    session.errorMessage = errorMessage;
    session.endedAt = Date.now();
    this._persist(session);
    this.onSessionComplete?.(session);
  }

  private _persist(session: Session): void {
    const db = this.credStore.getDb();
    db.prepare(`
      INSERT OR REPLACE INTO sessions (id, service, task, status, actions_json, started_at, ended_at, error_msg)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      session.id,
      session.service,
      session.task,
      session.status,
      JSON.stringify(session.actions),
      session.startedAt,
      session.endedAt ?? null,
      session.errorMessage ?? null,
    );
  }
}
