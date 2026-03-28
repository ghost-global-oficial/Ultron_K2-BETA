/**
 * Supabase Client Configuration
 * Secure connection to Supabase backend
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Polyfill para fetch em Node.js
if (typeof fetch === 'undefined') {
  // @ts-ignore
  global.fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
}

// Configuração do Supabase (carregada de variáveis de ambiente)
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

// Cliente Supabase singleton
let supabaseClient: SupabaseClient | null = null;

/**
 * Obtém ou cria a instância do cliente Supabase
 */
export function getSupabaseClient(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase credentials not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.');
  }
  
  if (!supabaseClient) {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false, // Não usar autenticação
        autoRefreshToken: false,
      },
      db: {
        schema: 'public',
      },
    });
  }
  return supabaseClient;
}

/**
 * Tipos de dados do Supabase
 */
export interface OAuthTokenRow {
  id: string;
  user_id: string;
  service: string;
  provider: string;
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  token_type?: string;
  scope?: string;
  config?: any;
  user_info?: any;
  created_at: string;
  updated_at: string;
}

export interface ServiceCredentialRow {
  id: string;
  user_id: string;
  service: string;
  email: string;
  password_encrypted: string;
  extra?: any;
  session_id?: string;
  created_at: string;
  updated_at: string;
}

export interface WebhookRow {
  id: string;
  user_id: string;
  name: string;
  url: string;
  method: string;
  service: string;
  events: string[];
  headers?: any;
  enabled: boolean;
  last_triggered?: string;
  trigger_count: number;
  created_at: string;
  updated_at: string;
}

export interface ApiKeyRow {
  id: string;
  user_id: string;
  service: string;
  key_encrypted: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

/**
 * Database schema type
 */
export interface Database {
  public: {
    Tables: {
      oauth_tokens: {
        Row: OAuthTokenRow;
        Insert: Omit<OAuthTokenRow, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<OAuthTokenRow, 'id' | 'created_at' | 'updated_at'>>;
      };
      service_credentials: {
        Row: ServiceCredentialRow;
        Insert: Omit<ServiceCredentialRow, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ServiceCredentialRow, 'id' | 'created_at' | 'updated_at'>>;
      };
      webhooks: {
        Row: WebhookRow;
        Insert: Omit<WebhookRow, 'id' | 'created_at' | 'updated_at' | 'trigger_count'>;
        Update: Partial<Omit<WebhookRow, 'id' | 'created_at' | 'updated_at'>>;
      };
      api_keys: {
        Row: ApiKeyRow;
        Insert: Omit<ApiKeyRow, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ApiKeyRow, 'id' | 'created_at' | 'updated_at'>>;
      };
    };
  };
}

/**
 * Obtém o user_id atual (pode ser customizado)
 * Por padrão, usa um ID baseado no hostname da máquina
 */
export function getCurrentUserId(): string {
  // Em produção, você pode usar um ID único por instalação
  // Por enquanto, usamos um ID fixo ou baseado no hostname
  if (typeof window !== 'undefined' && window.electron) {
    // Em Electron, podemos usar o hostname ou um ID único
    return 'ultron-user-' + (process.env.COMPUTERNAME || process.env.HOSTNAME || 'default');
  }
  return 'ultron-user-default';
}

export default getSupabaseClient;
