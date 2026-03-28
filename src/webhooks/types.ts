/**
 * ULTRON Webhook System — Types
 * Estrutura central para todos os webhooks de integrações de terceiros.
 */

export type WebhookMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type WebhookStatus = 'active' | 'inactive' | 'error';

export type WebhookAuthType = 'none' | 'bearer' | 'basic' | 'hmac' | 'api_key';

export interface WebhookAuth {
  type: WebhookAuthType;
  /** Bearer token / API key value */
  token?: string;
  /** Basic auth username */
  username?: string;
  /** Basic auth password */
  password?: string;
  /** HMAC secret for signature verification */
  secret?: string;
  /** Header name for api_key auth (e.g. "X-API-Key") */
  headerName?: string;
}

export interface WebhookRetryPolicy {
  maxAttempts: number;   // default: 3
  backoffMs: number;     // initial delay in ms, doubles each retry (default: 1000)
}

/** A registered outbound webhook — Ultron calls this URL when an event fires */
export interface WebhookConfig {
  id: string;
  name: string;
  description?: string;
  /** Target URL to call */
  url: string;
  method: WebhookMethod;
  /** Which integration service this belongs to (e.g. "github", "slack", "zapier") */
  service: string;
  /** Event name(s) that trigger this webhook (e.g. "message.sent", "task.completed") */
  events: string[];
  auth: WebhookAuth;
  headers?: Record<string, string>;
  /** Static payload template (merged with event data at call time) */
  payloadTemplate?: Record<string, unknown>;
  retryPolicy: WebhookRetryPolicy;
  status: WebhookStatus;
  createdAt: string;   // ISO date
  updatedAt: string;   // ISO date
  lastTriggeredAt?: string;
  lastError?: string;
}

/** An inbound webhook endpoint — third-party services call Ultron */
export interface InboundWebhookEndpoint {
  id: string;
  name: string;
  description?: string;
  /** Unique path segment: /api/webhooks/in/:endpointId */
  endpointId: string;
  service: string;
  /** Secret used to verify incoming HMAC signatures */
  secret?: string;
  /** Which Ultron action to trigger on receipt */
  action: string;
  status: WebhookStatus;
  createdAt: string;
  updatedAt: string;
  lastReceivedAt?: string;
}

/** A single delivery attempt log entry */
export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: string;
  payload: Record<string, unknown>;
  responseStatus?: number;
  responseBody?: string;
  durationMs?: number;
  attempt: number;
  success: boolean;
  error?: string;
  timestamp: string;
}

/** Runtime event dispatched through the webhook system */
export interface WebhookEvent {
  name: string;
  service: string;
  data: Record<string, unknown>;
  timestamp?: string;
}
