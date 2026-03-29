/**
 * Integração das Edge Functions com o sistema de OAuth existente
 */

import { EdgeFunctionsOAuthAdapter } from './edge-functions-adapter';
import { getEdgeFunctionsConfig } from '../config/edge-functions';

/**
 * Configura o adaptador de Edge Functions
 */
export function setupEdgeFunctionsIntegration() {
  const config = getEdgeFunctionsConfig();
  
  if (!config.enabled) {
    console.warn('Edge Functions estão desabilitadas na configuração');
    return null;
  }

  const adapter = new EdgeFunctionsOAuthAdapter({
    baseUrl: config.baseUrl,
    apiKey: config.apiKey
  });

  // Sobrescrever funções do OAuth manager para usar Edge Functions
  overrideOAuthManager(adapter);
  
  return adapter;
}

/**
 * Sobrescreve as funções do OAuth manager para usar Edge Functions
 */
function overrideOAuthManager(adapter: EdgeFunctionsOAuthAdapter) {
  // Salvar referências originais
  const originalStartAuthorization = window.oauthManager?.startAuthorization;
  const originalHandleCallback = window.oauthManager?.handleCallback;
  const originalRefreshToken = window.oauthManager?.refreshToken;
  
  // Sobrescrever startAuthorization
  window.oauthManager.startAuthorization = async function(config, service) {
    try {
      // Usar Edge Functions para iniciar OAuth
      const { url, state, codeVerifier } = await adapter.startOAuthFlow(
        config.provider,
        service,
        config.scopes,
        config.redirectUri
      );
      
      // Armazenar state e codeVerifier para uso posterior
      sessionStorage.setItem('oauth:state', state);
      sessionStorage.setItem('oauth:codeVerifier', codeVerifier);
      sessionStorage.setItem('oauth:provider', config.provider);
      sessionStorage.setItem('oauth:service', service);
      
      return url;
    } catch (error) {
      console.error('Erro ao iniciar OAuth com Edge Functions:', error);
      throw error;
    }
  };
  
  // Sobrescrever handleCallback
  window.oauthManager.handleCallback = async function(code, state) {
    try {
      const storedState = sessionStorage.getItem('oauth:state');
      const codeVerifier = sessionStorage.getItem('oauth:codeVerifier');
      const provider = sessionStorage.getItem('oauth:provider');
      const service = sessionStorage.getItem('oauth:service');
      
      if (state !== storedState) {
        throw new Error('State mismatch');
      }
      
      const token = await adapter.exchangeCodeForToken(
        code,
        codeVerifier,
        config.redirectUri
      );
      
      // Limpar storage
      sessionStorage.removeItem('oauth:state');
      sessionStorage.removeItem('oauth:codeVerifier');
      sessionStorage.removeItem('oauth:provider');
      sessionStorage.removeItem('oauth:service');
      
      return { success: true, service, token };
    } catch (error) {
      console.error('Erro no callback OAuth:', error);
      return { success: false, error: error.message };
    }
  };
  
  // Sobrescrever refreshToken
  window.oauthManager.refreshToken = async function(service) {
    try {
      const connection = await getConnectionByService(service);
      if (!connection || !connection.token.refresh_token) {
        throw new Error('No refresh token available');
      }
      
      const newToken = await adapter.refreshToken(connection.token.refresh_token);
      
      // Atualizar token no armazenamento
      await updateToken(service, newToken);
      
      return newToken;
    } catch (error) {
      console.error('Erro ao atualizar token:', error);
      throw error;
    }
  };
}

/**
 * Inicializa a integração com Edge Functions
 */
export function initEdgeFunctionsIntegration() {
  try {
    const adapter = setupEdgeFunctionsIntegration();
    
    if (adapter) {
      console.log('Edge Functions integration initialized');
      
      // Configurar interceptador de requisições de API
      setupApiProxy(adapter);
      
      return adapter;
    }
  } catch (error) {
    console.error('Failed to initialize Edge Functions integration:', error);
    return null;
  }
}

/**
 * Configura proxy para requisições de API
 */
function setupApiProxy(adapter) {
  // Interceptar requisições para APIs de terceiros
  const originalFetch = window.fetch;
  
  window.fetch = async function(resource, options = {}) {
    const url = typeof resource === 'string' ? resource : resource.url || resource;
    
    // Verificar se é uma requisição para uma API de terceiro
    if (isThirdPartyApiRequest(url)) {
      const accessToken = getCurrentAccessToken();
      if (accessToken) {
        // Usar Edge Functions proxy para APIs de terceiros
        return proxyRequestThroughEdgeFunctions(url, options, accessToken);
      }
    }
    
    // Usar fetch original para outras requisições
    return originalFetch.call(this, resource, options);
  };
}

/**
 * Proxy para requisições através das Edge Functions
 */
async function proxyRequestThroughEdgeFunctions(url, options, accessToken) {
  const adapter = getEdgeFunctionsAdapter();
  
  try {
    const response = await adapter.makeAuthenticatedRequest(
      options.method || 'GET',
      url,
      accessToken,
      options.body,
      options.headers
    );
    
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Proxy request failed:', error);
    throw error;
  }
}

/**
 * Verifica se a URL é para uma API de terceiros
 */
function isThirdPartyApiRequest(url) {
  const thirdPartyDomains = [
    'api.github.com',
    'www.googleapis.com',
    'graph.microsoft.com',
    'slack.com',
    'api.notion.com'
  ];
  
  try {
    const urlObj = new URL(url);
    return thirdPartyDomains.some(domain => urlObj.hostname.includes(domain));
  } catch {
    return false;
  }
}

/**
 * Obtém o token de acesso atual
 */
function getCurrentAccessToken() {
  // Implementar lógica para obter o token atual
  // Pode ser do localStorage, sessionStorage, etc.
  return localStorage.getItem('access_token');
}

/**
 * Obtém o adaptador de Edge Functions
 */
function getEdgeFunctionsAdapter() {
  return window.edgeFunctionsAdapter;
}

// Inicialização automática quando o script carrega
if (typeof window !== 'undefined') {
  // Inicializar quando o DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initEdgeFunctionsIntegration();
    });
  } else {
    initEdgeFunctionsIntegration();
  }
}

export default {
  initEdgeFunctionsIntegration,
  setupEdgeFunctionsIntegration
};