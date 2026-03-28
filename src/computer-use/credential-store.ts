import Database from 'better-sqlite3';
import * as crypto from 'crypto';
import * as path from 'path';
import * as os from 'os';

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface ICredentialStore {
  create(service: string, email: string, password: string, extra?: Record<string, string>): Promise<void>;
  read(service: string, sessionId?: string): Promise<{ email: string; password: string; extra?: Record<string, string> } | null>;
  update(service: string, email: string, password: string, extra?: Record<string, string>): Promise<void>;
  delete(service: string): Promise<void>;
  listServices(): Promise<{ service: string; hasCredentials: boolean }[]>;
}

export interface ComputerUseError {
  code: string;
  message: string;
  details?: unknown;
}

// ─── Encryption helpers ───────────────────────────────────────────────────────

const PBKDF2_ITERATIONS = 100_000;
const KEY_LENGTH = 32;
const SALT_SIZE = 32;

function deriveMasterKey(deviceId: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(
    deviceId + 'ultron-computer-use',
    salt,
    PBKDF2_ITERATIONS,
    KEY_LENGTH,
    'sha256'
  );
}

function encrypt(plaintext: string, key: Buffer): { ciphertext: string; iv: string; authTag: string } {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    ciphertext: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
  };
}

function decrypt(ciphertext: string, iv: string, authTag: string, key: Buffer): string {
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(authTag, 'base64'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'base64')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

// ─── CredentialStore ─────────────────────────────────────────────────────────

export class CredentialStore implements ICredentialStore {
  private db: Database.Database;
  private masterKey: Buffer;

  constructor(dbPath?: string) {
    const resolvedPath = dbPath ?? path.join(os.homedir(), '.ultron', 'credentials.db');
    this.db = new Database(resolvedPath);
    this.masterKey = this._initMasterKey();
    this._initSchema();
  }

  private _initMasterKey(): Buffer {
    // Use machine-specific identifier as base for key derivation
    const deviceId = os.hostname() + os.userInfo().username + process.platform;

    // Check if we have a stored salt, otherwise generate one
    this.db.exec(`CREATE TABLE IF NOT EXISTS _keystore (key TEXT PRIMARY KEY, value TEXT NOT NULL)`);
    const row = this.db.prepare('SELECT value FROM _keystore WHERE key = ?').get('master_salt') as { value: string } | undefined;

    let salt: Buffer;
    if (row) {
      salt = Buffer.from(row.value, 'base64');
    } else {
      salt = crypto.randomBytes(SALT_SIZE);
      this.db.prepare('INSERT INTO _keystore (key, value) VALUES (?, ?)').run('master_salt', salt.toString('base64'));
    }

    return deriveMasterKey(deviceId, salt);
  }

  private _initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS credentials (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        service      TEXT    NOT NULL UNIQUE,
        email        TEXT    NOT NULL,
        password_enc TEXT    NOT NULL,
        iv           TEXT    NOT NULL,
        auth_tag     TEXT    NOT NULL,
        extra_enc    TEXT,
        created_at   INTEGER NOT NULL,
        updated_at   INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS audit_log (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        operation  TEXT    NOT NULL,
        service    TEXT    NOT NULL,
        session_id TEXT,
        timestamp  INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id           TEXT    PRIMARY KEY,
        service      TEXT    NOT NULL,
        task         TEXT    NOT NULL,
        status       TEXT    NOT NULL,
        actions_json TEXT    NOT NULL,
        started_at   INTEGER NOT NULL,
        ended_at     INTEGER,
        error_msg    TEXT
      );

      CREATE TABLE IF NOT EXISTS config (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      INSERT OR IGNORE INTO config (key, value) VALUES ('cu_enabled', 'true');
      INSERT OR IGNORE INTO config (key, value) VALUES ('auto_confirm_services', '[]');
    `);
  }

  async create(service: string, email: string, password: string, extra?: Record<string, string>): Promise<void> {
    const { ciphertext, iv, authTag } = encrypt(password, this.masterKey);
    let extraEnc: string | null = null;
    if (extra) {
      const enc = encrypt(JSON.stringify(extra), this.masterKey);
      extraEnc = JSON.stringify(enc);
    }
    const now = Date.now();
    this.db.prepare(`
      INSERT INTO credentials (service, email, password_enc, iv, auth_tag, extra_enc, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(service, email, ciphertext, iv, authTag, extraEnc, now, now);
    this._audit('create', service);
  }

  async read(service: string, sessionId?: string): Promise<{ email: string; password: string; extra?: Record<string, string> } | null> {
    const row = this.db.prepare('SELECT * FROM credentials WHERE service = ?').get(service) as any;
    this._audit('read', service, sessionId);
    if (!row) return null;

    const password = decrypt(row.password_enc, row.iv, row.auth_tag, this.masterKey);
    let extra: Record<string, string> | undefined;
    if (row.extra_enc) {
      const enc = JSON.parse(row.extra_enc);
      extra = JSON.parse(decrypt(enc.ciphertext, enc.iv, enc.authTag, this.masterKey));
    }
    return { email: row.email, password, extra };
  }

  async update(service: string, email: string, password: string, extra?: Record<string, string>): Promise<void> {
    const { ciphertext, iv, authTag } = encrypt(password, this.masterKey);
    let extraEnc: string | null = null;
    if (extra) {
      const enc = encrypt(JSON.stringify(extra), this.masterKey);
      extraEnc = JSON.stringify(enc);
    }
    this.db.prepare(`
      UPDATE credentials SET email = ?, password_enc = ?, iv = ?, auth_tag = ?, extra_enc = ?, updated_at = ?
      WHERE service = ?
    `).run(email, ciphertext, iv, authTag, extraEnc, Date.now(), service);
    this._audit('update', service);
  }

  async delete(service: string): Promise<void> {
    this.db.prepare('DELETE FROM credentials WHERE service = ?').run(service);
    this._audit('delete', service);
  }

  async listServices(): Promise<{ service: string; hasCredentials: boolean }[]> {
    // Only return service name and presence flag — never expose email or any credential data
    const rows = this.db.prepare('SELECT service FROM credentials').all() as { service: string }[];
    return rows.map(r => ({ service: r.service, hasCredentials: true }));
  }

  async listServicesWithEmail(): Promise<{ service: string; email: string }[]> {
    // Used only internally (main process) — never sent to renderer
    const rows = this.db.prepare('SELECT service, email FROM credentials').all() as { service: string; email: string }[];
    return rows;
  }

  // Expose DB for Session_Manager to share
  getDb(): Database.Database {
    return this.db;
  }

  // Config helpers
  getConfig(key: string): string | null {
    const row = this.db.prepare('SELECT value FROM config WHERE key = ?').get(key) as { value: string } | undefined;
    return row?.value ?? null;
  }

  setConfig(key: string, value: string): void {
    this.db.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)').run(key, value);
  }

  private _audit(operation: string, service: string, sessionId?: string): void {
    this.db.prepare(`
      INSERT INTO audit_log (operation, service, session_id, timestamp) VALUES (?, ?, ?, ?)
    `).run(operation, service, sessionId ?? null, Date.now());
  }
}
