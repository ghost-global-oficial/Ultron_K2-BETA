/**
 * Supabase Webhook Store
 * Armazena configurações de webhooks no Supabase
 */

import { getSupabaseClient, getCurrentUserId, type WebhookRow } from './supabase-client';
import type { WebhookConfig } from '../webhooks/types';

/**
 * Salva ou atualiza um webhook
 */
export async function saveWebhook(webhook: WebhookConfig): Promise<string> {
  const supabase = getSupabaseClient();
  const userId = getCurrentUserId();

  const data = {
    user_id: userId,
    name: webhook.name,
    url: webhook.url,
    method: webhook.method,
    service: webhook.service,
    events: webhook.events,
    headers: webhook.headers || null,
    enabled: webhook.enabled !== false,
  };

  if (webhook.id) {
    // Atualizar existente
    const { error } = await supabase
      .from('webhooks')
      .update(data)
      .eq('id', webhook.id);

    if (error) {
      console.error('[Supabase Webhook Store] Error updating webhook:', error);
      throw new Error(`Failed to update webhook: ${error.message}`);
    }

    console.log('[Supabase Webhook Store] Webhook updated:', webhook.id);
    return webhook.id;
  } else {
    // Criar novo
    const { data: inserted, error } = await supabase
      .from('webhooks')
      .insert(data)
      .select('id')
      .single();

    if (error || !inserted) {
      console.error('[Supabase Webhook Store] Error creating webhook:', error);
      throw new Error(`Failed to create webhook: ${error?.message}`);
    }

    console.log('[Supabase Webhook Store] Webhook created:', inserted.id);
    return inserted.id;
  }
}

/**
 * Lista todos os webhooks do usuário
 */
export async function listWebhooks(): Promise<WebhookConfig[]> {
  const supabase = getSupabaseClient();
  const userId = getCurrentUserId();

  const { data, error } = await supabase
    .from('webhooks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Supabase Webhook Store] Error listing webhooks:', error);
    return [];
  }

  return (data || []).map((row: WebhookRow) => ({
    id: row.id,
    name: row.name,
    url: row.url,
    method: row.method as any,
    service: row.service,
    events: row.events,
    headers: row.headers || undefined,
    enabled: row.enabled,
  }));
}

/**
 * Obtém um webhook específico por ID
 */
export async function getWebhook(id: string): Promise<WebhookConfig | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('webhooks')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    url: data.url,
    method: data.method as any,
    service: data.service,
    events: data.events,
    headers: data.headers || undefined,
    enabled: data.enabled,
  };
}

/**
 * Deleta um webhook
 */
export async function deleteWebhook(id: string): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('webhooks')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[Supabase Webhook Store] Error deleting webhook:', error);
    throw new Error(`Failed to delete webhook: ${error.message}`);
  }

  console.log('[Supabase Webhook Store] Webhook deleted:', id);
}

/**
 * Atualiza o contador de triggers de um webhook
 */
export async function incrementTriggerCount(id: string): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('webhooks')
    .update({
      trigger_count: supabase.rpc('increment', { row_id: id }),
      last_triggered: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    console.error('[Supabase Webhook Store] Error incrementing trigger count:', error);
  }
}

/**
 * Lista webhooks por serviço
 */
export async function listWebhooksByService(service: string): Promise<WebhookConfig[]> {
  const supabase = getSupabaseClient();
  const userId = getCurrentUserId();

  const { data, error } = await supabase
    .from('webhooks')
    .select('*')
    .eq('user_id', userId)
    .eq('service', service)
    .eq('enabled', true);

  if (error) {
    console.error('[Supabase Webhook Store] Error listing webhooks by service:', error);
    return [];
  }

  return (data || []).map((row: WebhookRow) => ({
    id: row.id,
    name: row.name,
    url: row.url,
    method: row.method as any,
    service: row.service,
    events: row.events,
    headers: row.headers || undefined,
    enabled: row.enabled,
  }));
}
