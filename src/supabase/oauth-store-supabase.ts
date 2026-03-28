/**
 * Supabase OAuth Token Store
 * Substitui localStorage por armazenamento seguro no Supabase
 */

import { getSupabaseClient, getCurrentUserId, type OAuthTokenRow } from './supabase-client';
import type { OAuthToken, OAuthProviderName } from '../oauth/types';
import { encrypt, decrypt } from '../security/encryption';

export interface StoredOAuthConnection {
  id: string;
  service: string;
  provider: OAuthProviderName;
  token: OAuthToken;
  config?: {
    client_id?: string;
    client_secret?: string;
  };
  userInfo?: {
    email?: string;
    name?: string;
    avatar?: string;
  };
  createdAt: number;
}

/**
 * Salva uma conexão OAuth no Supabase
 */
export async function saveConnection(connection: Omit<StoredOAuthConnection, 'id' | 'createdAt'>): Promise<void> {
  const supabase = getSupabaseClient();
  const userId = getCurrentUserId();

  // Encriptar tokens sensíveis
  const accessTokenEncrypted = await encrypt(connection.token.access_token);
  const refreshTokenEncrypted = connection.token.refresh_token 
    ? await encrypt(connection.token.refresh_token) 
    : null;

  const data = {
    user_id: userId,
    service: connection.service,
    provider: connection.provider,
    access_token: accessTokenEncrypted,
    refresh_token: refreshTokenEncrypted,
    expires_at: connection.token.expires_at,
    token_type: connection.token.token_type,
    scope: connection.token.scope,
    config: connection.config,
    user_info: connection.userInfo,
  };

  const { error } = await supabase
    .from('oauth_tokens')
    .upsert(data, { onConflict: 'user_id,service' });

  if (error) {
    console.error('[Supabase OAuth Store] Error saving connection:', error);
    throw new Error(`Failed to save OAuth connection: ${error.message}`);
  }

  console.log('[Supabase OAuth Store] Connection saved:', connection.service);
}

/**
 * Lista todas as conexões OAuth do usuário
 */
export async function listConnections(): Promise<StoredOAuthConnection[]> {
  const supabase = getSupabaseClient();
  const userId = getCurrentUserId();

  const { data, error } = await supabase
    .from('oauth_tokens')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Supabase OAuth Store] Error listing connections:', error);
    return [];
  }

  if (!data) return [];

  // Desencriptar tokens
  const connections = await Promise.all(
    data.map(async (row: OAuthTokenRow) => {
      const accessToken = await decrypt(row.access_token);
      const refreshToken = row.refresh_token ? await decrypt(row.refresh_token) : undefined;

      return {
        id: row.id,
        service: row.service,
        provider: row.provider as OAuthProviderName,
        token: {
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_at: row.expires_at,
          token_type: row.token_type,
          scope: row.scope,
        },
        config: row.config,
        userInfo: row.user_info,
        createdAt: new Date(row.created_at).getTime(),
      };
    })
  );

  return connections;
}

/**
 * Obtém uma conexão específica por service
 */
export async function getConnectionByService(service: string): Promise<StoredOAuthConnection | null> {
  const supabase = getSupabaseClient();
  const userId = getCurrentUserId();

  const { data, error } = await supabase
    .from('oauth_tokens')
    .select('*')
    .eq('user_id', userId)
    .eq('service', service)
    .single();

  if (error || !data) {
    return null;
  }

  const accessToken = await decrypt(data.access_token);
  const refreshToken = data.refresh_token ? await decrypt(data.refresh_token) : undefined;

  return {
    id: data.id,
    service: data.service,
    provider: data.provider as OAuthProviderName,
    token: {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: data.expires_at,
      token_type: data.token_type,
      scope: data.scope,
    },
    config: data.config,
    userInfo: data.user_info,
    createdAt: new Date(data.created_at).getTime(),
  };
}

/**
 * Atualiza o token de uma conexão
 */
export async function updateToken(service: string, token: OAuthToken): Promise<void> {
  const supabase = getSupabaseClient();
  const userId = getCurrentUserId();

  const accessTokenEncrypted = await encrypt(token.access_token);
  const refreshTokenEncrypted = token.refresh_token 
    ? await encrypt(token.refresh_token) 
    : null;

  const { error } = await supabase
    .from('oauth_tokens')
    .update({
      access_token: accessTokenEncrypted,
      refresh_token: refreshTokenEncrypted,
      expires_at: token.expires_at,
      token_type: token.token_type,
      scope: token.scope,
    })
    .eq('user_id', userId)
    .eq('service', service);

  if (error) {
    console.error('[Supabase OAuth Store] Error updating token:', error);
    throw new Error(`Failed to update token: ${error.message}`);
  }

  console.log('[Supabase OAuth Store] Token updated:', service);
}

/**
 * Atualiza as informações do usuário
 */
export async function updateUserInfo(service: string, userInfo: any): Promise<void> {
  const supabase = getSupabaseClient();
  const userId = getCurrentUserId();

  const { error } = await supabase
    .from('oauth_tokens')
    .update({ user_info: userInfo })
    .eq('user_id', userId)
    .eq('service', service);

  if (error) {
    console.error('[Supabase OAuth Store] Error updating user info:', error);
    throw new Error(`Failed to update user info: ${error.message}`);
  }

  console.log('[Supabase OAuth Store] User info updated:', service);
}

/**
 * Deleta uma conexão
 */
export async function deleteConnection(id: string): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('oauth_tokens')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[Supabase OAuth Store] Error deleting connection:', error);
    throw new Error(`Failed to delete connection: ${error.message}`);
  }

  console.log('[Supabase OAuth Store] Connection deleted:', id);
}

/**
 * Migra dados do localStorage para Supabase
 */
export async function migrateFromLocalStorage(): Promise<void> {
  const STORAGE_KEY = 'ultron:oauth:connections';
  const localData = localStorage.getItem(STORAGE_KEY);

  if (!localData) {
    console.log('[Supabase OAuth Store] No local data to migrate');
    return;
  }

  try {
    const connections: StoredOAuthConnection[] = JSON.parse(localData);
    console.log(`[Supabase OAuth Store] Migrating ${connections.length} connections...`);

    for (const conn of connections) {
      await saveConnection(conn);
    }

    // Limpar localStorage após migração bem-sucedida
    localStorage.removeItem(STORAGE_KEY);
    console.log('[Supabase OAuth Store] Migration completed successfully');
  } catch (error) {
    console.error('[Supabase OAuth Store] Migration failed:', error);
    throw error;
  }
}
