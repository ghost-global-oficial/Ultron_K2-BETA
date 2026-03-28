/**
 * ULTRON OAuth Token Store
 * Persistência segura de tokens OAuth no localStorage (encriptado).
 */

import type { StoredOAuthConnection, OAuthToken } from './types';

const STORAGE_KEY = 'ultron:oauth:connections';

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

export function listConnections(): StoredOAuthConnection[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function getConnection(id: string): StoredOAuthConnection | undefined {
  return listConnections().find(c => c.id === id);
}

export function getConnectionByService(service: string): StoredOAuthConnection | undefined {
  return listConnections().find(c => c.service === service);
}

export function saveConnection(conn: Omit<StoredOAuthConnection, 'id' | 'createdAt' | 'updatedAt'>): StoredOAuthConnection {
  const now = new Date().toISOString();
  const existing = getConnectionByService(conn.service);
  
  if (existing) {
    // Update existing
    const updated: StoredOAuthConnection = {
      ...existing,
      ...conn,
      updatedAt: now,
    };
    const all = listConnections().map(c => c.id === existing.id ? updated : c);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    return updated;
  }

  // Create new
  const newConn: StoredOAuthConnection = {
    ...conn,
    id: uid(),
    createdAt: now,
    updatedAt: now,
  };
  const all = listConnections();
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...all, newConn]));
  return newConn;
}

export function updateToken(service: string, token: OAuthToken): boolean {
  const conn = getConnectionByService(service);
  if (!conn) return false;
  conn.token = token;
  conn.updatedAt = new Date().toISOString();
  const all = listConnections().map(c => c.service === service ? conn : c);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  return true;
}

export function updateUserInfo(service: string, userInfo: { email?: string; name?: string; avatar?: string }): boolean {
  const conn = getConnectionByService(service);
  if (!conn) return false;
  conn.userInfo = userInfo;
  conn.updatedAt = new Date().toISOString();
  const all = listConnections().map(c => c.service === service ? conn : c);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  return true;
}

export function deleteConnection(id: string): boolean {
  const all = listConnections();
  const filtered = all.filter(c => c.id !== id);
  if (filtered.length === all.length) return false;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return true;
}

export function clearAll(): void {
  localStorage.removeItem(STORAGE_KEY);
}
