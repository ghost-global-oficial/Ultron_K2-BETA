/**
 * Supabase Credentials Store
 * Armazena credenciais de serviços (Computer Use) no Supabase
 */

import { getSupabaseClient, getCurrentUserId, type ServiceCredentialRow } from './supabase-client';
import { encrypt, decrypt } from '../security/encryption';

/**
 * Cria ou atualiza credenciais de um serviço
 */
export async function createOrUpdateCredentials(
  service: string,
  email: string,
  password: string,
  extra?: Record<string, string>,
  sessionId?: string
): Promise<void> {
  const supabase = getSupabaseClient();
  const userId = getCurrentUserId();

  // Encriptar senha
  const passwordEncrypted = await encrypt(password);

  const data = {
    user_id: userId,
    service,
    email,
    password_encrypted: passwordEncrypted,
    extra: extra || null,
    session_id: sessionId || null,
  };

  const { error } = await supabase
    .from('service_credentials')
    .upsert(data, { onConflict: 'user_id,service' });

  if (error) {
    console.error('[Supabase Credentials Store] Error saving credentials:', error);
    throw new Error(`Failed to save credentials: ${error.message}`);
  }

  console.log('[Supabase Credentials Store] Credentials saved:', service);
}

/**
 * Lê credenciais de um serviço
 */
export async function readCredentials(
  service: string,
  sessionId?: string
): Promise<{ email: string; password: string; extra?: Record<string, string> } | null> {
  const supabase = getSupabaseClient();
  const userId = getCurrentUserId();

  let query = supabase
    .from('service_credentials')
    .select('*')
    .eq('user_id', userId)
    .eq('service', service);

  if (sessionId) {
    query = query.eq('session_id', sessionId);
  }

  const { data, error } = await query.single();

  if (error || !data) {
    return null;
  }

  // Desencriptar senha
  const password = await decrypt(data.password_encrypted);

  return {
    email: data.email,
    password,
    extra: data.extra || undefined,
  };
}

/**
 * Deleta credenciais de um serviço
 */
export async function deleteCredentials(service: string): Promise<void> {
  const supabase = getSupabaseClient();
  const userId = getCurrentUserId();

  const { error } = await supabase
    .from('service_credentials')
    .delete()
    .eq('user_id', userId)
    .eq('service', service);

  if (error) {
    console.error('[Supabase Credentials Store] Error deleting credentials:', error);
    throw new Error(`Failed to delete credentials: ${error.message}`);
  }

  console.log('[Supabase Credentials Store] Credentials deleted:', service);
}

/**
 * Lista todos os serviços com credenciais armazenadas
 */
export async function listServices(): Promise<string[]> {
  const supabase = getSupabaseClient();
  const userId = getCurrentUserId();

  const { data, error } = await supabase
    .from('service_credentials')
    .select('service')
    .eq('user_id', userId);

  if (error) {
    console.error('[Supabase Credentials Store] Error listing services:', error);
    return [];
  }

  return data?.map((row: any) => row.service) || [];
}

/**
 * Verifica se existem credenciais para um serviço
 */
export async function hasCredentials(service: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  const userId = getCurrentUserId();

  const { data, error } = await supabase
    .from('service_credentials')
    .select('id')
    .eq('user_id', userId)
    .eq('service', service)
    .single();

  return !error && !!data;
}
