/**
 * Adaptador para usar Edge Functions do Supabase para OAuth
 * 
 * Este adaptador substitui as chamadas diretas aos provedores OAuth
 * por chamadas para as Edge Functions do Supabase.
 */

import type { OAuthConfig, OAuthToken, OAuthAuthorizationRequest } from './types';

export interface EdgeFunctionsConfig {
  baseUrl: string;
  apiKey: string;
}

export class EdgeFunctionsOAuthAdapter {
  private baseUrl: string;
  private apiKey: string;

  constructor(config: EdgeFunctionsConfig) {
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
  }

  /**
   * Inicia o fluxo OAuth através da Edge Function
   */
  async startOAuthFlow(
    provider: string,
    service: string,
    scopes: string[],
    redirectUri: string
  ): Promise<{ url: string; state: string; codeVerifier: string }> {
    const response = await fetch(`${this.baseUrl}/oauth-start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        provider,
        service,
        scopes,
        redirect_uri: redirectUri
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to start OAuth flow: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      url: data.auth_url,
      state: data.state,
      codeVerifier: data.code_verifier
    };
  }

  /**
   * Troca o código de autorização por um token de acesso
   */
  async exchangeCodeForToken(
    code: string,
    codeVerifier: string,
    redirectUri: string
  ): Promise<OAuthToken> {
    const response = await fetch(`${this.baseUrl}/oauth-callback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        code,
        code_verifier: codeVerifier,
        redirect_uri: redirectUri
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to exchange code for token: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
      token_type: data.token_type,
      scope: data.scope,
      expires_at: Date.now() + (data.expires_in * 1000)
    };
  }

  /**
   * Atualiza um token de acesso expirado
   */
  async refreshToken(refreshToken: string): Promise<OAuthToken> {
    const response = await fetch(`${this.baseUrl}/oauth-refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        refresh_token: refreshToken
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to refresh token: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
      token_type: data.token_type,
      scope: data.scope,
      expires_at: Date.now() + (data.expires_in * 1000)
    };
  }

  /**
   * Faz uma requisição autenticada para uma API de terceiros
   */
  async makeAuthenticatedRequest(
    method: string,
    url: string,
    accessToken: string,
    body?: any,
    headers?: Record<string, string>
  ): Promise<any> {
    const response = await fetch(`${this.baseUrl}/proxy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        method,
        url,
        access_token: accessToken,
        body,
        headers
      })
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Obtém informações do usuário autenticado
   */
  async getUserInfo(accessToken: string, provider: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/user-info`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        access_token: accessToken,
        provider
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to get user info: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Revoga um token de acesso
   */
  async revokeToken(accessToken: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/revoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        access_token: accessToken
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to revoke token: ${response.statusText}`);
    }
  }

  /**
   * Valida um token de acesso
   */
  async validateToken(accessToken: string): Promise<boolean> {
    const response = await fetch(`${this.baseUrl}/validate-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        access_token: accessToken
      })
    });

    return response.ok;
  }

  /**
   * Lista todos os provedores OAuth suportados
   */
  async listProviders(): Promise<string[]> {
    const response = await fetch(`${this.baseUrl}/providers`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to list providers: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Obtém a configuração de um provedor específico
   */
  async getProviderConfig(provider: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/providers/${provider}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get provider config: ${response.statusText}`);
    }

    return response.json();
  }
}

// Instância padrão (singleton)
let edgeFunctionsAdapter: EdgeFunctionsOAuthAdapter | null = null;

export function getEdgeFunctionsAdapter(config?: EdgeFunctionsConfig): EdgeFunctionsOAuthAdapter {
  if (!edgeFunctionsAdapter && config) {
    edgeFunctionsAdapter = new EdgeFunctionsOAuthAdapter(config);
  }
  
  if (!edgeFunctionsAdapter) {
    throw new Error('EdgeFunctionsOAuthAdapter not initialized. Call initEdgeFunctionsAdapter first.');
  }
  
  return edgeFunctionsAdapter;
}

export function initEdgeFunctionsAdapter(config: EdgeFunctionsConfig): EdgeFunctionsOAuthAdapter {
  edgeFunctionsAdapter = new EdgeFunctionsOAuthAdapter(config);
  return edgeFunctionsAdapter;
}

export default EdgeFunctionsOAuthAdapter;