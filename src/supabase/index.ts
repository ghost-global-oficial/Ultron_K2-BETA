/**
 * Supabase Integration - Main Export
 */

// Client
export { getSupabaseClient, getCurrentUserId } from './supabase-client';
export type { 
  OAuthTokenRow, 
  ServiceCredentialRow, 
  WebhookRow, 
  ApiKeyRow,
  Database 
} from './supabase-client';

// OAuth Store
export {
  saveConnection,
  listConnections,
  getConnectionByService,
  updateToken,
  updateUserInfo,
  deleteConnection,
  migrateFromLocalStorage
} from './oauth-store-supabase';

// Credentials Store
export {
  createOrUpdateCredentials,
  readCredentials,
  deleteCredentials,
  listServices,
  hasCredentials
} from './credentials-store-supabase';

// Webhook Store
export {
  saveWebhook,
  listWebhooks,
  getWebhook,
  deleteWebhook,
  incrementTriggerCount,
  listWebhooksByService
} from './webhook-store-supabase';
