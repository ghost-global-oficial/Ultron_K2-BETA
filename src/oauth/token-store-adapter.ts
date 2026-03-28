/**
 * Token Store Adapter
 * Adaptador que usa Supabase mas mantém compatibilidade com a API existente
 */

import type { StoredOAuthConnection, OAuthToken } from './types';
import * as supabaseStore from '../supabase/oauth-store-supabase';

// Flag para usar Supabase (pode ser configurado via env)
const USE_SUPABASE = true;

// Fallback para localStorage se Supabase falhar
import * as localStore from './token-store';

/**
 * Lista todas as conexões
 */
export async function listConnections(): Promise<StoredOAuthConnection[]> {
  if (!USE_SUPABASE) {
    return localStore.listConnections();
  }

  try {
    return await supabaseStore.listConnections();
  } catch (error) {
    console.error('[Token Store Adapter] Supabase failed, using localStorage:', error);
    return localStore.listConnections();
  }
}

/**
 * Obtém uma conexão por ID
 */
export async function getConnection(id: string): Promise<StoredOAuthConnection | undefined> {
  const connections = await listConnections();
  return connections.find(c => c.id === id);
}

/**
 * Obtém uma conexão por service
 */
export async function getConnectionByService(service: string): Promise<StoredOAuthConnection | null> {
  if (!USE_SUPABASE) {
    return localStore.getConnectionByService(service) || null;
  }

  try {
    return await supabaseStore.getConnectionByService(service);
  } catch (error) {
    console.error('[Token Store Adapter] Supabase failed, using localStorage:', error);
    return localStore.getConnectionByService(service) || null;
  }
}

/**
 * Salva uma conexão
 */
export async function saveConnection(conn: Omit<StoredOAuthConnection, 'id' | 'createdAt'>): Promise<void> {
  if (!USE_SUPABASE) {
    localStore.saveConnection(conn);
    return;
  }

  try {
    await supabaseStore.saveConnection(conn);
    // Também salvar no localStorage como backup
    localStore.saveConnection(conn);
  } catch (error) {
    console.error('[Token Store Adapter] Supabase failed, using localStorage only:', error);
    localStore.saveConnection(conn);
  }
}

/**
 * Atualiza o token de uma conexão
 */
export async function updateToken(service: string, token: OAuthToken): Promise<boolean> {
  if (!USE_SUPABASE) {
    return localStore.updateToken(service, token);
  }

  try {
    await supabaseStore.updateToken(service, token);
    // Também atualizar no localStorage como backup
    localStore.updateToken(service, token);
    return true;
  } catch (error) {
    console.error('[Token Store Adapter] Supabase failed, using localStorage only:', error);
    return localStore.updateToken(service, token);
  }
}

/**
 * Atualiza as informações do usuário
 */
export async function updateUserInfo(
  service: string,
  userInfo: { email?: string; name?: string; avatar?: string }
): Promise<boolean> {
  if (!USE_SUPABASE) {
    return localStore.updateUserInfo(service, userInfo);
  }

  try {
    await supabaseStore.updateUserInfo(service, userInfo);
    // Também atualizar no localStorage como backup
    localStore.updateUserInfo(service, userInfo);
    return true;
  } catch (error) {
    console.error('[Token Store Adapter] Supabase failed, using localStorage only:', error);
    return localStore.updateUserInfo(service, userInfo);
  }
}

/**
 * Deleta uma conexão
 */
export async function deleteConnection(id: string): Promise<boolean> {
  if (!USE_SUPABASE) {
    return localStore.deleteConnection(id);
  }

  try {
    await supabaseStore.deleteConnection(id);
    // Também deletar do localStorage
    localStore.deleteConnection(id);
    return true;
  } catch (error) {
    console.error('[Token Store Adapter] Supabase failed, using localStorage only:', error);
    return localStore.deleteConnection(id);
  }
}

/**
 * Limpa todas as conexões
 */
export async function clearAll(): Promise<void> {
  localStore.clearAll();
  // Não implementado para Supabase por segurança
}
