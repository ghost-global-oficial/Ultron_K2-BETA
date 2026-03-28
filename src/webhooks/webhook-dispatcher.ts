/**
 * ULTRON Webhook System — Dispatcher
 * Responsável por disparar webhooks outbound quando um evento ocorre.
 * Suporta retry com backoff exponencial e logging de entregas.
 */

import type { WebhookConfig, WebhookEvent, WebhookDelivery } from './types';
import { listWebhooks, updateWebhook, logDelivery } from './webhook-store';

// ── Auth header builder ───────────────────────────────────────────────────────

function buildAuthHeaders(config: WebhookConfig): Record<string, string> {
  const { auth } = config;
  switch (auth.type) {
    case 'bearer':
      return { Authorization: `Bearer ${auth.token ?? ''}` };
    case 'basic': {
      const encoded = btoa(`${auth.username ?? ''}:${auth.password ?? ''}`);
      return { Authorization: `Basic ${encoded}` };
    }
    case 'api_key':
      return { [auth.headerName ?? 'X-API-Key']: auth.token ?? '' };
    default:
      return {};
  }
}

// ── HMAC signature (for inbound verification — same logic used outbound too) ──

async function hmacSignature(secret: string, body: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(body));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── Single attempt ────────────────────────────────────────────────────────────

async function attempt(
  config: WebhookConfig,
  event: WebhookEvent,
  attemptNum: number
): Promise<{ success: boolean; status?: number; body?: string; error?: string; durationMs: number }> {
  const payload = {
    ...(config.payloadTemplate ?? {}),
    event: event.name,
    service: event.service,
    data: event.data,
    timestamp: event.timestamp ?? new Date().toISOString(),
  };

  const bodyStr = JSON.stringify(payload);
  const start = Date.now();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Ultron-Event': event.name,
    'X-Ultron-Service': event.service,
    'X-Ultron-Delivery': `${config.id}-${Date.now()}`,
    ...buildAuthHeaders(config),
    ...(config.headers ?? {}),
  };

  // HMAC signature if configured
  if (config.auth.type === 'hmac' && config.auth.secret) {
    const sig = await hmacSignature(config.auth.secret, bodyStr);
    headers['X-Ultron-Signature'] = `sha256=${sig}`;
  }

  try {
    const res = await fetch(config.url, {
      method: config.method,
      headers,
      body: ['GET', 'DELETE'].includes(config.method) ? undefined : bodyStr,
    });

    const body = await res.text().catch(() => '');
    const durationMs = Date.now() - start;

    return {
      success: res.ok,
      status: res.status,
      body: body.slice(0, 500), // cap log size
      durationMs,
      error: res.ok ? undefined : `HTTP ${res.status}`,
    };
  } catch (err: any) {
    return {
      success: false,
      durationMs: Date.now() - start,
      error: err?.message ?? String(err),
    };
  }
}

// ── Dispatcher ────────────────────────────────────────────────────────────────

export async function dispatch(event: WebhookEvent): Promise<void> {
  const webhooks = listWebhooks().filter(
    w => w.status === 'active' && w.events.some(e => e === event.name || e === '*')
  );

  await Promise.allSettled(webhooks.map(w => dispatchOne(w, event)));
}

export async function dispatchOne(config: WebhookConfig, event: WebhookEvent): Promise<WebhookDelivery> {
  const { maxAttempts, backoffMs } = config.retryPolicy;
  let lastResult: Awaited<ReturnType<typeof attempt>> | null = null;

  for (let i = 1; i <= maxAttempts; i++) {
    lastResult = await attempt(config, event, i);

    if (lastResult.success) break;

    if (i < maxAttempts) {
      await new Promise(r => setTimeout(r, backoffMs * Math.pow(2, i - 1)));
    }
  }

  const result = lastResult!;
  const now = new Date().toISOString();

  // Update webhook metadata
  updateWebhook(config.id, {
    lastTriggeredAt: now,
    status: result.success ? 'active' : 'error',
    lastError: result.error,
  });

  // Log delivery
  return logDelivery({
    webhookId: config.id,
    event: event.name,
    payload: { event: event.name, service: event.service, data: event.data },
    responseStatus: result.status,
    responseBody: result.body,
    durationMs: result.durationMs,
    attempt: config.retryPolicy.maxAttempts,
    success: result.success,
    error: result.error,
    timestamp: now,
  });
}

/** Test a webhook with a synthetic ping event */
export async function testWebhook(config: WebhookConfig): Promise<WebhookDelivery> {
  return dispatchOne(config, {
    name: 'webhook.test',
    service: config.service,
    data: { message: 'This is a test delivery from ULTRON', webhookId: config.id },
    timestamp: new Date().toISOString(),
  });
}
