/**
 * Configuração das Edge Functions do Supabase
 */

export interface EdgeFunctionsConfig {
  baseUrl: string;
  apiKey: string;
  enabled: boolean;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

// Configuração padrão
const defaultConfig: EdgeFunctionsConfig = {
  baseUrl: process.env.EDGE_FUNCTIONS_BASE_URL || 'https://seu-projeto.supabase.co/functions/v1',
  apiKey: process.env.SUPABASE_ANON_KEY || '',
  enabled: process.env.EDGE_FUNCTIONS_ENABLED === 'true',
  timeout: 30000, // 30 segundos
  retryAttempts: 3,
  retryDelay: 1000 // 1 segundo
};

// Configuração atual
let currentConfig: EdgeFunctionsConfig = { ...defaultConfig };

/**
 * Obtém a configuração atual das Edge Functions
 */
export function getEdgeFunctionsConfig(): EdgeFunctionsConfig {
  return { ...currentConfig };
}

/**
 * Atualiza a configuração das Edge Functions
 */
export function updateEdgeFunctionsConfig(config: Partial<EdgeFunctionsConfig>): void {
  currentConfig = { ...currentConfig, ...config };
}

/**
 * Verifica se as Edge Functions estão habilitadas
 */
export function isEdgeFunctionsEnabled(): boolean {
  return currentConfig.enabled && !!currentConfig.baseUrl && !!currentConfig.apiKey;
}

/**
 * Obtém a URL base das Edge Functions
 */
export function getEdgeFunctionsBaseUrl(): string {
  return currentConfig.baseUrl;
}

/**
 * Obtém a chave de API das Edge Functions
 */
export function getEdgeFunctionsApiKey(): string {
  return currentConfig.apiKey;
}

/**
 * Configura as Edge Functions com base nas variáveis de ambiente
 */
export function configureFromEnvironment(): void {
  const config: Partial<EdgeFunctionsConfig> = {
    baseUrl: process.env.EDGE_FUNCTIONS_BASE_URL || defaultConfig.baseUrl,
    apiKey: process.env.SUPABASE_ANON_KEY || defaultConfig.apiKey,
    enabled: process.env.EDGE_FUNCTIONS_ENABLED === 'true' || defaultConfig.enabled,
    timeout: parseInt(process.env.EDGE_FUNCTIONS_TIMEOUT || '30000'),
    retryAttempts: parseInt(process.env.EDGE_FUNCTIONS_RETRY_ATTEMPTS || '3'),
    retryDelay: parseInt(process.env.EDGE_FUNCTIONS_RETRY_DELAY || '1000')
  };

  updateEdgeFunctionsConfig(config);
}

/**
 * Valida a configuração das Edge Functions
 */
export function validateConfig(): string[] {
  const errors: string[] = [];

  if (!currentConfig.baseUrl) {
    errors.push('Edge Functions base URL is not configured');
  }

  if (!currentConfig.apiKey) {
    errors.push('Edge Functions API key is not configured');
  }

  if (currentConfig.timeout < 1000) {
    errors.push('Edge Functions timeout must be at least 1000ms');
  }

  if (currentConfig.retryAttempts < 0) {
    errors.push('Edge Functions retry attempts must be non-negative');
  }

  if (currentConfig.retryDelay < 0) {
    errors.push('Edge Functions retry delay must be non-negative');
  }

  return errors;
}

/**
 * Configuração dos provedores OAuth suportados
 */
export const supportedProviders = {
  google: {
    name: 'Google',
    scopes: {
      gmail: ['https://www.googleapis.com/auth/gmail.readonly'],
      drive: ['https://www.googleapis.com/auth/drive.readonly'],
      calendar: ['https://www.googleapis.com/auth/calendar.readonly'],
      contacts: ['https://www.googleapis.com/auth/contacts.readonly']
    }
  },
  github: {
    name: 'GitHub',
    scopes: {
      repo: ['repo'],
      user: ['user'],
      gist: ['gist']
    }
  },
  microsoft: {
    name: 'Microsoft',
    scopes: {
      mail: ['Mail.Read'],
      calendar: ['Calendars.Read'],
      contacts: ['Contacts.Read']
    }
  },
  slack: {
    name: 'Slack',
    scopes: {
      channels: ['channels:read', 'channels:history'],
      users: ['users:read'],
      chat: ['chat:write']
    }
  }
};

/**
 * Obtém os escopos padrão para um provedor
 */
export function getDefaultScopes(provider: string, service?: string): string[] {
  const providerConfig = supportedProviders[provider as keyof typeof supportedProviders];
  
  if (!providerConfig) {
    return [];
  }

  if (service && providerConfig.scopes[service]) {
    return providerConfig.scopes[service];
  }

  // Retorna todos os escopos do provedor
  return Object.values(providerConfig.scopes).flat();
}

/**
 * Configuração das URLs de callback
 */
export const callbackUrls = {
  local: 'http://localhost:3000/oauth/callback',
  development: 'https://dev.example.com/oauth/callback',
  production: 'https://app.example.com/oauth/callback'
};

/**
 * Obtém a URL de callback apropriada
 */
export function getCallbackUrl(): string {
  const env = process.env.NODE_ENV || 'development';
  
  switch (env) {
    case 'production':
      return callbackUrls.production;
    case 'development':
      return callbackUrls.development;
    default:
      return callbackUrls.local;
  }
}

export default {
  getEdgeFunctionsConfig,
  updateEdgeFunctionsConfig,
  isEdgeFunctionsEnabled,
  getEdgeFunctionsBaseUrl,
  getEdgeFunctionsApiKey,
  configureFromEnvironment,
  validateConfig,
  supportedProviders,
  getDefaultScopes,
  getCallbackUrl
};