/**
 * Cliente para as Edge Functions do Supabase
 */

const EDGE_FUNCTIONS_BASE_URL = 'https://seu-projeto.supabase.co/functions/v1'

export interface OAuthStartRequest {
  provider: 'google' | 'github' | 'microsoft' | 'slack' | 'notion';
  service: string;
  scopes: string[];
  redirectUri: string;
  state?: string;
}

export interface OAuthStartResponse {
  url: string;
  state: string;
  session_id: string;
  code_verifier: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type: string;
  scope?: string;
  user_info?: any;
}

export interface RefreshTokenRequest {
  provider: string;
  refresh_token: string;
  client_id?: string;
  client_secret?: string;
}

export interface ProxyRequest {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: any;
  accessToken: string;
}

export class EdgeFunctionsClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.apiKey = apiKey;
  }

  private async fetchWithAuth(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
      ...options.headers
    };

    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    return response.json();
  }

  /**
   * Inicia o fluxo OAuth
   */
  async startOAuth(params: OAuthStartRequest): Promise<OAuthStartResponse> {
    return this.fetchWithAuth('/oauth-start', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  }

  /**
   * Processa o callback OAuth
   */
  async handleCallback(code: string, state: string, provider: string) {
    return this.fetchWithAuth('/oauth-callback', {
      method: 'POST',
      body: JSON.stringify({ code, state, provider })
    });
  }

  /**
   * Atualiza um token de acesso
   */
  async refreshToken(request: RefreshTokenRequest) {
    return this.fetchWithAuth('/oauth-refresh', {
      method: 'POST',
      body: JSON.stringify(request)
    });
  }

  /**
   * Faz uma requisição autenticada através do proxy
   */
  async proxyRequest(request: ProxyRequest) {
    return this.fetchWithAuth('/oauth-proxy', {
      method: 'POST',
      body: JSON.stringify(request)
    });
  }

  /**
   * Faz uma requisição para a API do Google através do proxy
   */
  async googleApiRequest(endpoint: string, options: {
    method?: string;
    accessToken: string;
    params?: Record<string, string>;
    body?: any;
  }) {
    return this.fetchWithAuth('/google-api-proxy', {
      method: 'POST',
      body: JSON.stringify({
        endpoint,
        method: options.method || 'GET',
        accessToken: options.accessToken,
        params: options.params,
        body: options.body
      })
    });
  }

  /**
   * Obtém informações do usuário
   */
  async getUserInfo(provider: string, accessToken: string) {
    return this.fetchWithAuth('/user-info', {
      method: 'POST',
      body: JSON.stringify({
        provider,
        access_token: accessToken
      })
    });
  }

  /**
   * Faz uma requisição HTTP através do proxy
   */
  async proxyHttpRequest(request: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: any;
    accessToken: string;
  }) {
    return this.fetchWithAuth('/http-proxy', {
      method: 'POST',
      body: JSON.stringify(request)
    });
  }
}

// Instância padrão (configurar com suas credenciais)
export const edgeFunctions = new EdgeFunctionsClient(
  process.env.EDGE_FUNCTIONS_BASE_URL || 'https://seu-projeto.supabase.co/functions/v1',
  process.env.SUPABASE_ANON_KEY || ''
);

// Helper para iniciar OAuth no frontend
export async function startOAuthFlow(provider: string, scopes: string[], redirectUri: string) {
  const client = new EdgeFunctionsClient(
    process.env.EDGE_FUNCTIONS_BASE_URL!,
    process.env.SUPABASE_ANON_KEY!
  );

  const response = await client.startOAuth({
    provider: provider as any,
    service: provider,
    scopes,
    redirectUri
  });

  // Redireciona o usuário para a URL de autorização
  window.location.href = response.url;
}

// Helper para processar o callback OAuth
export async function handleOAuthCallback(code: string, state: string, provider: string) {
  const client = new EdgeFunctionsClient(
    process.env.EDGE_FUNCTIONS_BASE_URL!,
    process.env.SUPABASE_ANON_KEY!
  );

  return client.handleCallback(code, state, provider);
}

export default EdgeFunctionsClient;