/**
 * ULTRON Webhook System — Store
 * Persiste webhooks e logs de entrega no localStorage (frontend)
 * e expõe uma API síncrona simples para CRUD.
 */

import type {
  WebhookConfig,
  InboundWebhookEndpoint,
  WebhookDelivery,
} from './types';

const KEYS = {
  outbound: 'ultron:webhooks:outbound',
  inbound:  'ultron:webhooks:inbound',
  deliveries: 'ultron:webhooks:deliveries',
} as const;

const MAX_DELIVERY_LOGS = 200;

function read<T>(key: string): T[] {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]') as T[];
  } catch {
    return [];
  }
}

function write<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ── Outbound webhooks ─────────────────────────────────────────────────────────

export function listWebhooks(): WebhookConfig[] {
  return read<WebhookConfig>(KEYS.outbound);
}

export function getWebhook(id: string): WebhookConfig | undefined {
  return listWebhooks().find(w => w.id === id);
}

export function createWebhook(
  data: Omit<WebhookConfig, 'id' | 'createdAt' | 'updatedAt' | 'status'>
): WebhookConfig {
  const now = new Date().toISOString();
  const webhook: WebhookConfig = {
    ...data,
    id: uid(),
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };
  const all = listWebhooks();
  write(KEYS.outbound, [...all, webhook]);
  return webhook;
}

export function updateWebhook(id: string, patch: Partial<WebhookConfig>): WebhookConfig | null {
  const all = listWebhooks();
  const idx = all.findIndex(w => w.id === id);
  if (idx === -1) return null;
  const updated = { ...all[idx], ...patch, updatedAt: new Date().toISOString() };
  all[idx] = updated;
  write(KEYS.outbound, all);
  return updated;
}

export function deleteWebhook(id: string): boolean {
  const all = listWebhooks();
  const filtered = all.filter(w => w.id !== id);
  if (filtered.length === all.length) return false;
  write(KEYS.outbound, filtered);
  return true;
}

export function toggleWebhook(id: string): WebhookConfig | null {
  const w = getWebhook(id);
  if (!w) return null;
  return updateWebhook(id, { status: w.status === 'active' ? 'inactive' : 'active' });
}

// ── Inbound endpoints ─────────────────────────────────────────────────────────

export function listInboundEndpoints(): InboundWebhookEndpoint[] {
  return read<InboundWebhookEndpoint>(KEYS.inbound);
}

export function createInboundEndpoint(
  data: Omit<InboundWebhookEndpoint, 'id' | 'endpointId' | 'createdAt' | 'updatedAt' | 'status'>
): InboundWebhookEndpoint {
  const now = new Date().toISOString();
  const endpoint: InboundWebhookEndpoint = {
    ...data,
    id: uid(),
    endpointId: uid(),
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };
  const all = listInboundEndpoints();
  write(KEYS.inbound, [...all, endpoint]);
  return endpoint;
}

export function deleteInboundEndpoint(id: string): boolean {
  const all = listInboundEndpoints();
  const filtered = all.filter(e => e.id !== id);
  if (filtered.length === all.length) return false;
  write(KEYS.inbound, filtered);
  return true;
}

// ── Delivery logs ─────────────────────────────────────────────────────────────

export function listDeliveries(webhookId?: string): WebhookDelivery[] {
  const all = read<WebhookDelivery>(KEYS.deliveries);
  return webhookId ? all.filter(d => d.webhookId === webhookId) : all;
}

export function logDelivery(delivery: Omit<WebhookDelivery, 'id'>): WebhookDelivery {
  const entry: WebhookDelivery = { ...delivery, id: uid() };
  const all = read<WebhookDelivery>(KEYS.deliveries);
  // Keep only the most recent MAX_DELIVERY_LOGS entries
  const trimmed = [entry, ...all].slice(0, MAX_DELIVERY_LOGS);
  write(KEYS.deliveries, trimmed);
  return entry;
}

export function clearDeliveries(webhookId?: string): void {
  if (!webhookId) {
    write(KEYS.deliveries, []);
    return;
  }
  const all = read<WebhookDelivery>(KEYS.deliveries);
  write(KEYS.deliveries, all.filter(d => d.webhookId !== webhookId));
}
